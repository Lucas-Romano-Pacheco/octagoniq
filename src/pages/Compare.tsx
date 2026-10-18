import { useMemo, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { Crown } from '@phosphor-icons/react';
import type { FighterProfile, HistoryFight } from '@shared/types';
import { fighterHref, useFighter } from '@/lib/api';
import { fullDate, nf, recordStr } from '@/lib/format';
import { FighterPicker } from '@/components/FighterPicker';
import { CORNER as COLOR, DuelRow, better as cmp, type Side } from '@/components/Duel';
import { Avatar, CountUp, Empty, ErrorState, Flag, HistoryBadge, PageHeader, Panel, Skeleton, Spotlight, Tag, Tip } from '@/components/kit';
import { AttrRadar, hasRadar, RADAR_NOTE } from '@/components/Radar';


function Card({ p, side }: { p: FighterProfile; side: Side }) {
  const b = p.bio;
  const right = side === 'b';
  return (
    <Link to={fighterHref({ slug: b.slug, espnId: b.espnId })} className={clsx('group flex min-w-0 flex-1 items-center gap-4', right && 'flex-row-reverse text-right')}>
      <Avatar src={b.headshot} name={b.name} size={72} flag={b.countryCode} ring={COLOR[side]} className="hidden sm:block" />
      <div className="min-w-0">
        <div className={clsx('mb-1.5 h-0.5 w-6 rounded-full', right && 'ml-auto')} style={{ background: COLOR[side] }} />
        <div className="display text-2xl text-fg group-hover:text-brand sm:truncate sm:text-3xl">{b.name}</div>
        <div className={clsx('mt-1 flex flex-wrap items-center gap-2 text-[13.5px] text-fg-3', right && 'justify-end')}>
          {b.rankLabel === 'Campeão' && <Tag tone="gold"><Crown className="h-3 w-3" /> Campeão</Tag>}
          {b.rankLabel && b.rankLabel !== 'Campeão' && <Tag tone="blue">{b.rankLabel}</Tag>}
          <Flag code={b.countryCode} src={b.flag} title={b.country} size={18} /><span>{b.country}</span>
          <span className="num font-mono">{recordStr(b.record)}</span>
        </div>
      </div>
    </Link>
  );
}

/** Linha da ficha: valor A | rótulo | valor B. `better` destaca o lado vantajoso. */
function TapeRow({ label, a, b, better }: { label: string; a?: ReactNode; b?: ReactNode; better?: Side | null }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-2.5">
      <span className={clsx('num text-right text-[14px]', better === 'a' ? 'font-semibold text-fg' : 'text-fg-2')}>{a ?? '—'}</span>
      <span className="label w-36 text-center">{label}</span>
      <span className={clsx('num text-[14px]', better === 'b' ? 'font-semibold text-fg' : 'text-fg-2')}>{b ?? '—'}</span>
    </div>
  );
}



/* ---------- Placar de vantagens (comparação lado a lado) ---------- */

const EDGES: { label: string; get: (p: FighterProfile) => number | undefined; lower?: boolean }[] = [
  { label: 'Envergadura', get: p => p.bio.reachCm },
  { label: 'Altura', get: p => p.bio.heightCm },
  { label: 'Idade', get: p => p.bio.age, lower: true },
  { label: 'Vitórias', get: p => p.bio.record?.w },
  { label: 'Golpes sig. / min', get: p => p.stats.slpm },
  { label: 'Absorvidos / min', get: p => p.stats.sapm, lower: true },
  { label: 'Precisão de golpes', get: p => p.stats.strAcc },
  { label: 'Defesa de golpes', get: p => p.stats.strDef },
  { label: 'Quedas / 15 min', get: p => p.stats.tdAvg },
  { label: 'Defesa de quedas', get: p => p.stats.tdDef },
  { label: 'Finalizações / 15 min', get: p => p.stats.subAvg },
  { label: 'Knockdowns / 15 min', get: p => p.stats.kdAvg },
];

