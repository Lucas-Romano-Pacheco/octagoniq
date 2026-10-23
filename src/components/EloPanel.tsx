import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChartLineUp } from '@phosphor-icons/react';
import type { EloFighter } from '@shared/types';
import { slugify } from '@shared/format';
import { fighterHref, useEloFighter, useEloRanking } from '@/lib/api';
import { fullDate } from '@/lib/format';
import { Avatar, Empty, Panel, Skeleton, Tip } from './kit';

/* Nota Elo (N7): o painel do lutador (nota, posição, pico e a curva da carreira) e a tabela do ranking alternativo.
   Cálculo em server/elo.ts. */

const ELO_NOTE = 'Calculada com todas as lutas do UFC, na ordem: todos começam com 1500 e cada vitória vale mais quanto mais forte o adversário. Empates e lutas sem resultado não contam; lutas fora do UFC também não.';

/** Curva da nota ao longo da carreira (uma marca por luta). */
function Curve({ h }: { h: EloFighter['history'] }) {
  if (h.length < 2) return null;
  const W = 320, H = 90, P = 6;
  const min = Math.min(...h.map(x => x.r), 1500), max = Math.max(...h.map(x => x.r), 1500);
  const x = (i: number) => P + (i / (h.length - 1)) * (W - P * 2);
  const y = (r: number) => H - P - ((r - min) / Math.max(1, max - min)) * (H - P * 2);
  const path = h.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.r)}`).join(' ');
  const peakAt = h.reduce((bi, p, i) => (p.r > h[bi].r ? i : bi), 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label={`Nota Elo de ${h[0].r} a ${h[h.length - 1].r} em ${h.length} lutas`}>
      <line x1={P} x2={W - P} y1={y(1500)} y2={y(1500)} stroke="var(--color-line-2)" strokeDasharray="3 4" />
      <text x={W - P} y={y(1500) - 4} textAnchor="end" className="fill-fg-3 text-[10px]">1500 (início)</text>
      <motion.path d={path} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
      <circle cx={x(peakAt)} cy={y(h[peakAt].r)} r="5" fill="var(--color-gold)" stroke="var(--color-surface)" strokeWidth="2" />
      <circle cx={x(h.length - 1)} cy={y(h[h.length - 1].r)} r="4" fill="var(--color-brand)" />
    </svg>
  );
}

export function EloPanel({ espnId }: { espnId?: string }) {
  const { data: f, isPending, isError } = useEloFighter(espnId);
  if (!espnId || isError) return null;
  if (isPending) return <Skeleton label="Carregando o Elo" className="h-56" />;
  if (!f || f.fights < 1) return null;
  return (
    <Panel plain title="Nota Elo" action={<Tip title="Como é calculada" content={ELO_NOTE}><span tabIndex={0} className="cursor-help text-[13px] text-fg-3 underline decoration-dotted underline-offset-4">O que é</span></Tip>}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="display text-[44px] leading-none text-fg">{Math.round(f.rating)}</div>
          <div className="mt-1 text-[14px] text-fg-2">{f.rank ? <><b className="text-fg">{f.rank}º</b> de {f.of} ativos no {f.division}</> : 'fora dos ativos (sem luta há 2 anos)'}</div>
        </div>
        <div className="text-right text-[13px] text-fg-3">
          <div>Pico <b className="num text-[16px] text-fg">{Math.round(f.peak)}</b></div>
          {f.peakDate && <div>{fullDate(f.peakDate)}</div>}
        </div>
      </div>
      <Curve h={f.history} />
      <p className="mt-2 text-[13px] text-fg-3">{f.fights} lutas no UFC contadas · <span className="inline-block h-2 w-2 rounded-full bg-gold align-middle" /> melhor momento</p>
    </Panel>
  );
}

/** Tabela do ranking alternativo de uma divisão (só ativos com 3+ lutas). */
export function EloTable({ division }: { division: string }) {
  const { data, isPending } = useEloRanking(division);
  if (isPending) return <div role="status" aria-busy="true" aria-label="Carregando o ranking Elo" className="space-y-2 p-4">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12" />)}</div>;
  if (!data?.length) return <Empty>Sem lutadores ativos suficientes para a nota Elo nesta divisão.</Empty>;
  const max = data[0].rating;
  return (
    <div>
      <ol className="divide-y divide-line/70">
        {data.map((f, i) => (
          <motion.li key={f.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 14) * 0.03 }}>
            <Link to={fighterHref({ slug: slugify(f.name), espnId: f.id })} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-surface-2/60 sm:px-6">
              <span className="num text-right font-display text-[18px] font-semibold text-fg-3">{i + 1}</span>
              <span className="flex min-w-0 items-center gap-3">
                <Avatar src={`https://a.espncdn.com/i/headshots/mma/players/full/${f.id}.png`} name={f.name} size={36} />
                <span className="min-w-0">
                  <span className="block truncate text-[16px] font-semibold text-fg">{f.name}</span>
                  <span className="mt-1 block h-1.5 w-32 overflow-hidden rounded-full bg-surface-2 sm:w-48"><span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(8, ((f.rating - 1450) / (max - 1450)) * 100)}%` }} /></span>
                </span>
              </span>
              <span className="text-right"><span className="num display text-[20px] text-fg">{Math.round(f.rating)}</span><span className="block text-[12px] text-fg-3">{f.wins}-{f.fights - f.wins} no UFC</span></span>
            </Link>
          </motion.li>
        ))}
      </ol>
      <p className="flex items-start gap-2 px-4 pb-4 pt-3 text-[13px] text-fg-3 sm:px-6"><ChartLineUp className="mt-1 h-4 w-4 shrink-0" />{ELO_NOTE} Só ativos (luta nos últimos 2 anos) com 3 ou mais lutas.</p>
    </div>
  );
}
