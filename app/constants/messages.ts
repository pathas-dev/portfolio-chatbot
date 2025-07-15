// 로그 메시지
export const LOG_MESSAGES = {
  DOCUMENT_SEARCH: '---앙상블 문서 검색 중 (벡터 + 키워드)---',
  ANSWER_GENERATION: '---답변 생성 중---',
  STREAMING_ANSWER_GENERATION: '---스트리밍 답변 생성 중---',
  INITIALIZATION_SUCCESS:
    '앙상블 RAG 챗봇이 성공적으로 초기화되었습니다. (벡터 검색 + 키워드 검색)',
  PDF_LOADED: (count: number) =>
    `PDF에서 ${count}개의 문서 청크를 로드했습니다.`,
  REFINED_QUESTION: (question: string) => `정제된 질문: ${question}`,
  STREAMING_CHUNK: (chunk: string) => `스트리밍 청크: ${chunk}`,
} as const;

// 에러 메시지
export const ERROR_MESSAGES = {
  RETRIEVER_NOT_INITIALIZED: 'Retriever가 초기화되지 않았습니다.',
  INITIALIZATION_FAILED: 'RAG 챗봇 초기화 실패:',
  QUESTION_PROCESSING_ERROR: '질문 처리 중 오류:',
  STREAMING_ERROR: '스트리밍 처리 중 오류:',
  NO_DOCUMENTS_FOUND: '관련 문서를 찾을 수 없습니다.',
  NO_ANSWER_GENERATED: '죄송합니다. 답변을 생성할 수 없습니다.',
  GENERIC_ERROR: '오류가 발생했습니다. 다시 시도해주세요.',
  DOCUMENT_NOT_FOUND:
    '해당 질문에 대해서는 적절한 답변을 하기 어렵습니다. 죄송합니다.',
} as const;
