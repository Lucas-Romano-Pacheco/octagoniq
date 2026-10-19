/** Foto de uma fonte externa passando pelo redimensionador do servidor (/img): WebP na largura pedida em vez do PNG original. */
const REMOTE = /^https:\/\/(a\.espncdn\.com|(www\.)?ufc\.com(\.br)?|dmxg5wxfqgb4u\.cloudfront\.net)\//i;

export function proxy(url: string | undefined, width: number): string | undefined {
  if (!url || !REMOTE.test(url)) return url;
  return `/img?u=${encodeURIComponent(url)}&w=${Math.round(width)}`;
}
