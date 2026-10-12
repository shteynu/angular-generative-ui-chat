// Local server for `npm start`; on Vercel, api/chat.ts serves the same handler.
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { chatMode, handleChat, live, modelName } from './chat.js';

const port = Number(process.env['PORT'] ?? 3000);

createServer(async (req, res) => {
  if (req.url !== '/api/chat' || !['GET', 'POST'].includes(req.method ?? '')) {
    res.writeHead(404).end();
    return;
  }
  const response =
    req.method === 'GET'
      ? chatMode()
      : await handleChat(
          new Request(`http://localhost:${port}${req.url}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: Readable.toWeb(req) as ReadableStream,
            duplex: 'half',
          } as RequestInit),
        );
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (response.body) {
    Readable.fromWeb(response.body as NodeReadableStream).pipe(res);
  } else {
    res.end();
  }
}).listen(port, () => {
  const using = live
    ? `model ${modelName}`
    : `${modelName} (no AI_GATEWAY_API_KEY)`;
  console.log(
    `chat server on http://localhost:${port}/api/chat, using ${using}`,
  );
});
