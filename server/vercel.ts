/* Função serverless do Vercel: atende /api/* com as mesmas rotas do servidor local (routes.ts),
   as imagens de prévia (/og/*) e o HTML com meta tags para robôs de redes sociais.
   O build (scripts/vercel-build.mjs) empacota este arquivo num único .mjs. */

import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handle } from './routes.ts';
import { htmlWithMeta, ogImage } from './og.ts';
import { IMG_CACHE, resizeImage } from './img.ts';
import { flushTelemetry, initTelemetry } from './telemetry.ts';

const telemetry = initTelemetry();

let indexHtml: string | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await telemetry;
  const url = new URL(req.url ?? '/', `https://${req.headers.host ?? 'localhost'}`);
  const origin = `https://${req.headers['x-forwarded-host'] ?? req.headers.host}`;

  // /img?u=…&w=… → /api?__img=1&u=…&w=… (fotos redimensionadas)
  if (url.searchParams.get('__img') !== null) {
    const out = await resizeImage(url.searchParams.get('u') ?? '', Number(url.searchParams.get('w'))).catch(() => null);
    if (!out) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'image/webp', 'Cache-Control': IMG_CACHE });
    return res.end(out);
  }
  // /og/<caminho> → /api?__og=<caminho> (regra do config.json)
  const og = url.searchParams.get('__og');
  if (og !== null) {
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=43200, s-maxage=43200, stale-while-revalidate=86400' });
    return res.end(await ogImage(`/og/${og}`));
  }
  // robôs de redes sociais em qualquer página → /api?__html=<caminho>
  const page = url.searchParams.get('__html');
  if (page !== null) {
    indexHtml ??= readFileSync(new URL('./index.html', import.meta.url), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' });
    return res.end(await htmlWithMeta(indexHtml, `/${page}`, origin));
  }

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
  // depois da resposta: a pessoa não espera, mas os traces e erros saem antes de a instância congelar
  await flushTelemetry();
}
