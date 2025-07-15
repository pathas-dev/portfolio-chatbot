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
import {
  LLM_CONFIG,
  RETRIEVAL_CONFIG,
  PROMPT_TEMPLATES,
  RESUME_PATHS,
  LOG_MESSAGES,
  ERROR_MESSAGES,
} from '~/constants';

export class RAGChatbot {
  private retriever: EnsembleRetriever | null = null;
  private isInitialized = false;

  private refineQuestion = async (question: string): Promise<string> => {
    const llm = this.createLLM(false, LLM_CONFIG.MODELS.LITE);

    const prompt = ChatPromptTemplate.fromTemplate(
      PROMPT_TEMPLATES.QUESTION_REFINEMENT
    );
    const chain = prompt.pipe(llm).pipe(new StringOutputParser());

    const result = await chain.invoke({ question });
    return result || question;
  };

  /**
   * 공통 프롬프트 템플릿
   */
  private getPromptTemplate = (): ChatPromptTemplate =>
    ChatPromptTemplate.fromTemplate(PROMPT_TEMPLATES.QUERY_RESUME_PROMPT);

  /**
   * 공통 LLM 인스턴스 생성 (스트리밍 여부에 따라)
   */
  private createLLM = (
    streaming: boolean = false,
    model: string = LLM_CONFIG.MODELS.PRIMARY
  ): ChatGoogleGenerativeAI =>
    new ChatGoogleGenerativeAI({
      model,
      temperature: LLM_CONFIG.TEMPERATURE,
      apiKey: process.env[LLM_CONFIG.API_KEY_ENV],
      streaming,
    });

  /**
   * 공통 문서 검색 로직
   */
  private searchDocuments = async (
    question: string
  ): Promise<{ documents: Document[]; context: string }> => {
    if (!this.retriever) {
      throw new Error(ERROR_MESSAGES.RETRIEVER_NOT_INITIALIZED);
    }

    console.log(LOG_MESSAGES.DOCUMENT_SEARCH);
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
      const pdfPath = path.join(
        process.cwd(),
        RESUME_PATHS.PUBLIC_DIR,
        RESUME_PATHS.RESUME_PDF
      );
      const pdfLoader = new PDFLoader(pdfPath);
      const documents = await pdfLoader.load();

      console.log(LOG_MESSAGES.PDF_LOADED(documents.length));

      // 2. 임베딩 및 벡터 스토어 생성
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env[LLM_CONFIG.API_KEY_ENV],
      });

      const vectorStore = await MemoryVectorStore.fromDocuments(
        documents,
        embeddings
      );

      // 벡터 검색 리트리버 생성
      const vectorRetriever = vectorStore.asRetriever({
        k: RETRIEVAL_CONFIG.DOCUMENT_COUNT,
      });

      // BM25 키워드 검색 리트리버 생성
      const bm25Retriever = BM25Retriever.fromDocuments(documents, {
        k: RETRIEVAL_CONFIG.DOCUMENT_COUNT,
      });

      // 앙상블 리트리버 생성 (벡터 검색 + 키워드 검색)
      this.retriever = new EnsembleRetriever({
        retrievers: [vectorRetriever, bm25Retriever],
        weights: [
          RETRIEVAL_CONFIG.ENSEMBLE_WEIGHTS.VECTOR,
          RETRIEVAL_CONFIG.ENSEMBLE_WEIGHTS.KEYWORD,
        ],
      });

      this.isInitialized = true;
      console.log(LOG_MESSAGES.INITIALIZATION_SUCCESS);
    } catch (error) {
      console.error(ERROR_MESSAGES.INITIALIZATION_FAILED, error);
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
        return ERROR_MESSAGES.NO_DOCUMENTS_FOUND;
      }

      // 2. LangChain RAG 체인 구성
      const prompt = this.getPromptTemplate();
      const llm = this.createLLM(false); // 일반 응답
      const chain = prompt.pipe(llm).pipe(new StringOutputParser());

      console.log(LOG_MESSAGES.ANSWER_GENERATION);

      // 3. 질문 정제
      const refinedQuestion = await this.refineQuestion(question);

      console.log(LOG_MESSAGES.REFINED_QUESTION(refinedQuestion));

      // 4 답변 생성
      const result = await chain.invoke({
        context,
        question: refinedQuestion,
      });

      return result || ERROR_MESSAGES.NO_ANSWER_GENERATED;
    } catch (error) {
      console.error(ERROR_MESSAGES.QUESTION_PROCESSING_ERROR, error);
      return ERROR_MESSAGES.GENERIC_ERROR;
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
        yield ERROR_MESSAGES.NO_DOCUMENTS_FOUND;
        return;
      }

      // 2. LangChain 스트리밍 체인 구성
      const prompt = this.getPromptTemplate();
      const llm = this.createLLM(true); // 스트리밍 활성화
      const streamingChain = prompt.pipe(llm).pipe(new StringOutputParser());

      console.log(LOG_MESSAGES.STREAMING_ANSWER_GENERATION);

      // 3. 질문 정제
      const refinedQuestion = await this.refineQuestion(question);

      console.log(LOG_MESSAGES.REFINED_QUESTION(refinedQuestion));

      // 4. 스트리밍 답변 생성
      const stream = await streamingChain.stream({
        context,
        question: refinedQuestion,
      });

      for await (const chunk of stream) {
        if (chunk && chunk.trim()) {
          console.log(LOG_MESSAGES.STREAMING_CHUNK(chunk));
          yield chunk;
        }
      }
    } catch (error) {
      console.error(ERROR_MESSAGES.STREAMING_ERROR, error);
      yield ERROR_MESSAGES.GENERIC_ERROR;
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
