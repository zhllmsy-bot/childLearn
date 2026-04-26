import type { IncomingMessage, ServerResponse } from 'node:http';
import { proxyLearningSync } from '../server/childlearnServer';

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const text = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(text);
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as unknown;
  } catch {
    return {};
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const body = method === 'GET' ? null : await readJsonBody(req);
  const result = await proxyLearningSync(method, req.url ?? '/api/learning-sync', body);
  sendJson(res, result.status, result.body);
}
