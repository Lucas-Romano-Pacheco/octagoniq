/* Prévias para compartilhar (Open Graph): quem cola um link no WhatsApp, LinkedIn etc. vê título, descrição e
   uma imagem 1200×630 feita para aquela página (luta, lutador, evento).
   Os robôs dessas redes não executam JavaScript, então o servidor escreve as meta tags no HTML só para eles
   (detectados pelo User-Agent); os visitantes recebem o site estático de sempre.
   Imagens: satori (HTML/CSS → SVG) + resvg (SVG → PNG), com Saira e Inter em WOFF. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { FighterRef } from '../shared/types.ts';
import { HOUR, remember } from './http.ts';
import { eventFull, fighterProfile } from './routes.ts';

export const BOT_UA = /facebookexternalhit|facebot|linkedinbot|whatsapp|twitterbot|slackbot|telegrambot|discordbot|pinterest|skypeuripreview|googlebot|bingbot|redditbot|embedly|vkshare|applebot/i;

/* ---------- Fontes (pasta fonts/ ao lado da função no Vercel; node_modules no resto) ---------- */

const FONT_FILES = {
  saira800: '@fontsource/saira/files/saira-latin-800-normal.woff',
  saira700: '@fontsource/saira/files/saira-latin-700-normal.woff',
  plex400: '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff',
  plex600: '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff',
};
function font(rel: string) {
  const name = rel.split('/').pop()!;
  for (const p of [fileURLToPath(new URL(`./fonts/${name}`, import.meta.url)), join(process.cwd(), 'node_modules', rel)]) {
    try { return readFileSync(p); } catch { /* tenta o próximo */ }
  }
  throw new Error(`fonte não encontrada: ${name}`);
}
let fonts: Parameters<typeof satori>[1]['fonts'] | null = null;
const loadFonts = () => (fonts ??= [
  { name: 'Saira', data: font(FONT_FILES.saira800), weight: 800, style: 'normal' },
  { name: 'Saira', data: font(FONT_FILES.saira700), weight: 700, style: 'normal' },
  { name: 'Plex', data: font(FONT_FILES.plex400), weight: 400, style: 'normal' },
  { name: 'Plex', data: font(FONT_FILES.plex600), weight: 600, style: 'normal' },
]);

/* ---------- Mini-JSX para o satori ---------- */

type El = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: (El | string | null | undefined | false)[]): El =>
  ({ type, props: { style: { display: 'flex', ...style }, children: children.filter(Boolean) } });
const img = (src: string, style: Record<string, unknown>): El => ({ type: 'img', props: { src, style } });

const C = { bg: '#0d0f22', panel: '#171a36', fg: '#f2f0ea', fg3: '#8287a6', red: '#e34948', blue: '#2a78d6', gold: '#f2a900', brand: '#d62839' };

