import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { Document } from '@langchain/core/documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Runnable } from '@langchain/core/runnables';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from '@langchain/google-genai';
import {
  Annotation,
  CompiledGraph,
  END,
  MemorySaver,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import path from 'path';

// LangGraph 상태 정의
const GraphState = Annotation.Root({
  question: Annotation<string>,
  generation: Annotation<string>,
  documents: Annotation<Document[]>({
    reducer: (_, y) => y,
    default: () => [],
  }),
});

export class RAGChatbot {
  private retriever: VectorStoreRetriever<MemoryVectorStore> | null = null;
  private ragChain: Runnable | null = null;
  private graph: CompiledGraph<
    '__start__' | 'retrieve' | 'generate',
    typeof GraphState.State,
    Partial<typeof GraphState.State>
  > | null = null;
  private isInitialized = false;

  /**
   * 챗봇 초기화
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // 1. PDF 파일 로드 및 처리
      const pdfPath = path.join(process.cwd(), 'public', 'resume.pdf');
      const pdfLoader = new PDFLoader(pdfPath);
      const documents = await pdfLoader.load();

      console.log(`PDF에서 ${documents.length}개의 문서 청크를 로드했습니다.`);

      // 2. 임베딩 및 벡터 스토어 생성
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
      });

      const vectorStore = await MemoryVectorStore.fromDocuments(
        documents,
        embeddings
      );

      this.retriever = vectorStore.asRetriever({
        k: 4, // 상위 4개 관련 문서 검색
      });

      // 3. RAG 체인 설정
      const prompt = ChatPromptTemplate.fromTemplate(`
당신은 Pathas의 이력서를 바탕으로 질문에 답하는 AI 어시스턴트입니다.
제공된 문서를 바탕으로 정확하고 도움이 되는 답변을 제공하세요.
문서에 없는 정보에 대해서는 "제공된 정보에서 해당 내용을 찾을 수 없습니다"라고 답하세요.

관련 문서:
{context}

질문: {question}

답변:`);

      const llm = new ChatGoogleGenerativeAI({
        model: 'gemini-2.0-flash',
        temperature: 0,
        apiKey: process.env.GOOGLE_API_KEY,
      });

      this.ragChain = prompt.pipe(llm).pipe(new StringOutputParser());

      // 4. LangGraph 노드들 정의
      const retrieve = async (
        state: typeof GraphState.State
      ): Promise<Partial<typeof GraphState.State>> => {
        console.log('---문서 검색 중---');
        if (!this.retriever) {
          throw new Error('Retriever가 초기화되지 않았습니다.');
        }
        const documents = await this.retriever.invoke(state.question);
        return { documents };
      };

      const generate = async (
        state: typeof GraphState.State
      ): Promise<Partial<typeof GraphState.State>> => {
        console.log('---답변 생성 중---');
        const { question, documents } = state;

        if (!this.ragChain) {
          throw new Error('RAG Chain이 초기화되지 않았습니다.');
        }

        // 문서 내용을 컨텍스트로 포맷팅
        const context = documents.map(doc => doc.pageContent).join('\n\n');

        const generation = await this.ragChain.invoke({
          context,
          question,
        });

        return { generation };
      };

      // 5. LangGraph 구성
      const graph = new StateGraph(GraphState)
        .addNode('retrieve', retrieve)
        .addNode('generate', generate)
        .addEdge(START, 'retrieve')
        .addEdge('retrieve', 'generate')
        .addEdge('generate', END);

      // 6. 메모리와 함께 그래프 컴파일
      this.graph = graph.compile({
        checkpointer: new MemorySaver(),
      });

      this.isInitialized = true;
      console.log('RAG 챗봇이 성공적으로 초기화되었습니다.');
    } catch (error) {
      console.error('RAG 챗봇 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 질문에 대한 답변 생성
   */
  async ask(question: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const config = {
        configurable: { thread_id: Date.now().toString() },
      };

      if (!this.graph) {
        throw new Error(
          '챗봇이 초기화되지 않았습니다. 먼저 initialize()를 호출하세요.'
        );
      }

      const result = await this.graph.invoke({ question }, config);

      return result.generation || '죄송합니다. 답변을 생성할 수 없습니다.';
    } catch (error) {
      console.error('질문 처리 중 오류:', error);
      return '오류가 발생했습니다. 다시 시도해주세요.';
    }
  }

  /**
   * 스트리밍으로 답변 생성
   */
  async *askStream(question: string): AsyncGenerator<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (!this.retriever) {
        throw new Error('Retriever가 초기화되지 않았습니다.');
      }

      // 1. 문서 검색
      console.log('---문서 검색 중---');
      const documents = await this.retriever.invoke(question);

      // 2. 컨텍스트 준비
      const context = documents.map(doc => doc.pageContent).join('\n\n');

      // 3. 프롬프트 준비
      const prompt = ChatPromptTemplate.fromTemplate(`
          당신은 Pathas의 이력서를 바탕으로 질문에 답하는 AI 어시스턴트입니다.

          마치 pathas 가 자신인 것처럼 질문을 이해하고 답변을 생성하세요.


          제공된 문서를 바탕으로 정확하고 도움이 되는 답변을 제공하세요.
          문서에 없는 정보에 대해서는 "해당 질문에 대해서는 적절한 답변을 하기 어렵습니다. 죄송합니다."라고 답하세요.

          관련 문서:
          {context}

          질문: {question}

          답변:
`);

      const llm = new ChatGoogleGenerativeAI({
        model: 'gemini-2.0-flash',
        temperature: 0,
        apiKey: process.env.GOOGLE_API_KEY,
        streaming: true,
      });

      const streamingChain = prompt.pipe(llm).pipe(new StringOutputParser());

      console.log('---스트리밍 답변 생성 중---');

      const stream = await streamingChain.stream({
        context,
        question,
      });

      for await (const chunk of stream) {
        if (chunk && chunk.trim()) {
          console.log('스트리밍 청크:', chunk);
          yield chunk;
        }
      }
    } catch (error) {
      console.error('스트리밍 처리 중 오류:', error);
      yield '오류가 발생했습니다.';
    }
  }
}

let ragChatbotInstance: RAGChatbot | null = null;

export function getRagChatbot(): RAGChatbot {
  if (!ragChatbotInstance) {
    ragChatbotInstance = new RAGChatbot();
  }
  return ragChatbotInstance;
}
