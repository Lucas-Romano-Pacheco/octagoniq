import { useId, useState } from 'react';
import { StrikeMap } from '@/components/StrikeMap';
import { FlagOctagon } from '@/components/FaceOff';
import { MirrorStats, NickBackdrop, RecordMark, SlantResult, WinVs } from '@/components/FightExtras';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowsLeftRight, Lightning } from '@/components/icons';
import type { FightDetail, FightSideStats, FighterRef, MethodOdds } from '@shared/types';
import { fmtMoneyline, impliedProb } from '@shared/format';
import { fighterHref, useFight } from '@/lib/api';
import { fullDate, lastName, mmss, splitEventName } from '@/lib/format';
import { CORNER, CORNER_FILL, DuelHead, DuelRow, OddsChip, oddsView } from '@/components/Duel';
import { RoundFlow } from '@/components/RoundFlow';
import { ProbCompare } from '@/components/ProbCompare';
import { FanJudge } from '@/components/FanJudge';
import { Avatar, BeltIcon, Empty, ErrorState, Flag, LiveTag, MethodTag, Panel, Reveal, Segmented, Tag, Term, Tip, trackSpotlight, usePageTitle } from '@/components/kit';
import silhueta from '@/assets/silhueta.png';
import { FightPreview } from '@/components/FightPreview';
import { FightSkeleton } from '@/components/Skeletons';
import { proxy } from '@/lib/img';

const pctOf = (l: number, a: number) => (a ? Math.round((l / a) * 100) : 0);
/** "de 44 · 50%" (complemento de um número conectado); sem tentativas, só "de 0". */
const of = (landed: number, attempted: number) => (attempted ? `de ${attempted} · ${pctOf(landed, attempted)}%` : 'de 0');

/* ---------- Topo: recortes, nomes e resultado ---------- */

function Corner({ f, side, won, lost, odds }: { f: FighterRef; side: 'a' | 'b'; won: boolean; lost: boolean; odds?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const right = side === 'b';
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { opacity: 0, x: right ? 24 : -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`flex min-w-0 flex-col ${right ? 'items-end text-right' : 'items-start'}`}>
      <Link to={fighterHref(f)} className="group min-w-0">
        <div className="h-1 w-10 rounded-full" style={{ background: CORNER[side], marginLeft: right ? 'auto' : 0 }} />
        {/* nome numa cápsula; a do vencedor tem borda dourada */}
        <div className={`display mt-3 break-words text-[24px] text-fg group-hover:text-brand sm:text-[44px] ${won ? `w-fit rounded-[24px] px-3 py-1 ring-2 ring-gold/70 sm:px-4 ${right ? '-mr-3 ml-auto sm:-mr-4' : '-ml-3 sm:-ml-4'}` : ''}`}>{f.name}</div>
      </Link>
      {/* no celular o nome do país sai: bandeira + cartel cabem em meia tela */}
      <div className={`mt-2 flex items-center gap-2 text-[14px] text-fg-2 ${right ? 'flex-row-reverse' : ''}`}>
        <Flag code={f.countryCode} src={f.flag} title={f.country} size={20} /><span className="hidden sm:inline">{f.country}</span><span className="hidden text-fg-3 sm:inline">·</span><RecordMark record={f.record} won={won} lost={lost} />
      </div>
      {odds && <div className="mt-3">{odds}</div>}
      <div className="relative mt-4 h-[230px] w-full sm:h-[420px]" style={{ viewTransitionName: `fight-${side}` }}>
        <NickBackdrop f={f} right={right} won={won} />
        {f.bodyImage && !failed && <FlagOctagon code={f.countryCode} className={`top-[4%] w-[110%] max-w-[420px] ${right ? 'right-[-6%]' : 'left-[-6%]'}`} />}
        {f.bodyImage && !failed ? (
          <img src={proxy(f.bodyImage, 640)} alt={f.name} fetchPriority="high" decoding="async" onError={() => setFailed(true)}
            className={`absolute bottom-0 h-full w-auto object-contain drop-shadow-[0_30px_40px_var(--cutout-shadow)] [mask-image:linear-gradient(to_bottom,black_82%,transparent)] ${right ? 'right-0 -scale-x-100' : 'left-0'}`} />
        ) : (
          <div className={`absolute bottom-6 ${right ? 'right-0 sm:right-4' : 'left-0 sm:left-4'}`}><Avatar src={f.headshot} name={f.name} size={120} /></div>
        )}
        {(won || lost) && <SlantResult won={won} right={right} />}
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
        {f.title && <Tag tone="gold"><BeltIcon className="h-3.5 w-6" /> Disputa de cinturão</Tag>}
        <Tag>{f.weightClass}</Tag>
        {f.status === 'in' && <LiveTag />}
      </div>
      <div className="grid w-full max-w-[380px] grid-cols-[0.8fr_0.9fr_1.5fr] cut overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.05]">
        {cells.map((c, i) => (
          <div key={c.k} className={`px-3 py-4 ${i ? 'border-l border-line' : ''}`}>
            <div className="label">{c.k}</div>
            {r && c.k === 'Método'
              ? <div className="mt-2 flex justify-center"><MethodTag method={r.method} size="md" className="max-w-full" /></div>
              : <div className={`num mt-2 font-display font-bold leading-tight text-fg ${String(c.v).length > 8 ? 'text-[16px] break-words' : 'text-[20px]'}`}>{c.v}</div>}
          </div>
        ))}
      </div>
      {r?.detail && <div className="text-[14px] text-fg-2">{r.method} por <b className="text-fg">{r.detail.toLowerCase()}</b></div>}
      {d.seconds !== undefined && <div className="text-[14px] text-fg-3">Duração total: {mmss(d.seconds)}</div>}
    </div>
  );
}

