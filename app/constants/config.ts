/**
 * RAG 챗봇 설정 상수
 */

// LLM 모델 설정
export const LLM_CONFIG = {
  MODELS: {
    PRIMARY: 'gemini-2.0-flash',
    LITE: 'gemini-2.0-flash-lite',
  },
  TEMPERATURE: 0,
  API_KEY_ENV: 'GOOGLE_API_KEY',
} as const;

// 검색 설정
export const RETRIEVAL_CONFIG = {
  DOCUMENT_COUNT: 10, // 상위 관련 문서 검색 개수
  ENSEMBLE_WEIGHTS: {
    VECTOR: 0.7, // 벡터 검색 70%
    KEYWORD: 0.3, // 키워드 검색 30%
  },
} as const;

/**
 * 챗봇 인터뷰 대상자 설정
 */
export const INTERVIEWEE = {
  NAME: 'pathas',
  ROLE: '프런트엔드 개발자',
} as const;

export const PASCAL_NAME = 
  INTERVIEWEE.NAME.slice(0, 1).toUpperCase() + INTERVIEWEE.NAME.slice(1);

export const RESUME_PATHS = {
  RESUME_PDF: 'resume.pdf',
  PUBLIC_DIR: 'public',
} as const;

const stripPromptIndent = (prompt: string): string =>
  prompt
    .split('\n')
    .map(line => line.trim())
    .filter(trimmed => !!trimmed)
    .join('\n');

// 프롬프트 템플릿
export const PROMPT_TEMPLATES = {
  QUESTION_REFINEMENT: stripPromptIndent(`
    다음 질문을 프런트엔드 개발자의 이력서 정보를 벡터스토어에서 더 효과적으로 검색할 수 있는 질문으로 개선해주세요:

    **주의사항**    
    - 원래 질문의 핵심 의도와 맥락을 유지하세요.
    - 벡터 검색에 유리한 키워드와 맥락을 포함하세요.
    - 질문의 종류(기술,경험,역량 등)는 변경하지 마세요.
    - 개선된 질문만 제시하고 부가 설명은 하지 마세요.
    - 개선된 질문은 특수문자(/,*,$,#,& 등)를 포함하지 말고 일반 문자로만 생성하세요.

    원래 질문: {question}

    개선된 질문: 
    `),

  QUERY_RESUME_PROMPT: stripPromptIndent(`
    당신은 ${INTERVIEWEE.NAME} 의 이력서를 바탕으로 질문에 답하는 AI 어시스턴트입니다.

    **주의사항**
    - 마치 ${INTERVIEWEE.NAME} 가 자신인 것처럼 질문을 이해하고 답변을 생성하세요.
    - 제공된 문서를 최대한 활용해서 정확하고 도움이 되는 답변을 제공하세요.
    - 맥락에 맞지 않은 답변은 피하고 질문에 대해 최대한 일관성 있는 답변을 제시하세요.
    - 답변은 가능한 경우에 최대한 Markdown 문법을 활용해서 작성하세요. (목록의 경우에는 bullet 을 사용하세요.)
    - 문서에 없는 정보에 대해서는 "해당 질문에 대해서는 적절한 답변을 하기 어렵습니다. 죄송합니다."라고 답하세요.
    - 답변은 항상 완결된 문장 형식을 취하고, 문법적으로 올바르게 작성하세요.
    - 모든 답변은 정중한 형식의 문장을 사용합니다.
    - 질문에 직접적인 관련이 없는 정보는 제외하세요.

    관련 문서: 
    {context}

    질문: {question}

    답변:
`),
} as const;

export const OG_CONFIG = {
  SITE_URL: 'https://portfolio-chatbot-ivory.vercel.app',
  IMAGE_FILENAME: 'og-image.png',
  TYPE: 'website',
} as const;
