import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { Document } from '@langchain/core/documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from '@langchain/google-genai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { EnsembleRetriever } from 'langchain/retrievers/ensemble';
import { BM25Retriever } from '@langchain/community/retrievers/bm25';
import path from 'path';

export class RAGChatbot {
  private retriever: EnsembleRetriever | null = null;
  private isInitialized = false;
  private readonly interviewee: string = 'pathas'; // 인터뷰 대상자 이름

  private refineQuestion = async (question: string): Promise<string> => {
    const llm = this.createLLM(false, 'gemini-2.0-flash-lite');

    const prompt = ChatPromptTemplate.fromTemplate(`
    다음 질문을 더 많은 답변을 이끌어낼 수 있는 질문으로 만들어주세요:

    **주의사항**    
    - 당신은 면접관입니다.
    - 질문을 받는 사람은 프런트엔드 개발자입니다.
    - 질문 외에 다른 부가 설명은 하지 마세요.
    - 처음 질문과 맥락이 달라지지 않게 주의하세요. 
    - 질문 내용 종류를 늘리지는 마세요. (예: 기술 질문 -> 기술 질문, 경험 질문)

    질문: {question}

    개선된 질문: 
    `);
    const chain = prompt.pipe(llm).pipe(new StringOutputParser());

    const result = await chain.invoke({ question });
    return result || question;
  };

  /**
   * 공통 프롬프트 템플릿
   */
  private getPromptTemplate = (): ChatPromptTemplate =>
    ChatPromptTemplate.fromTemplate(`
    당신은 ${this.interviewee} 의 이력서를 바탕으로 질문에 답하는 AI 어시스턴트입니다.

    **주의사항**
    - 마치 ${this.interviewee} 가 자신인 것처럼 질문을 이해하고 답변을 생성하세요.
    - 제공된 문서를 최대한 활용해서 정확하고 도움이 되는 답변을 제공하세요.
    - 맥락에 맞지 않은 답변은 피하고 질문에 대해 최대한 일관성 있는 답변을 제시하세요.
    - 답변은 가능한 경우에 최대한 Markdown 문법을 활용해서 작성하세요. (목록의 경우에는 bullet 을 사용하세요.)
    - 문서에 없는 정보에 대해서는 "해당 질문에 대해서는 적절한 답변을 하기 어렵습니다. 죄송합니다."라고 답하세요.
    - 답변은 항상 완결된 문장 형식을 취하고, 문법적으로 올바르게 작성하세요.
    - 모든 답변은 정중한 형식의 문장을 사용합니다.

    관련 문서: 
    {context}

    질문: {question}

    답변:
`);

  /**
   * 공통 LLM 인스턴스 생성 (스트리밍 여부에 따라)
   */
  private createLLM = (
    streaming: boolean = false,
    model: string = 'gemini-2.0-flash'
  ): ChatGoogleGenerativeAI =>
    new ChatGoogleGenerativeAI({
      model,
      temperature: 0,
      apiKey: process.env.GOOGLE_API_KEY,
      streaming,
    });

  /**
   * 공통 문서 검색 로직
   */
  private searchDocuments = async (
    question: string
  ): Promise<{ documents: Document[]; context: string }> => {
    if (!this.retriever) {
      throw new Error('Retriever가 초기화되지 않았습니다.');
    }

    console.log('---앙상블 문서 검색 중 (벡터 + 키워드)---');
    const documents = await this.retriever.invoke(question);
    const context = documents.map(doc => doc.pageContent).join('\n\n');

    return { documents, context };
  };

  /**
   * 챗봇 초기화 (LangChain 방식)
   */
  initialize = async () => {
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

      // 벡터 검색 리트리버 생성
      const vectorRetriever = vectorStore.asRetriever({
        k: 10, // 상위 10개 관련 문서 검색
      });

      // BM25 키워드 검색 리트리버 생성
      const bm25Retriever = BM25Retriever.fromDocuments(documents, {
        k: 10, // 상위 10개 관련 문서 검색
      });

      // 앙상블 리트리버 생성 (벡터 검색 + 키워드 검색)
      this.retriever = new EnsembleRetriever({
        retrievers: [vectorRetriever, bm25Retriever],
        weights: [0.7, 0.3], // 벡터 검색 70%, 키워드 검색 30%
      });

      this.isInitialized = true;
      console.log(
        '앙상블 RAG 챗봇이 성공적으로 초기화되었습니다. (벡터 검색 + 키워드 검색)'
      );
    } catch (error) {
      console.error('RAG 챗봇 초기화 실패:', error);
      throw error;
    }
  };

  /**
   * 질문에 대한 답변 생성 (LangChain RAG 방식)
   */
  ask = async (question: string): Promise<string> => {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 1. 공통 문서 검색
      const { context } = await this.searchDocuments(question);

      if (!context.trim()) {
        return '관련 문서를 찾을 수 없습니다.';
      }

      // 2. LangChain RAG 체인 구성
      const prompt = this.getPromptTemplate();
      const llm = this.createLLM(false); // 일반 응답
      const chain = prompt.pipe(llm).pipe(new StringOutputParser());

      console.log('---답변 생성 중---');

      // 3. 질문 정제
      const refinedQuestion = await this.refineQuestion(question);

      console.log('정제된 질문:', refinedQuestion);

      // 4 답변 생성
      const result = await chain.invoke({
        context,
        question: refinedQuestion,
      });

      return result || '죄송합니다. 답변을 생성할 수 없습니다.';
    } catch (error) {
      console.error('질문 처리 중 오류:', error);
      return '오류가 발생했습니다. 다시 시도해주세요.';
    }
  };

  /**
   * 스트리밍으로 답변 생성 (LangChain RAG 방식)
   */
  async *askStream(question: string): AsyncGenerator<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 1. 공통 문서 검색
      const { context } = await this.searchDocuments(question);

      if (!context.trim()) {
        yield '관련 문서를 찾을 수 없습니다.';
        return;
      }

      // 2. LangChain 스트리밍 체인 구성
      const prompt = this.getPromptTemplate();
      const llm = this.createLLM(true); // 스트리밍 활성화
      const streamingChain = prompt.pipe(llm).pipe(new StringOutputParser());

      console.log('---스트리밍 답변 생성 중---');

      // 3. 질문 정제
      const refinedQuestion = await this.refineQuestion(question);

      console.log('정제된 질문:', refinedQuestion);

      // 4. 스트리밍 답변 생성
      const stream = await streamingChain.stream({
        context,
        question: refinedQuestion,
      });

      for await (const chunk of stream) {
        if (chunk && chunk.trim()) {
          console.log('스트리밍 청크:', chunk);
          yield chunk;
        }
      }
    } catch (error) {
      console.error('스트리밍 처리 중 오류:', error);
      yield '오류가 발생했습니다. 다시 시도해주세요.';
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
