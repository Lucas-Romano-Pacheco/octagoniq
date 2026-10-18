import { useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowsLeftRight, Crown, Lightning, Trophy } from '@phosphor-icons/react';
import type { FightDetail, FightSideStats, FighterRef, MethodOdds } from '@shared/types';
import { fmtMoneyline, impliedProb } from '@shared/format';
import { fighterHref, useFight } from '@/lib/api';
import { fullDate, mmss, splitEventName } from '@/lib/format';
import { CORNER, DuelRow, OddsChip, oddsView } from '@/components/Duel';
import { Avatar, Empty, ErrorState, Flag, LiveTag, Panel, Reveal, Segmented, Skeleton, Tag, Tip, trackSpotlight } from '@/components/kit';
import silhueta from '@/assets/silhueta.png';

const pctOf = (l: number, a: number) => (a ? Math.round((l / a) * 100) : 0);

/* ---------- Topo: recortes, nomes e resultado ---------- */

function Corner({ f, side, won, odds }: { f: FighterRef; side: 'a' | 'b'; won: boolean; odds?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const right = side === 'b';
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { opacity: 0, x: right ? 24 : -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`flex min-w-0 flex-col ${right ? 'items-end text-right' : 'items-start'}`}>
      <Link to={fighterHref(f)} className="group min-w-0">
        <div className="h-1 w-10 rounded-full" style={{ background: CORNER[side], marginLeft: right ? 'auto' : 0 }} />
        <div className="display mt-3 text-[30px] text-fg group-hover:text-brand sm:text-[40px]">{f.name}</div>
      </Link>
      <div className={`mt-2 flex items-center gap-2 text-[14px] text-fg-2 ${right ? 'flex-row-reverse' : ''}`}>
        <Flag code={f.countryCode} src={f.flag} title={f.country} size={20} /><span>{f.country}</span><span className="text-fg-3">·</span><span className="num font-semibold">{f.record}</span>
      </div>
      {odds && <div className="mt-2.5">{odds}</div>}
      <div className="relative mt-4 h-[300px] w-full sm:h-[420px]">
        {won && <span className={`absolute top-2 z-10 ${right ? 'right-0' : 'left-0'}`}><Tag tone="dark" className="h-8 px-3.5 text-[14px]"><Trophy weight="fill" className="h-4 w-4 text-gold" /> Vitória</Tag></span>}
        {f.bodyImage && !failed ? (
          <img src={f.bodyImage} alt={f.name} onError={() => setFailed(true)}
            className={`absolute bottom-0 h-full w-auto object-contain drop-shadow-[0_30px_40px_var(--cutout-shadow)] [mask-image:linear-gradient(to_bottom,black_82%,transparent)] ${right ? 'right-0 -scale-x-100' : 'left-0'}`} />
        ) : (
          <div className={`absolute bottom-6 ${right ? 'right-4' : 'left-4'}`}><Avatar src={f.headshot} name={f.name} size={150} /></div>
        )}
      </div>
    </motion.div>
  );
}

function ResultBox({ d }: { d: FightDetail }) {
  const f = d.fight, r = f.result;
  const cells = r
    ? [{ k: 'Round', v: r.round ?? '—' }, { k: 'Tempo', v: r.clock ?? '—' }, { k: 'Método', v: r.method || '—' }]
    : [{ k: 'Categoria', v: f.weightClass }, { k: 'Rounds', v: f.rounds }, { k: 'Status', v: f.status === 'in' ? 'Ao vivo' : 'Agendada' }];
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {f.title && <Tag tone="gold"><Crown weight="fill" className="h-3.5 w-3.5" /> Disputa de cinturão</Tag>}
        <Tag>{f.weightClass}</Tag>
        {f.status === 'in' && <LiveTag />}
      </div>
      <div className="grid w-full max-w-[380px] grid-cols-[0.8fr_0.9fr_1.5fr] overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.05]">
        {cells.map((c, i) => (
          <div key={c.k} className={`px-3 py-4 ${i ? 'border-l border-line' : ''}`}>
            <div className="label">{c.k}</div>
            <div className={`num mt-1.5 font-display font-bold leading-tight text-fg ${String(c.v).length > 8 ? 'text-[16px] break-words' : 'text-[20px]'}`}>{c.v}</div>
          </div>
        ))}
      </div>
      {r?.detail && <div className="text-[14px] text-fg-2">{r.method} por <b className="text-fg">{r.detail.toLowerCase()}</b></div>}
      {d.seconds !== undefined && <div className="text-[14px] text-fg-3">Duração total: {mmss(d.seconds)}</div>}
    </div>
  );
}

