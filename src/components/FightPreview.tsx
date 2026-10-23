import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowsOutLineHorizontal, Fire, Flame, Hand, HourglassMedium, Lightning, PersonSimpleRun, ShieldCheck, TrendDown, TrendUp } from '@phosphor-icons/react';
import type { FighterProfile, HistoryFight } from '@shared/types';
import { useFighter } from '@/lib/api';
import { lastName, nf } from '@/lib/format';
import { CORNER, DuelHead, DuelRow, better, type Side } from './Duel';
import { AttrRadar, hasRadar, RADAR_NOTE } from './Radar';
import { HistoryBadge, Panel, Segmented, Skeleton } from './kit';

/* Prévia de uma luta que ainda não aconteceu: no lugar das estatísticas da luta, compara a carreira dos dois
   (dados do perfil de cada um) e destaca o que deve decidir o confronto. */

type Ref = { slug: string; espnId?: string; name: string };
type Insight = { side?: Side; icon: ReactNode; text: ReactNode };

const ico = 'h-4 w-4';

function streak(h: HistoryFight[]) {
  const done = h.filter(x => x.outcome === 'W' || x.outcome === 'L');
  if (!done.length) return null;
  let n = 0;
  for (const x of done) { if (x.outcome === done[0].outcome) n++; else break; }
  return { outcome: done[0].outcome, n };
}

/** Vitórias por método: oficial do UFC.com (mesma fonte do perfil) ou, sem ela, contado no histórico da ESPN. */
function winMethods(p: FighterProfile) {
  const w = p.history.filter(x => x.outcome === 'W');
  const m = p.stats.winsBy ?? {
    ko: w.filter(x => x.method === 'KO/TKO').length,
    sub: w.filter(x => x.method === 'Finalização').length,
    dec: w.filter(x => x.method?.startsWith('Decisão')).length,
  };
  const total = m.ko + m.sub + m.dec;
  return { total, ko: m.ko, sub: m.sub, dec: m.dec, finish: total ? (m.ko + m.sub) / total : 0 };
}

/** Frases sobre o confronto, a partir dos números dos dois. Só entram diferenças relevantes; no máximo 6. */
function insights(a: FighterProfile, b: FighterProfile): Insight[] {
  const out: Insight[] = [];
  const A = lastName(a.bio.name), B = lastName(b.bio.name);
  const pair = [[a, A, 'a'], [b, B, 'b']] as const;
  const name = (s: Side) => (s === 'a' ? A : B);
  const B_ = (x: ReactNode) => <b className="font-semibold text-fg">{x}</b>;

  // envergadura e idade
  const ra = a.bio.reachCm, rb = b.bio.reachCm;
  if (ra && rb && Math.abs(ra - rb) >= 5) {
    const s: Side = ra > rb ? 'a' : 'b';
    out.push({ side: s, icon: <ArrowsOutLineHorizontal className={ico} />, text: <>{B_(name(s))} tem {B_(`${Math.abs(ra - rb)} cm`)} a mais de envergadura ({ra} × {rb} cm): vantagem para lutar de longe.</> });
  }
  const aa = a.bio.age, ab = b.bio.age;
  if (aa && ab && Math.abs(aa - ab) >= 5) {
    const s: Side = aa < ab ? 'a' : 'b';
    out.push({ side: s, icon: <HourglassMedium className={ico} />, text: <>{B_(name(s))} é {B_(`${Math.abs(aa - ab)} anos`)} mais novo ({Math.min(aa, ab)} × {Math.max(aa, ab)}).</> });
  }

  // momento: sequências
  for (const [p, n, s] of pair) {
    const st = streak(p.history);
    if (st && st.n >= 2) out.push({
      side: s, icon: st.outcome === 'W' ? <TrendUp className={ico} /> : <TrendDown className={ico} />,
      text: st.outcome === 'W' ? <>{B_(n)} chega com {B_(`${st.n} vitórias seguidas`)}.</> : <>{B_(n)} vem de {B_(`${st.n} derrotas seguidas`)}.</>,
    });
  }

  // grappling: quem derruba contra quem defende
  for (const [p, n, s] of pair) {
    const o = s === 'a' ? b : a, on = s === 'a' ? B : A;
    const td = p.stats.tdAvg, def = o.stats.tdDef;
    if (td !== undefined && td >= 1.5 && def !== undefined) out.push({
      side: s, icon: <PersonSimpleRun className={ico} />,
      text: def < 70
        ? <>{B_(n)} busca a queda com frequência ({B_(`${nf(td, 2)} por 15 min`)}) e {on} defende só {B_(`${Math.round(def)}%`)} delas.</>
        : <>{B_(n)} gosta de derrubar ({nf(td, 2)} por 15 min), mas {on} defende {B_(`${Math.round(def)}%`)} das quedas.</>,
    });
  }

  // trocação: volume e poder
  const sa = a.stats.slpm, sb = b.stats.slpm;
  if (sa && sb && Math.max(sa, sb) / Math.min(sa, sb) >= 1.3) {
    const s: Side = sa > sb ? 'a' : 'b';
    out.push({ side: s, icon: <Fire className={ico} />, text: <>{B_(name(s))} conecta {B_(`${nf(Math.max(sa, sb), 2)} golpes sig./min`)} contra {nf(Math.min(sa, sb), 2)}: deve ditar o ritmo em pé.</> });
  }
  for (const [p, n, s] of pair) {
    const kd = p.stats.kdAvg;
    if (kd !== undefined && kd >= 0.8) out.push({ side: s, icon: <Lightning className={ico} />, text: <>{B_(n)} tem mão pesada: {B_(`${nf(kd, 2)} knockdowns`)} a cada 15 min.</> });
  }

  // como vencem
  for (const [p, n, s] of pair) {
    const w = winMethods(p);
    if (w.total >= 5 && w.finish >= 0.7) out.push({
      side: s, icon: w.sub > w.ko ? <Hand className={ico} /> : <Flame className={ico} />,
      text: <>{B_(n)} encerra {B_(`${Math.round(w.finish * 100)}%`)} das vitórias antes da decisão, principalmente por {w.sub > w.ko ? 'finalização' : 'nocaute'}.</>,
    });
  }

  // defesa
  const da = a.stats.strDef, db = b.stats.strDef;
  if (da && db && Math.abs(da - db) >= 8) {
    const s: Side = da > db ? 'a' : 'b';
    out.push({ side: s, icon: <ShieldCheck className={ico} />, text: <>{B_(name(s))} é mais difícil de acertar: evita {B_(`${Math.round(Math.max(da, db))}%`)} dos golpes, contra {Math.round(Math.min(da, db))}%.</> });
  }
  return out.slice(0, 6);
}

