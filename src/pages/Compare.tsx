import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowsLeftRight, Check, Crown, LinkSimple } from '@phosphor-icons/react';
import type { FighterProfile, HistoryFight } from '@shared/types';
import { fightHref, fighterHref, useFighter, useRankings, useRankingsMeta, useUpcoming } from '@/lib/api';
import { dayMonth, fullDate, lastName, nf, recordStr, splitEventName } from '@/lib/format';
import { FighterPicker } from '@/components/FighterPicker';
import { CORNER as COLOR, DuelHead, DuelRow, better as cmp, type Side } from '@/components/Duel';
import { Avatar, CountUp, ErrorState, Flag, HistoryBadge, OutcomeBadge, PageHeader, Panel, RankBadge, Skeleton, Tip, usePageTitle } from '@/components/kit';
import { AttrRadar, hasRadar, RADAR_NOTE } from '@/components/Radar';


function Card({ p, side }: { p: FighterProfile; side: Side }) {
  const b = p.bio;
  const right = side === 'b';
  return (
    <Link to={fighterHref({ slug: b.slug, espnId: b.espnId })} className={clsx('group flex min-w-0 flex-1 items-center gap-4', right && 'flex-row-reverse text-right')}>
      <Avatar src={b.headshot} name={b.name} size={72} flag={b.countryCode} ring={COLOR[side]} className="hidden sm:block" />
      <div className="min-w-0">
        <div className={clsx('mb-1.5 h-0.5 w-6 rounded-full', right && 'ml-auto')} style={{ background: COLOR[side] }} />
        <div className="display break-words text-[18px] leading-tight text-fg group-hover:text-brand sm:truncate sm:text-[32px]">{b.name}</div>
        <div className={clsx('mt-3 flex flex-wrap items-center gap-2 text-[13px] text-fg-3', right && 'justify-end')}>
          {/* no celular, a divisão sai do selo (não cabe na meia tela) */}
          <RankBadge rankLabel={b.rankLabel} division={b.division} women={b.division?.includes("(F)")} className="max-sm:[&_.rb-div]:hidden" />
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-2.5 sm:gap-4 sm:px-5">
      <span className={clsx('num text-right text-[14px]', better === 'a' ? 'font-semibold text-fg' : 'text-fg-2')}>{a ?? '—'}</span>
      <span className="label w-[92px] text-center text-[12px] tracking-[0.04em] sm:w-36 sm:text-[13px] sm:tracking-[0.08em]">{label}</span>
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
        <span className="display text-[72px] leading-[0.85]" style={{ color: COLOR[s] }}><CountUp value={list.length} /></span>
        <span className="text-[14px] font-semibold text-fg-2">vantagens</span>
      </div>
      <div className="mt-1 truncate text-[14px] text-fg-3">{p.bio.name}</div>
      <div className={clsx('mt-3 flex flex-wrap gap-1.5', s === 'b' && 'justify-end')}>
        {list.map(r => (
          <span key={r.label} className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-[13px] font-semibold text-fg-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR[s] }} />{r.label}
          </span>
        ))}
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

  const last = (n: string) => n.split(' ').slice(-1)[0];
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      {/* confronto direto: cada luta numa frase ("Makhachev venceu Volkanovski"), do ponto de vista do vencedor */}
      <Panel plain title="Confronto direto" action={direct.length > 0 && <span className="text-[13px] text-fg-3">{direct.length} {direct.length > 1 ? 'lutas' : 'luta'}</span>}>
        {direct.length === 0 ? <p className="py-2 text-[14px] text-fg-3">Os dois nunca se enfrentaram.</p> : (
          <ul className="divide-y divide-line/70">
            {direct.map(h => {
              const winA = h.outcome === 'W', winB = h.outcome === 'L';
              const winner = winA ? a.bio : winB ? b.bio : null, loser = winA ? b.bio : a.bio;
              return (
                <li key={h.fightId}>
                  <Link to={fightHref(h.eventId, h.fightId)} className="group flex items-center gap-3 py-3">
                    {winner ? <Avatar src={winner.headshot} name={winner.name} size={40} ring={COLOR[winA ? 'a' : 'b']} /> : <OutcomeBadge outcome={h.outcome} />}
                    <div className="min-w-0">
                      <div className="text-[16px] font-semibold text-fg group-hover:text-brand">
                        {winner ? <>{last(winner.name)} venceu {last(loser.name)}</> : h.outcome === 'D' ? 'Empate' : 'Sem resultado'}
                      </div>
                      <div className="text-[13px] text-fg-3">{[h.method, h.round && `R${h.round} ${h.clock}`, fullDate(h.date)].filter(Boolean).join(' · ')}</div>
                    </div>
                    {h.title && <Crown weight="fill" className="ml-auto h-4 w-4 shrink-0 text-gold" aria-label="Disputa de título" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel plain title="Adversários em comum" action={rows.length > 0 && <span className="text-[13px] text-fg-3">{rows.length}</span>}>
        {rows.length === 0 ? <p className="py-2 text-[14px] text-fg-3">Nenhum adversário em comum.</p> : (
          <table className="table">
            <thead><tr><th className="text-right">{last(a.bio.name)}</th><th className="text-center">Adversário</th><th>{last(b.bio.name)}</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.opp.espnId}>
                  <td className="text-right"><div className="flex justify-end gap-1">{r.a.map(f => <HistoryBadge key={f.fightId} h={f} me={a.bio} />)}</div></td>
                  <td className="text-center"><Link to={fighterHref(r.opp)} className="font-medium text-fg hover:underline hover:underline-offset-4">{r.opp.name}</Link></td>
                  <td><div className="flex gap-1">{r.b.map(f => <HistoryBadge key={f.fightId} h={f} me={b.bio} />)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

/* ---------- Tela vazia: comparações sugeridas ---------- */

type Pair = { key: string; label: string; sub: string; a: { slug: string; espnId?: string; name: string; headshot?: string }; b: { slug: string; espnId?: string; name: string; headshot?: string } };
const headshot = (id?: string) => (id ? `https://a.espncdn.com/i/headshots/mma/players/full/${id}.png` : undefined);

/** Lutas principais dos próximos eventos e "campeão × nº 1" de cada divisão: um clique preenche os dois cantos. */
function Suggestions({ onPick }: { onPick: (p: Pair) => void }) {
  const upcoming = useUpcoming(10);
  const { data: rankings } = useRankings();
  const { data: meta } = useRankingsMeta();
  const last = (n: string) => n.split(' ').slice(-1)[0];
  const mains: Pair[] = (upcoming.data ?? []).filter(e => e.series !== 'dwcs' && e.main).slice(0, 4).map(e => ({
    key: e.id, label: `${last(e.main!.red.name)} × ${last(e.main!.blue.name)}`, sub: `${splitEventName(e.name).series} · ${dayMonth(e.date)}`,
    a: { ...e.main!.red, slug: e.main!.red.slug }, b: { ...e.main!.blue, slug: e.main!.blue.slug },
  }));
  // sem repetir uma luta principal que já seja campeão × nº 1
  const inMains = new Set(mains.flatMap(m => [`${m.a.slug}|${m.b.slug}`, `${m.b.slug}|${m.a.slug}`]));
  const belts: Pair[] = (rankings?.divisions ?? []).filter(d => !d.p4p && d.champion && d.entries[0] && !inMains.has(`${d.champion.slug}|${d.entries[0].slug}`)).slice(0, 8).map(d => {
    const c = d.champion!, n1 = d.entries[0];
    return {
      key: d.id, label: `${last(c.name)} × ${last(n1.name)}`, sub: d.name,
      a: { slug: c.slug, espnId: meta?.[c.slug]?.espnId, name: c.name, headshot: headshot(meta?.[c.slug]?.espnId) },
      b: { slug: n1.slug, espnId: meta?.[n1.slug]?.espnId, name: n1.name, headshot: headshot(meta?.[n1.slug]?.espnId) },
    };
  });
  const card = (p: Pair) => (
    <button key={p.key} onClick={() => onPick(p)} className="lift cut group flex items-center gap-4 rounded-xl bg-surface p-4 text-left ring-1 ring-fg/[0.06]">
      <span className="flex shrink-0 items-center">
        <Avatar src={p.a.headshot} name={p.a.name} size={44} ring="var(--color-red)" />
        <Avatar src={p.b.headshot} name={p.b.name} size={44} ring="var(--color-blue)" className="-ml-2" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[16px] font-bold text-fg group-hover:text-brand">{p.label}</span>
        <span className="block truncate text-[13px] text-fg-3">{p.sub}</span>
      </span>
    </button>
  );
  return (
    <div className="space-y-8">
      {mains.length > 0 && (
        <Panel plain title="Lutas principais que vêm aí">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{mains.map(card)}</div>
        </Panel>
      )}
      {belts.length > 0 && (
        <Panel plain title="Campeão contra o nº 1">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{belts.map(card)}</div>
        </Panel>
      )}
      {upcoming.isLoading && <Skeleton className="h-40" />}
    </div>
  );
}

/** Copiar o link (a URL já guarda os dois lutadores) e trocar os cantos. */
function Toolbar({ onSwap }: { onSwap: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* sem permissão: ignora */ }
  };
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button onClick={onSwap} className="btn"><ArrowsLeftRight className="h-4 w-4" /> Trocar cantos</button>
      <button onClick={copy} className="btn" aria-live="polite">
        {copied ? <><Check weight="bold" className="h-4 w-4 text-win" /> Link copiado</> : <><LinkSimple className="h-4 w-4" /> Copiar link da comparação</>}
      </button>
    </div>
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

  const pickPair = (p: Pair) => {
    const next = new URLSearchParams();
    next.set('a', p.a.slug); if (p.a.espnId) next.set('ae', p.a.espnId);
    next.set('b', p.b.slug); if (p.b.espnId) next.set('be', p.b.espnId);
    setParams(next, { replace: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const swap = () => {
    const next = new URLSearchParams();
    for (const [k, v] of params) next.set(k.replace(/^a/, '§').replace(/^b/, 'a').replace(/^§/, 'b'), v);
    setParams(next, { replace: true });
  };

  // isPending (e não isLoading) cobre a restauração do cache; consulta sem lutador escolhido fica desligada
  const loadA = A.isPending && !!params.get('a'), loadB = B.isPending && !!params.get('b');
  const a = A.data, b = B.data;
  usePageTitle(a && b ? `${a.bio.name} × ${b.bio.name}` : 'Comparar lutadores');
  const sa = a?.stats, sb = b?.stats;
  const n2 = (v?: number) => nf(v, 2);
  const p0 = (v?: number) => (v === undefined ? '—' : `${nf(v, 0)}%`);

  return (
    <div className="space-y-6">
      <PageHeader title="Frente a frente" meta="Escolha dois lutadores para comparar a ficha técnica, as estatísticas oficiais e os adversários em comum." />
      <div className="grid gap-3 sm:grid-cols-2">
        <FighterPicker placeholder="Canto vermelho…" value={a?.bio.name} onClear={() => set('a')} onPick={h => set('a', h.slug, h.espnId)} />
        <FighterPicker placeholder="Canto azul…" value={b?.bio.name} onClear={() => set('b')} onPick={h => set('b', h.slug, h.espnId)} />
      </div>

      {(loadA || loadB) && <Skeleton className="min-h-[1800px] h-64" />}
      {(A.isError || B.isError) && <Panel><ErrorState message={(A.error ?? B.error)?.message} /></Panel>}

      {a && b ? (
        <>
          <Toolbar onSwap={swap} />
          <div className="panel flex items-center gap-2 px-4 py-6 sm:gap-6 sm:px-5">
            <Card p={a} side="a" />
            <span className="display shrink-0 text-[18px] text-fg-3 sm:text-[24px]">VS</span>
            <Card p={b} side="b" />
          </div>

          <EdgeBoard a={a} b={b} />

          {hasRadar(sa) && hasRadar(sb) && (
            <Panel plain title="Perfil de luta" action={
              <div className="flex items-center gap-3 text-[13px] text-fg-2">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red" />{a.bio.name}</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue" />{b.bio.name}</span>
              </div>}>
              <AttrRadar height={340} series={[{ name: a.bio.name, color: 'red', stats: sa! }, { name: b.bio.name, color: 'blue', stats: sb! }]} />
              <p className="text-[13px] text-fg-3">{RADAR_NOTE}</p>
            </Panel>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2">
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
                a={<span className="inline-flex flex-row-reverse flex-wrap gap-1">{a.history.slice(0, 5).map(h => <HistoryBadge key={h.fightId} h={h} size="sm" me={a.bio} />)}</span>}
                b={<span className="inline-flex flex-wrap gap-1">{b.history.slice(0, 5).map(h => <HistoryBadge key={h.fightId} h={h} size="sm" me={b.bio} />)}</span>} />
            </Panel>

            <Panel plain title="Estatísticas oficiais" action={<span className="text-[13px] text-fg-3">UFC.com</span>} bodyClass="divide-y divide-line/70">
              <DuelHead a={lastName(a.bio.name)} b={lastName(b.bio.name)} />
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
      ) : !(loadA || loadB) && (
        <>
          <p className="text-[16px] text-fg-2">{a || b ? 'Escolha o segundo lutador acima, ou comece por uma destas comparações:' : 'Escolha dois lutadores acima, ou comece por uma destas comparações:'}</p>
          <Suggestions onPick={pickPair} />
        </>
      )}
    </div>
  );
}