/** Foto da ESPN como data URI (o satori não busca imagens remotas de forma confiável). */
async function photo(url?: string) {
  if (!url) return undefined;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return undefined;
    return `data:${r.headers.get('content-type') ?? 'image/png'};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
  } catch { return undefined; }
}

const last = (n: string) => n.split(' ').slice(-1)[0];
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' }).replace('.', '').replace(/ de /g, ' ');

const logo = () => h('div', { alignItems: 'center', gap: 12 },
  h('div', { fontFamily: 'Saira', fontWeight: 800, fontSize: 34, color: C.fg, letterSpacing: 1 }, 'OCTAGON'),
  h('div', { fontFamily: 'Saira', fontWeight: 800, fontSize: 30, color: '#fff', background: C.brand, padding: '0 10px', borderRadius: 4 }, 'IQ'));

const frame = (...children: El[]) => h('div', { width: 1200, height: 630, background: C.bg, color: C.fg, flexDirection: 'column', fontFamily: 'Plex', position: 'relative', overflow: 'hidden' }, ...children);

/* ---------- Modelos ---------- */

async function duelCard(top: string, red: FighterRef, blue: FighterRef, bottom: string, belt?: boolean) {
  const [pr, pb] = await Promise.all([photo(red.headshot), photo(blue.headshot)]);
  const face = (src: string | undefined, color: string) => h('div', { width: 400, height: 470, alignItems: 'flex-end', justifyContent: 'center', borderBottom: `10px solid ${color}` },
    src ? img(src, { width: 440, height: 320, objectFit: 'cover', objectPosition: 'top' }) : h('div', {}));
  return frame(
    h('div', { position: 'absolute', left: 0, top: 0, width: 600, height: 630, background: 'linear-gradient(90deg, rgba(227,73,72,0.22), rgba(13,15,34,0))' }),
    h('div', { position: 'absolute', right: 0, top: 0, width: 600, height: 630, background: 'linear-gradient(270deg, rgba(42,120,214,0.22), rgba(13,15,34,0))' }),
    h('div', { justifyContent: 'space-between', alignItems: 'center', padding: '40px 56px 0' },
      logo(), h('div', { fontFamily: 'Saira', fontWeight: 700, fontSize: 24, color: C.fg3, letterSpacing: 3, textTransform: 'uppercase' }, top)),
    h('div', { flex: 1, alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 40px' },
      face(pr, C.red),
      h('div', { flexDirection: 'column', alignItems: 'center', paddingBottom: 60, width: 340 },
        belt ? h('div', { fontFamily: 'Saira', fontWeight: 800, fontSize: 22, color: '#14183e', background: C.gold, padding: '4px 14px', borderRadius: 4, marginBottom: 18, letterSpacing: 2 }, 'DISPUTA DE CINTURÃO') : null,
        h('div', { fontFamily: 'Saira', fontWeight: 800, fontSize: 64, lineHeight: 1, textAlign: 'center', textTransform: 'uppercase' }, last(red.name)),
        h('div', { fontFamily: 'Saira', fontWeight: 800, fontSize: 40, color: C.fg3, margin: '8px 0' }, '×'),
        h('div', { fontFamily: 'Saira', fontWeight: 800, fontSize: 64, lineHeight: 1, textAlign: 'center', textTransform: 'uppercase' }, last(blue.name)),
        h('div', { fontSize: 24, color: C.fg3, marginTop: 22, textAlign: 'center' }, bottom)),
      face(pb, C.blue)),
  );
}

async function fighterCard(slug: string) {
  const p = await fighterProfile(slug);
  if (!p) return null;
  const b = p.bio, face = await photo(b.headshot);
  const rec = `${b.record.w}-${b.record.l}-${b.record.d}`;
  const rank = b.rankLabel === 'Campeão' ? 'CAMPEÃO' : b.rankLabel ? `Nº ${b.rankLabel.replace('#', '')}` : undefined;
  return frame(
    h('div', { position: 'absolute', right: 0, top: 0, width: 640, height: 630, background: 'linear-gradient(270deg, rgba(214,40,57,0.28), rgba(13,15,34,0))' }),
    h('div', { padding: '40px 56px 0' }, logo()),
    h('div', { flex: 1, justifyContent: 'space-between', alignItems: 'flex-end' },
      h('div', { flexDirection: 'column', padding: '0 0 64px 56px', width: 680 },
        rank || b.division ? h('div', { gap: 10, marginBottom: 18 },
          rank ? h('div', { fontFamily: 'Saira', fontWeight: 800, fontSize: 22, color: rank === 'CAMPEÃO' ? '#14183e' : C.fg, background: rank === 'CAMPEÃO' ? C.gold : '#2a2f52', padding: '4px 12px', borderRadius: 4 }, rank) : null,
          b.division ? h('div', { fontFamily: 'Saira', fontWeight: 700, fontSize: 22, color: C.fg3, padding: '4px 0', textTransform: 'uppercase', letterSpacing: 2 }, b.division) : null) : null,
        h('div', { fontFamily: 'Saira', fontWeight: 800, fontSize: 84, lineHeight: 0.95, textTransform: 'uppercase', flexWrap: 'wrap' }, b.name),
        b.nickname ? h('div', { fontSize: 28, color: C.fg3, marginTop: 14 }, `“${b.nickname}”`) : null,
        h('div', { flexDirection: 'column', marginTop: 26 },
          h('div', { fontFamily: 'Saira', fontWeight: 800, fontSize: 72, lineHeight: 1, color: C.fg }, rec),
          h('div', { fontSize: 24, color: C.fg3, marginTop: 6 }, `vitórias · derrotas · empates${b.country ? `   |   ${b.country}` : ''}`))),
      face ? img(face, { width: 520, height: 378, objectFit: 'cover', objectPosition: 'top' }) : h('div', {})),
  );
}

const defaultCard = () => frame(
  h('div', { position: 'absolute', right: -120, top: -120, width: 560, height: 560, borderRadius: 999, background: 'rgba(214,40,57,0.18)' }),
  h('div', { flex: 1, flexDirection: 'column', justifyContent: 'center', padding: '0 80px' },
    logo(),
    h('div', { fontFamily: 'Saira', fontWeight: 800, fontSize: 76, lineHeight: 1, marginTop: 40, textTransform: 'uppercase' }, 'O UFC em números'),
    h('div', { fontSize: 30, color: C.fg3, marginTop: 24, maxWidth: 900 }, 'Eventos, resultados, rankings oficiais, odds e estatísticas de cada lutador, em português.')),
);

/* ---------- Rotas ---------- */

const render = async (el: El) => {
  const svg = await satori(el as never, { width: 1200, height: 630, fonts: loadFonts()! });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
};

/** PNG de /og/... (luta, lutador, evento ou padrão). 12 h em cache: resultado e cartel mudam pouco. */
export async function ogImage(pathname: string): Promise<Buffer> {
  // o cache em disco é JSON: guarda o PNG em base64
  const b64 = await remember(`og:v3:${pathname}`, 12 * HOUR, async () => {
    let m: RegExpMatchArray | null;
    let el: El | null = null;
    if ((m = pathname.match(/^\/og\/luta\/(\d+)\/(\d+)\.png$/))) {
      const ev = await eventFull(m[1]), f = ev?.fights.find(x => x.id === m![2]);
      if (ev && f) {
        const r = f.result, w = r?.winnerId === f.red.espnId ? f.red : r?.winnerId === f.blue.espnId ? f.blue : null;
        el = await duelCard(`${ev.name.split(':')[0]} · ${shortDate(ev.date)}`, f.red, f.blue,
          r ? `${w ? `Vitória de ${last(w.name)} · ` : ''}${r.method}${r.round ? `, R${r.round}` : ''}` : `${f.weightClass} · ${f.rounds} rounds`, f.title);
      }
    } else if ((m = pathname.match(/^\/og\/evento\/(\d+)\.png$/))) {
      const ev = await eventFull(m[1]), f = ev && (ev.fights.find(x => x.order === 1) ?? ev.fights[0]);
      if (ev && f) el = await duelCard(`${ev.name.split(':')[0]} · ${shortDate(ev.date)}`, f.red, f.blue, `${ev.fights.length} lutas${ev.city ? ` · ${ev.city}` : ''}`, f.title);
    } else if ((m = pathname.match(/^\/og\/lutador\/([a-z0-9-]+)\.png$/))) {
      el = await fighterCard(m[1]);
    }
    return Buffer.from(await render(el ?? defaultCard())).toString('base64');
  });
  return Buffer.from(b64, 'base64');
}

/* ---------- Meta tags por página ---------- */

type Meta = { title: string; description: string; image: string };
const DEFAULT_META: Meta = {
  title: 'OctagonIQ · O UFC em números',
  description: 'Eventos, resultados, rankings oficiais, odds e estatísticas de cada lutador do UFC, em português.',
  image: '/og/padrao.png',
};

export async function pageMeta(pathname: string): Promise<Meta> {
  let m: RegExpMatchArray | null;
  try {
    if ((m = pathname.match(/^\/eventos\/(\d+)\/lutas\/(\d+)/))) {
      const ev = await eventFull(m[1]), f = ev?.fights.find(x => x.id === m![2]);
      if (ev && f) {
        const r = f.result;
        return {
          title: `${f.red.name} × ${f.blue.name} · ${ev.name.split(':')[0]} | OctagonIQ`,
          description: r ? `${r.method}${r.round ? `, round ${r.round} (${r.clock})` : ''}. Estatísticas, odds e cartões dos juízes.` : `${f.weightClass} · ${shortDate(ev.date)}. Prévia, odds e a carreira dos dois frente a frente.`,
          image: `/og/luta/${m[1]}/${m[2]}.png`,
        };
      }
    } else if ((m = pathname.match(/^\/eventos\/(\d+)/))) {
      const ev = await eventFull(m[1]);
      if (ev) return { title: `${ev.name} | OctagonIQ`, description: `${shortDate(ev.date)}${ev.venue ? ` · ${ev.venue}` : ''}. ${ev.fights.length} lutas, resultados e odds.`, image: `/og/evento/${m[1]}.png` };
    } else if ((m = pathname.match(/^\/lutadores\/([a-z0-9-]+)/))) {
      const p = await fighterProfile(m[1]);
      if (p) {
        const b = p.bio;
        return { title: `${b.name}: cartel, estatísticas e histórico | OctagonIQ`, description: `${b.record.w}-${b.record.l}-${b.record.d}${b.division ? ` · ${b.division}` : ''}${b.country ? ` · ${b.country}` : ''}. Estatísticas oficiais do UFC, histórico luta a luta e próximas lutas.`, image: `/og/lutador/${m[1]}.png` };
      }
    } else if (pathname.startsWith('/rankings')) return { ...DEFAULT_META, title: 'Rankings oficiais do UFC | OctagonIQ', description: 'Campeões e top 15 de cada divisão, com cartel, país e luta marcada.' };
    else if (pathname.startsWith('/palpites')) return { ...DEFAULT_META, title: 'Palpites do card | OctagonIQ', description: 'Dê seus palpites de vencedor, método e round em cada luta e veja quantas você acertou.' };
    else if (pathname.startsWith('/sobre')) return { ...DEFAULT_META, title: 'Sobre o projeto | OctagonIQ', description: 'Como o OctagonIQ foi feito: arquitetura, fontes de dados, cache e decisões.' };
  } catch { /* cai no padrão */ }
  return DEFAULT_META;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Escreve título e meta tags (Open Graph + Twitter) no index.html. */
export async function htmlWithMeta(html: string, pathname: string, origin: string) {
  const m = await pageMeta(pathname);
  const image = origin + m.image, url = origin + pathname;
  const tags = [
    `<meta property="og:type" content="website" />`, `<meta property="og:site_name" content="OctagonIQ" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`, `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`, `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`, `<meta property="og:image:height" content="630" />`, `<meta property="og:locale" content="pt_BR" />`,
    `<meta name="twitter:card" content="summary_large_image" />`, `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`, `<meta name="twitter:image" content="${esc(image)}" />`,
  ].join('\n    ');
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(m.description)}" />`)
    .replace('</head>', `    ${tags}\n  </head>`);
}
