import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowSquareOut, ArrowsLeftRight, CaretLeft, CaretRight, Crown, Flag as FlagIcon, Hand, Lightning, Newspaper, Scales } from '@phosphor-icons/react';
import type { FighterProfile, HistoryFight, OfficialStats } from '@shared/types';
import { fightHref, fighterHref, useFighter } from '@/lib/api';
import { fullDate, lastName, mmss, nf, pct, ratio, shortEvent } from '@/lib/format';
import { EChart, SERIES, axisBase, tooltipBase, useInk } from '@/components/EChart';
import { Avatar, BlobClip, Brush, CountUp, Empty, ErrorState, Flag, FlagBackdrop, HistoryBadge, Meter, OctagonMark, OutcomeBadge, Panel, SortTh, Tip, useSort, RecordCount, Segmented, Skeleton, Stat, Tag } from '@/components/kit';
import { AttrRadar, hasRadar, RADAR_NOTE } from '@/components/Radar';

/* ---------- Cabeçalho ---------- */

function streak(history: HistoryFight[]) {
  const first = history.find(h => h.outcome === 'W' || h.outcome === 'L');
  if (!first) return null;
  let n = 0;
  for (const h of history) { if (h.outcome === first.outcome) n++; else if (h.outcome === 'W' || h.outcome === 'L') break; }
  return { outcome: first.outcome, n };
}

const debutPt = (s?: string) => { const m = s?.match(/^(\d{2})\.(\d{2})\.(\d{2})$/); return m ? `${m[1]}/${m[2]}/20${m[3]}` : s; };