function EdgeBoard({ a, b }: { a: FighterProfile; b: FighterProfile }) {
  const res = EDGES.map(e => ({ label: e.label, win: cmp(e.get(a), e.get(b), e.lower) }));
  const A = res.filter(r => r.win === 'a'), B = res.filter(r => r.win === 'b');
  const total = A.length + B.length || 1;
  const side = (p: FighterProfile, list: typeof A, s: Side) => (
    <div className={clsx('min-w-0', s === 'b' && 'text-right')}>
      <div className={clsx('flex items-baseline gap-2', s === 'b' && 'justify-end')}>
        <span className="display text-[88px] leading-[0.85]" style={{ color: COLOR[s] }}><CountUp value={list.length} /></span>
        <span className="text-[14px] font-semibold text-fg-2">vantagens</span>
      </div>
      <div className="mt-1 truncate text-[14px] text-fg-3">{p.bio.name}</div>
      <div className={clsx('mt-3 flex flex-wrap gap-1.5', s === 'b' && 'justify-end')}>
        {list.map(r => <span key={r.label} className="rounded-full px-2.5 py-1 text-[12.5px] font-semibold" style={{ background: `color-mix(in oklab, ${COLOR[s]} 12%, transparent)`, color: COLOR[s] }}>{r.label}</span>)}
      </div>
    </div>
  );
  return (
    <Panel title="Placar de vantagens" action={
      <Tip content={`Conta em quantos dos ${EDGES.length} números da ficha e das estatísticas oficiais cada um leva vantagem. Empates e dados ausentes não contam. Não é uma previsão.`}>
        <span tabIndex={0} className="cursor-help text-[13px] text-fg-3 underline decoration-dotted underline-offset-4">Como é calculado</span>
      </Tip>} bodyClass="px-6 pb-6 pt-2">
      <div className="grid grid-cols-2 gap-6">{side(a, A, 'a')}{side(b, B, 'b')}</div>
      <div className="mt-5 flex h-3 gap-[2px] overflow-hidden rounded-full">
        <div className="rounded-l-full transition-[flex-grow] duration-700" style={{ flexGrow: A.length / total, background: COLOR.a }} />
        <div className="rounded-r-full transition-[flex-grow] duration-700" style={{ flexGrow: B.length / total, background: COLOR.b }} />
      </div>
    </Panel>
  );
}

