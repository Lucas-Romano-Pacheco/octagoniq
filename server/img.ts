/* Proxy de imagens: /img?u=<url>&w=<largura> devolve a foto redimensionada em WebP.
   As fotos das fontes (UFC.com, ESPN) são PNGs de 250–300 KB feitos para telas grandes; um avatar de 40 px não
   precisa disso. Só domínios da lista abaixo são aceitos (senão seria um proxy aberto) e a largura é limitada. */

import sharp from 'sharp';

const ALLOWED = /^(https:\/\/)(a\.espncdn\.com|(www\.)?ufc\.com(\.br)?|dmxg5wxfqgb4u\.cloudfront\.net|ufc\.com\.br)\//i;
const memo = new Map<string, Buffer>(); // LRU simples: respostas pequenas, ~400 itens

function isAllowedImage(u: string) { return ALLOWED.test(u); }

export async function resizeImage(url: string, width: number): Promise<Buffer | null> {
  if (!isAllowedImage(url)) return null;
  const w = Math.min(Math.max(Math.round(width) || 200, 24), 900);
  const key = `${w}:${url}`;
  const hit = memo.get(key);
  if (hit) { memo.delete(key); memo.set(key, hit); return hit; }
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 OctagonIQ' } });
  if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('image/')) return null;
  const out = await sharp(Buffer.from(await r.arrayBuffer())).resize({ width: w, withoutEnlargement: true }).webp({ quality: 84, effort: 4 }).toBuffer();
  memo.set(key, out);
  if (memo.size > 400) memo.delete(memo.keys().next().value!);
  return out;
}

export const IMG_CACHE = 'public, max-age=604800, s-maxage=2592000, immutable';
