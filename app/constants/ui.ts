/**
 * UI 관련 상수
 */

export interface ExampleQuestion {
  title: string;
  content: string;
  icon: string;
}

export const EXAMPLE_QUESTIONS: ExampleQuestion[] = [
  {
    title: '이력서 요약',
    content: '전체 이력서를 간단히 요약해 주세요.',
    icon: '📝',
  },
  {
    title: '경력 & 경험',
    content: '당신의 경력은 어떻게 되나요?',
    icon: '💼',
  },
  {
    title: '프로젝트 경험',
    content: '진행하신 프로젝트들을 요약해서 알려주세요.',
    icon: '🚀',
  },
  {
    title: '기술 스택',
    content: '어떤 기술들을 사용할 수 있나요?',
    icon: '🛠️',
  },
  {
    title: '문제 해결',
    content: '어떤 문제들을 해결해 봤나요?',
    icon: '🧩',
  },
  {
    title: '포트폴리오',
    content: '포트폴리오나 블로그가 있나요?',
    icon: '🌐',
  },
] as const;

export const STREAMING_ERROR_MESSAGE =
  '스트리밍 중 오류가 발생했습니다. 다시 시도해주세요.';