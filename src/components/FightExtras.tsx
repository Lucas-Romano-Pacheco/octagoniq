import { motion, useReducedMotion } from 'motion/react';
import type { FightDetail, FightSideStats, FighterRef } from '@shared/types';
import { useFighter } from '@/lib/api';
import { lastName } from '@/lib/format';
import { Trophy } from './icons';
import { CORNER } from './Duel';

/* Peças da página da luta inspiradas no Sport24 e no app do UFC 242: barras espelhadas, etiqueta inclinada de
   resultado, cartel com o número que mudou destacado, apelido gigante atrás do recorte e o selo "Venceu | VS". */

const pct = (l: number, a: number) => (a ? Math.round((l / a) * 100) : 0);

/** Uma linha espelhada: a barra de cada um sai do centro, com o número dentro; nas pontas, apagado, "49% de 94". */
function Mirror({ label, a, b, attA, attB, i }: { label: string; a: number; b: number; attA?: number; attB?: number; i: number }) {
  const max = Math.max(a, b, 1);
  const reduce = useReducedMotion();
  const bar = (v: number, side: 'a' | 'b') => (
    <div className={`relative h-7 bg-surface-2/70 ${side === 'a' ? 'rounded-l-md' : 'rounded-r-md'}`}>
      <motion.div initial={reduce ? false : { width: 0 }} whileInView={{ width: `${v ? Math.max(8, (v / max) * 100) : 0}%` }} viewport={{ once: true }}
        transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
        className={`absolute inset-y-0 flex items-center ${side === 'a' ? 'right-0 justify-start rounded-l-md pl-2' : 'left-0 justify-end rounded-r-md pr-2'}`}
        style={{ background: CORNER[side] }}>
        {v > 0 && <span className="num text-[13px] font-bold text-white">{v}</span>}
      </motion.div>
      {!v && <span className={`num absolute inset-y-0 flex items-center text-[13px] font-bold text-fg-3 ${side === 'a' ? 'right-2' : 'left-2'}`}>0</span>}
    </div>
  );
  const edge = (l: number, att?: number) => (att ? `${pct(l, att)}% de ${att}` : '');
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 text-[12px]">
        <span className="num text-fg-3">{edge(a, attA)}</span>
        <span className="text-[14px] font-semibold text-fg">{label}</span>
        <span className="num text-right text-fg-3">{edge(b, attB)}</span>
      </div>
      <div className="grid grid-cols-2 gap-[3px]">{bar(a, 'a')}{bar(b, 'b')}</div>
    </div>
  );
}

export function MirrorStats({ a, b }: { a: FightSideStats; b: FightSideStats }) {
  const rows: [string, number, number, number?, number?][] = [
    ['Golpes significativos', a.sigLanded, b.sigLanded, a.sigAttempted, b.sigAttempted],
    ['Golpes totais', a.totalLanded, b.totalLanded, a.totalAttempted, b.totalAttempted],
    ['Quedas', a.tdLanded, b.tdLanded, a.tdAttempted, b.tdAttempted],
    ['Knockdowns', a.kd, b.kd],
    ['Finalizações tentadas', a.subAttempts, b.subAttempts],
    ['Reversões', a.reversals, b.reversals],
  ];
  const zones: [string, keyof Pick<FightSideStats, 'head' | 'body' | 'leg'>][] = [['Cabeça', 'head'], ['Corpo', 'body'], ['Pernas', 'leg']];
  return (
    <div className="space-y-5 px-4 pb-5 pt-3 sm:px-6">
      {rows.map(([l, x, y, ax, ay], i) => <Mirror key={l} label={l} a={x} b={y} attA={ax} attB={ay} i={i} />)}
      <div className="border-t border-line pt-5">
        <div className="mb-4 text-center font-display text-[18px] font-bold text-fg">Golpes significativos por alvo</div>
        <div className="space-y-5">
          {zones.map(([l, k], i) => <Mirror key={k} label={l} a={a[k][0]} b={b[k][0]} attA={a[k][1]} attB={b[k][1]} i={i + rows.length} />)}
        </div>
      </div>
    </div>
  );
}

/** Etiqueta inclinada sob a foto: verde para quem venceu, vermelha para quem perdeu. */
export function SlantResult({ won, right }: { won: boolean; right?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span initial={reduce ? false : { opacity: 0, y: 10, skewX: -12 }} animate={{ opacity: 1, y: 0, skewX: -12 }} transition={{ delay: 0.5, type: 'spring', stiffness: 380, damping: 22 }}
      className={`absolute bottom-3 z-10 inline-block px-4 py-1.5 font-display text-[15px] font-bold uppercase tracking-[0.04em] text-white shadow-[var(--shadow-lift)] sm:text-[18px] ${won ? 'bg-win' : 'bg-loss'} ${right ? 'right-2' : 'left-2'}`}>
      <span className="inline-block skew-x-12">{won ? 'Vitória' : 'Derrota'}</span>
    </motion.span>
  );
}

/** Cartel com o número que esta luta mudou colorido: o das vitórias do vencedor e o das derrotas do perdedor. */
export function RecordMark({ record, won, lost }: { record?: string; won: boolean; lost: boolean }) {
  if (!record) return <span className="num">—</span>;
  const parts = record.split('-');
  return (
    <span className="num whitespace-nowrap font-semibold">
      {parts.map((p, i) => (
        <span key={i}>{i > 0 && '-'}<span className={(won && i === 0) ? 'text-win' : (lost && i === 1) ? 'text-loss' : undefined}>{p}</span></span>
      ))}
    </span>
  );
}

/** Apelido (ou sobrenome) gigante e apagado atrás do recorte; o do vencedor ganha um brilho dourado. */
export function NickBackdrop({ f, right, won }: { f: FighterRef; right?: boolean; won: boolean }) {
  const { data } = useFighter(f.slug, f.espnId);
  const word = (data?.bio.nickname || lastName(f.name)).toUpperCase();
  return (
    <>
      {won && <div aria-hidden className="pointer-events-none absolute inset-x-[-10%] bottom-0 top-[10%] rounded-full" style={{ background: 'radial-gradient(closest-side, color-mix(in oklab, var(--color-gold) 38%, transparent), transparent)' }} />}
      <div aria-hidden className={`pointer-events-none absolute top-[2%] w-[160%] overflow-hidden whitespace-nowrap font-display text-[64px] font-black leading-none text-fg/[0.07] sm:text-[112px] ${right ? 'right-0 text-right' : 'left-0'}`}>
        {word}
      </div>
    </>
  );
}

/** Pílula "Venceu | VS" no centro do topo: o lado do vencedor em dourado, apontando para ele. */
export function WinVs({ d }: { d: FightDetail }) {
  const reduce = useReducedMotion();
  const w = d.fight.result?.winnerId;
  if (!w) return null;
  const left = w === d.red.espnId;
  const win = (
    <motion.span initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6, type: 'spring', stiffness: 420, damping: 16 }}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-gold px-4 font-display text-[15px] font-bold uppercase text-[#14183e] shadow-[0_6px_24px_color-mix(in_oklab,var(--color-gold)_45%,transparent)]">
      <Trophy weight="fill" className="h-4 w-4" /> Venceu
    </motion.span>
  );
  return (
    <div className="mb-5 flex justify-center">
      <div className="inline-flex items-center rounded-full p-1 ring-1 ring-line-2">
        {left && win}
        <span className="px-4 font-display text-[15px] font-bold text-fg-3">VS</span>
        {!left && win}
      </div>
    </div>
  );
}
