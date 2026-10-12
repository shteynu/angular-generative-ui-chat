// The Vercel Function behind /api/chat. Locally, server/index.ts serves the
// same handler.
import { chatMode, handleChat } from '../server/chat.js';

export function POST(request: Request): Promise<Response> {
  return handleChat(request);
}

export function GET(): Response {
  return chatMode();
}
