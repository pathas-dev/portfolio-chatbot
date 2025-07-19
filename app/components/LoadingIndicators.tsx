/**
 * 로딩 인디케이터 컴포넌트
 */

interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className = "" }: LoadingDotsProps) {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
      <div
        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
        style={{ animationDelay: '0.1s' }}
      />
      <div
        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
        style={{ animationDelay: '0.2s' }}
      />
    </div>
  );
}

interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ${className}`} />
  );
}