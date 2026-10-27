import type { FighterProfile } from '@shared/types';
import { proxy } from './img';
import { circleFlag } from './flags';
import { fighterStyle, withHistoryWins } from './style';

/* "Figurinha" do lutador para compartilhar: um pôster 1080×1350 (formato de post), desenhado no navegador no mesmo
   visual dos stories do resumo da noite. O lutador de corpo inteiro (UFC.com) entra pelo /img (mesma origem, então o
   canvas pode exportar), o sobrenome gigante vazado fica ao fundo, e embaixo vão ranking, cartel, estilo e números. */

const W = 1080, H = 1350;
const DISPLAY = '"Archivo Narrow", "Arial Narrow", sans-serif';
const SANS = '"Montserrat Variable", system-ui, sans-serif';
const GOLD = '#f1a501', BRAND = '#d62839';

function loadImage(src?: string): Promise<HTMLImageElement | null> {
  return new Promise(res => {
    if (!src) return res(null);
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

function octagonPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function chip(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, bg: string, fg = '#fff') {
  ctx.font = `700 26px ${DISPLAY}`;
  const w = ctx.measureText(text).width + 32;
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(x, y, w, 46, 10); ctx.fill();
  ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 16, y + 24);
  return w;
}

export interface CardNumbers { label: string; value: string }

export async function drawFighterCard(p: FighterProfile, numbers: CardNumbers[]): Promise<Blob> {
  await document.fonts?.ready;
  const b = p.bio;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const champ = /campe/i.test(b.rankLabel ?? '');
  const accent = champ ? GOLD : BRAND;

  // fundo: vinho no alto, azul-marinho embaixo (o mesmo dos stories)
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, champ ? '#6b4b12' : '#7a1f3d'); g.addColorStop(0.55, '#2a1838'); g.addColorStop(1, '#0d0f22');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // octógono de ringue atrás do lutador
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 3;
  octagonPath(ctx, W * 0.62, H * 0.42, 430); ctx.stroke();
  ctx.setLineDash([10, 14]); octagonPath(ctx, W * 0.62, H * 0.42, 340); ctx.stroke(); ctx.setLineDash([]);

  // sobrenome gigante, só o contorno
  const surname = b.name.split(' ').slice(-1)[0].toUpperCase();
  ctx.save();
  ctx.font = `900 300px ${DISPLAY}`; ctx.textBaseline = 'alphabetic';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 3;
  ctx.strokeText(surname, 40, 560);
  ctx.restore();

  // lutador em pé, à direita, sumindo embaixo
  const body = await loadImage(b.bodyImage ? proxy(b.bodyImage, 900) : undefined);
  const head = body ? null : await loadImage(b.headshot ? proxy(b.headshot, 600) : undefined);
  if (body) {
    const h = H * 0.78, w = (body.width / body.height) * h;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
    ctx.drawImage(body, W - w * 0.92, H * 0.14, w, h);
    ctx.restore();
  } else if (head) {
    ctx.save(); octagonPath(ctx, W * 0.66, H * 0.4, 300); ctx.clip();
    ctx.drawImage(head, W * 0.66 - 300, H * 0.4 - 300, 600, 600 * (head.height / head.width));
    ctx.restore();
  }
  // véu escuro embaixo, para o texto
  const v = ctx.createLinearGradient(0, H * 0.5, 0, H);
  v.addColorStop(0, 'rgba(13,15,34,0)'); v.addColorStop(0.55, 'rgba(13,15,34,0.85)'); v.addColorStop(1, 'rgba(13,15,34,1)');
  ctx.fillStyle = v; ctx.fillRect(0, H * 0.5, W, H * 0.5);

  // topo: marca, ranking e divisão
  ctx.fillStyle = '#fff'; ctx.font = `800 34px ${DISPLAY}`; ctx.textBaseline = 'top';
  ctx.fillText('OCTAGON', 64, 64);
  const mw = ctx.measureText('OCTAGON').width;
  ctx.fillStyle = BRAND; ctx.beginPath(); ctx.roundRect(64 + mw + 10, 58, 50, 44, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText('IQ', 64 + mw + 21, 64);
  let x = 64;
  if (b.rankLabel) x += chip(ctx, x, 128, champ ? '★ Campeão' : `Nº ${b.rankLabel.replace('#', '')}`, champ ? GOLD : 'rgba(255,255,255,0.14)', champ ? '#14183e' : '#fff') + 10;
  if (b.division) chip(ctx, x, 128, b.division, 'rgba(255,255,255,0.14)');

  // nome: o primeiro nome pequeno, o sobrenome grande
  const parts = b.name.split(' ');
  const first = parts.slice(0, -1).join(' ');
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = `700 54px ${DISPLAY}`;
  ctx.fillText(first.toUpperCase(), 64, 770);
  ctx.fillStyle = '#fff'; ctx.font = `900 132px ${DISPLAY}`;
  let size = 132;
  while (ctx.measureText(surname).width > W - 128 && size > 70) { size -= 6; ctx.font = `900 ${size}px ${DISPLAY}`; }
  ctx.fillText(surname, 64, 770 + size * 0.95);
  // traço na cor de destaque, como o sublinhado do nome no site
  ctx.fillStyle = accent; ctx.fillRect(64, 790 + size, Math.min(ctx.measureText(surname).width, 420), 8);
  let y = 830 + size;
  if (b.nickname) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `italic 500 34px ${SANS}`; ctx.fillText(`"${b.nickname}"`, 64, y); y += 20; }

  // cartel e país
  y += 50;
  const rec = `${b.record.w}-${b.record.l}-${b.record.d}`;
  ctx.fillStyle = '#fff'; ctx.font = `800 76px ${DISPLAY}`; ctx.fillText(rec, 64, y + 20);
  const rw = ctx.measureText(rec).width;
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = `500 26px ${SANS}`; ctx.fillText('V · D · E', 64 + rw + 18, y + 16);
  const flag = await loadImage(circleFlag(b.countryCode));
  let fx = 64 + rw + 150;
  if (flag) { ctx.drawImage(flag, fx, y - 32, 52, 52); fx += 64; }
  if (b.country) { ctx.fillStyle = '#fff'; ctx.font = `600 32px ${SANS}`; ctx.fillText(b.country, fx, y + 6); }

  // estilo (as etiquetas do perfil)
  const tags = fighterStyle(withHistoryWins(p.stats, p.history)).slice(0, 3);
  if (tags.length) {
    y += 56; x = 64;
    for (const t of tags) x += chip(ctx, x, y, t.label, 'rgba(255,255,255,0.12)') + 10;
    y += 46;
  }

  // três números na base
  const nums = numbers.slice(0, 3);
  const colW = (W - 128) / Math.max(nums.length, 1);
  const top = H - 150;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(64, top - 24); ctx.lineTo(W - 64, top - 24); ctx.stroke();
  nums.forEach((n, i) => {
    const nx = 64 + i * colW;
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = `600 24px ${SANS}`; ctx.fillText(n.label, nx, top + 10);
    ctx.fillStyle = '#fff'; ctx.font = `800 58px ${DISPLAY}`; ctx.fillText(n.value, nx, top + 72);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = `500 22px ${SANS}`;
  ctx.fillText('octagoniq.vercel.app', W - 64 - ctx.measureText('octagoniq.vercel.app').width, H - 30);

  return new Promise((res, rej) => cv.toBlob(bl => (bl ? res(bl) : rej(new Error('canvas vazio'))), 'image/png'));
}

/** Celular: abre o compartilhamento (WhatsApp etc.) com a imagem; computador: baixa o PNG. */
export async function shareFighterCard(blob: Blob, p: FighterProfile): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], `figurinha-${p.bio.name.replace(/\W+/g, '-').toLowerCase()}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: `${p.bio.name} no OctagonIQ https://octagoniq.vercel.app` }); return 'shared'; }
    catch (e) { if ((e as Error).name === 'AbortError') return 'shared'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return 'downloaded';
}
