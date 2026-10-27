import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import type { HistoryFight } from '@shared/types';
import { fightHref } from '@/lib/api';
import { lastName } from '@/lib/format';
import { Avatar } from './kit';

/* Mural de investigação (inspirado num pôster do Makhachev): as viradas da carreira presas como polaroides, ligadas
   por uma linha vermelha que se desenha ao aparecer na tela, e a maior sequência de vitórias num número enorme
   pintado a pincel ao fundo. */

interface Moment { h: HistoryFight; label: string }

function moments(history: HistoryFight[]) {
  const done = history.filter(h => h.outcome !== 'pending').reverse(); // da mais antiga para a mais recente
  if (done.length < 2) return { list: [] as Moment[], best: 0 };
  const list: Moment[] = [{ h: done[0], label: 'Estreia' }];
  const title = done.find(h => h.title && h.outcome === 'W');
  const shot = done.find(h => h.title);
  if (title) list.push({ h: title, label: 'Conquista o cinturão' });
  else if (shot) list.push({ h: shot, label: 'Primeira disputa de título' });
  let run = 0, best = 0, bestAt: HistoryFight | undefined;
  for (const h of done) { run = h.outcome === 'W' ? run + 1 : 0; if (run > best) { best = run; bestAt = h; } }
  if (bestAt && best >= 3) list.push({ h: bestAt, label: `${best}ª vitória seguida` });
  const firstLoss = done.find(h => h.outcome === 'L');
  if (firstLoss) list.push({ h: firstLoss, label: 'Primeira derrota' });
  list.push({ h: done[done.length - 1], label: 'Última luta' });
  // sem repetir a mesma luta, na ordem da carreira
  const seen = new Set<string>();
  const uniq = list.filter(m => (seen.has(m.h.fightId) ? false : (seen.add(m.h.fightId), true)));
  uniq.sort((a, b) => a.h.date.localeCompare(b.h.date));
  return { list: uniq.slice(0, 5), best };
}

const OUT = { W: 'Vitória', L: 'Derrota', D: 'Empate', NC: 'Sem resultado', pending: '' };

/** Moldura de polaroide com alfinete (usada no mural da carreira e no mural dos reinados do cinturão). */
export function PolaroidFrame({ photo, title, lines, rot, to, gold, active, onClick }: {
  photo: React.ReactNode; title: React.ReactNode; lines: React.ReactNode[]; rot: number; to?: string; gold?: boolean; active?: boolean; onClick?: () => void;
}) {
  const cls = `group relative block w-[150px] bg-white p-2 pb-3 text-left shadow-[0_10px_30px_rgba(20,24,62,0.18)] transition-transform duration-300 hover:z-10 hover:scale-105 sm:w-[170px] ${gold ? 'ring-[3px] ring-gold' : ''} ${active ? 'z-10 scale-105 ring-[3px] ring-brand' : ''}`;
  const body = (
    <>
      {/* o alfinete */}
      <span aria-hidden className={`absolute -top-1.5 left-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.35)] ring-2 ring-white/70 ${gold ? 'bg-gold' : 'bg-brand'}`} />
      <div className={`grid aspect-square place-items-center overflow-hidden bg-[#e9e6df] transition group-hover:grayscale-0 ${gold || active ? '' : 'grayscale'}`}>{photo}</div>
      <div className="mt-2 font-display text-[15px] font-bold leading-tight text-[#14183e]">{title}</div>
      {lines.map((l, i) => <div key={i} className={i ? 'num text-[11px] text-[#7a7e93]' : 'text-[12px] text-[#4a4f6a]'}>{l}</div>)}
    </>
  );
  const style = { rotate: `${rot}deg` };
  return to ? <Link to={to} className={cls} style={style}>{body}</Link> : <button type="button" onClick={onClick} className={cls} style={style}>{body}</button>;
}

function Polaroid({ m, rot }: { m: Moment; rot: number }) {
  const h = m.h;
  return (
    <PolaroidFrame to={fightHref(h.eventId, h.fightId)} rot={rot} title={m.label}
      photo={<Avatar src={h.opponent.headshot} name={h.opponent.name} size={110} className="!ring-0" />}
      lines={[`${OUT[h.outcome]} × ${lastName(h.opponent.name)}`, new Date(h.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })]} />
  );
}

/** Linha vermelha entre alfinetes, cedendo com o peso entre um e outro (coordenadas em %). */
export const sagPath = (pts: { x: number; y: number }[], sag = 12) => pts.map((p, i) => {
  if (!i) return `M${p.x},${p.y}`;
  const q = pts[i - 1];
  return `Q${(q.x + p.x) / 2},${Math.max(q.y, p.y) + sag} ${p.x},${p.y}`;
}).join(' ');

export function CareerBoard({ history }: { history: HistoryFight[] }) {
  const reduce = useReducedMotion();
  const { list, best } = moments(history);
  if (list.length < 3) return null;
  const n = list.length;
  // posições do alfinete de cada foto (em %): ziguezague na horizontal (desktop) e na vertical (celular)
  const wide = list.map((_, i) => ({ x: 8 + (i / (n - 1)) * 84, y: i % 2 ? 46 : 10 }));
  const tall = list.map((_, i) => ({ x: i % 2 ? 68 : 32, y: 2 + (i / (n - 1)) * 80 }));
  const board = (pts: { x: number; y: number }[], cls: string) => (
    <div className={`relative ${cls}`}>
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible">
        <motion.path d={sagPath(pts)} fill="none" stroke="var(--color-brand)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 1.8, ease: [0.65, 0, 0.35, 1] }} />
      </svg>
      {list.map((m, i) => (
        <motion.div key={m.h.fightId} className="absolute z-[2] -translate-x-1/2" style={{ left: `${pts[i].x}%`, top: `${pts[i].y}%` }}
          initial={reduce ? false : { opacity: 0, y: -16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: 0.2 + i * 0.25, type: 'spring', stiffness: 300, damping: 18 }}>
          <Polaroid m={m} rot={[-5, 4, -3, 6, -4][i]} />
        </motion.div>
      ))}
    </div>
  );
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-[#ebe8e1] px-4 py-8 text-[#14183e] sm:px-8 dark:bg-[#24283f] dark:text-white"
      style={{ backgroundImage: 'linear-gradient(rgba(20,24,62,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(20,24,62,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
      <div className="relative z-[3] flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[420px]">
          <h2 className="font-display text-[32px] font-bold leading-none sm:text-[44px]">O caso da carreira</h2>
          <p className="mt-2 text-[15px] opacity-75">As viradas, na ordem em que aconteceram. Toque numa foto para abrir a luta.</p>
        </div>
        {best >= 3 && <div className="font-display text-[15px] font-bold uppercase tracking-[0.1em] opacity-70"><span className="text-brand">{best}</span> vitórias seguidas, a melhor fase</div>}
      </div>
      {/* a maior sequência, pintada a pincel ao fundo, atrás das fotos */}
      {best >= 3 && (
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[52%] z-0 -translate-x-1/2 -translate-y-1/2 select-none font-display text-[260px] font-black italic leading-none tracking-tighter text-[#14183e]/[0.1] [text-shadow:6px_4px_0_rgba(20,24,62,0.05)] sm:text-[420px] dark:text-white/[0.08]">{best}</div>
      )}
      {board(wide, 'mt-8 hidden h-[420px] sm:block')}
      {board(tall, 'mt-6 h-[900px] sm:hidden')}
    </section>
  );
}