/* ---------- Silhueta: golpes por região ----------
   Mesmo arranjo do Fight Tracker do UFC: rótulo | figura | conectados | %.
   Silhueta em PNG usada como máscara alfa; cada região ganha a cor do
   canto com intensidade proporcional aos golpes conectados nela. */

// regiões (viewBox 0 0 100 300, figura recortada na proporção 1:3): cabeça até o pescoço;
// pernas = faixa central abaixo da virilha (as mãos, nas laterais, ficam no corpo)
const ZONES = {
  head: 'M0 0H100V45H0Z',
  legs: 'M19 172H85V300H19Z',
  body: 'M0 45H100V300H0Z M19 172H85V300H19Z',
};
// centro vertical de cada região, em % da altura
const ROW_Y = { head: 8, body: 36, legs: 78 };

function Figure({ color, op }: { color: string; op: { head: number; body: number; legs: number } }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 100 300" className="absolute left-1/2 top-0 h-full -translate-x-1/2" role="img" aria-label="Golpes significativos conectados por região do corpo">
      <defs>
        <mask id={`fig-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="300" style={{ maskType: 'alpha' }}>
          <image href={silhueta} width="100" height="300" preserveAspectRatio="none" />
        </mask>
      </defs>
      <g mask={`url(#fig-${id})`} fill={color}>
        <path d={ZONES.head} fillOpacity={op.head} />
        <path d={ZONES.body} fillOpacity={op.body} fillRule="evenodd" />
        <path d={ZONES.legs} fillOpacity={op.legs} />
      </g>
    </svg>
  );
}

function Silhouette({ s, side }: { s: FightSideStats; side: 'a' | 'b' }) {
  const color = side === 'a' ? 'var(--color-red)' : 'var(--color-blue)';
  const total = s.head[0] + s.body[0] + s.leg[0];
  const op = (n: number) => 0.24 + 0.76 * (total ? n / total : 0);
  const rows = [
    { k: 'Cabeça', y: ROW_Y.head, v: s.head },
    { k: 'Corpo', y: ROW_Y.body, v: s.body },
    { k: 'Pernas', y: ROW_Y.legs, v: s.leg },
  ];
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[360px]">
      {/* linhas de referência atravessando cada região, como no UFC */}
      {rows.map(r => <div key={r.k} className="absolute inset-x-0 border-t border-line/80" style={{ top: `calc(${r.y}% + 16px)` }} />)}
      <Figure color={color} op={{ head: op(s.head[0]), body: op(s.body[0]), legs: op(s.leg[0]) }} />
      {rows.map(r => (
        <div key={r.k} className="absolute inset-x-0 flex items-center justify-between" style={{ top: `${r.y}%`, transform: 'translateY(-50%)' }}>
          <span className="w-[86px] text-[14px] font-bold text-fg">{r.k}</span>
          <span className="flex w-[100px] items-baseline justify-end gap-2.5">
            <Tip content={`${r.v[0]} conectados de ${r.v[1]} tentados`}><span tabIndex={0} className="num cursor-help text-[18px] font-bold text-fg">{r.v[0]}</span></Tip>
            <span className="num w-[42px] text-right text-[14px] font-bold" style={{ color }}>{pctOf(r.v[0], total || 1)}%</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Posição ---------- */

function PositionBars({ a, b }: { a: FightSideStats; b: FightSideStats }) {
  const rows: [string, keyof Pick<FightSideStats, 'distance' | 'clinch' | 'ground'>][] = [['Distância', 'distance'], ['Clinche', 'clinch'], ['Solo', 'ground']];
  return (
    <div className="divide-y divide-line/70">
      {rows.map(([label, k]) => (
        <DuelRow key={k} label={label} a={a[k][0]} b={b[k][0]} sub={[`/${a[k][1]}`, `/${b[k][1]}`]} />
      ))}
    </div>
  );
}

/* ---------- Odds ---------- */

function MethodTable({ red, blue, names }: { red?: MethodOdds; blue?: MethodOdds; names: [string, string] }) {
  if (!red && !blue) return null;
  const rows: [string, keyof MethodOdds][] = [['Por KO/TKO', 'ko'], ['Por finalização', 'sub'], ['Por decisão', 'dec']];
  const cell = (v?: number) => (
    <td className="text-center"><span className="num font-semibold text-fg">{fmtMoneyline(v)}</span>{v !== undefined && <span className="ml-1.5 text-[13px] text-fg-3">{Math.round((impliedProb(v) ?? 0) * 100)}%</span>}</td>
  );
  return (
    <table className="table mt-2">
      <thead><tr><th>Vitória</th><th className="text-center">{names[0]}</th><th className="text-center">{names[1]}</th></tr></thead>
      <tbody>{rows.map(([label, k]) => <tr key={k}><td className="text-fg-2">{label}</td>{cell(red?.[k])}{cell(blue?.[k])}</tr>)}</tbody>
    </table>
  );
}

function OddsPanel({ d }: { d: FightDetail }) {
  const o = d.fight.odds, v = oddsView(o);
  if (!o || !v) return <Panel title="Odds"><Empty>Sem odds publicadas para esta luta.</Empty></Panel>;
  const r = d.fight.result;
  const fav = v.red.p >= v.blue.p ? 'red' : 'blue';
  const winnerSide = r?.winnerId === d.red.espnId ? 'red' : r?.winnerId === d.blue.espnId ? 'blue' : null;
  const verdict = !winnerSide ? null : winnerSide === fav ? 'O favorito confirmou' : v[winnerSide].p < 0.35 ? 'Zebra! O azarão venceu' : 'O azarão venceu';
  const last = (n: string) => n.split(' ').slice(-1)[0];
  return (
    <Panel eyebrow={o.provider} title="Odds e probabilidades"
      action={verdict && <Tag tone={verdict.startsWith('Zebra') ? 'gold' : 'neutral'}>{verdict.startsWith('Zebra') && <Lightning weight="fill" className="h-3.5 w-3.5" />}{verdict}</Tag>}
      bodyClass="px-6 pb-6">
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
        <div>
          <div className="num font-display text-[34px] font-semibold text-fg">{Math.round(v.red.p * 100)}%</div>
          <OddsChip {...v.red} />
          {o.redOpen !== undefined && <div className="mt-1.5 text-[13px] text-fg-3">abriu em {fmtMoneyline(o.redOpen)}</div>}
        </div>
        <div className="pb-2 text-[13px] text-fg-3">chance implícita</div>
        <div className="text-right">
          <div className="num font-display text-[34px] font-semibold text-fg">{Math.round(v.blue.p * 100)}%</div>
          <OddsChip {...v.blue} />
          {o.blueOpen !== undefined && <div className="mt-1.5 text-[13px] text-fg-3">abriu em {fmtMoneyline(o.blueOpen)}</div>}
        </div>
      </div>
      <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full">
        <div className="rounded-l-full transition-[flex-grow] duration-700" style={{ flexGrow: v.red.p, background: CORNER.a }} />
        <div className="rounded-r-full transition-[flex-grow] duration-700" style={{ flexGrow: v.blue.p, background: CORNER.b }} />
      </div>
      <MethodTable red={o.methods?.red} blue={o.methods?.blue} names={[last(d.red.name), last(d.blue.name)]} />
      <p className="mt-4 text-[13px] leading-relaxed text-fg-3">
        Linhas de fechamento ({o.provider}, via ESPN). Probabilidades sem a margem da casa. Classificação: grande favorito ≥ 80%, favorito ≥ 65%, ligeiro favorito ≥ 53%; zebra ≤ 35%.
      </p>
    </Panel>
  );
}

/* ---------- Página ---------- */

export default function Fight() {
  const { id, fight } = useParams();
  const { data: d, isLoading, isError, error, refetch } = useFight(id, fight);
  const [tab, setTab] = useState<'geral' | 'alvo' | 'posicao'>('geral');

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-16 w-96" /><Skeleton className="h-[460px]" /></div>;
  if (isError || !d) return <Panel><ErrorState message={error?.message} onRetry={() => refetch()} /></Panel>;

  const f = d.fight, a = d.red.stats, b = d.blue.stats;
  const v = oddsView(f.odds);
  const { series } = splitEventName(d.eventName);
  const n2 = (x?: number) => (x === undefined ? '—' : String(x));

  return (
    <div className="space-y-8">
      <div>
        <Link to={`/eventos/${d.eventId}`} className="btn-ghost -ml-3.5"><ArrowLeft className="h-4 w-4" /> {d.eventName}</Link>
        <div className="eyebrow mt-4">{series} · {fullDate(f.date ?? '')}</div>
      </div>

      <section data-duel onPointerMove={trackSpotlight} className="spotlight relative grid grid-cols-[1fr_auto_1fr] items-start gap-4 rounded-[40px] sm:gap-8">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-[40px] bg-gradient-to-t from-cream/70 to-transparent" />
        <Corner f={d.red} side="a" won={f.result?.winnerId === d.red.espnId} odds={v && <OddsChip {...v.red} />} />
        <div className="relative w-[220px] pt-24 sm:w-[380px]"><ResultBox d={d} /></div>
        <Corner f={d.blue} side="b" won={f.result?.winnerId === d.blue.espnId} odds={v && <OddsChip {...v.blue} />} />
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Reveal>
          {a && b ? (
            <Panel title="Estatísticas da luta" action={
              <Segmented value={tab} onChange={setTab} options={[{ value: 'geral', label: 'Visão geral' }, { value: 'alvo', label: 'Por alvo' }, { value: 'posicao', label: 'Por posição' }]} />}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                {tab === 'geral' && (
                  <div className="divide-y divide-line/70 pb-2">
                    <DuelRow label="Golpes significativos" a={a.sigLanded} b={b.sigLanded} sub={[`/${a.sigAttempted}`, `/${b.sigAttempted}`]} />
                    <DuelRow label="Precisão" a={pctOf(a.sigLanded, a.sigAttempted)} b={pctOf(b.sigLanded, b.sigAttempted)} fmt={x => `${x}%`} />
                    <DuelRow label="Golpes totais" a={a.totalLanded} b={b.totalLanded} sub={[`/${a.totalAttempted}`, `/${b.totalAttempted}`]} />
                    <DuelRow label="Knockdowns" a={a.kd} b={b.kd} fmt={n2} />
                    <DuelRow label="Quedas" a={a.tdLanded} b={b.tdLanded} sub={[`/${a.tdAttempted}`, `/${b.tdAttempted}`]} />
                    <DuelRow label="Finalizações tentadas" a={a.subAttempts} b={b.subAttempts} fmt={n2} />
                    <DuelRow label="Avanços de posição" a={a.advances} b={b.advances} fmt={n2} />
                    <DuelRow label="Reversões" a={a.reversals} b={b.reversals} fmt={n2} />
                  </div>
                )}
                {tab === 'alvo' && (
                  <div className="grid gap-10 px-6 pb-6 pt-4 sm:grid-cols-2">
                    <Silhouette s={a} side="a" />
                    <Silhouette s={b} side="b" />
                  </div>
                )}
                {tab === 'posicao' && <PositionBars a={a} b={b} />}
                </motion.div>
              </AnimatePresence>
            </Panel>
          ) : (
            <Panel title="Estatísticas da luta"><Empty>{f.status === 'pre' ? 'A luta ainda não aconteceu. As estatísticas aparecem aqui ao vivo, assim que ela começar.' : 'Sem estatísticas registradas para esta luta.'}</Empty></Panel>
          )}
        </Reveal>
        <Reveal delay={0.08} className="space-y-6">
          <OddsPanel d={d} />
          <Link to={`/comparar?a=${d.red.slug}&ae=${d.red.espnId}&b=${d.blue.slug}&be=${d.blue.espnId}`} className="btn w-full justify-center"><ArrowsLeftRight className="h-4 w-4" /> Comparar a carreira dos dois</Link>
        </Reveal>
      </div>
    </div>
  );
}
