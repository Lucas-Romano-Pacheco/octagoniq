/* Servidor de produção: serve o build (dist/) e o BFF (/api/*).
   Roda direto com `node server/index.ts` (Node ≥ 22.18 remove os tipos nativamente). */

import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { handle } from './routes.ts';
import { warmUp } from './warm.ts';
import { BOT_UA, htmlWithMeta, ogImage } from './og.ts';
import { IMG_CACHE, resizeImage } from './img.ts';
import { initTelemetry } from './telemetry.ts';

// antes de qualquer requisição: liga Sentry e OpenTelemetry se as variáveis existirem
await initTelemetry();

const PORT = Number(process.env.PORT) || 4173;
const DIST = join(import.meta.dirname, '..', 'dist');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon',
};

const packed = new Map<string, Buffer>();

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
  // fotos redimensionadas (WebP)
  if (url.pathname === '/img') {
    const out = await resizeImage(url.searchParams.get('u') ?? '', Number(url.searchParams.get('w'))).catch(() => null);
    if (!out) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'image/webp', 'Cache-Control': IMG_CACHE });
    return res.end(out);
  }
  // imagem de prévia (Open Graph)
  if (url.pathname.startsWith('/og/')) {
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=43200' });
    return res.end(await ogImage(url.pathname));
  }
  // arquivos estáticos; qualquer outra rota cai no index.html (SPA)
  const asset = await file(url.pathname);
  if (!asset && BOT_UA.test(req.headers['user-agent'] ?? '')) {
    // robôs de redes sociais: index.html com as meta tags da página
    const index = await file('index.html');
    if (index) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(await htmlWithMeta(index.body.toString('utf8'), url.pathname, `${req.headers['x-forwarded-proto'] ?? 'http'}://${req.headers.host}`));
    }
  }
  const f = asset ?? (await file('index.html'));
  if (!f) { res.writeHead(500); return res.end('Rode `npm run build` antes de `npm start`.'); }
  const immutable = url.pathname.startsWith('/assets/');
  const headers: Record<string, string> = { 'Content-Type': f.type, 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache', Vary: 'Accept-Encoding' };
  // texto (HTML, JS, CSS, SVG, JSON): brotli ou gzip, com o resultado guardado (o Vercel faz isso sozinho na CDN)
  const enc = String(req.headers['accept-encoding'] ?? '');
  if (/^(text\/|application\/json|image\/svg)|javascript/.test(f.type) && f.body.length > 1024 && /\bbr\b|\bgzip\b/.test(enc)) {
    const br = /\bbr\b/.test(enc), key = `${br ? 'br' : 'gz'}:${createHash('md5').update(f.body).digest('hex')}`; // pelo conteúdo: um build novo com o mesmo tamanho não pode reaproveitar o antigo
    let z = packed.get(key);
    if (!z) { z = br ? brotliCompressSync(f.body) : gzipSync(f.body); packed.set(key, z); }
    headers['Content-Encoding'] = br ? 'br' : 'gzip';
    res.writeHead(200, headers);
    return res.end(z);
  }
  res.writeHead(200, headers);
  res.end(f.body);
}).listen(PORT, () => { console.log(`OctagonIQ em http://localhost:${PORT}`); warmUp(); });
