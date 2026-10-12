// The Cloudflare Worker: /api/chat runs the chat handler, every other path is
// served from the Angular build by the static assets binding.
import { chatMode, handleChat } from '../server/chat.js';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/chat') {
      if (request.method === 'GET') return chatMode();
      if (request.method === 'POST') return handleChat(request);
      return new Response(null, {
        status: 405,
        headers: { allow: 'GET, POST' },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
