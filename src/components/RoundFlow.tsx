import { motion } from 'motion/react';
import type { FightDetail, RoundStat } from '@shared/types';
import { roundEdge } from '@/lib/fights';
import { lastName } from '@/lib/format';
import { CORNER, CORNER_INK, CORNER_FILL } from './Duel';
import { Panel, Tip } from './kit';

/* Domínio por round: cada round é uma barra para o lado de quem levou vantagem (golpes, knockdowns, quedas e
   controle, com os pesos de src/lib/fights.ts), e a linha mostra a vantagem acumulada até ali. Fonte: UFC Fight Tracker. */

const W = 560, H = 220, PAD = 28, MID = H / 2;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

function Detail({ r, a, b }: { r: RoundStat; a: string; b: string }) {
  const line = (n: string, s: RoundStat['red']) => `${n}: ${s.sig} golpes sig. · ${s.td} quedas · ${mmss(s.ctrl)} de controle${s.kd ? ` · ${s.kd} knockdown${s.kd > 1 ? 's' : ''}` : ''}`;
  return <>{line(a, r.red)}<br />{line(b, r.blue)}</>;
}

export function RoundFlow({ d }: { d: FightDetail }) {
  const rounds = d.rounds;
  if (!rounds?.length) return null;
  const a = lastName(d.red.name), b = lastName(d.blue.name);
  const edges = rounds.map(roundEdge);
  let acc = 0;
  const cum = edges.map(e => (acc += e));
  const max = Math.max(1, ...edges.map(Math.abs), ...cum.map(Math.abs));
  const slot = (W - PAD * 2) / rounds.length;
  const x = (i: number) => PAD + slot * i + slot / 2;
  const y = (v: number) => MID - (v / max) * (MID - 22);
  const barW = Math.min(64, slot * 0.5);
  const total = cum[cum.length - 1];
  const lead = Math.abs(total) < 0.5 ? null : total > 0 ? d.red : d.blue;
  const path = cum.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');

  return (
    <Panel title="Domínio por round" eyebrow="Golpes, quedas, knockdowns e controle · UFC Fight Tracker" bodyClass="px-6 pb-6">
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[13px] text-fg-2">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-md" style={{ background: CORNER.a }} />{a} (para cima)</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-md" style={{ background: CORNER.b }} />{b} (para baixo)</span>
        <span className="flex items-center gap-2"><span className="h-0.5 w-4 rounded bg-fg" />Vantagem acumulada</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img"
        aria-label={`Domínio por round: ${rounds.map((r, i) => `round ${r.n} ${edges[i] > 0 ? a : edges[i] < 0 ? b : 'equilibrado'}`).join(', ')}`}>
        <line x1={PAD} x2={W - PAD} y1={MID} y2={MID} stroke="var(--color-line-2)" strokeWidth="1.5" />
        {rounds.map((r, i) => {
          const e = edges[i], h = Math.abs(y(e) - MID), side = e >= 0 ? 'a' : 'b';
          return (
            <g key={r.n}>
              <Tip title={`Round ${r.n}`} content={<Detail r={r} a={a} b={b} />}>
                <motion.rect tabIndex={0} x={x(i) - barW / 2} width={barW} rx="4" fill={CORNER_FILL[side]} className="cursor-help outline-none"
                  initial={{ height: 0, y: MID }} animate={{ height: Math.max(h, 2), y: e >= 0 ? MID - Math.max(h, 2) : MID }}
                  transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }} />
              </Tip>
              <text x={x(i)} y={H - 4} textAnchor="middle" className="fill-fg-3 font-display text-[12px] font-bold">R{r.n}</text>
              {Math.round(e) !== 0 && (
                <text x={x(i) + barW / 2 + 6} y={e >= 0 ? MID - Math.max(h, 2) + 12 : MID + Math.max(h, 2) - 4} className="num fill-fg-2 text-[12px] font-semibold">
                  +{Math.round(Math.abs(e))} {e >= 0 ? a : b}
                </text>
              )}
            </g>
          );
        })}
        <motion.path d={path} fill="none" stroke="var(--color-fg)" strokeWidth="2.5" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: 0.3 }} />
        {cum.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="5" fill="var(--color-surface)" stroke="var(--color-fg)" strokeWidth="2.5" />)}
      </svg>
      <p className="mt-2 max-w-[60ch] text-[14px] text-fg-2">
        {lead ? <><b className="text-fg" style={{ color: lead === d.red ? CORNER_INK.a : CORNER_INK.b }}>{lastName(lead.name)}</b> dominou no acumulado</> : 'Luta equilibrada no acumulado'}
        {rounds.length > 1 && <>; venceu {edges.filter(e => (lead === d.blue ? e < 0 : e > 0)).length} de {rounds.length} rounds pela régua.</>}
      </p>
      <p className="mt-1 max-w-[60ch] text-[13px] text-fg-3">Régua do gráfico: golpe significativo vale 1, queda 4, knockdown 8, finalização tentada 2 e cada 15 s de controle 1. Não é o critério dos juízes. Passe o mouse nas barras para ver os números.</p>
    </Panel>
  );
}