function Header({ p }: { p: FighterProfile }) {
  const b = p.bio;
  const s = streak(p.history);
  const last5 = p.history.slice(0, 5);
  const reduce = useReducedMotion();
  const [imgFailed, setImgFailed] = useState(false);
  const women = b.division?.includes('(F)');
  const fade = (d: number) => (reduce ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.65, delay: d, ease: [0.22, 1, 0.36, 1] as const } });
  return (
    <section className="relative grid items-center gap-8 pb-6 pt-2 lg:grid-cols-[1.1fr_1fr]">
      <div aria-hidden className="pointer-events-none absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,var(--glow),transparent_65%)]" />
      <div className="relative min-w-0">
        <motion.div {...fade(0)} className="flex flex-wrap items-center gap-2">
          {b.rankLabel === 'Campeão' && <Tag tone="gold"><Crown className="h-3.5 w-3.5" /> {women ? 'Campeã' : 'Campeão'}{b.division ? ` · ${b.division}` : ''}</Tag>}
          {b.rankLabel && b.rankLabel !== 'Campeão' && <Tag tone="blue">{b.rankLabel} · {b.division}</Tag>}
          {!b.rankLabel && b.division && <Tag>{b.division}</Tag>}
          {b.p4pRank && <Tag tone="dark">#{b.p4pRank} peso por peso</Tag>}
          {b.status && <span className="text-[14px] text-fg-3">{b.status}</span>}
        </motion.div>
        <motion.h1 {...fade(0.06)} className="display mt-5 text-[52px] text-fg sm:text-[76px]">
          {b.name.split(' ').slice(0, -1).join(' ')}{' '}
          <span className="relative inline-block whitespace-nowrap">{b.name.split(' ').slice(-1)[0]}<Brush className="absolute -bottom-2 left-[6%] h-4 w-[92%]" /></span>
        </motion.h1>
        <motion.div {...fade(0.12)} className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-fg-2">
          {b.nickname && <span className="font-display text-[19px] italic text-fg">“{b.nickname}”</span>}
          {b.country && <span className="inline-flex items-center gap-2 font-semibold text-fg"><Flag code={b.countryCode} src={b.flag} title={b.country} size={22} />{b.country}</span>}
          {b.hometown && <span className="text-fg-3">Natural de {b.hometown}</span>}
          {b.team && <span className="text-fg-3">{b.team}</span>}
        </motion.div>
        <motion.div {...fade(0.18)} className="mt-9 flex flex-wrap items-center gap-4">
          <Link to={`/comparar?a=${b.slug}${b.espnId ? `&ae=${b.espnId}` : ''}`} className="btn-primary"><ArrowsLeftRight className="h-4 w-4" /> Comparar com outro lutador</Link>
          {b.ufcUrl && <a href={b.ufcUrl} target="_blank" rel="noreferrer" className="btn-ghost">UFC.com <ArrowSquareOut className="h-3.5 w-3.5" /></a>}
          {b.espnUrl && <a href={b.espnUrl} target="_blank" rel="noreferrer" className="btn-ghost">ESPN <ArrowSquareOut className="h-3.5 w-3.5" /></a>}
          {/* Tapology e Sherdog não têm API e os termos não permitem reaproveitar os dados; o link leva direto à busca de cada site */}
          <a href={`https://www.tapology.com/search?term=${encodeURIComponent(b.name)}&mainSearchFilter=fighters`} target="_blank" rel="noreferrer" className="btn-ghost">Tapology <ArrowSquareOut className="h-3.5 w-3.5" /></a>
          <a href={`https://www.sherdog.com/stats/fightfinder?SearchTxt=${encodeURIComponent(b.name)}`} target="_blank" rel="noreferrer" className="btn-ghost">Sherdog <ArrowSquareOut className="h-3.5 w-3.5" /></a>
        </motion.div>
      </div>

      <div className="relative mx-auto h-[440px] w-full max-w-[520px] sm:h-[520px]">
        <BlobClip className="inset-x-0 bottom-0 h-[88%]">
          <div className="absolute inset-0 bg-cream" />
          <FlagBackdrop code={b.countryCode} shape="rect" className="inset-0 opacity-45 dark:opacity-35" />
        </BlobClip>
        <OctagonMark className="float absolute right-8 top-6 h-9 w-9 opacity-80" />
        {b.bodyImage && !imgFailed ? (
          <motion.img initial={reduce ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            src={b.bodyImage} alt={b.name} onError={() => setImgFailed(true)}
            className="absolute bottom-0 left-1/2 h-[96%] w-auto -translate-x-1/2 object-contain drop-shadow-[0_30px_40px_var(--cutout-shadow)] [mask-image:linear-gradient(to_bottom,black_82%,transparent)]" />
        ) : (
          <div className="absolute inset-0 grid place-items-center"><Avatar src={b.headshot} name={b.name} size={220} flag={b.countryCode} /></div>
        )}
        <motion.div initial={reduce ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
          className="absolute left-0 top-[30%] rounded-3xl bg-surface/95 px-5 py-4 shadow-[var(--shadow-lift)] backdrop-blur sm:-left-4">
          <div className="label">Cartel</div>
          <div className="num font-display text-[34px] font-semibold leading-tight text-fg"><RecordCount record={b.record} /></div>
          <div className="text-[13px] text-fg-3">V · D · E</div>
        </motion.div>
        {last5.length > 0 && (
          <motion.div initial={reduce ? false : { opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.62 }}
            className="absolute bottom-0 right-0 sm:-right-4">
            <RecentFights me={b} fights={last5} streak={s} />
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ---------- Últimas lutas (carrossel) ---------- */

const RESULT_TAG = { W: 'Vitória', L: 'Derrota', D: 'Empate', NC: 'Sem resultado', pending: '' };
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

/** Selos das últimas lutas + carrossel com as fotos do confronto (como a lista de lutas do UFC.com). */
function RecentFights({ me, fights, streak: st }: { me: FighterProfile['bio']; fights: HistoryFight[]; streak: ReturnType<typeof streak> }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [open, setOpen] = useState(false);
  const go = (n: number) => { setDir(n > i ? 1 : -1); setI((n + fights.length) % fights.length); };
  const h = fights[i];
  const won = h.outcome === 'W', lost = h.outcome === 'L';
  const tagCls = 'absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white';
  const Face = ({ src, name, tag }: { src?: string; name: string; tag?: string }) => (
    <div className="relative flex h-full flex-1 items-end justify-center">
      {src ? <img src={src} alt={name} className="h-full w-auto object-contain object-bottom" /> : <Avatar src={undefined} name={name} size={72} className="mb-3" />}
      {tag && <span className={tagCls} style={{ background: 'var(--color-brand)' }}>{tag}</span>}
    </div>
  );
  return (
    // fechado: só os selos; ao passar o mouse (ou focar pelo teclado) abre o carrossel por cima
    <motion.div layout transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
      className={clsx('rounded-3xl bg-surface/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur', open ? 'w-[300px]' : 'w-auto')}>
      <motion.div layout="position" className="flex items-center justify-between gap-4">
        <div className="label">Últimas {fights.length}</div>
        {open && <div className="flex gap-1">
          <button onClick={() => go(i - 1)} aria-label="Luta anterior" className="grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-fg-2 transition-colors hover:bg-fg hover:text-bg"><CaretLeft weight="bold" className="h-3.5 w-3.5" /></button>
          <button onClick={() => go(i + 1)} aria-label="Próxima luta" className="grid h-7 w-7 place-items-center rounded-full bg-fg text-bg transition-transform hover:scale-105"><CaretRight weight="bold" className="h-3.5 w-3.5" /></button>
        </div>}
      </motion.div>
      <div className="mt-2 flex gap-1.5">
        {fights.map((f, k) => (
          <button key={f.fightId} onClick={() => go(k)} aria-label={`Luta ${k + 1}: ${RESULT_TAG[f.outcome]} contra ${f.opponent.name}`}
            className={clsx('rounded-full p-0.5 transition-all', open && k === i ? 'ring-2 ring-fg/70' : open ? 'opacity-70 hover:opacity-100' : '')}>
            <HistoryBadge h={f} size="sm" />
          </button>
        ))}
      </div>
      {open && <div className="relative mt-3 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div key={h.fightId} custom={dir}
            initial={{ x: dir * 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir * -60, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
            <Link to={fightHref(h.eventId, h.fightId)} className="group block">
              <div className="flex h-[112px] gap-1 overflow-hidden rounded-2xl bg-gradient-to-b from-cream to-cream-2">
                <Face src={me.headshot} name={me.name} tag={won ? 'Vitória' : undefined} />
                <Face src={h.opponent.headshot} name={h.opponent.name} tag={lost ? 'Vitória' : undefined} />
              </div>
              <div className="mt-3 line-clamp-2 font-display text-[16px] font-bold uppercase leading-tight tracking-tight text-fg group-hover:text-brand">
                {lastName(me.name)} vs {lastName(h.opponent.name)}
              </div>
              <div className="num text-[12.5px] text-fg-3">{shortDate(h.date)} · {RESULT_TAG[h.outcome]}</div>
              <dl className="mt-2 grid grid-cols-[auto_auto_1fr] gap-x-4 border-t border-line pt-2">
                {[['Round', h.round ?? '—'], ['Tempo', h.clock ?? '—'], ['Método', h.method ?? '—']].map(([k, v]) => (
                  <div key={k} className="min-w-0"><dt className="text-[11.5px] text-fg-3">{k}</dt><dd className="num truncate text-[13px] font-bold text-fg">{v}</dd></div>
                ))}
              </dl>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>}
      {st && st.n > 1 && <div className="mt-3 text-[13px] font-semibold text-fg-2">{st.n} {st.outcome === 'W' ? 'vitórias' : 'derrotas'} seguidas</div>}
    </motion.div>
  );
}

/* ---------- Bio ---------- */

function Bio({ p }: { p: FighterProfile }) {
  const b = p.bio;
  const rows: [string, string | undefined][] = [
    ['Idade', b.age ? `${b.age} anos` : undefined],
    ['Nascimento', b.dob ? fullDate(b.dob + 'T12:00:00Z') : undefined],
    ['Altura', b.heightCm ? `${b.heightCm} cm` : undefined],
    ['Envergadura', b.reachCm ? `${b.reachCm} cm` : undefined],
    ['Alcance das pernas', b.legReachCm ? `${b.legReachCm} cm` : undefined],
    ['Peso', b.weightKg ? `${nf(b.weightKg, 1)} kg` : undefined],
    ['Base', b.stance],
    ['Estilo', b.style],
    ['Estreia no UFC', debutPt(b.debut)],
  ];
  return (
    <Panel plain title="Bio">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 pt-1">
        {rows.filter(r => r[1]).map(([k, v]) => (
          <div key={k}>
            <dt className="label">{k}</dt>
            <dd className="num mt-1 text-[15px] font-semibold text-fg">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/* ---------- Estatísticas oficiais ---------- */

function OfficialPanel({ s }: { s: OfficialStats }) {
  const has = s.slpm !== undefined || s.strAcc !== undefined;
  return (
    <Panel plain title="Estatísticas oficiais" action={<span className="text-[13px] text-fg-3">UFC.com · carreira no UFC</span>}>
      {!has ? <Empty>Sem estatísticas oficiais no UFC.com para este atleta.</Empty> : (
        <div className="grid gap-8 pt-2 md:grid-cols-[1fr_1.15fr]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            <Stat label="Golpes sig. / min" value={<span className="num">{nf(s.slpm, 2)}</span>} sub="conectados" />
            <Stat label="Absorvidos / min" value={<span className="num">{nf(s.sapm, 2)}</span>} sub="golpes sig. sofridos" />
            <Stat label="Quedas / 15 min" value={<span className="num">{nf(s.tdAvg, 2)}</span>} sub="média" />
            <Stat label="Finalizações / 15 min" value={<span className="num">{nf(s.subAvg, 2)}</span>} sub="tentativas" />
            <Stat label="Knockdowns / 15 min" value={<span className="num">{nf(s.kdAvg, 2)}</span>} />
            <Stat label="Tempo médio de luta" value={<span className="num">{s.avgFightTime ?? '—'}</span>} />
          </div>
          <div className="space-y-4">
            <Meter label="Precisão de golpes" value={s.strAcc} display={pct(s.strAcc)} hint={s.sigAttempted ? `${s.sigLanded} de ${s.sigAttempted} golpes significativos` : undefined} />
            <Meter label="Defesa de golpes" value={s.strDef} display={pct(s.strDef)} />
            <Meter label="Precisão de quedas" value={s.tdAcc} display={pct(s.tdAcc)} hint={s.tdAttempted ? `${s.tdLanded} de ${s.tdAttempted} quedas` : undefined} />
            <Meter label="Defesa de quedas" value={s.tdDef} display={pct(s.tdDef)} />
          </div>
        </div>
      )}
    </Panel>
  );
}

/** Barra empilhada com intervalo de 2px e legenda com rótulo direto. */
function Stacked({ title, parts }: { title: string; parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <div>
      <div className="eyebrow mb-2">{title}</div>
      {total === 0 ? <div className="text-[13px] text-fg-3">Sem dados</div> : (
        <>
          <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full">
            {parts.filter(p => p.value).map(p => (
              <Tip key={p.label} title={p.label} content={`${p.value} · ${Math.round((p.value / total) * 100)}%`}><div style={{ flexGrow: p.value, background: p.color }} className="first:rounded-l-full last:rounded-r-full" /></Tip>
            ))}
          </div>
          <ul className="mt-2.5 grid grid-cols-3 gap-2">
            {parts.map(p => (
              <li key={p.label} className="min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] text-fg-2"><span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: p.color }} /><span className="truncate">{p.label}</span></div>
                <div className="num mt-0.5 text-[14px] font-medium text-fg">{p.value} <span className="text-fg-3">· {Math.round((p.value / total) * 100)}%</span></div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Vitórias por método: oficial (UFC) ou derivado do histórico. */
function winsByMethod(s: OfficialStats, history: HistoryFight[]) {
  const wins = history.filter(h => h.outcome === 'W');
  return s.winsBy ?? {
    ko: wins.filter(h => h.method === 'KO/TKO').length,
    sub: wins.filter(h => h.method === 'Finalização').length,
    dec: wins.filter(h => h.method?.startsWith('Decisão')).length,
  };
}

/** KPIs grandes: como o lutador vence. */
function WinKpis({ s, history }: { s: OfficialStats; history: HistoryFight[] }) {
  const w = winsByMethod(s, history);
  const total = w.ko + w.sub + w.dec;
  if (!total) return null;
  const items = [
    { label: 'Por nocaute', sub: 'KO/TKO', value: w.ko, Icon: Lightning, color: 'var(--color-blue)' },
    { label: 'Por finalização', sub: 'Mata-leão, chaves…', value: w.sub, Icon: Hand, color: 'var(--color-orange)' },
    { label: 'Por decisão', sub: 'Dos juízes', value: w.dec, Icon: Scales, color: 'var(--color-aqua)' },
  ];
  const [top, ...rest] = [...items].sort((x, y) => y.value - x.value);
  const share = (v: number) => Math.round((v / total) * 100);
  return (
    <Panel plain title="Como vence" action={<span className="text-[13px] text-fg-3">{total} vitórias</span>}>
      <div className="grid gap-8 pt-1 sm:grid-cols-[1.3fr_1fr]">
        {/* método dominante: número grande */}
        <div>
          <div className="flex items-center gap-2 text-[15px] font-semibold text-fg-2"><top.Icon weight="bold" className="h-4 w-4" style={{ color: top.color }} />{top.label}</div>
          <div className="mt-1 flex items-end gap-3">
            <span className="display text-[120px] leading-[0.8] text-fg"><CountUp value={top.value} /></span>
            <span className="display pb-1 text-[40px] leading-none" style={{ color: top.color }}>{share(top.value)}%</span>
          </div>
          <div className="mt-2 text-[14px] text-fg-3">das vitórias · {top.sub}</div>
        </div>
        {/* demais métodos: linhas com barra */}
        <div className="space-y-5 sm:border-l sm:border-line sm:pl-8">
          {rest.map(it => (
            <div key={it.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-2 text-[15px] font-semibold text-fg-2"><it.Icon weight="bold" className="h-4 w-4" style={{ color: it.color }} />{it.label}</span>
                <span className="display text-[34px] leading-none text-fg">{it.value}<span className="ml-1.5 text-[20px] text-fg-3">{share(it.value)}%</span></span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <motion.div className="h-full rounded-full" style={{ background: it.color }} initial={{ width: 0 }} whileInView={{ width: `${share(it.value)}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Breakdowns({ s, history }: { s: OfficialStats; history: HistoryFight[] }) {
  const losses = history.filter(h => h.outcome === 'L');
  return (
    <Panel plain title="Distribuição" bodyClass="grid gap-x-8 gap-y-6 pt-2 sm:grid-cols-2">
      <Stacked title="Derrotas por método" parts={[
        { label: 'KO/TKO', value: losses.filter(h => h.method === 'KO/TKO').length, color: SERIES.blue },
        { label: 'Finalização', value: losses.filter(h => h.method === 'Finalização').length, color: SERIES.orange },
        { label: 'Decisão', value: losses.filter(h => h.method?.startsWith('Decisão')).length, color: SERIES.aqua },
      ]} />
      {s.byTarget && <Stacked title="Golpes sig. por alvo" parts={[
        { label: 'Cabeça', value: s.byTarget.head, color: SERIES.blue },
        { label: 'Corpo', value: s.byTarget.body, color: SERIES.orange },
        { label: 'Pernas', value: s.byTarget.leg, color: SERIES.aqua },
      ]} />}
      {s.byPosition && <Stacked title="Golpes sig. por posição" parts={[
        { label: 'Em pé', value: s.byPosition.standing, color: SERIES.blue },
        { label: 'Clinche', value: s.byPosition.clinch, color: SERIES.orange },
        { label: 'Solo', value: s.byPosition.ground, color: SERIES.aqua },
      ]} />}
    </Panel>
  );
}

/* ---------- Gráfico luta a luta ---------- */

const OUT_PT = { W: 'Vitória', L: 'Derrota', D: 'Empate', NC: 'Sem resultado', pending: '' };

function PerFightChart({ history }: { history: HistoryFight[] }) {
  const rows = useMemo(() => history.filter(h => h.stats).slice(0, 14).reverse(), [history]);
  const ink = useInk();
  const option = useMemo(() => ({
    grid: { left: 36, right: 8, top: 16, bottom: 44 },
    tooltip: {
      ...tooltipBase(ink), trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: ink.hover } },
      formatter: (ps: { dataIndex: number }[]) => {
        const h = rows[ps[0].dataIndex], s = h.stats!;
        return `<div style="font-weight:600;margin-bottom:2px">${OUT_PT[h.outcome]} vs ${h.opponent.name}</div>
          <div style="color:${ink.fg3};margin-bottom:6px">${shortEvent(h.eventName)} · ${fullDate(h.date)}</div>
          <div>Golpes sig.: <b>${s.sigLanded}</b> de ${s.sigAttempted} (${ratio(s.sigLanded, s.sigAttempted) ?? 0}%)</div>
          <div>Quedas: <b>${s.tdLanded}</b> de ${s.tdAttempted} · Knockdowns: <b>${s.kd}</b></div>
          <div style="color:${ink.fg3};margin-top:4px">${h.method ?? ''}${h.round ? ` · R${h.round} ${h.clock}` : ''}</div>`;
      },
    },
    xAxis: { type: 'category', data: rows.map(h => `${h.outcome === 'W' ? 'V' : h.outcome === 'L' ? 'D' : h.outcome}\n${lastName(h.opponent.name)}`), ...axisBase(ink), axisLabel: { ...axisBase(ink).axisLabel, interval: 0, lineHeight: 14, fontSize: 10 }, splitLine: { show: false } },
    yAxis: { type: 'value', ...axisBase(ink), axisLine: { show: false }, splitNumber: 4 },
    series: [
      { name: 'Desferidos', type: 'bar', data: rows.map(h => h.stats!.sigAttempted), barWidth: '46%', barMaxWidth: 22, barGap: '-100%', itemStyle: { color: ink.blueWash, borderRadius: [4, 4, 0, 0] }, z: 1 },
      { name: 'Conectados', type: 'bar', data: rows.map(h => h.stats!.sigLanded), barWidth: '46%', barMaxWidth: 22, itemStyle: { color: ink.blue, borderRadius: [4, 4, 0, 0] }, z: 2 },
    ],
  }), [rows, ink]);

  if (rows.length < 2) return null;
  return (
    <Panel plain title="Golpes significativos por luta" action={
      <div className="flex items-center gap-3 text-[13px] text-fg-3">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-blue" />Conectados</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-blue/25" />Desferidos</span>
      </div>}>
      <div className="-mx-2 pt-1">
        <EChart option={option} height={260} ariaLabel={`Golpes significativos conectados e desferidos nas últimas ${rows.length} lutas`} />
      </div>
    </Panel>
  );
}

/* ---------- Histórico ---------- */

function History({ history }: { history: HistoryFight[] }) {
  const [filter, setFilter] = useState<'all' | 'W' | 'L' | 'title'>('all');
  const filtered = history.filter(h => filter === 'all' || (filter === 'title' ? h.title : h.outcome === filter));
  const { sorted: rows, sort, toggle } = useSort(filtered, {
    date: h => new Date(h.date).getTime(),
    opp: h => h.opponent.name,
    method: h => h.method,
    round: h => h.seconds,
    sig: h => h.stats?.sigLanded,
    td: h => h.stats?.tdLanded,
  }, 'date');
  const titles = history.filter(h => h.title);
  return (
    <Panel
      title={<h2 className="panel-title">Histórico de lutas <span className="ml-1.5 align-middle font-sans text-[14px] font-semibold text-fg-3">{history.length} lutas</span></h2>}
      action={<Segmented value={filter} onChange={setFilter} options={[
        { value: 'all', label: 'Todas' }, { value: 'W', label: 'Vitórias' }, { value: 'L', label: 'Derrotas' },
        ...(titles.length ? [{ value: 'title' as const, label: `Títulos (${titles.length})` }] : []),
      ]} />}>
      {history.length === 0 ? <Empty>Sem lutas registradas na ESPN.</Empty> : (
        <div className="overflow-x-auto">
          <table className="table min-w-[860px]">
            <thead>
              <tr>
                <th className="w-12">Res.</th>
                <SortTh k="opp" sort={sort} toggle={toggle} first="asc">Adversário</SortTh>
                <SortTh k="method" sort={sort} toggle={toggle} first="asc">Método</SortTh>
                <th className="w-10 text-right">R</th>
                <SortTh k="round" sort={sort} toggle={toggle} className="w-20 text-right">Tempo</SortTh>
                <SortTh k="sig" sort={sort} toggle={toggle} className="text-right">Golpes sig.</SortTh>
                <SortTh k="td" sort={sort} toggle={toggle} className="text-right">Quedas</SortTh>
                <SortTh k="date" sort={sort} toggle={toggle}>Evento</SortTh>
              </tr>
            </thead>
            <tbody>
              {rows.map(h => (
                <tr key={h.fightId}>
                  <td><HistoryBadge h={h} /></td>
                  <td>
                    <Link to={fighterHref(h.opponent)} className="flex items-center gap-2.5">
                      <Avatar src={h.opponent.headshot} name={h.opponent.name} size={34} flag={h.opponent.countryCode} />
                      <span className="font-medium text-fg hover:underline hover:underline-offset-4">{h.opponent.name}</span>
                      {h.title && <Crown className="h-3.5 w-3.5 text-gold" aria-label="Disputa de título" />}
                    </Link>
                  </td>
                  <td><Link to={fightHref(h.eventId, h.fightId)} className="group/m"><span className="text-fg group-hover/m:text-brand group-hover/m:underline group-hover/m:underline-offset-4">{h.method ?? '—'}</span>{h.detail && <span className="text-fg-3"> · {h.detail}</span>}</Link></td>
                  <td className="num text-right font-mono text-fg-2">{h.round ?? '—'}</td>
                  <td className="num text-right font-mono text-fg-2">{h.clock ?? '—'}</td>
                  <td className="num text-right font-mono text-fg-2">{h.stats ? <>{h.stats.sigLanded}<span className="text-fg-3">/{h.stats.sigAttempted}</span></> : '—'}</td>
                  <td className="num text-right font-mono text-fg-2">{h.stats ? <>{h.stats.tdLanded}<span className="text-fg-3">/{h.stats.tdAttempted}</span></> : '—'}</td>
                  <td>
                    <Link to={`/eventos/${h.eventId}`} className="block max-w-[260px] hover:underline hover:underline-offset-4">
                      <div className="truncate text-fg-2">{shortEvent(h.eventName)}</div>
                      <div className="num font-mono text-[12.5px] text-fg-3">{fullDate(h.date)}{h.weightClass ? ` · ${h.weightClass}` : ''}</div>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* ---------- Resumo de carreira, próxima luta, notícias ---------- */

function CareerNumbers({ history }: { history: HistoryFight[] }) {
  const done = history.filter(h => h.outcome !== 'pending');
  const wins = done.filter(h => h.outcome === 'W');
  const finishes = wins.filter(h => h.method === 'KO/TKO' || h.method === 'Finalização').length;
  const titleFights = done.filter(h => h.title);
  const titleWins = titleFights.filter(h => h.outcome === 'W').length;
  const secs = done.map(h => h.seconds).filter((s): s is number => !!s);
  const cage = secs.reduce((a, b) => a + b, 0);
  const items = [
    { label: 'Lutas registradas', value: done.length, sub: `${wins.length} vitórias` },
    { label: 'Taxa de finalização', value: wins.length ? `${Math.round((finishes / wins.length) * 100)}%` : '—', sub: `${finishes} de ${wins.length} vitórias` },
    { label: 'Disputas de título', value: titleFights.length, sub: titleFights.length ? `${titleWins}-${titleFights.length - titleWins} nessas lutas` : 'nenhuma' },
    { label: 'Tempo de octógono', value: cage ? `${Math.floor(cage / 3600)}h ${Math.round((cage % 3600) / 60)}min` : '—', sub: secs.length ? `média ${mmss(cage / secs.length)} por luta` : undefined },
  ];
  // faixa de placar: o primeiro número (lutas) maior, os outros separados por linhas finas
  return (
    <div className="rule grid grid-cols-2 gap-y-6 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:divide-x lg:divide-line">
      {items.map((it, i) => (
        <div key={it.label} className={i ? 'lg:pl-6' : 'lg:pr-6'}>
          <div className="label">{it.label}</div>
          <div className={`display mt-1 text-fg ${i ? 'text-[44px]' : 'text-[64px]'}`}>{it.value}</div>
          {it.sub && <div className="mt-1 text-[14px] text-fg-3">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function NextFight({ h }: { h: HistoryFight }) {
  return (
    <Panel title="Próxima luta">
      <Link to={`/eventos/${h.eventId}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2/60">
        <Avatar src={h.opponent.headshot} name={h.opponent.name} size={44} />
        <div className="min-w-0">
          <div className="text-[13.5px] font-medium text-fg">vs {h.opponent.name}{h.title && <Crown className="ml-1.5 inline h-3.5 w-3.5 text-gold" />}</div>
          <div className="truncate text-[13px] text-fg-3">{shortEvent(h.eventName)} · {fullDate(h.date)}</div>
        </div>
      </Link>
    </Panel>
  );
}

/* ---------- Radar ---------- */

function RadarPanel({ p }: { p: FighterProfile }) {
  if (!hasRadar(p.stats)) return null;
  return (
    <Panel plain title="Perfil de luta" action={<span className="text-[13px] text-fg-3">UFC.com</span>}>
      <AttrRadar series={[{ name: p.bio.name, color: 'blue', stats: p.stats }]} height={280} />
      <p className="text-[12.5px] leading-relaxed text-fg-3">{RADAR_NOTE}</p>
    </Panel>
  );
}

/* ---------- Linha do tempo ---------- */

type Milestone = { label: string; tone: 'gold' | 'brand' | 'blue' };

/** Marcos da carreira em cada luta: estreia, cinturão, defesas, sequências. */
function milestones(history: HistoryFight[]) {
  const done = [...history].filter(h => h.outcome !== 'pending').reverse(); // da mais antiga para a mais recente
  const out = new Map<string, Milestone[]>();
  const push = (id: string, m: Milestone) => out.set(id, [...(out.get(id) ?? []), m]);
  const champ = new Set<string>(); let run = 0; // cinturões em posse, por divisão
  done.forEach((h, i) => {
    if (i === 0) push(h.fightId, { label: 'Primeira luta registrada', tone: 'blue' });
    const div = h.weightClass ?? '';
    if (h.title && h.outcome === 'W') { push(h.fightId, { label: champ.has(div) ? 'Defendeu o cinturão' : 'Conquistou o cinturão', tone: 'gold' }); champ.add(div); }
    else if (h.title && h.outcome === 'L' && champ.has(div)) { push(h.fightId, { label: 'Perdeu o cinturão', tone: 'brand' }); champ.delete(div); }
    else if (h.title) push(h.fightId, { label: 'Disputa de título', tone: 'gold' });
    run = h.outcome === 'W' ? run + 1 : 0;
    if (run > 0 && run % 5 === 0) push(h.fightId, { label: `${run} vitórias seguidas`, tone: 'blue' });
  });
  return out;
}


function Timeline({ history }: { history: HistoryFight[] }) {
  const [all, setAll] = useState(false);
  const marks = useMemo(() => milestones(history), [history]);
  const rows = history.filter(h => h.outcome !== 'pending');
  const shown = all ? rows : rows.slice(0, 12);
  const years = shown.reduce<{ year: string; items: HistoryFight[] }[]>((acc, h) => {
    const y = h.date.slice(0, 4);
    if (acc.at(-1)?.year !== y) acc.push({ year: y, items: [] });
    acc.at(-1)!.items.push(h);
    return acc;
  }, []);
  if (!rows.length) return <Panel><Empty>Sem lutas registradas na ESPN.</Empty></Panel>;
  return (
    <Panel plain title="Linha do tempo" action={<span className="text-[13px] text-fg-3">da mais recente para a mais antiga</span>}>
      {years.map(g => (
        <div key={g.year} className="relative">
          <div className="sticky top-[136px] z-10 -ml-1 mb-2 mt-4 inline-flex rounded-full bg-fg px-3 py-1 font-display text-[14px] font-bold text-bg">{g.year}</div>
          <ol className="relative ml-[11px] border-l-2 border-line">
            {g.items.map((h, i) => (
              <motion.li key={h.fightId} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: Math.min(i, 4) * 0.04 }}
                className="relative pb-5 pl-7 last:pb-2">
                <span className="absolute -left-[13px] top-0 rounded-full bg-surface p-0.5"><OutcomeBadge outcome={h.outcome} size="sm" /></span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link to={fighterHref(h.opponent)} className="flex items-center gap-2 font-semibold text-fg hover:underline hover:underline-offset-4">
                    <Avatar src={h.opponent.headshot} name={h.opponent.name} size={30} flag={h.opponent.countryCode} />{h.opponent.name}
                  </Link>
                  {marks.get(h.fightId)?.map(m => <Tag key={m.label} tone={m.tone}>{m.tone === 'gold' ? <Crown className="h-3 w-3" /> : <FlagIcon className="h-3 w-3" />}{m.label}</Tag>)}
                </div>
                <div className="mt-1 text-[14px] text-fg-2">
                  <Link to={fightHref(h.eventId, h.fightId)} className="hover:text-brand hover:underline hover:underline-offset-4">{h.method ?? '—'}{h.detail ? ` · ${h.detail}` : ''}</Link>
                  {h.round && <span className="num text-fg-3"> · R{h.round} {h.clock}</span>}
                </div>
                <div className="mt-0.5 text-[13px] text-fg-3">{shortEvent(h.eventName)} · {fullDate(h.date)}</div>
              </motion.li>
            ))}
          </ol>
        </div>
      ))}
      {rows.length > 12 && (
        <button className="btn mt-2" onClick={() => setAll(v => !v)}>{all ? 'Mostrar menos' : `Mostrar todas as ${rows.length} lutas`}</button>
      )}
    </Panel>
  );
}

function News({ items }: { items: FighterProfile['news'] }) {
  if (!items.length) return null;
  return (
    <Panel plain title="Notícias">
      <ul className="divide-y divide-line/70">
        {items.slice(0, 6).map(n => (
          <li key={n.url}>
            <a href={n.url} target="_blank" rel="noreferrer" className="flex gap-3 py-3 transition-colors hover:text-brand">
              <Newspaper className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-3" />
              <div className="min-w-0">
                <div className="line-clamp-2 text-[14px] leading-snug text-fg">{n.title}</div>
                <div className="mt-1 text-[13px] text-fg-3">{n.source}{n.date ? ` · ${fullDate(n.date)}` : ''}</div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ---------- Página ---------- */

export default function Fighter() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const { data: p, isLoading, isError, error, refetch } = useFighter(slug, params.get('espn'));
  const [tab, setTab] = useState<'geral' | 'historico' | 'carreira'>('geral');

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-60" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
      <p className="text-center text-[13px] text-fg-3">Consultando UFC.com e ESPN: o primeiro carregamento de um lutador leva alguns segundos.</p>
    </div>
  );
  if (isError || !p) return (
    <Panel><ErrorState message={error?.message} onRetry={() => refetch()} />
      <div className="pb-8 text-center"><Link to="/lutadores" className="btn-ghost"><ArrowLeft className="h-3.5 w-3.5" /> Voltar para lutadores</Link></div>
    </Panel>
  );

  return (
    <div className="space-y-6">
      <Header p={p} />
      <CareerNumbers history={p.history} />
      <div className="sticky top-[84px] z-20 -mx-1 flex justify-center px-1 py-1">
        <Segmented value={tab} onChange={setTab} className="shadow-[var(--shadow-lift)]" options={[
          { value: 'geral', label: 'Visão geral' }, { value: 'historico', label: `Histórico (${p.history.length})` }, { value: 'carreira', label: 'Linha do tempo' },
        ]} />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
          {tab === 'geral' && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-6">
                <WinKpis s={p.stats} history={p.history} />
                <OfficialPanel s={p.stats} />
                <PerFightChart history={p.history} />
                <Breakdowns s={p.stats} history={p.history} />
              </div>
              <aside className="space-y-6">
                {p.nextFight && <NextFight h={p.nextFight} />}
                <RadarPanel p={p} />
                <Bio p={p} />
                <News items={p.news} />
              </aside>
            </div>
          )}
          {tab === 'historico' && <History history={p.history} />}
          {tab === 'carreira' && <Timeline history={p.history} />}
        </motion.div>
      </AnimatePresence>
      <p className="text-[13px] text-fg-3">Fontes: {p.sources.join(' · ')}. Estatísticas oficiais cobrem só as lutas no UFC; o histórico inclui o que a ESPN registra.</p>
    </div>
  );
}