/** Linha da ficha: valor A | rótulo | valor B, com o lado vantajoso em destaque. */
function Tape({ label, a, b, win }: { label: string; a?: ReactNode; b?: ReactNode; win?: Side | null }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-5 py-3">
      <span className={`num text-right text-[14px] ${win === 'a' ? 'font-bold text-fg' : 'text-fg-2'}`}>{a ?? '—'}</span>
      <span className="label w-28 text-center">{label}</span>
      <span className={`num text-[14px] ${win === 'b' ? 'font-bold text-fg' : 'text-fg-2'}`}>{b ?? '—'}</span>
    </div>
  );
}

export function FightPreview({ red, blue }: { red: Ref; blue: Ref }) {
  const A = useFighter(red.slug, red.espnId), B = useFighter(blue.slug, blue.espnId);
  const [tab, setTab] = useState<'chaves' | 'numeros' | 'ficha'>('chaves');
  const a = A.data, b = B.data;

  const header = (
    <div>
      <h2 className="panel-title">Prévia da luta</h2>
      <p className="mt-1 text-[13px] text-fg-3">A luta ainda não aconteceu: a carreira dos dois, frente a frente</p>
    </div>
  );
  if (!a || !b) return (
    <Panel title={header}>
      <div className="space-y-3 px-6 pb-6">
        {A.isError || B.isError ? <p className="text-[14px] text-fg-3">Não foi possível carregar o perfil dos lutadores.</p>
          : <><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /><p className="text-[13px] text-fg-3">Buscando o perfil dos dois lutadores…</p></>}
      </div>
    </Panel>
  );

  const sa = a.stats, sb = b.stats;
  const keys = insights(a, b);
  const n2 = (v?: number) => nf(v, 2), p0 = (v?: number) => (v === undefined ? '—' : `${nf(v, 0)}%`);
  const cm = (v?: number) => (v ? `${v} cm` : undefined);
  const wa = winMethods(a), wb = winMethods(b);
  const how = (w: ReturnType<typeof winMethods>) => (w.total ? `${w.ko} KO · ${w.sub} fin. · ${w.dec} dec.` : undefined);
  const last5 = (p: FighterProfile, rev?: boolean) => (
    <span className={`inline-flex flex-wrap gap-1 ${rev ? 'flex-row-reverse' : ''}`}>{p.history.filter(x => x.outcome !== 'pending').slice(0, 5).map(x => <HistoryBadge key={x.fightId} h={x} size="sm" me={p.bio} />)}</span>
  );

  return (
    <Panel title={header} action={
      <Segmented value={tab} onChange={setTab} options={[{ value: 'chaves', label: 'Pontos-chave' }, { value: 'numeros', label: 'Estatísticas' }, { value: 'ficha', label: 'Ficha técnica' }]} />}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
          {tab === 'chaves' && (
            <div className="px-6 pb-6">
              {keys.length === 0 ? <p className="py-2 text-[14px] text-fg-3">Números muito parecidos: nenhuma vantagem clara no papel.</p> : (
                <ul className="divide-y divide-line/70">
                  {keys.map((k, i) => (
                    <li key={i} className="flex gap-3 py-3 text-[14px] leading-snug text-fg-2">
                      <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white" style={{ background: k.side ? CORNER[k.side] : 'var(--color-fg-3)' }}>{k.icon}</span>
                      <span>{k.text}</span>
                    </li>
                  ))}
                </ul>
              )}
              {hasRadar(sa) && hasRadar(sb) && (
                <div className="mt-4 border-t border-line pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="label">Perfil de luta</span>
                    <span className="flex gap-3 text-[13px] text-fg-2">
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red" />{lastName(a.bio.name)}</span>
                      <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue" />{lastName(b.bio.name)}</span>
                    </span>
                  </div>
                  <AttrRadar height={300} series={[{ name: a.bio.name, color: 'red', stats: sa }, { name: b.bio.name, color: 'blue', stats: sb }]} />
                  <p className="text-[13px] text-fg-3">{RADAR_NOTE}</p>
                </div>
              )}
            </div>
          )}
          {tab === 'numeros' && (
            <div className="divide-y divide-line/70 pb-2">
              <DuelHead a={lastName(a.bio.name)} b={lastName(b.bio.name)} />
              <DuelRow label="Golpes sig. / min" a={sa.slpm} b={sb.slpm} fmt={n2} />
              <DuelRow label="Absorvidos / min" a={sa.sapm} b={sb.sapm} fmt={n2} lowerIsBetter />
              <DuelRow label="Precisão de golpes" a={sa.strAcc} b={sb.strAcc} fmt={p0} />
              <DuelRow label="Defesa de golpes" a={sa.strDef} b={sb.strDef} fmt={p0} />
              <DuelRow label="Quedas / 15 min" a={sa.tdAvg} b={sb.tdAvg} fmt={n2} />
              <DuelRow label="Defesa de quedas" a={sa.tdDef} b={sb.tdDef} fmt={p0} />
              <DuelRow label="Finalizações / 15 min" a={sa.subAvg} b={sb.subAvg} fmt={n2} />
              <DuelRow label="Knockdowns / 15 min" a={sa.kdAvg} b={sb.kdAvg} fmt={n2} />
              <p className="px-5 pt-3 text-[13px] text-fg-3">Médias da carreira no UFC (UFC.com).</p>
            </div>
          )}
          {tab === 'ficha' && (
            <div className="divide-y divide-line/70 pb-2">
              <Tape label="Cartel" a={`${a.bio.record.w}-${a.bio.record.l}-${a.bio.record.d}`} b={`${b.bio.record.w}-${b.bio.record.l}-${b.bio.record.d}`} />
              <Tape label="Idade" a={a.bio.age && `${a.bio.age} anos`} b={b.bio.age && `${b.bio.age} anos`} win={better(a.bio.age, b.bio.age, true)} />
              <Tape label="Altura" a={cm(a.bio.heightCm)} b={cm(b.bio.heightCm)} win={better(a.bio.heightCm, b.bio.heightCm)} />
              <Tape label="Envergadura" a={cm(a.bio.reachCm)} b={cm(b.bio.reachCm)} win={better(a.bio.reachCm, b.bio.reachCm)} />
              <Tape label="Base" a={a.bio.stance} b={b.bio.stance} />
              <Tape label="Estilo" a={a.bio.style} b={b.bio.style} />
              <Tape label="Como vence" a={how(wa)} b={how(wb)} />
              <Tape label="Finaliza" a={wa.total ? `${Math.round(wa.finish * 100)}%` : undefined} b={wb.total ? `${Math.round(wb.finish * 100)}%` : undefined} win={better(wa.finish, wb.finish)} />
              <Tape label="Últimas 5" a={last5(a, true)} b={last5(b)} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Panel>
  );
}
