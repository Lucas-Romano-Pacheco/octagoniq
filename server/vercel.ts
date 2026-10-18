/* Função serverless do Vercel: atende /api/* com as mesmas rotas do servidor local (routes.ts).
   O build (scripts/vercel-build.mjs) empacota este arquivo num único .mjs. */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { handle } from './routes.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `https://${req.headers.host ?? 'localhost'}`);
  // a regra de roteamento reescreve /api/<rota> para /api?__path=<rota>; reconstrói a URL original
  const path = url.searchParams.get('__path');
  if (path !== null) {
    url.pathname = `/api/${path}`;
    url.searchParams.delete('__path');
  }
  const r = await handle(url);
  // s-maxage: a CDN do Vercel guarda a resposta e poupa execuções da função
  res.writeHead(r.status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': r.maxAge ? `public, max-age=${r.maxAge}, s-maxage=${r.maxAge}, stale-while-revalidate=86400` : 'no-store',
  });
  res.end(JSON.stringify(r.body));
}
