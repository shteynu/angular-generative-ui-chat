import { pipeJsonRender } from '@json-render/core';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from 'ai';
// The catalog without its Angular components, so plain Node can load it. The
// client renders with `materialRegistry`, built from the same catalog.
import { materialCatalog } from 'ngx-json-render-material/catalog';
import { scriptedModel } from './scripted-model.js';

/**
 * Which model answers, read per request: on Cloudflare, secrets reach
 * `process.env` through the `nodejs_compat` flag.
 */
export function chatModel() {
  const live = Boolean(process.env['AI_GATEWAY_API_KEY']);
  return {
    live,
    model: live
      ? (process.env['MODEL'] ?? 'anthropic/claude-sonnet-5.5')
      : scriptedModel(),
  };
}

// Prose plus ```spec fenced JSONL patches, in the vocabulary of the catalog.
const system = materialCatalog.prompt({ mode: 'inline' });

/** POST /api/chat: a UI message stream whose specs arrive as `data-spec` parts. */
export async function handleChat(request: Request): Promise<Response> {
  const { messages } = (await request.json()) as { messages: UIMessage[] };

  const result = streamText({
    model: chatModel().model,
    system,
    messages: await convertToModelMessages(messages),
  });

  // pipeJsonRender passes the prose through as text parts and turns each
  // patch line of a ```spec fence into a `data-spec` part on the message.
  const stream = createUIMessageStream({
    execute: ({ writer }) =>
      writer.merge(pipeJsonRender(result.toUIMessageStream())),
  });
  return createUIMessageStreamResponse({ stream });
}

/** GET /api/chat: tells the client whether a real model is answering. */
export function chatMode(): Response {
  return Response.json({ mode: chatModel().live ? 'live' : 'scripted' });
}
