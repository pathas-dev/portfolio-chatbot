import type { ActionFunctionArgs } from '@remix-run/node';
import { getRagChatbot } from '~/lib/rag-chatbot.server';

export const loader = async () => {
  // handle "GET" request for API status check
  return Response.json(
    {
      success: true,
      message: 'RAG Chatbot API is ready',
      endpoint: '/me',
      methods: ['GET', 'POST'],
    },
    { status: 200 }
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  // handle "POST" request for chatbot interaction
  try {
    const url = new URL(request.url);
    const isStreaming = url.searchParams.get('stream') === 'true';

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return Response.json(
        { success: false, error: '메세지를 입력하세요.' },
        { status: 400 }
      );
    }

    const ragChatbot = getRagChatbot();

    console.log(`🤖 사용자 질문: ${message}`);

    // 일반 응답 처리
    if (!isStreaming) {
      const response = await ragChatbot.ask(message);
      console.log(`🚀 챗봇 응답: ${response}`);

      return Response.json({
        success: true,
        question: message,
        answer: response,
        timestamp: new Date().toISOString(),
      });
    }

    // 스트리밍 응답
    console.log('🌊 스트리밍 모드 시작');
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('🚀 스트리밍 제너레이터 시작');
          const streamGenerator = ragChatbot.askStream(message);

          for await (const chunk of streamGenerator) {
            console.log('📦 스트리밍 청크 수신:', chunk);
            const data = JSON.stringify({
              type: 'chunk',
              content: chunk,
              timestamp: new Date().toISOString(),
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // 스트림 종료 신호
          console.log('✅ 스트리밍 완료');
          const endData = JSON.stringify({
            type: 'done',
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${endData}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({
            type: 'error',
            content: 'An error occurred while generating the response.',
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chatbot action error:', error);
    return Response.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};