function CommonOpponents({ a, b }: { a: FighterProfile; b: FighterProfile }) {
  const rows = useMemo(() => {
    const byOpp = (h: HistoryFight[]) => {
      const m = new Map<string, HistoryFight[]>();
      for (const f of h) m.set(f.opponent.espnId, [...(m.get(f.opponent.espnId) ?? []), f]);
      return m;
    };
    const A = byOpp(a.history), B = byOpp(b.history);
    return [...A.keys()].filter(k => B.has(k) && k !== a.bio.espnId && k !== b.bio.espnId).map(k => ({ opp: A.get(k)![0].opponent, a: A.get(k)!, b: B.get(k)! }));
  }, [a, b]);
  const direct = a.history.filter(h => h.opponent.espnId === b.bio.espnId);

  return (
    <Panel title="Confrontos e adversários em comum">
      {direct.length > 0 && (
        <div className="border-b border-line px-5 py-3">
          <div className="eyebrow mb-2">Confronto direto</div>
          {direct.map(h => (
            <div key={h.fightId} className="flex items-center gap-3 text-[14px]">
              <HistoryBadge h={h} /><span className="text-fg">{a.bio.name}</span>
              <span className="text-fg-3">{h.method}{h.round ? ` · R${h.round} ${h.clock}` : ''} · {fullDate(h.date)}</span>
            </div>
          ))}
        </div>
      )}
      {rows.length === 0 ? <Empty>Nenhum adversário em comum.</Empty> : (
        <table className="table">
          <thead><tr><th className="text-right">{a.bio.name.split(' ').slice(-1)[0]}</th><th className="text-center">Adversário</th><th>{b.bio.name.split(' ').slice(-1)[0]}</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.opp.espnId}>
                <td className="text-right"><div className="flex justify-end gap-1">{r.a.map(f => <HistoryBadge key={f.fightId} h={f} />)}</div></td>
                <td className="text-center"><Link to={fighterHref(r.opp)} className="font-medium text-fg hover:underline hover:underline-offset-4">{r.opp.name}</Link></td>
                <td><div className="flex gap-1">{r.b.map(f => <HistoryBadge key={f.fightId} h={f} />)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const A = useFighter(params.get('a') ?? undefined, params.get('ae'));
  const B = useFighter(params.get('b') ?? undefined, params.get('be'));

  const set = (side: Side, slug?: string, espn?: string) => {
    const next = new URLSearchParams(params);
    if (slug) next.set(side, slug); else next.delete(side);
    if (espn) next.set(`${side}e`, espn); else next.delete(`${side}e`);
    setParams(next, { replace: true });
  };

  const a = A.data, b = B.data;
  const sa = a?.stats, sb = b?.stats;
  const n2 = (v?: number) => nf(v, 2);
  const p0 = (v?: number) => (v === undefined ? '—' : `${nf(v, 0)}%`);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Comparação" title="Frente a frente" meta="Escolha dois lutadores para comparar a ficha técnica, as estatísticas oficiais e os adversários em comum." />
      <div className="grid gap-3 sm:grid-cols-2">
        <FighterPicker placeholder="Canto vermelho…" value={a?.bio.name} onClear={() => set('a')} onPick={h => set('a', h.slug, h.espnId)} />
        <FighterPicker placeholder="Canto azul…" value={b?.bio.name} onClear={() => set('b')} onPick={h => set('b', h.slug, h.espnId)} />
      </div>

      {(A.isLoading || B.isLoading) && <Skeleton className="h-64" />}
      {(A.isError || B.isError) && <Panel><ErrorState message={(A.error ?? B.error)?.message} /></Panel>}

      {a && b ? (
        <>
          <Spotlight duel className="panel flex items-center gap-4 px-5 py-6 sm:gap-6">
            <Card p={a} side="a" />
            <span className="display shrink-0 text-2xl text-fg-3">VS</span>
            <Card p={b} side="b" />
          </Spotlight>

          <EdgeBoard a={a} b={b} />

          {hasRadar(sa) && hasRadar(sb) && (
            <Panel plain title="Perfil de luta" action={
              <div className="flex items-center gap-3 text-[13px] text-fg-2">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red" />{a.bio.name}</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue" />{b.bio.name}</span>
              </div>}>
              <AttrRadar height={340} series={[{ name: a.bio.name, color: 'red', stats: sa! }, { name: b.bio.name, color: 'blue', stats: sb! }]} />
              <p className="text-[12.5px] text-fg-3">{RADAR_NOTE}</p>
            </Panel>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Panel plain title="Ficha técnica" bodyClass="divide-y divide-line/70">
              <TapeRow label="Cartel" a={recordStr(a.bio.record)} b={recordStr(b.bio.record)} />
              <TapeRow label="Idade" a={a.bio.age ? `${a.bio.age} anos` : undefined} b={b.bio.age ? `${b.bio.age} anos` : undefined} better={cmp(a.bio.age, b.bio.age, true)} />
              <TapeRow label="Altura" a={a.bio.heightCm ? `${a.bio.heightCm} cm` : undefined} b={b.bio.heightCm ? `${b.bio.heightCm} cm` : undefined} better={cmp(a.bio.heightCm, b.bio.heightCm)} />
              <TapeRow label="Envergadura" a={a.bio.reachCm ? `${a.bio.reachCm} cm` : undefined} b={b.bio.reachCm ? `${b.bio.reachCm} cm` : undefined} better={cmp(a.bio.reachCm, b.bio.reachCm)} />
              <TapeRow label="Alcance das pernas" a={a.bio.legReachCm ? `${a.bio.legReachCm} cm` : undefined} b={b.bio.legReachCm ? `${b.bio.legReachCm} cm` : undefined} better={cmp(a.bio.legReachCm, b.bio.legReachCm)} />
              <TapeRow label="Base" a={a.bio.stance} b={b.bio.stance} />
              <TapeRow label="Divisão" a={a.bio.division} b={b.bio.division} />
              <TapeRow label="Estilo" a={a.bio.style} b={b.bio.style} />
              <TapeRow label="Últimas 5"
                a={<span className="inline-flex flex-row-reverse gap-1">{a.history.slice(0, 5).map(h => <HistoryBadge key={h.fightId} h={h} size="sm" />)}</span>}
                b={<span className="inline-flex gap-1">{b.history.slice(0, 5).map(h => <HistoryBadge key={h.fightId} h={h} size="sm" />)}</span>} />
            </Panel>

            <Panel plain title="Estatísticas oficiais" action={<span className="text-[13px] text-fg-3">UFC.com</span>} bodyClass="divide-y divide-line/70">
              <DuelRow label="Golpes sig. / min" a={sa?.slpm} b={sb?.slpm} fmt={n2} />
              <DuelRow label="Absorvidos / min" a={sa?.sapm} b={sb?.sapm} fmt={n2} lowerIsBetter />
              <DuelRow label="Precisão de golpes" a={sa?.strAcc} b={sb?.strAcc} fmt={p0} />
              <DuelRow label="Defesa de golpes" a={sa?.strDef} b={sb?.strDef} fmt={p0} />
              <DuelRow label="Quedas / 15 min" a={sa?.tdAvg} b={sb?.tdAvg} fmt={n2} />
              <DuelRow label="Precisão de quedas" a={sa?.tdAcc} b={sb?.tdAcc} fmt={p0} />
              <DuelRow label="Defesa de quedas" a={sa?.tdDef} b={sb?.tdDef} fmt={p0} />
              <DuelRow label="Finalizações / 15 min" a={sa?.subAvg} b={sb?.subAvg} fmt={n2} />
              <DuelRow label="Knockdowns / 15 min" a={sa?.kdAvg} b={sb?.kdAvg} fmt={n2} />
            </Panel>
          </div>

          <CommonOpponents a={a} b={b} />
        </>
      ) : !(A.isLoading || B.isLoading) && (
        <Panel><Empty>{a || b ? 'Escolha o segundo lutador.' : 'Escolha dois lutadores acima.'}</Empty></Panel>
      )}
    </div>
  );
}