/** Os números que decidem a luta, no centro do topo (como a arte de TV): vermelho | rótulo | azul, com barras. */
function KeyNumbers({ a, b }: { a: FightSideStats; b: FightSideStats }) {
  const rows: [string, number, number][] = [
    ['Golpes sig.', a.sigLanded, b.sigLanded],
    ['Golpes totais', a.totalLanded, b.totalLanded],
    ['Quedas', a.tdLanded, b.tdLanded],
    ['Knockdowns', a.kd, b.kd],
  ];
  return (
    <div className="mx-auto mt-6 w-full max-w-[380px] space-y-3">
      {rows.map(([label, x, y]) => {
        const max = Math.max(x, y) || 1;
        return (
          <div key={label}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
              <span className={`display text-right text-[32px] leading-none ${x > y ? 'text-fg' : 'text-fg-3'}`}>{x}</span>
              <span className="label text-center">{label}</span>
              <span className={`display text-[32px] leading-none ${y > x ? 'text-fg' : 'text-fg-3'}`}>{y}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-[2px]">
              <div className="flex h-1.5 justify-end rounded-l-full bg-surface-2"><div className="h-full rounded-l-full" style={{ width: `${(x / max) * 100}%`, background: CORNER.a }} /></div>
              <div className="flex h-1.5 rounded-r-full bg-surface-2"><div className="h-full rounded-r-full" style={{ width: `${(y / max) * 100}%`, background: CORNER.b }} /></div>
            </div>
          </div>
        );
      })}
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
// centro vertical de cada região, em % da altura (silhueta 2D e boneco 3D, que tem outro enquadramento)
const ROW_Y = { head: 8, body: 36, legs: 78 };

// boneco 3D: three.js só é baixado quando a aba "Por alvo" abre; sem WebGL, fica a silhueta 2D

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
  const flat = { head: op(s.head[0]), body: op(s.body[0]), legs: op(s.leg[0]) };
  const Y = ROW_Y;
  const figure2d = <Figure color={color} op={flat} />;
  const rows = [
    { k: 'Cabeça', y: Y.head, v: s.head },
    { k: 'Corpo', y: Y.body, v: s.body },
    { k: 'Pernas', y: Y.legs, v: s.leg },
  ];
  return (
    <div>
      <div className="relative mx-auto h-[320px] w-full max-w-[360px]">
        {/* linhas de referência atravessando cada região, como no UFC */}
        {rows.map(r => <div key={r.k} className="pointer-events-none absolute inset-x-0 border-t border-line/80" style={{ top: `calc(${r.y}% + 16px)` }} />)}
        {figure2d}
        {rows.map(r => (
          <div key={r.k} className="pointer-events-none absolute inset-x-0 flex items-center justify-between" style={{ top: `${r.y}%`, transform: 'translateY(-50%)' }}>
            <span className="w-[86px] font-display text-[13px] font-bold text-fg">{r.k}</span>
            <span className="pointer-events-auto flex w-[100px] items-baseline justify-end gap-3">
              <Tip content={`${r.v[0]} conectados de ${r.v[1]} tentados`}><span tabIndex={0} className="num cursor-help text-[18px] font-bold text-fg">{r.v[0]}</span></Tip>
              <span className="num w-[42px] text-right text-[14px] font-bold" style={{ color }}>{pctOf(r.v[0], total || 1)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Posição ---------- */

function PositionBars({ a, b, names }: { a: FightSideStats; b: FightSideStats; names: [string, string] }) {
  const rows: [string, keyof Pick<FightSideStats, 'distance' | 'clinch' | 'ground'>][] = [['Distância', 'distance'], ['Clinche', 'clinch'], ['Solo', 'ground']];
  return (
    <div className="divide-y divide-line/70">
      <DuelHead a={names[0]} b={names[1]} />
      {rows.map(([label, k]) => (
        <DuelRow key={k} label={label} a={a[k][0]} b={b[k][0]} sub={[of(a[k][0], a[k][1]), of(b[k][0], b[k][1])]} />
      ))}
    </div>
  );
}

/* ---------- Odds ---------- */

function MethodTable({ red, blue, names }: { red?: MethodOdds; blue?: MethodOdds; names: [string, string] }) {
  if (!red && !blue) return null;
  const rows: [string, keyof MethodOdds][] = [['Por KO/TKO', 'ko'], ['Por finalização', 'sub'], ['Por decisão', 'dec']];
  const cell = (v?: number) => (
    <td className="text-center"><span className="num odds font-semibold text-fg">{fmtMoneyline(v)}</span>{v !== undefined && <span className="block text-[13px] text-fg-3 sm:ml-2 sm:inline">{Math.round((impliedProb(v) ?? 0) * 100)}%</span>}</td>
  );
  return (
    <table className="table mt-2 w-full table-fixed sm:table-auto">
      <thead><tr><th className="w-[38%] sm:w-auto">Vitória</th><th className="break-words text-center">{names[0]}</th><th className="break-words text-center">{names[1]}</th></tr></thead>
      <tbody>{rows.map(([label, k]) => <tr key={k}><td className="text-fg-2">{label}</td>{cell(red?.[k])}{cell(blue?.[k])}</tr>)}</tbody>
    </table>
  );
}

/** Movimento da linha entre a abertura e o fechamento: "−400 → −344", com seta pela variação da chance implícita. */
function LineMove({ open, close, right }: { open?: number; close?: number; right?: boolean }) {
  if (open === undefined || close === undefined) return null;
  const p0 = impliedProb(open) ?? 0, p1 = impliedProb(close) ?? 0;
  const delta = Math.round((p1 - p0) * 100);
  const Icon = delta > 0 ? ArrowUp : ArrowDown;
  return (
    <div className={`mt-2 text-[13px] ${right ? 'text-right' : ''}`}>
      <div className="text-[12px] text-fg-3">Abertura → fechamento</div>
      <div className="num odds whitespace-nowrap font-semibold text-fg-2">{fmtMoneyline(open)} → {fmtMoneyline(close)}</div>
      {delta !== 0 && (
        <Tip content={`Chance implícita foi de ${Math.round(p0 * 100)}% para ${Math.round(p1 * 100)}% entre a abertura e o fechamento (com a margem da casa).`}>
          <span tabIndex={0} className={`inline-flex cursor-help items-center gap-1 font-semibold ${delta > 0 ? 'text-win' : 'text-loss'}`}>
            <Icon weight="bold" className="h-3 w-3" />{delta > 0 ? 'ganhou' : 'perdeu'} força ({delta > 0 ? '+' : ''}{delta} pts)
          </span>
        </Tip>
      )}
    </div>
  );
}

/** Cartões dos juízes: uma linha por juiz, um quadrinho por round (cor de quem venceu o round) e o total. */
function ScorecardsPanel({ d }: { d: FightDetail }) {
  const sc = d.scorecards, r = d.fight.result;
  const last = (x: string) => x.split(' ').slice(-1)[0];
  const decision = /decis/i.test(r?.method ?? '');
  if (!sc?.judges.length) {
    // luta encerrada sem cartões: explica em vez de sumir com o quadro
    if (d.fight.status !== 'post' || !r) return null;
    return (
      <Panel title="Cartões dos juízes" bodyClass="px-6 pb-6">
        <p className="text-[14px] leading-relaxed text-fg-2">
          {!decision && (r.round ?? 1) <= 1
            ? <>Sem cartões: a luta acabou por <b className="text-fg">{r.method}</b> no 1º round, antes de os juízes pontuarem um round completo.</>
            : 'Os cartões desta luta não foram divulgados pelo UFC.'}
        </p>
      </Panel>
    );
  }
  const n = Math.max(...sc.judges.map(j => j.rounds.length));
  const winRed = r?.winnerId === d.red.espnId;
  const ahead = (side: 'red' | 'blue') => sc.judges.filter(j => (side === 'red' ? j.red > j.blue : j.blue > j.red)).length;
  return (
    <Panel eyebrow={decision ? sc.source : `Até a interrupção no ${r?.round}º round · ${sc.source}`} title="Cartões dos juízes" bodyClass="px-6 pb-6">
      <div className="mt-2 flex items-center gap-4 text-[13px] text-fg-2">
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-md" style={{ background: CORNER.a }} />{last(d.red.name)}</span>
        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-md" style={{ background: CORNER.b }} />{last(d.blue.name)}</span>
      </div>
      <div className="mt-4 space-y-4">
        {sc.judges.map(j => (
          <div key={j.name}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] font-semibold text-fg">{j.name}</span>
              <span className="display text-[24px] leading-none text-fg">
                <span style={{ color: j.red > j.blue ? CORNER.a : undefined }}>{j.red}</span>
                <span className="mx-1 text-fg-3">–</span>
                <span style={{ color: j.blue > j.red ? CORNER.b : undefined }}>{j.blue}</span>
              </span>
            </div>
            <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
              {j.rounds.map(r => {
                const w = r.red > r.blue ? 'a' : r.blue > r.red ? 'b' : null;
                return (
                  <Tip key={r.n} content={`Round ${r.n}: ${last(d.red.name)} ${r.red} × ${r.blue} ${last(d.blue.name)}`}>
                    <div tabIndex={0} className={`rounded-md px-1 py-2 text-center ${w ? 'text-white' : 'text-fg'}`} style={{ background: w ? CORNER_FILL[w] : 'var(--color-surface-3)' }}>
                      <div className="text-[12px] font-semibold">R{r.n}</div>
                      <div className="num text-[13px] font-bold">{r.red}-{r.blue}</div>
                    </div>
                  </Tip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-fg-3">
        {decision
          ? (sc.judges.every(j => (j.red > j.blue) === winRed) ? 'Os três juízes deram a vitória ao mesmo lutador.' : 'Os juízes divergiram nesta luta.')
          : (() => {
              // na interrupção os cartões não decidem nada: mostram quem estava na frente
              const a = ahead('red'), b = ahead('blue');
              const lead = a > b ? d.red : b > a ? d.blue : null;
              return <>A luta acabou por {r?.method} antes da decisão. {lead ? <>Até ali, <b className="text-fg-2">{last(lead.name)}</b> vencia em {Math.max(a, b)} de {sc.judges.length} cartões{(lead === d.red) === winRed ? ' e confirmou com a vitória' : ', mas sofreu a virada'}.</> : 'Até ali, os cartões estavam empatados.'}</>;
            })()}
      </p>
    </Panel>
  );
}

function OddsPanel({ d }: { d: FightDetail }) {
  const o = d.fight.odds, v = oddsView(o);
  if (!o || !v) return <Panel title="Odds"><Empty>As casas ainda não abriram linha para esta luta.</Empty></Panel>;
  const r = d.fight.result;
  const fav = v.red.p >= v.blue.p ? 'red' : 'blue';
  const winnerSide = r?.winnerId === d.red.espnId ? 'red' : r?.winnerId === d.blue.espnId ? 'blue' : null;
  const verdict = !winnerSide ? null : winnerSide === fav ? 'O favorito confirmou' : v[winnerSide].p < 0.35 ? 'Zebra! O azarão venceu' : 'O azarão venceu';
  const last = (n: string) => n.split(' ').slice(-1)[0];
  return (
    <Panel eyebrow={o.provider} title="Odds e probabilidades"
      action={verdict && <Tag tone={verdict.startsWith('Zebra') ? 'orange' : 'neutral'}>{verdict.startsWith('Zebra') && <Lightning weight="fill" className="h-3.5 w-3.5" />}{verdict}</Tag>}
      bodyClass="px-6 pb-6">
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3 sm:gap-4">
        <div>
          <div className="num font-display text-[32px] font-semibold text-fg">{Math.round(v.red.p * 100)}%</div>
          <OddsChip {...v.red} />
          <LineMove open={o.redOpen} close={o.red} />
        </div>
        <div className="hidden pb-2 text-[13px] text-fg-3 sm:block"><Term label="chance implícita" /></div>
        <div className="text-right">
          <div className="num font-display text-[32px] font-semibold text-fg">{Math.round(v.blue.p * 100)}%</div>
          <OddsChip {...v.blue} />
          <LineMove open={o.blueOpen} close={o.blue} right />
        </div>
      </div>
      <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full">
        <div className="rounded-l-full transition-[flex-grow] duration-700" style={{ flexGrow: v.red.p, background: CORNER.a }} />
        <div className="rounded-r-full transition-[flex-grow] duration-700" style={{ flexGrow: v.blue.p, background: CORNER.b }} />
      </div>
      <MethodTable red={o.methods?.red} blue={o.methods?.blue} names={[last(d.red.name), last(d.blue.name)]} />
      <p className="mt-4 text-[13px] leading-relaxed text-fg-3">
        Linhas de fechamento ({o.provider === 'BestFightOdds' ? 'BestFightOdds, média das casas' : `${o.provider}, via ESPN`}). Probabilidades sem a margem da casa. Classificação: grande favorito ≥ 80%, favorito ≥ 65%, ligeiro favorito ≥ 53%; zebra ≤ 35%.
      </p>
    </Panel>
  );
}

/* ---------- Página ---------- */

export default function Fight() {
  const { id, fight } = useParams();
  const { data: d, isPending: isLoading, isError, error, refetch } = useFight(id, fight);
  const [tab, setTab] = useState<'geral' | 'barras' | 'alvo' | 'posicao'>('geral');
  usePageTitle(d && `${d.red.name} × ${d.blue.name}`);

  if (isLoading) return <FightSkeleton />;
  if (isError || !d) return <Panel><ErrorState message={error?.message} onRetry={() => refetch()} /></Panel>;

  const f = d.fight, a = d.red.stats, b = d.blue.stats;
  const v = oddsView(f.odds);
  const { series } = splitEventName(d.eventName);
  const n2 = (x?: number) => (x === undefined ? '—' : String(x));

  return (
    <div className="space-y-8">
      <div>
        <Link to={`/eventos/${d.eventId}`} className="btn-ghost -ml-4"><ArrowLeft className="h-4 w-4" /> {d.eventName}</Link>
        <div className="mt-3 text-[14px] text-fg-3">{series} · {fullDate(f.date ?? '')}</div>
      </div>

      {/* a caixa (degradê + brilho) cresce para fora com margem interna: o conteúdo fica alinhado à página
          e a borda não encosta mais nos nomes */}
      <section data-duel onPointerMove={trackSpotlight}
        className="spotlight relative -mx-3 grid grid-cols-2 items-start overflow-x-clip gap-x-3 gap-y-6 rounded-xl px-3 pt-6 sm:-mx-8 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-8 sm:px-8 sm:pt-8">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-xl bg-gradient-to-t from-cream/70 to-transparent" />
        {/* assinatura: a grade do octógono, em linhas finas, atrás do placar */}
        <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[118%] -translate-x-1/2 -translate-y-1/2 text-fg/[0.07] sm:block" preserveAspectRatio="xMidYMid meet">
          {[46, 36, 26].map(r => {
            const k = r * 0.4142; // meio lado do octógono regular
            const pts = [[-k, -r], [k, -r], [r, -k], [r, k], [k, r], [-k, r], [-r, k], [-r, -k]].map(([x, y]) => `${50 + x},${50 + y}`).join(' ');
            return <polygon key={r} points={pts} fill="none" stroke="currentColor" strokeWidth={r === 46 ? 0.5 : 0.3} strokeDasharray={r === 26 ? '1 1.4' : undefined} vectorEffect="non-scaling-stroke" />;
          })}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(n => {
            const a = (n * Math.PI) / 4 + Math.PI / 8, r = 46 / Math.cos(Math.PI / 8);
            return <line key={n} x1="50" y1="50" x2={50 + Math.cos(a) * r} y2={50 + Math.sin(a) * r} stroke="currentColor" strokeWidth="0.25" vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        <Corner f={d.red} side="a" won={f.result?.winnerId === d.red.espnId} lost={!!f.result?.winnerId && f.result.winnerId !== d.red.espnId} odds={v && <OddsChip {...v.red} />} />
        {/* centro: no celular vai para baixo das fotos, em largura total */}
        <div className="relative order-last col-span-2 sm:order-none sm:col-span-1 sm:w-[380px] sm:pt-24">
          <WinVs d={d} />
          <ResultBox d={d} />
          {d.red.stats && d.blue.stats && <KeyNumbers a={d.red.stats} b={d.blue.stats} />}
        </div>
        <Corner f={d.blue} side="b" won={f.result?.winnerId === d.blue.espnId} lost={!!f.result?.winnerId && f.result.winnerId !== d.blue.espnId} odds={v && <OddsChip {...v.blue} />} />
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Reveal>
          {a && b ? (
            <Panel title="Estatísticas da luta" action={
              <Segmented value={tab} onChange={setTab} className="no-scrollbar max-w-full overflow-x-auto" options={[{ value: 'geral', label: 'Visão geral' }, { value: 'barras', label: 'Em barras' }, { value: 'alvo', label: 'Por alvo' }, { value: 'posicao', label: 'Por posição' }]} />}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
                {tab === 'geral' && (
                  <div className="divide-y divide-line/70 pb-2">
                    <DuelHead a={lastName(d.red.name)} b={lastName(d.blue.name)} />
                    <DuelRow label="Golpes significativos" a={a.sigLanded} b={b.sigLanded} sub={[of(a.sigLanded, a.sigAttempted), of(b.sigLanded, b.sigAttempted)]} />
                    <DuelRow label="Precisão" a={pctOf(a.sigLanded, a.sigAttempted)} b={pctOf(b.sigLanded, b.sigAttempted)} fmt={x => `${x}%`} />
                    <DuelRow label="Golpes totais" a={a.totalLanded} b={b.totalLanded} sub={[of(a.totalLanded, a.totalAttempted), of(b.totalLanded, b.totalAttempted)]} />
                    <DuelRow label="Knockdowns" a={a.kd} b={b.kd} fmt={n2} />
                    <DuelRow label="Quedas" a={a.tdLanded} b={b.tdLanded} sub={[of(a.tdLanded, a.tdAttempted), of(b.tdLanded, b.tdAttempted)]} />
                    <DuelRow label="Finalizações tentadas" a={a.subAttempts} b={b.subAttempts} fmt={n2} />
                    <DuelRow label="Avanços de posição" a={a.advances} b={b.advances} fmt={n2} />
                    <DuelRow label="Reversões" a={a.reversals} b={b.reversals} fmt={n2} />
                  </div>
                )}
                {tab === 'alvo' && (
                  d.red.bodyImage && d.blue.bodyImage ? (
                    // estilo ESPN: cada um na própria foto, pintado onde foi atingido (na cor de quem bateu)
                    <div className="px-6 pb-6 pt-4">
                      <p className="mb-4 text-[14px] text-fg-2">Onde cada um foi atingido: quanto mais forte a cor, mais golpes naquela região.</p>
                      <div className="grid gap-10 sm:grid-cols-2">
                        <StrikeMap f={d.red} hits={b} by={d.blue} color="var(--color-blue)" />
                        <StrikeMap f={d.blue} hits={a} by={d.red} color="var(--color-red)" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-10 px-6 pb-6 pt-4 sm:grid-cols-2">
                      <Silhouette s={a} side="a" />
                      <Silhouette s={b} side="b" />
                    </div>
                  )
                )}
                {tab === 'barras' && <MirrorStats a={a} b={b} />}
                {tab === 'posicao' && <PositionBars a={a} b={b} names={[lastName(d.red.name), lastName(d.blue.name)]} />}
                </motion.div>
              </AnimatePresence>
            </Panel>
          ) : (
            f.status === 'pre'
              ? <FightPreview red={d.red} blue={d.blue} />
              : <Panel title="Estatísticas da luta"><Empty>Sem estatísticas registradas para esta luta.</Empty></Panel>
          )}
          {d.rounds && <div className="mt-6"><RoundFlow d={d} /></div>}
        </Reveal>
        <Reveal delay={0.08} className="space-y-6">
          <OddsPanel d={d} />
          <ProbCompare f={d.fight} eventId={d.eventId} provider={d.fight.odds?.provider} />
          <ScorecardsPanel d={d} />
          <FanJudge d={d} />
          <Link to={`/comparar?a=${d.red.slug}&ae=${d.red.espnId}&b=${d.blue.slug}&be=${d.blue.espnId}`} className="btn w-full justify-center"><ArrowsLeftRight className="h-4 w-4" /> Comparar a carreira de {d.red.name.split(' ').slice(-1)[0]} e {d.blue.name.split(' ').slice(-1)[0]}</Link>
        </Reveal>
      </div>
    </div>
  );
}
