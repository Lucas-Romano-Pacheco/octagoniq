import { useEffect, useMemo, useState, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, CaretLeft, CaretRight, ArrowsLeftRight, CalendarDots, Crown, Lightning, MapPin, Timer, Trophy } from '@phosphor-icons/react';
import type { Fight, FighterRef } from '@shared/types';
import { fightHref, fighterHref, useBonuses, useEvent, useRankings, useRankingsMeta, useSchedule, useUpcoming, type UpcomingEvent } from '@/lib/api';
import { capitalize, dayMonth, mmss, fullDate, lastName, longDate, splitEventName, time, weekday, weightPhrase } from '@/lib/format';
import { FightRow } from '@/components/FightRow';
import { cardSummary, fightSeconds, winnerChance } from '@/lib/fights';
import { fairProbs, fmtMoneyline } from '@shared/format';
import { SERIES_LABEL, SERIES_TONE } from '@/lib/series';
import { Avatar, Brush, Defer, morphPhoto, OctagonFrame, Empty, ErrorState, Flag, FlagBackdrop, LiveTag, Panel, Reveal, SectionTitle, Skeleton, Tag } from '@/components/kit';
import { proxy } from '@/lib/img';

/* ---------- Hero ---------- */

function useClock(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

function Countdown({ iso }: { iso: string }) {
  const now = useClock();
  const ms = Math.max(0, new Date(iso).getTime() - now);
  const parts = [
    { v: Math.floor(ms / 864e5), l: 'dias' },
    { v: Math.floor(ms / 36e5) % 24, l: 'horas' },
    { v: Math.floor(ms / 6e4) % 60, l: 'min' },
    { v: Math.floor(ms / 1e3) % 60, l: 'seg' },
  ];
  return (
    <div className="flex gap-2">
      {parts.map(p => (
        <div key={p.l} className="w-[52px] text-center">
          <div className="num font-display text-[24px] font-semibold leading-none text-fg">{String(p.v).padStart(2, '0')}</div>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-fg-3">{p.l}</div>
        </div>
      ))}
    </div>
  );
}

/** Recorte de corpo inteiro do UFC.com; cai para a foto da ESPN se não houver. */
function Cutout({ f, mirrored, className }: { f: FighterRef; mirrored?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!f.bodyImage || failed) return <Avatar src={f.headshot} name={f.name} size={180} className={className} />;
  return (
    <img src={proxy(f.bodyImage, 760)} alt={f.name} fetchPriority="high" decoding="async" onError={() => setFailed(true)}
      className={`${className} h-full w-auto object-contain object-bottom drop-shadow-[0_30px_40px_var(--cutout-shadow)] [mask-image:linear-gradient(to_bottom,black_80%,transparent)] ${mirrored ? '-scale-x-100' : ''}`} />
  );
}

/** Posição do brilho relativa à camada de largura total (não à seção). */
function moveGlow(e: PointerEvent<HTMLElement>) {
  const g = e.currentTarget.querySelector<HTMLElement>('[data-glow]');
  if (!g) return;
  const r = g.getBoundingClientRect();
  g.style.setProperty('--mx', `${e.clientX - r.left}px`);
  g.style.setProperty('--my', `${e.clientY - r.top}px`);
  g.style.opacity = '1';
}

function Hero({ e }: { e: UpcomingEvent }) {
  const reduce = useReducedMotion();
  const { series } = splitEventName(e.name);
  const m = e.main;
  const fade = (d: number) => (reduce ? {} : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] as const } });

  return (
    // brilho dourado que segue o cursor, só em disputa de cinturão (dourado é a cor do título);
    // a camada ocupa a largura da janela e esmaece nas bordas, sem caixa visível
    <section onPointerMove={m?.title ? moveGlow : undefined} className="relative grid items-center gap-10 pb-10 pt-6 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-16">
      {m?.title && <div aria-hidden data-glow className="hero-glow" />}

      <div className="relative">
        {e.status === 'in' && <motion.div {...fade(0)} className="mb-4"><LiveTag /></motion.div>}
        {m ? (
          <motion.h1 {...fade(0.08)} className="display break-words text-[44px] text-fg sm:text-[72px] xl:text-[72px]">
            {lastName(m.red.name)}
            <br />
            <span className="relative inline-block">
              <span className="text-fg-3">×</span> {lastName(m.blue.name)}
              <Brush className="absolute -bottom-2 left-[18%] h-4 w-[82%] sm:-bottom-3 sm:h-5" />
            </span>
          </motion.h1>
        ) : <h1 className="display mt-5 text-[64px] text-fg">{series}</h1>}
        <motion.p {...fade(0.16)} className="mt-8 max-w-[520px] text-[16px] leading-[1.75] text-fg-2">
          <b className="font-semibold text-fg">{series}</b> · {m?.title ? <>disputa de cinturão do {weightPhrase(m.weightClass)}. </> : m ? <>luta principal no {weightPhrase(m.weightClass)}. </> : null}
          {capitalize(longDate(e.date))}, às {time(e.date)} (Brasília){e.venue ? `, na ${e.venue}` : ''}. {e.fightCount} lutas no card.
        </motion.p>
        <motion.div {...fade(0.24)} className="mt-10 flex flex-wrap items-center gap-6">
          <Link to={`/eventos/${e.id}`} className="btn-primary">Ver as {e.fightCount} lutas <ArrowRight className="h-4 w-4" /></Link>
          {m && (
            <Link to={`/comparar?a=${m.red.slug}&ae=${m.red.espnId}&b=${m.blue.slug}&be=${m.blue.espnId}`} className="group flex items-center gap-3 text-[16px] font-semibold text-fg-2 hover:text-fg">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-white shadow-[0_14px_28px_-10px_rgb(214_40_57/0.7)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:brightness-110 group-hover:shadow-[0_20px_34px_-10px_rgb(214_40_57/0.8)]">
                <ArrowsLeftRight className="h-5 w-5" />
              </span>
              Comparar {lastName(m.red.name)} e {lastName(m.blue.name)}
            </Link>
          )}
        </motion.div>
      </div>

      {/* Lado direito: moldura em octógono, recortes frente a frente e cartões flutuantes */}
      {m && (
        <div className="relative mx-auto h-[420px] w-full max-w-[600px] sm:h-[540px]">
          {/* octógono com a bandeira de cada lutador do seu lado, esmaecendo até o centro */}
          <OctagonFrame className="bottom-0 left-1/2 h-[90%] -translate-x-1/2">
            <div className="absolute inset-0 bg-cream" />
            <FlagBackdrop code={m.red.countryCode} shape="fade-right" className="inset-y-0 left-0 w-[62%] opacity-40 dark:opacity-30" />
            <FlagBackdrop code={m.blue.countryCode} shape="fade-left" className="inset-y-0 right-0 w-[62%] opacity-40 dark:opacity-30" />
          </OctagonFrame>

          <motion.div initial={reduce ? false : { opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 left-[2%] h-[94%]">
            <Link to={fighterHref(m.red)} aria-label={m.red.name}><Cutout f={m.red} className="h-full" /></Link>
          </motion.div>
          <motion.div initial={reduce ? false : { opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 right-[2%] h-[94%]">
            <Link to={fighterHref(m.blue)} aria-label={m.blue.name}><Cutout f={m.blue} mirrored className="h-full" /></Link>
          </motion.div>

          {/* cartão: contagem regressiva */}
          <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6 }}
            className="cut absolute -bottom-4 left-1/2 w-max -translate-x-1/2 rounded-xl bg-surface/95 px-5 py-4 shadow-[var(--shadow-lift)] backdrop-blur">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-fg-2"><Timer className="h-3.5 w-3.5 text-brand" /> {e.status === 'in' ? 'Acontecendo agora' : 'Começa em'}</div>
            {e.status === 'in' ? <LiveTag /> : <Countdown iso={e.date} />}
          </motion.div>

          {/* cartões: cada canto */}
          {[{ f: m.red, side: 'left-0 top-[60%] sm:-left-6', dot: 'bg-red' }, { f: m.blue, side: 'right-0 top-[50%] sm:-right-6', dot: 'bg-blue' }].map(({ f, side, dot }, i) => (
            <motion.div key={f.espnId} initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 + i * 0.1, duration: 0.5 }}
              className={`absolute ${side} cut hidden items-center gap-3 rounded-xl bg-surface/95 py-2.5 pl-2.5 pr-4 shadow-[var(--shadow-lift)] backdrop-blur sm:flex`}>
              <Avatar src={f.headshot} name={f.name} size={38} />
              <div>
                <div className="flex items-center gap-1.5 text-[14px] font-bold text-fg"><span className={`h-2 w-2 rounded-full ${dot}`} />{f.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-fg-2"><Flag code={f.countryCode} src={f.flag} title={f.country} size={16} /><span>{f.country}</span><span className="text-fg-3">·</span><span className="num font-semibold">{f.record}</span></div>
              </div>
            </motion.div>
          ))}
          {m.title && (
            <motion.div initial={reduce ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
              className="absolute left-1/2 top-2 -translate-x-1/2">
              <Tag tone="gold" className="h-8 px-3.5 text-[13px] shadow-[var(--shadow-soft)]"><Crown className="h-4 w-4" /> Cinturão · {m.weightClass}</Tag>
            </motion.div>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- Campeões (carrossel no estilo "Top Destinations") ---------- */

const headshot = (espnId?: string) => (espnId ? `https://a.espncdn.com/i/headshots/mma/players/full/${espnId}.png` : undefined);

/* ---------- Mosaico (bento) ---------- */

type Slide = { key: string; label: string; icon: React.ReactNode; title: string; sub: string; href: string; faces: FighterRef[] };

/** Destaques do último evento, um por vez, com setas: zebra, maior favorito, bônus do UFC, finalização mais rápida… */
function Highlight({ lastId }: { lastId?: string }) {
  const { data: ev } = useEvent(lastId);
  const { data: bonus } = useBonuses(lastId);
  const [i, setI] = useState(0);
  const tile = 'panel h-full overflow-hidden p-5 sm:p-7';
  const last = (n: string) => n.split(' ').slice(-1)[0];
  const slides: Slide[] = [];
  if (ev) {
    const done = ev.fights.filter(f => f.result?.winnerId);
    const href = (f: Fight) => fightHref(ev.id, f.id);
    const winLose = (f: Fight) => (f.result!.winnerId === f.red.espnId ? [f.red, f.blue] : [f.blue, f.red]);
    const how = (f: Fight) => `${f.result!.method}${f.result!.round ? `, R${f.result!.round} ${f.result!.clock}` : ''}`;
    const z = cardSummary(ev.fights).biggestUpset;
    if (z) {
      const [w, l] = winLose(z);
      slides.push({ key: 'zebra', label: 'Zebra do evento', icon: <Lightning weight="fill" className="h-3.5 w-3.5 text-orange-fill" />, title: `${last(w.name)} venceu ${last(l.name)}`,
        sub: `${fmtMoneyline(z.result!.winnerId === z.red.espnId ? z.odds?.red : z.odds?.blue)} · só ${Math.round((winnerChance(z) ?? 0) * 100)}% de chance pelas odds · ${how(z)}`, href: href(z), faces: [w, l] });
    }
    // maior favorito do card (com odds): confirmou ou não
    const fav = done.map(f => { const p = fairProbs(f.odds?.red, f.odds?.blue); return p ? { f, side: p[0] >= p[1] ? f.red : f.blue, p: Math.max(...p) } : null; })
      .filter(Boolean).sort((x, y) => y!.p - x!.p)[0];
    if (fav) {
      const won = fav.f.result!.winnerId === fav.side.espnId, opp = fav.side === fav.f.red ? fav.f.blue : fav.f.red;
      slides.push({ key: 'fav', label: 'Maior favorito da noite', icon: <Crown weight="fill" className="h-3.5 w-3.5 text-gold" />, title: `${last(fav.side.name)} ${won ? 'confirmou' : 'caiu'} contra ${last(opp.name)}`,
        sub: `${Math.round(fav.p * 100)}% de chance pelas odds · ${how(fav.f)}`, href: href(fav.f), faces: [fav.side, opp] });
    }
    // bônus oficiais do UFC
    const byName = (n: string) => done.find(f => [f.red, f.blue].some(x => last(x.name).toLowerCase() === last(n).toLowerCase()));
    for (const pair of bonus?.fight ?? []) {
      const f = byName(pair[0]);
      if (f) slides.push({ key: `fotn-${f.id}`, label: 'Luta da noite (bônus do UFC)', icon: <Trophy weight="fill" className="h-3.5 w-3.5 text-gold" />, title: `${last(f.red.name)} × ${last(f.blue.name)}`, sub: how(f), href: href(f), faces: [f.red, f.blue] });
    }
    for (const n of bonus?.performance ?? []) {
      const f = byName(n);
      if (!f) continue;
      const me = [f.red, f.blue].find(x => last(x.name).toLowerCase() === last(n).toLowerCase())!, opp = me === f.red ? f.blue : f.red;
      slides.push({ key: `potn-${n}`, label: 'Performance da noite (bônus do UFC)', icon: <Trophy weight="fill" className="h-3.5 w-3.5 text-gold" />, title: `${last(me.name)} sobre ${last(opp.name)}`, sub: how(f), href: href(f), faces: [me, opp] });
    }
    // finalização mais rápida e luta mais longa
    const finishes = done.filter(f => !/Decis/.test(f.result!.method) && fightSeconds(f) !== undefined).sort((x, y) => fightSeconds(x)! - fightSeconds(y)!);
    if (finishes[0]) {
      const [w, l] = winLose(finishes[0]);
      slides.push({ key: 'fast', label: 'Vitória mais rápida', icon: <Timer weight="fill" className="h-3.5 w-3.5 text-brand" />, title: `${last(w.name)} em ${mmss(fightSeconds(finishes[0]))}`, sub: `contra ${l.name} · ${how(finishes[0])}`, href: href(finishes[0]), faces: [w, l] });
    }
  }
  if (!slides.length) return <div className={tile}><Skeleton className="h-20" /></div>;
  const k = ((i % slides.length) + slides.length) % slides.length, sl = slides[k];
  return (
    <div className={`${tile} relative`}>
      <div className="flex items-center justify-between gap-3">
        <div className="label flex items-center gap-1.5">{sl.icon} {sl.label}{ev && !sl.key.startsWith('title') && <span className="normal-case tracking-normal text-fg-3">· {splitEventName(ev.name).series}</span>}</div>
        {slides.length > 1 && (
          <div className="flex shrink-0 items-center gap-1">
            <span className="num mr-1 text-[13px] text-fg-3">{k + 1}/{slides.length}</span>
            <button onClick={() => setI(k - 1)} aria-label="Destaque anterior" className="lift grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-fg-2"><CaretLeft weight="bold" className="h-3.5 w-3.5" /></button>
            <button onClick={() => setI(k + 1)} aria-label="Próximo destaque" className="lift grid h-8 w-8 place-items-center rounded-full bg-fg text-bg"><CaretRight weight="bold" className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={sl.key} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
          <Link to={sl.href} className="group mt-3 flex items-center gap-5">
            <span className="flex shrink-0">
              <Avatar src={sl.faces[0]?.headshot} name={sl.faces[0]?.name ?? ''} size={84} flag={sl.faces[0]?.countryCode} />
              {sl.faces[1] && <Avatar src={sl.faces[1].headshot} name={sl.faces[1].name} size={60} className="-ml-4 mt-6 opacity-80" />}
            </span>
            <div className="min-w-0">
              <h3 className="display line-clamp-2 text-[32px] leading-[1] text-fg group-hover:text-brand">{sl.title}</h3>
              <p className="mt-1 text-[14px] text-fg-3">{sl.sub}</p>
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Bento({ next, lastId }: { next?: UpcomingEvent; lastId?: string }) {
  const { data } = useRankings();
  const { data: meta } = useRankingsMeta();
  const [women, setWomen] = useState(false);
  const p4p = data?.divisions.find(d => d.p4p && d.women === women);
  const champs = data?.divisions.filter(d => !d.p4p && d.champion) ?? [];
  const byCountry = Object.entries(champs.reduce<Record<string, { country?: string; n: number }>>((acc, d) => {
    const m = meta?.[d.champion!.slug];
    if (m?.countryCode) acc[m.countryCode] = { country: m.country, n: (acc[m.countryCode]?.n ?? 0) + 1 };
    return acc;
  }, {})).sort((x, y) => y[1].n - x[1].n);
  const m = next?.main;
  const tile = 'panel h-full overflow-hidden p-5 sm:p-7';

  return (
    <section className="min-h-[760px] py-10 lg:min-h-[640px]">
      <Reveal><SectionTitle title="O UFC agora" /></Reveal>
      <div className="grid auto-rows-[minmax(210px,auto)] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* P4P top 5 */}
        <Reveal className="md:row-span-2 lg:col-span-2">
          <div className={tile}>
            <div className="flex items-center justify-between">
              <div><div className="label">Peso por peso · {women ? 'feminino' : 'masculino'}</div><h3 className="panel-title mt-1">Top 5 do UFC</h3></div>
              <div className="flex items-center gap-1">
                <Link to={p4p ? `/rankings/${p4p.id}` : '/rankings'} className="btn-ghost">Ranking <ArrowUpRight className="h-4 w-4" /></Link>
                <button onClick={() => setWomen(w => !w)} aria-label={women ? 'Ver peso por peso masculino' : 'Ver peso por peso feminino'}
                  className="lift grid h-9 w-9 place-items-center rounded-full bg-fg text-bg">
                  {women ? <CaretLeft weight="bold" className="h-4 w-4" /> : <CaretRight weight="bold" className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
            <motion.ol key={String(women)} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }} className="mt-4 space-y-1">
              {(p4p?.entries.slice(0, 5) ?? []).map(e => {
                const mm = meta?.[e.slug];
                return (
                  <li key={e.slug}>
                    <Link to={fighterHref({ slug: e.slug, espnId: mm?.espnId })} viewTransition onClick={morphPhoto} className="flex items-center gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-surface-2/70 sm:gap-4 sm:px-2">
                      <span className="num w-6 text-right font-display text-[20px] font-semibold text-fg-3">{e.rank}</span>
                      <Avatar src={headshot(mm?.espnId)} name={e.name} size={52} flag={mm?.countryCode} className="max-sm:-mr-1" />
                      <span className="min-w-0 flex-1 line-clamp-2 text-[18px] font-bold leading-tight text-fg sm:text-[18px]">{e.name}</span>
                      <span className="num text-[16px] font-semibold text-fg-2">{mm?.record}</span>
                    </Link>
                  </li>
                );
              })}
              {!p4p && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </motion.ol>
            </AnimatePresence>
          </div>
        </Reveal>

        {/* zebra do último evento; sem zebra, a próxima disputa de cinturão (o próximo evento já está no topo) */}
        <Reveal delay={0.05} className="lg:col-span-2"><Highlight lastId={lastId} /></Reveal>

        {/* campeões por país */}
        <Reveal delay={0.1}>
          <div className={tile}>
            <div className="label">Cinturões</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="display text-[64px] leading-[0.85] text-fg">{champs.length}</span>
              <span className="text-[14px] text-fg-3">campeões de {byCountry.length} países</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {byCountry.map(([code, v]) => (
                <span key={code} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1.5 pl-1.5 pr-3 text-[16px] font-semibold text-fg-2">
                  <Flag code={code} title={v.country} size={26} />{v.n}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* atalho para comparar */}
        <Reveal delay={0.15}>
          {m ? (
            <Link to={`/comparar?a=${m.red.slug}&ae=${m.red.espnId}&b=${m.blue.slug}&be=${m.blue.espnId}`} className="block h-full">
              <div className={`${tile} group flex flex-col items-center justify-between text-center transition-colors hover:bg-surface-2/60`}>
                <div className="label">Frente a frente</div>
                <div className="my-4 flex w-full items-center justify-center">
                  <Avatar src={m.red.headshot} name={m.red.name} size={116} ring="var(--color-red)" flag={m.red.countryCode} />
                  <span className="z-10 -mx-2 grid h-10 w-10 place-items-center rounded-full bg-fg font-display text-[13px] font-bold text-bg ring-4 ring-surface">VS</span>
                  <Avatar src={m.blue.headshot} name={m.blue.name} size={116} ring="var(--color-blue)" flag={m.blue.countryCode} />
                </div>
                <div className="font-display text-[18px] font-bold uppercase leading-tight text-fg">{lastName(m.red.name)} × {lastName(m.blue.name)}</div>
                <div className="mt-2 flex items-center gap-1.5 text-[14px] font-semibold text-fg-2 group-hover:text-brand">Comparar a luta principal <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
              </div>
            </Link>
          ) : <Skeleton className="h-full" />}
        </Reveal>
      </div>
    </section>
  );
}

function Champions() {
  const { data, isPending: isLoading, isError, refetch } = useRankings();
  const { data: meta } = useRankingsMeta();
  const divs = data?.divisions.filter(d => d.champion) ?? [];
  return (
    <section className="py-12">
      <Reveal>
        <SectionTitle title="Os donos dos cinturões" action={<Link to="/rankings" className="btn">Todos os rankings <ArrowUpRight className="h-4 w-4" /></Link>} />
      </Reveal>
      {isError && <Panel><ErrorState onRetry={() => refetch()} /></Panel>}
      {isLoading && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[210px]" />)}</div>}
      {divs.length > 0 && (
        <Reveal delay={0.1}>
          {/* todos os cinturões de uma vez (o carrossel escondia 7 dos 11) */}
          <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {divs.map(d => {
              const c = d.champion!, mm = meta?.[c.slug];
              return (
                <Link key={d.id} to={fighterHref({ slug: c.slug, espnId: mm?.espnId })} className="cut group block overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                  <div className="relative h-[170px] overflow-hidden bg-cream lg:h-[150px]">
                    <FlagBackdrop code={mm?.countryCode} className="inset-0 opacity-45 dark:opacity-35" />
                    {c.image && <img src={proxy(c.image, 640)} alt="" loading="lazy" decoding="async" className="absolute bottom-0 left-1/2 h-[96%] w-auto max-w-none -translate-x-1/2 object-contain transition-transform duration-500 group-hover:scale-[1.05]" />}
                  </div>
                  <div className="px-4 pb-4 pt-3.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex min-w-0 items-center gap-1 text-[13px] font-semibold text-fg-3"><Crown weight="fill" className="h-3.5 w-3.5 shrink-0 text-gold" /><span className="truncate">{d.name}</span></span>
                      {mm && <Flag code={mm.countryCode} title={mm.country} size={16} />}
                    </div>
                    <div className="mt-1 line-clamp-2 font-display text-[18px] font-bold uppercase leading-tight text-fg group-hover:text-brand">{c.name}</div>
                    {mm?.record && <div className="num text-[14px] font-semibold text-fg-3">{mm.record}</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </Reveal>
      )}
    </section>
  );
}

/* ---------- Card de um evento ---------- */

function EventCard({ id, eyebrow, title, limit = 6 }: { id?: string; eyebrow: string; title: string; limit?: number }) {
  const { data, isPending, isError, refetch } = useEvent(id);
  const isLoading = isPending && !!id; // sem id (consulta desligada) não há o que esperar
  const fights = data?.fights.filter(f => f.segment === 'main').slice(0, limit) ?? [];
  // evento encerrado: uma linha-resumo da noite inteira ("4 nocautes · 1 zebra · 2 no 1º round")
  const sum = data?.status === 'post' ? cardSummary(data.fights) : null;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const line = sum && [
    sum.ko && plural(sum.ko, 'nocaute', 'nocautes'), sum.sub && plural(sum.sub, 'finalização', 'finalizações'),
    sum.upsets && plural(sum.upsets, 'zebra', 'zebras'), sum.r1 && `${sum.r1} no 1º round`,
  ].filter(Boolean).join(' · ');
  return (
    <Panel eyebrow={eyebrow}
      title={<div><h2 className="panel-title">{title}</h2>{data && <p className="mt-0.5 truncate text-[14px] text-fg-3">{data.name} · {fullDate(data.date)}</p>}
        {line && <p className="mt-1.5 text-[14px] font-semibold text-fg-2">{line}</p>}</div>}
      action={id && <Link to={`/eventos/${id}`} className="btn-ghost shrink-0">{data ? `Ver as ${data.fights.length} lutas` : 'Ver evento'} <ArrowRight className="h-4 w-4" /></Link>}
      bodyClass="divide-y divide-line/70 px-2 pb-2">
      {isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="px-4 py-4"><Skeleton className="h-12" /></div>)}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {fights.map(f => <FightRow key={f.id} fight={f} eventId={id} compact />)}
    </Panel>
  );
}

/* ---------- Agenda: a cor de cada data é o tipo do evento (mesma legenda do calendário) ---------- */


function Agenda({ events }: { events: UpcomingEvent[] }) {
  return (
    <div>
      <h2 className="display text-[32px] text-fg">Próximas datas</h2>
      <ul className="mt-6 space-y-3">
        {events.map(e => {
          const { series, title } = splitEventName(e.name);
          return (
            <li key={e.id}>
              <Link to={`/eventos/${e.id}`} className="group flex items-center gap-4 rounded-xl p-2 pr-4 transition-all hover:bg-surface hover:shadow-[var(--shadow-soft)]">
                <div className={`cut grid h-14 w-14 shrink-0 place-items-center rounded-xl ${SERIES_TONE[e.series]}`} title={SERIES_LABEL[e.series]}>
                  <div className="text-center leading-none">
                    <div className="num font-display text-[20px] font-semibold">{dayMonth(e.date).split(' ')[0]}</div>
                    <div className="mt-0.5 text-[12px] font-bold uppercase tracking-wider">{dayMonth(e.date).split(' ')[1]}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-bold text-fg">{title || series}</div>
                  <div className="flex items-center gap-1.5 truncate text-[14px] text-fg-3">
                    {title ? `${series} · ` : ''}<MapPin className="h-3 w-3 shrink-0" />{e.city || 'Local a definir'}
                  </div>
                </div>
                {e.status === 'in' ? <LiveTag /> : <span className="num hidden text-[14px] font-semibold text-fg-3 sm:block">{weekday(e.date)} · {time(e.date)}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-fg-3">
        {(['ppv', 'fight-night'] as const).map(k => <span key={k} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-md ${SERIES_TONE[k].split(' ')[0]}`} />{SERIES_LABEL[k]}</span>)}
      </div>
      <Link to="/eventos" className="btn mt-5"><CalendarDots className="h-4 w-4" /> Calendário completo</Link>
    </div>
  );
}

/* ---------- Página ---------- */

export default function Home() {
  const upcoming = useUpcoming(10);
  const schedule = useSchedule(new Date().getFullYear());
  const ufcOnly = (upcoming.data ?? []).filter(e => e.series !== 'dwcs');
  const next = ufcOnly[0];

  const lastId = useMemo(() => {
    const now = Date.now();
    return [...(schedule.data ?? [])].reverse().find(e => e.series !== 'dwcs' && new Date(e.date).getTime() < now - 6 * 3600_000)?.id;
  }, [schedule.data]);

  return (
    <div>
      {/* esqueleto com a altura do destaque real (927 px no celular, 628 no desktop): o mosaico abaixo não salta quando os dados chegam */}
      {upcoming.isPending && (
        <div className="grid min-h-[927px] items-center gap-10 pb-10 pt-6 sm:min-h-[999px] lg:min-h-[628px] lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-5"><Skeleton className="h-4 w-60" /><Skeleton className="h-24 w-[90%]" /><Skeleton className="h-24 w-[60%]" /><Skeleton className="h-16 max-w-[520px]" /><Skeleton className="h-12 w-56 rounded-full" /></div>
          <div className="mx-auto aspect-square w-full max-w-[420px] skeleton" style={{ clipPath: 'polygon(29.3% 0, 70.7% 0, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0 70.7%, 0 29.3%)' }} />
        </div>
      )}
      {upcoming.isError && <Panel><ErrorState onRetry={() => upcoming.refetch()} /></Panel>}
      {next && <Hero e={next} />}
      {!upcoming.isPending && !next && <Panel><Empty>Octógono vazio: nenhum evento anunciado por enquanto.</Empty></Panel>}

      <Bento next={next} lastId={lastId} />
      <Defer minHeight={520}><Champions /></Defer>

      <Defer minHeight={1400}>
        <section className="grid gap-10 py-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-8">
            {next && <Reveal><EventCard id={next.id} eyebrow="Próximo evento" title="Card principal" /></Reveal>}
            <Reveal delay={0.05}><EventCard id={lastId} eyebrow="Encerrado" title="Últimos resultados" /></Reveal>
          </div>
          {ufcOnly.length > 1 && <Reveal delay={0.1}><Agenda events={ufcOnly.slice(1, 7)} /></Reveal>}
        </section>
      </Defer>
    </div>
  );
}
