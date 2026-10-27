import type { Fight } from '@shared/types';
import { FOTN, METHODS, scoreFight, type Pick } from './picks';
import { proxy } from './img';

/* Imagem dos palpites para compartilhar (P4): desenhada no navegador, num canvas, com as fontes do site e as fotos
   pelo /img (mesma origem, então o canvas pode exportar). Antes do evento: os palpites; depois: os pontos e a posição. */

const C = {
  bg: '#14183e', panel: '#1e2350', line: 'rgba(255,255,255,0.10)', fg: '#ffffff', fg2: 'rgba(255,255,255,0.72)', fg3: 'rgba(255,255,255,0.5)',
  red: '#e34948', blue: '#3987e5', brand: '#d62839', gold: '#f1a501', win: '#45d08a', loss: '#ff6b72',
  method: { ko: '#d03a7c', sub: '#0c7a55', dec: '#7445d6' } as Record<string, string>,
};
const DISPLAY = '"Archivo Narrow", "Arial Narrow", sans-serif';
const SANS = '"Montserrat Variable", system-ui, sans-serif';
const last = (n: string) => n.split(' ').slice(-1)[0];

function loadImage(src?: string): Promise<HTMLImageElement | null> {
  return new Promise(res => {
    if (!src) return res(null);
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

function octagon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const k = s * 0.29;
  ctx.beginPath();
  [[k, 0], [s - k, 0], [s, k], [s, s - k], [s - k, s], [k, s], [0, s - k], [0, k]].forEach(([px, py], i) => (i ? ctx.lineTo(x + px, y + py) : ctx.moveTo(x + px, y + py)));
  ctx.closePath();
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, bg: string, fg = '#fff') {
  ctx.font = `700 22px ${DISPLAY}`;
  const w = ctx.measureText(text).width + 28;
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(x, y, w, 38, 10); ctx.fill();
  ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 14, y + 20);
  return w;
}

export interface ShareOpts {
  eventName: string; eventDate: string; fights: Fight[]; picks: Record<string, Pick>; user?: string;
  /** depois do evento */
  points?: number; hits?: number; scored?: number; position?: { pos: number; of: number };
}

async function drawPicksCard(o: ShareOpts): Promise<Blob> {
  await document.fonts.ready;
  const list = [...o.fights].sort((a, b) => a.order - b.order).filter(f => o.picks[f.id]);
  const W = 1080, ROW = 92, TOP = o.points !== undefined ? 430 : 330, H = TOP + list.length * ROW + 150;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

  // grade do octógono ao fundo
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 3;
  for (const s of [900, 700, 500]) { octagon(ctx, W - s / 2 - 60, 120 - s / 2 + 200, s); ctx.stroke(); }

  // marca
  ctx.strokeStyle = C.brand; ctx.lineWidth = 5; octagon(ctx, 64, 60, 44); ctx.stroke();
  ctx.fillStyle = C.fg; ctx.font = `800 38px ${DISPLAY}`; ctx.textBaseline = 'alphabetic';
  ctx.fillText('OCTAGON', 124, 96);
  const ow = ctx.measureText('OCTAGON').width;
  ctx.fillStyle = C.brand; ctx.beginPath(); ctx.roundRect(124 + ow + 8, 60, 58, 46, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText('IQ', 124 + ow + 18, 96);

  // título
  ctx.fillStyle = C.fg2; ctx.font = `600 26px ${DISPLAY}`;
  ctx.fillText(`${o.user ? `${o.user.toUpperCase()} · ` : ''}MEUS PALPITES`, 64, 176);
  // o nome do evento diminui até caber na largura (de 58 a 40 px; abaixo disso, corta com reticências)
  const title = o.eventName.toUpperCase();
  let size = 58;
  ctx.font = `800 ${size}px ${DISPLAY}`;
  while (size > 40 && ctx.measureText(title).width > W - 128) { size -= 2; ctx.font = `800 ${size}px ${DISPLAY}`; }
  let shown = title;
  while (ctx.measureText(shown).width > W - 128 && shown.length > 4) shown = shown.slice(0, -2) + '…';
  ctx.fillStyle = C.fg; ctx.fillText(shown, 64, 240);
  ctx.fillStyle = C.fg3; ctx.font = `400 26px ${SANS}`;
  ctx.fillText(new Date(o.eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), 64, 280);

  if (o.points !== undefined) {
    ctx.fillStyle = C.gold; ctx.font = `800 96px ${DISPLAY}`;
    ctx.fillText(`${o.points} PTS`, 64, 390);
    const pw = ctx.measureText(`${o.points} PTS`).width;
    ctx.fillStyle = C.fg2; ctx.font = `600 30px ${SANS}`;
    const bits = [o.scored ? `${o.hits}/${o.scored} vencedores certos` : '', o.position ? `${o.position.pos}º de ${o.position.of} no ranking` : ''].filter(Boolean).join(' · ');
    ctx.fillText(bits, 64 + pw + 28, 380);
  }

  const imgs = await Promise.all(list.map(f => {
    const w = o.picks[f.id].winner === f.red.espnId ? f.red : f.blue;
    return loadImage(proxy(w.headshot, 160));
  }));

  list.forEach((f, i) => {
    const y = TOP + i * ROW, p = o.picks[f.id];
    const side = p.winner === f.red.espnId ? 'red' : 'blue';
    const winner = side === 'red' ? f.red : f.blue, loser = side === 'red' ? f.blue : f.red;
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(64, y); ctx.lineTo(W - 64, y); ctx.stroke();
    // foto
    const cx = 64 + 34, cy = y + ROW / 2;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.closePath();
    ctx.fillStyle = C.panel; ctx.fill(); ctx.clip();
    if (imgs[i]) ctx.drawImage(imgs[i]!, cx - 32, cy - 32, 64, 64);
    ctx.restore();
    ctx.strokeStyle = C[side]; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 33, 0, Math.PI * 2); ctx.stroke();
    // nomes
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.fg; ctx.font = `800 34px ${DISPLAY}`;
    ctx.fillText(last(winner.name).toUpperCase(), 160, y + 50);
    const nw = ctx.measureText(last(winner.name).toUpperCase()).width;
    ctx.fillStyle = C.fg3; ctx.font = `400 24px ${SANS}`;
    ctx.fillText(`vence ${last(loser.name)}`, 160 + nw + 14, y + 50);
    // método e round
    let x = 160;
    ctx.textBaseline = 'middle';
    if (p.method) x += pill(ctx, x, y + 58, METHODS.find(m => m.key === p.method)!.label.toUpperCase(), C.method[p.method]) + 10;
    if (p.round && p.method !== 'dec') x += pill(ctx, x, y + 58, `ROUND ${p.round}`, 'rgba(255,255,255,0.12)') + 10;
    if (o.picks[FOTN]?.winner === f.id) pill(ctx, x, y + 58, '★ LUTA DA NOITE', C.gold, '#14183e');
    // resultado, depois do evento
    const sc = scoreFight(p, f);
    if (sc.state === 'done') {
      ctx.textAlign = 'right'; ctx.font = `800 40px ${DISPLAY}`;
      ctx.fillStyle = sc.winner ? C.win : C.loss;
      ctx.fillText(sc.winner ? `+${sc.points}` : '✕', W - 64, cy);
      ctx.textAlign = 'left';
    }
  });

  // rodapé
  const fy = H - 70;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.fg2; ctx.font = `600 28px ${SANS}`;
  ctx.fillText(o.points !== undefined ? 'Quer entrar no ranking? Palpite no próximo card:' : 'E você, quem leva? Faça os seus palpites:', 64, fy);
  ctx.fillStyle = C.fg; ctx.font = `800 32px ${DISPLAY}`;
  ctx.fillText('OCTAGONIQ.VERCEL.APP/PALPITES', 64, fy + 44);

  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('canvas vazio'))), 'image/png'));
}

/** Abre o compartilhamento do celular (WhatsApp etc.) com a imagem; no computador, baixa o PNG. */
export async function sharePicksCard(o: ShareOpts): Promise<'shared' | 'downloaded'> {
  const blob = await drawPicksCard(o);
  const file = new File([blob], `palpites-${o.eventName.replace(/\W+/g, '-').toLowerCase()}.png`, { type: 'image/png' });
  const text = o.points !== undefined ? `Fiz ${o.points} pontos no ${o.eventName}${o.position ? `, ${o.position.pos}º no ranking` : ''}!` : `Meus palpites para o ${o.eventName}`;
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: `${text} https://octagoniq.vercel.app/palpites` }); return 'shared'; }
    catch (e) { if ((e as Error).name === 'AbortError') return 'shared'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return 'downloaded';
}
