import type { LoaderFunctionArgs } from '@remix-run/node'; // or cloudflare/deno
import { chatbot } from '~/chatbot.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log('🚀 ~ loader ~ request:', request);
  const response = chatbot.ask('Hello, chatbot!');
  return Response.json({ success: true, data: response }, { status: 200 });
};
