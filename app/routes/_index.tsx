import type { MetaFunction } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ENDPOINTS, INTERVIEWEE, OG_CONFIG, EXAMPLE_QUESTIONS, STREAMING_ERROR_MESSAGE, type ExampleQuestion } from '~/constants';
import { LoadingDots, LoadingSpinner } from '~/components/LoadingIndicators';

interface ChatbotResponse {
  success: boolean;
  question?: string;
  answer?: string;
  timestamp?: string;
  error?: string;
}

interface ChatMessage {
  question: string;
  answer: string;
  timestamp: string;
  isStreaming?: boolean;
}

const PascalName =
  INTERVIEWEE.NAME.slice(0, 1).toUpperCase() + INTERVIEWEE.NAME.slice(1);

export const meta: MetaFunction = () => {
  const title = `${PascalName} 이력서 챗봇`;
  const description = `${PascalName} 이력서 기반 AI 챗봇입니다.`;
  const imageUrl = `${OG_CONFIG.SITE_URL}/${OG_CONFIG.IMAGE_FILENAME}`;

  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: imageUrl },
    { property: 'og:type', content: OG_CONFIG.TYPE },
    { property: 'og:url', content: OG_CONFIG.SITE_URL },
  ];
};

export default function Index() {
  const fetcher = useFetcher<ChatbotResponse>();

  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);

  const refMessagesEnd = useRef<HTMLDivElement>(null);

  // Computed values to reduce repetition
  const isLoading = fetcher.state === 'submitting' || isStreaming;
  const canSubmit = !isLoading && message.trim();

  const submitMessage = (question: string) => {
    const userMessage = {
      question,
      answer: '',
      timestamp: new Date().toISOString(),
      isStreaming: useStreaming,
    };

    setChatHistory(prev => [...prev, userMessage]);

    if (useStreaming) return handleStreamingRequest(question);

    fetcher.submit(
      { message: question },
      {
        method: 'POST',
        action: ENDPOINTS.ME,
        encType: 'application/json',
      }
    );
  };

  const handleCardClick = (content: string) => {
    if (isLoading) return;
    submitMessage(content);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    submitMessage(message);

    setMessage('');
  };

  const updateLastChatMessage = (partialMessage: Partial<ChatMessage>) => {
    setChatHistory(prev => {
      const lastIndex = prev.length - 1;
      if (lastIndex < 0) return prev;

      const toUpdated = [...prev];

      toUpdated[lastIndex] = {
        ...toUpdated[lastIndex],
        ...partialMessage,
      };

      return toUpdated;
    });
  };

  const handleStreamingRequest = async (message: string) => {
    setIsStreaming(true);

    try {
      const response = await fetch(`${ENDPOINTS.ME}?stream=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      const DATA_START_PREFIX = 'data: ';

      let streamedAnswer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);

        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (!line.startsWith(DATA_START_PREFIX)) continue;

          try {
            const data = JSON.parse(line.slice(DATA_START_PREFIX.length));
            console.log('Received streaming data:', data);

            switch (data.type) {
              case 'chunk':
                streamedAnswer += data.content;
                console.log('Current streamed answer:', streamedAnswer);

                updateLastChatMessage({
                  answer: streamedAnswer,
                  timestamp: data.timestamp,
                });
                break;
              case 'done':
                console.log('스트리밍 완료');
                break;
              case 'error':
                streamedAnswer = data.content;
                updateLastChatMessage({
                  answer: streamedAnswer,
                  timestamp: data.timestamp,
                });
                break;
              default:
                break;
            }
          } catch (parseError) {
            console.error('Error parsing streaming data:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);

      updateLastChatMessage({
        answer: STREAMING_ERROR_MESSAGE,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    if (fetcher.data && fetcher.data.success) {
      updateLastChatMessage({
        question: fetcher.data?.question || '',
        answer: fetcher.data?.answer || '',
        timestamp: fetcher.data?.timestamp || new Date().toISOString(),
      });
    }
  }, [fetcher.data]);

  useEffect(() => {
    refMessagesEnd.current?.scrollTo({
      behavior: 'smooth',
      top: refMessagesEnd.current.scrollHeight,
    });
  }, [chatHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="mb-8">
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">
                {PascalName} 이력서 챗봇
              </h1>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 shadow-2xl mb-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="ml-4 text-xs md:text-sm text-gray-400">
                  Resume RAG Chatbot
                </span>
              </div>

              {/* Streaming Toggle */}
              <button
                onClick={() => setUseStreaming(!useStreaming)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 ${
                  useStreaming
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/30 hover:bg-gray-600/50'
                }`}
                title={useStreaming ? '스트리밍 응답 ON' : '스트리밍 응답 OFF'}
              >
                <span className="text-sm">⚡</span>
                <span>{useStreaming ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            {/* Chat History */}
            <div className="h-96 overflow-y-auto p-6" ref={refMessagesEnd}>
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-400 mt-16">
                  <div className="text-4xl md:text-6xl mb-4">🤖</div>
                  <p className="text-base md:text-lg">
                    대화를 시작해보세요! 저의 경력, 기술, 프로젝트에 대해
                    질문해주세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {chatHistory.map((chat, index) => {
                    const isLastMessage = index === chatHistory.length - 1;
                    const shouldShowLoading = !chat.answer && 
                      (fetcher.state === 'submitting' || (isStreaming && isLastMessage)) && 
                      isLastMessage;

                    return (
                      <div key={index} className="space-y-4">
                        {/* User Message */}
                        <div className="flex justify-end">
                          <div className="bg-blue-600 text-white p-4 rounded-2xl max-w-md shadow-lg">
                            <div className="text-sm opacity-75 mb-1">
                              Interviewer
                            </div>
                            {chat.question}
                          </div>
                        </div>

                        {/* Bot Response */}
                        {chat.answer && (
                          <div className="flex justify-start">
                            <div className="bg-gray-700 text-gray-100 p-4 rounded-2xl max-w-md shadow-lg">
                              <div className="text-sm opacity-75 mb-1 text-blue-400">
                                {PascalName}
                              </div>
                              <div className="prose prose-invert max-w-none">
                                <ReactMarkdown>{chat.answer || ''}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Loading indicator */}
                        {shouldShowLoading && (
                          <div className="flex justify-start">
                            <div className="bg-gray-700 text-gray-100 p-4 rounded-2xl shadow-lg">
                              <div className="text-sm opacity-75 mb-1 text-blue-400">
                                생각중입니다...
                              </div>
                              <LoadingDots />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="p-6 border-t border-gray-700">
              <form onSubmit={handleSubmit}>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="당신의 경력은 어떻게 되나요?"
                    className="flex-1 p-4 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full max-w-full box-border"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      '➤'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Error Display */}
          {fetcher.data && !fetcher.data.success && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-6 py-4 rounded-xl mb-8">
              오류: {fetcher.data.error}
            </div>
          )}

          {/* Example Questions Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXAMPLE_QUESTIONS.map((example, index) => (
              <button
                key={index}
                onClick={() => handleCardClick(example.content)}
                className={`bg-gray-800/30 border border-gray-700 p-6 rounded-xl hover:bg-gray-700/30 cursor-pointer transition-all duration-200 hover:border-gray-600 group text-left w-full ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isLoading}
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">
                  {example.icon}
                </div>
                <h3 className="text-white font-medium mb-3">{example.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {example.content}
                </p>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-gray-500 text-sm space-x-2">
            <span>RAG 기반 챗봇 🤖</span>
            <span>•</span>
            <span>Remix + LangChain 🔥</span>
            <span>•</span>
            <span>스트리밍 💬</span>
          </div>
        </div>
      </div>
    </div>
  );
}
