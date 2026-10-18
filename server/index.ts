/* Servidor de produção: serve o build (dist/) e o BFF (/api/*).
   Roda direto com `node server/index.ts` (Node ≥ 22.18 remove os tipos nativamente). */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { handle } from './routes.ts';
import { warmUp } from './warm.ts';

const PORT = Number(process.env.PORT) || 4173;
const DIST = join(import.meta.dirname, '..', 'dist');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon',
};

async function file(path: string) {
  const p = normalize(join(DIST, path));
  if (!p.startsWith(DIST)) return null;
  try { if ((await stat(p)).isFile()) return { body: await readFile(p), type: TYPES[extname(p)] ?? 'application/octet-stream' }; }
  catch { /* não existe */ }
  return null;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    const r = await handle(url);
    res.writeHead(r.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': r.maxAge ? `public, max-age=${r.maxAge}` : 'no-store' });
    return res.end(JSON.stringify(r.body));
  }
  // arquivos estáticos; qualquer outra rota cai no index.html (SPA)
  const f = (await file(url.pathname)) ?? (await file('index.html'));
  if (!f) { res.writeHead(500); return res.end('Rode `npm run build` antes de `npm start`.'); }
  const immutable = url.pathname.startsWith('/assets/');
  res.writeHead(200, { 'Content-Type': f.type, 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' });
  res.end(f.body);
}).listen(PORT, () => { console.log(`OctagonIQ em http://localhost:${PORT}`); warmUp(); });
