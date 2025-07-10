# Portfolio RAG Chatbot

LangChain 을 활용한 RAG(Retrieval-Augmented Generation) 기반 포트폴리오 챗봇입니다.

## � 기능

- PDF 문서 로딩 및 텍스트 추출
- 문서 청킹 및 벡터 임베딩 (LangChain)
- LangGraphJS를 사용한 RAG 워크플로우
- Google Gemini 모델 기반 답변 생성
- 이력서 기반 질의응답

## 📋 설정 방법

### 1. 의존성 설치

```sh
npm install
```

### 2. 환경변수 설정

`.env` 파일에 Google AI Studio API 키를 설정하세요:

```env
GOOGLE_API_KEY=google_api_key
```

### 3. PDF 파일 배치

`resume.pdf` 파일을 다음 경로에 배치하세요:

- `public/resume.pdf`

## 🛠️ 개발

개발 서버 실행:

```sh
npm run dev
```

## Deployment

먼저 프로덕션용 앱을 빌드하세요:

```sh
npm run build
```

그 다음 프로덕션 모드로 앱을 실행하세요:

```sh
npm start
```

이제 배포할 호스트를 선택해야 합니다.

### 직접 배포

Node 애플리케이션 배포에 익숙하다면, 내장된 Remix 앱 서버는 프로덕션 준비가 완료되어 있습니다.

`npm run build`의 출력물을 배포하세요:

- `build/server`
- `build/client`

## 스타일링

이 템플릿은 간단한 기본 시작 경험을 위해 [Tailwind CSS](https://tailwindcss.com/)가 이미 구성되어 있습니다. 원하는 CSS 프레임워크를 사용할 수 있습니다. 더 많은 정보는 [Vite CSS 문서](https://vitejs.dev/guide/features.html#css)를 참조하세요.
