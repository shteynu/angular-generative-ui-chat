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

const gatewayKey = process.env['AI_GATEWAY_API_KEY'];

/** True when a real model answers; false when the scripted one replays. */
export const live = Boolean(gatewayKey);

const model = live
  ? (process.env['MODEL'] ?? 'anthropic/claude-sonnet-5.5')
  : scriptedModel();

export const modelName = live ? String(model) : 'the scripted model';

// Prose plus ```spec fenced JSONL patches, in the vocabulary of the catalog.
const system = materialCatalog.prompt({ mode: 'inline' });

/** POST /api/chat: a UI message stream whose specs arrive as `data-spec` parts. */
export async function handleChat(request: Request): Promise<Response> {
  const { messages } = (await request.json()) as { messages: UIMessage[] };

  const result = streamText({
    model,
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
  return Response.json({ mode: live ? 'live' : 'scripted' });
}
