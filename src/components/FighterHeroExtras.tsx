import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { FighterBio } from '@shared/types';
import { useEloFighter } from '@/lib/api';
import { Flag } from './kit';

/* Peças do topo do perfil (inspiradas no Roark MMA): o Elo grande com a curva da carreira atrás da foto, as caixas de
   posição no ranking e a faixa de dados presa à base do topo. */

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

/** Curva do Elo em área tracejada, atrás do recorte. Passar o mouse marca a luta mais próxima (nota e data). */
export function EloBackdrop({ espnId }: { espnId?: string }) {
  const { data: f } = useEloFighter(espnId);
  const [hover, setHover] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const pid = useId().replace(/:/g, '');
  const h = f?.history ?? [];
  if (!f || h.length < 2) return null;
  const W = 400, H = 120;
  const min = Math.min(...h.map(p => p.r)) - 20, max = Math.max(...h.map(p => p.r)) + 20;
  const x = (i: number) => (i / (h.length - 1)) * W;
  const y = (r: number) => H - ((r - min) / (max - min)) * (H - 8);
  const line = h.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.r).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.round(((e.clientX - r.left) / r.width) * (h.length - 1)));
  };
  const cur = hover !== null ? h[Math.max(0, Math.min(h.length - 1, hover))] : null;
  const ci = hover !== null ? Math.max(0, Math.min(h.length - 1, hover)) : 0;
  return (
    <>
      <motion.div initial={reduce ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="absolute right-0 top-0 z-[1] text-right sm:-right-2">
        <div className="num font-display text-[56px] font-bold leading-none tracking-tight text-fg sm:text-[72px]">{Math.round(f.rating)}</div>
        <div className="label mt-1">Nota Elo{f.rank ? ` · ${f.rank}º na divisão` : ''}</div>
      </motion.div>
      <div className="absolute inset-x-[-4%] bottom-[14%] h-[34%]">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full touch-none overflow-visible"
          role="img" aria-label={`Nota Elo ao longo da carreira: de ${Math.round(h[0].r)} a ${Math.round(f.rating)} em ${h.length} lutas`}
          onPointerMove={pick} onPointerLeave={() => setHover(null)}>
          <defs>
            <pattern id={`hatch-${pid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-brand)" strokeOpacity="0.35" strokeWidth="1.2" />
            </pattern>
          </defs>
          <motion.path d={area} fill={`url(#hatch-${pid})`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }} />
          <motion.path d={line} fill="none" stroke="var(--color-brand)" strokeOpacity="0.7" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: 0.3 }} />
          <line x1="0" x2={W} y1={H} y2={H} stroke="var(--color-fg)" strokeOpacity="0.25" vectorEffect="non-scaling-stroke" />
          {cur && <line x1={x(ci)} x2={x(ci)} y1={y(cur.r)} y2={H} stroke="var(--color-fg)" strokeOpacity="0.6" vectorEffect="non-scaling-stroke" />}
        </svg>
        {cur && (
          <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-center" style={{ left: `${(ci / (h.length - 1)) * 100}%`, top: `${(y(cur.r) / H) * 100}%` }}>
            <div className="num mb-1 rounded bg-fg px-2 py-0.5 text-[13px] font-bold text-bg">{Math.round(cur.r)}</div>
          </div>
        )}
        {cur && (
          <div className="num pointer-events-none absolute top-full mt-1 -translate-x-1/2 text-[12px] font-semibold text-fg-2" style={{ left: `${(ci / (h.length - 1)) * 100}%` }}>{shortDate(cur.d)}</div>
        )}
      </div>
    </>
  );
}

/** Caixas de posição: borda grossa à esquerda, nome do ranking e o número grande. */
export function RankBoxes({ b }: { b: FighterBio }) {
  const reduce = useReducedMotion();
  const div = b.rankLabel && b.division ? { label: b.division, value: b.rankLabel === 'Campeão' ? 'C' : b.rankLabel.replace('#', '') } : null;
  const boxes = [b.p4pRank ? { label: 'Peso por peso', value: String(b.p4pRank) } : null, div].filter((x): x is { label: string; value: string } => !!x);
  if (!boxes.length) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {boxes.map((x, i) => (
        <motion.div key={x.label} initial={reduce ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
          className={`flex min-w-[200px] items-center justify-between gap-6 border-l-[6px] bg-surface py-3 pl-4 pr-5 shadow-[var(--shadow-soft)] ${x.value === 'C' ? 'border-gold' : 'border-brand'}`}>
          <span className="font-display text-[18px] font-bold text-fg">{x.label}</span>
          <span className="num font-display text-[34px] font-bold leading-none text-fg">{x.value === 'C' ? '★' : x.value}</span>
        </motion.div>
      ))}
    </div>
  );
}

/** Faixa escura presa à base do topo: cartel, altura, idade e país em blocos. */
export function DataStrip({ b }: { b: FighterBio }) {
  const r = b.record;
  type Item = { value: React.ReactNode; label: string };
  const items = ([
    { value: `${r.w}-${r.l}-${r.d}`, label: 'V-D-E' },
    b.heightCm && { value: `${(b.heightCm / 100).toFixed(2).replace('.', ',')} m`, label: 'Altura' },
    b.reachCm && { value: `${Math.round(b.reachCm)} cm`, label: 'Envergadura' },
    b.age && { value: `${b.age} anos`, label: 'Idade' },
    b.country && { value: <span className="inline-flex items-center gap-2"><Flag code={b.countryCode} src={b.flag} title={b.country} size={22} />{b.country}</span>, label: 'País' },
  ] as (Item | false | 0 | undefined)[]).filter((x): x is Item => !!x);
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] bg-white/10 sm:grid-cols-3 lg:grid-cols-5" style={{ background: '#14183e' }}>
      {items.map((x, i) => (
        <motion.div key={x.label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
          className="border-white/10 px-5 py-4 text-center text-white [&:not(:first-child)]:border-l">
          <div className="num font-display text-[24px] font-bold leading-tight">{x.value}</div>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60">{x.label}</div>
        </motion.div>
      ))}
    </div>
  );
}
