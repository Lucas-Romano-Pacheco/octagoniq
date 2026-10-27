import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, CaretLeft, CaretRight, ArrowsLeftRight, Crown, Lightning, MapPin, Timer, Trophy } from '@/components/icons';
import type { Fight, FighterRef } from '@shared/types';
import { TrendingFighters } from '@/components/TrendingFighters';
import { fightHref, fighterHref, useBonuses, useEvent, useRankings, useLastEvent, useRankingsMeta, useSchedule, useUpcoming, type UpcomingEvent } from '@/lib/api';
import { capitalize, dayLong, dayMonth, inDays, weekdayLong, mmss, lastName, longDate, splitEventName, time, weekday, weightPhrase } from '@/lib/format';
import { FightRow } from '@/components/FightRow';
import { cardSummary, fightSeconds, winnerChance } from '@/lib/fights';
import { fairProbs, fmtMoneyline, inLiveWindow } from '@shared/format';
import { SERIES_LABEL, SERIES_TONE } from '@/lib/series';
import { NightStories } from '@/components/NightStories';
import { Avatar, BeltIcon, Brush, CountUp, Defer, Empty, ErrorState, Flag, FlagBackdrop, LiveTag, Loading, morphPhoto, OctagonFrame, Panel, Reveal, SectionTitle, Segmented, Skeleton, Spotlight, Tag } from '@/components/kit';
import { proxy } from '@/lib/img';
import { useSplashGone } from '@/lib/splash';

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
          <div className="mt-1 text-[12px] font-semibold text-fg-3">{p.l}</div>
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
    // brilho dourado que segue o cursor (mais forte em disputa de cinturão: dourado é a cor do título);
    // a camada ocupa a largura da janela e esmaece nas bordas, sem caixa visível
    <section onPointerMove={moveGlow} className="relative grid items-center gap-8 pb-10 pt-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-4 lg:pb-14">
      <div aria-hidden data-glow data-title={m?.title ? '' : undefined} className="hero-glow" />

      <div className="relative">
        {e.status === 'in' && <motion.div {...fade(0)} className="mb-4"><LiveTag /></motion.div>}
        {m ? (
          // os dois nomes empilhados, cada um com o primeiro nome pequeno em cima e a cor do seu canto no "vs"
          <motion.h1 {...fade(0.08)} className="text-fg">
            {[m.red, m.blue].map((f, i) => (
              <span key={f.espnId} className="block">
                {i === 1 && <span className="my-1 flex items-center gap-3 font-display text-[18px] font-bold uppercase tracking-[0.08em] text-fg-3 sm:text-[22px]">
                  <span className="h-[2px] w-8 bg-red" />vs<span className="h-[2px] w-8 bg-blue" /></span>}
                <span className="block font-display text-[16px] font-semibold text-fg-2 sm:text-[20px]">{f.name.split(' ').slice(0, -1).join(' ')}</span>
                <span className={`relative inline-block display break-words text-[56px] leading-[0.88] sm:text-[88px] xl:text-[104px]`}>
                  {lastName(f.name)}
                  {i === 1 && <Brush className="absolute -bottom-2 left-[8%] h-4 w-[92%] sm:-bottom-3 sm:h-5" />}
                </span>
              </span>
            ))}
          </motion.h1>
        ) : <h1 className="display mt-5 text-[64px] text-fg">{series}</h1>}

        {/* fatos em três colunas no lugar do parágrafo longo */}
        <motion.dl {...fade(0.16)} className="mt-8 grid max-w-[560px] grid-cols-3 gap-4 border-t border-line pt-4">
          {[
            ['Quando', `${capitalize(weekdayLong(e.date))}, ${dayMonth(e.date)}`, `${time(e.date)} de Brasília`],
            ['Onde', e.venue ?? 'A definir', e.city?.split(',')[0] ?? ''],
            ['O card', `${e.fightCount} lutas`, m ? (m.title ? `cinturão do ${weightPhrase(m.weightClass).replace(/^peso-/, '')}` : `principal no ${m.weightClass.toLowerCase()}`) : series],
          ].map(([k, v, sub]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[14px] text-fg-3">{k}</dt>
              <dd className="mt-1 truncate font-display text-[20px] font-bold leading-tight text-fg">{v}</dd>
              <dd className="truncate text-[14px] text-fg-2">{sub}</dd>
            </div>
          ))}
        </motion.dl>
        <motion.div {...fade(0.24)} className="mt-8 flex flex-wrap items-center gap-6">
          <Link to={`/eventos/${e.id}`} viewTransition className="btn-primary">Ver o card <ArrowRight className="h-4 w-4" /></Link>
          {m && (
            <Link to={`/comparar?a=${m.red.slug}&ae=${m.red.espnId}&b=${m.blue.slug}&be=${m.blue.espnId}`} className="group flex items-center gap-3 text-[16px] font-semibold text-fg-2 hover:text-fg">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-white transition duration-200 group-hover:-translate-y-0.5 group-hover:brightness-110">
                <ArrowsLeftRight className="h-5 w-5" />
              </span>
              Comparar os dois
            </Link>
          )}
        </motion.div>
      </div>

      {/* Lado direito: cada lutador no seu octógono, com a bandeira inteira atrás; afastados, encarando-se */}
      {m && (
        <div className="relative mx-auto h-[400px] w-full max-w-[680px] sm:h-[540px]">
          {([[m.red, 'left', -30], [m.blue, 'right', 30]] as const).map(([f, side, dx], i) => (
            <motion.div key={f.espnId} initial={reduce ? false : { opacity: 0, x: dx }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} h-full w-[50%]`}>
              <OctagonFrame className="top-[8%] left-1/2 h-auto w-[104%] -translate-x-1/2 aspect-square">
                <div className="absolute inset-0 bg-cream" />
                <FlagBackdrop code={f.countryCode} shape="rect" className="inset-0 opacity-60 dark:opacity-45" />
                <div className="absolute inset-0" style={{ boxShadow: `inset 0 -80px 60px -40px var(--color-bg)` }} />
              </OctagonFrame>
              <span aria-hidden className={`absolute bottom-0 left-1/2 h-1 w-[40%] -translate-x-1/2 rounded-full ${side === 'left' ? 'bg-red' : 'bg-blue'}`} />
              <Link to={fighterHref(f)} aria-label={f.name} className="absolute inset-x-0 bottom-0 flex h-[96%] justify-center">
                <Cutout f={f} mirrored={side === 'right'} className="h-full" />
              </Link>
              {/* cartão do canto, colado embaixo de cada um */}
              <div className={`cut absolute bottom-[12%] ${side === 'left' ? 'left-0 sm:-left-4' : 'right-0 sm:-right-4'} hidden items-center gap-2 rounded-xl bg-surface/95 py-2 pl-2 pr-3 shadow-[var(--shadow-lift)] backdrop-blur sm:flex`}>
                <Flag code={f.countryCode} src={f.flag} title={f.country} size={22} />
                <div className="leading-tight">
                  <div className="font-display text-[15px] font-bold text-fg">{f.country}</div>
                  <div className="num text-[14px] font-semibold text-fg-2">{f.record}</div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* contagem regressiva, no meio entre os dois */}
          <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.6 }}
            className="cut absolute -bottom-4 left-1/2 z-10 w-max -translate-x-1/2 rounded-xl bg-surface/95 px-5 py-4 shadow-[var(--shadow-lift)] backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-fg-2"><Timer className="h-3.5 w-3.5 text-brand" /> {e.status === 'in' || Date.parse(e.date) <= Date.now() ? 'Acontecendo agora' : 'Começa em'}</div>
            {e.status === 'in' || Date.parse(e.date) <= Date.now() ? <LiveTag /> : <Countdown iso={e.date} />}
          </motion.div>
          {m.title && (
            <motion.div initial={reduce ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
              className="absolute left-1/2 top-0 z-20 -translate-x-1/2 sm:top-2">
              <Tag tone="gold" className="h-8 bg-surface px-4 text-[13px] shadow-[var(--shadow-soft)]"><BeltIcon className="h-3.5 w-6" /> Cinturão · {m.weightClass}</Tag>
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

/** Casca dos boxes do "O UFC agora": cada um com a sua cor (leve tom no fundo, filete no topo que cresce ao entrar na
    tela e o brilho que segue o cursor). `duel`: vermelho à esquerda e azul à direita, para confrontos. */
function Tile({ accent, duel, className, children }: { accent: string; duel?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <Spotlight duel={duel} color={duel ? undefined : accent} className={clsx('panel relative h-full overflow-hidden p-5 sm:p-7', className)}
      style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${accent} 9%, var(--color-surface)), var(--color-surface) 55%)` }}>
      <motion.span aria-hidden className="absolute inset-x-0 top-0 h-[3px] origin-left" style={{ background: duel ? 'linear-gradient(90deg, var(--color-red), var(--color-blue))' : accent }}
        initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
      {children}
    </Spotlight>
  );
}

/** Medidor da chance pelas odds (zebra, favorito): enche ao aparecer. */
function ChanceMeter({ p, color }: { p: number; color: string }) {
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-[12px] text-fg-3"><span>chance pelas odds</span><span className="num font-semibold" style={{ color }}>{Math.round(p * 100)}%</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <motion.div className="h-full origin-left rounded-full" style={{ background: color, width: '100%' }}
          initial={{ scaleX: 0 }} animate={{ scaleX: p }} transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div>
  );
}

type Slide = { key: string; label: string; icon: React.ReactNode; title: string; sub: string; href: string; chance?: number; faces: FighterRef[] };

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
      slides.push({ key: 'zebra', chance: winnerChance(z) ?? undefined, label: 'Zebra do evento', icon: <Lightning weight="fill" className="h-3.5 w-3.5 text-orange-fill" />, title: `${last(w.name)} venceu ${last(l.name)}`,
        sub: `${fmtMoneyline(z.result!.winnerId === z.red.espnId ? z.odds?.red : z.odds?.blue)} · só ${Math.round((winnerChance(z) ?? 0) * 100)}% de chance pelas odds · ${how(z)}`, href: href(z), faces: [w, l] });
    }
    // maior favorito do card (com odds): confirmou ou não
    const fav = done.map(f => { const p = fairProbs(f.odds?.red, f.odds?.blue); return p ? { f, side: p[0] >= p[1] ? f.red : f.blue, p: Math.max(...p) } : null; })
      .filter(Boolean).sort((x, y) => y!.p - x!.p)[0];
    if (fav) {
      const won = fav.f.result!.winnerId === fav.side.espnId, opp = fav.side === fav.f.red ? fav.f.blue : fav.f.red;
      slides.push({ key: 'fav', chance: fav.p, label: 'Maior favorito da noite', icon: <Crown weight="fill" className="h-3.5 w-3.5 text-gold" />, title: `${last(fav.side.name)} ${won ? 'confirmou' : 'caiu'} contra ${last(opp.name)}`,
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
    <Tile accent={sl.key === 'zebra' ? 'var(--color-orange-fill)' : sl.key === 'fast' ? 'var(--color-brand)' : 'var(--color-gold)'}>
      <div className="flex items-center justify-between gap-3">
        <div className="label flex items-center gap-2">{sl.icon} {sl.label}{ev && !sl.key.startsWith('title') && <span className="normal-case tracking-normal text-fg-3">· {splitEventName(ev.name).series}</span>}</div>
        {slides.length > 1 && (
          <div className="flex shrink-0 items-center gap-1">
            <span className="num mr-1 text-[13px] text-fg-3">{k + 1}/{slides.length}</span>
            <button type="button" onClick={() => setI(k - 1)} aria-label="Destaque anterior" className="lift grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-fg-2"><CaretLeft weight="bold" className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => setI(k + 1)} aria-label="Próximo destaque" className="lift grid h-8 w-8 place-items-center rounded-full bg-fg text-bg"><CaretRight weight="bold" className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={sl.key} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
          <Link to={sl.href} className="group mt-3 flex items-center gap-5">
            <span className="flex shrink-0">
              <Avatar src={sl.faces[0]?.headshot} name={sl.faces[0]?.name ?? ''} size={84} flag={sl.faces[0]?.countryCode} />
              {sl.faces[1] && <Avatar src={sl.faces[1].headshot} name={sl.faces[1].name} size={60} className="-ml-4 mt-6 opacity-80" />}
            </span>
            <div className="min-w-0">
              <h3 className="display line-clamp-2 text-[32px] leading-[1] text-fg group-hover:text-brand">{sl.title}</h3>
              <p className="mt-1 text-[14px] text-fg-3">{sl.sub}</p>
              {sl.chance !== undefined && <ChanceMeter key={sl.key} p={sl.chance} color={sl.key === 'zebra' ? 'var(--color-orange-fill)' : 'var(--color-gold)'} />}
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>
    </Tile>
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

  return (
    <section className="min-h-[760px] py-10 lg:min-h-[640px]">
      <Reveal><SectionTitle title="O UFC agora" /></Reveal>
      <div className="grid auto-rows-[minmax(210px,auto)] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* P4P top 5 */}
        <Reveal className="md:row-span-2 lg:col-span-2">
          <Tile accent="var(--color-brand)">
            {/* o nº 1 esmaecido ao fundo: o box tem um rosto, não só uma lista */}
            {p4p?.entries[0] && (
              <motion.div key={`bg-${women}`} aria-hidden className="pointer-events-none absolute -bottom-6 -right-10 hidden opacity-[0.12] sm:block [mask-image:linear-gradient(to_left,#000_30%,transparent)]"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 0.12, x: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
                <Avatar src={headshot(meta?.[p4p.entries[0].slug]?.espnId)} name={p4p.entries[0].name} size={300} className="!ring-0" />
              </motion.div>
            )}
            <div className="relative flex items-center justify-between">
              <div><div className="label">Peso por peso · {women ? 'feminino' : 'masculino'}</div><h3 className="panel-title mt-1">Top 5 do UFC</h3></div>
              <div className="flex items-center gap-1">
                <Link to={p4p ? `/rankings/${p4p.id}` : '/rankings'} className="btn-ghost">Ranking <ArrowUpRight className="h-4 w-4" /></Link>
                <button type="button" onClick={() => setWomen(w => !w)} aria-label={women ? 'Ver peso por peso masculino' : 'Ver peso por peso feminino'}
                  className="lift grid h-9 w-9 place-items-center rounded-full bg-fg text-bg">
                  {women ? <CaretLeft weight="bold" className="h-4 w-4" /> : <CaretRight weight="bold" className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <AnimatePresence mode="wait" initial={false}>
            <motion.ol key={String(women)} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="mt-4 space-y-1">
              {(p4p?.entries.slice(0, 5) ?? []).map((e, i) => {
                const mm = meta?.[e.slug];
                return (
                  <motion.li key={e.slug} className="relative" initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}>
                    <Link to={fighterHref({ slug: e.slug, espnId: mm?.espnId })} viewTransition onClick={morphPhoto} className="group/row flex items-center gap-3 rounded-xl px-1 py-2 transition hover:translate-x-1 hover:bg-surface-2/70 sm:gap-4 sm:px-2">
                      <span className={clsx('num relative w-6 text-right font-display text-[20px] font-semibold transition-colors group-hover/row:text-brand', i === 0 ? 'text-gold-ink dark:text-gold' : 'text-fg-3')}>
                        {i === 0 && <Crown weight="fill" className="absolute -top-3 right-0 h-3.5 w-3.5 text-gold" />}{e.rank}
                      </span>
                      <Avatar src={headshot(mm?.espnId)} name={e.name} size={52} flag={mm?.countryCode} className="max-sm:-mr-1" />
                      <span className="min-w-0 flex-1 line-clamp-2 text-[18px] font-bold leading-tight text-fg sm:text-[18px]">{e.name}</span>
                      <span className="num text-[16px] font-semibold text-fg-2">{mm?.record}</span>
                    </Link>
                  </motion.li>
                );
              })}
              {!p4p && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </motion.ol>
            </AnimatePresence>
          </Tile>
        </Reveal>

        {/* zebra do último evento; sem zebra, a próxima disputa de cinturão (o próximo evento já está no topo) */}
        <Reveal delay={0.05} className="lg:col-span-2"><Highlight lastId={lastId} /></Reveal>

        {/* campeões por país */}
        <Reveal delay={0.1}>
          <Tile accent="var(--color-gold)">
            <div className="label flex items-center gap-2"><BeltIcon className="h-3.5 w-6 text-gold" />Cinturões</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="display text-[64px] leading-[0.85] text-fg">{champs.length ? <CountUp value={champs.length} /> : '–'}</span>
              <span className="text-[14px] text-fg-3">campeões de {byCountry.length} países</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {byCountry.map(([code, v], i) => (
                <motion.span key={code} initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 420, damping: 20, delay: 0.25 + i * 0.05 }} whileHover={{ y: -2 }}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-2 py-2 pl-2 pr-3 text-[16px] font-semibold text-fg-2 ring-1 ring-gold/0 transition-shadow hover:ring-gold/50">
                  <Flag code={code} title={v.country} size={26} />{v.n}
                </motion.span>
              ))}
            </div>
          </Tile>
        </Reveal>

        {/* atalho para comparar */}
        <Reveal delay={0.15}>
          {m ? (
            <Link to={`/comparar?a=${m.red.slug}&ae=${m.red.espnId}&b=${m.blue.slug}&be=${m.blue.espnId}`} className="block h-full">
              <Tile accent="var(--color-red)" duel className="group flex flex-col items-center justify-between text-center">
                <div className="label">Frente a frente</div>
                {/* os dois entram pelos lados, o VS estoura no meio; no hover eles se encaram (aproximam) */}
                <div className="my-4 flex w-full items-center justify-center">
                  <motion.div initial={{ opacity: 0, x: -28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="transition-transform duration-300 group-hover:translate-x-2">
                    <Avatar src={m.red.headshot} name={m.red.name} size={116} ring="var(--color-red)" flag={m.red.countryCode} />
                  </motion.div>
                  <motion.span initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.45 }}
                    className="z-10 -mx-2 grid h-10 w-10 place-items-center rounded-full bg-fg font-display text-[13px] font-bold text-bg ring-4 ring-surface transition-transform duration-300 group-hover:scale-110">VS</motion.span>
                  <motion.div initial={{ opacity: 0, x: 28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="transition-transform duration-300 group-hover:-translate-x-2">
                    <Avatar src={m.blue.headshot} name={m.blue.name} size={116} ring="var(--color-blue)" flag={m.blue.countryCode} />
                  </motion.div>
                </div>
                <div className="font-display text-[18px] font-bold uppercase leading-tight text-fg">{lastName(m.red.name)} × {lastName(m.blue.name)}</div>
                <div className="mt-2 flex items-center gap-2 text-[14px] font-semibold text-fg-2 group-hover:text-brand">Comparar a luta principal <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
              </Tile>
            </Link>
          ) : <Skeleton className="h-full" />}
        </Reveal>
      </div>
    </section>
  );
}

/* Carrossel dos campeões (inspirado no "Atlas" do codeandchill): o cartão do centro fica em cor e em destaque; os dos
   lados, menores e em cinza. Desliza com o dedo (scroll-snap nativo), pelas setas ou tocando num cartão lateral, que
   vem para o centro em vez de abrir o perfil. Sem rolagem automática: quem escolhe o ritmo é a pessoa. */
function Champions() {
  const { data, isPending: isLoading, isError, refetch } = useRankings();
  const { data: meta } = useRankingsMeta();
  const [women, setWomen] = useState(false);
  const list = (data?.divisions ?? []).filter(d => d.champion && !d.p4p && !!d.women === women);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  // ativo = o cartão mais perto do centro do trilho
  const frame = useRef(0);
  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const t = track.current;
      if (!t) return;
      const mid = t.scrollLeft + t.clientWidth / 2;
      let best = 0, dist = Infinity;
      Array.from(t.children).forEach((c, i) => {
        const el = c as HTMLElement, d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
        if (d < dist) { dist = d; best = i; }
      });
      setActive(best);
    });
  };
  const go = (i: number, instant = false) => {
    const t = track.current, el = t?.children[Math.max(0, Math.min(i, list.length - 1))] as HTMLElement | undefined;
    if (t && el) t.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - t.clientWidth / 2, behavior: reduce || instant ? 'auto' : 'smooth' });
  };
  // abre no campeão do meio (vizinhos dos dois lados); trocar masculino/feminino recomeça do meio
  const n = list.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: só ao trocar o grupo ou quando os cartões chegam
  useEffect(() => { if (n) { const mid = Math.floor((n - 1) / 2); go(mid, true); setActive(mid); } }, [women, n]);

  return (
    <section className="py-12">
      <Reveal>
        <SectionTitle title="Os donos dos cinturões" action={<Link to="/rankings" className="btn">Todos os rankings <ArrowUpRight className="h-4 w-4" /></Link>} />
      </Reveal>
      {isError && <Panel><ErrorState onRetry={() => refetch()} /></Panel>}
      {isLoading && (
        <Loading label="Carregando os campeões" className="flex justify-center gap-4 overflow-hidden">
          {[0, 1, 2].map(i => <Skeleton key={i} className={clsx('h-[420px] w-[72vw] shrink-0 rounded-xl sm:w-[300px]', i !== 1 && 'opacity-50')} />)}
        </Loading>
      )}
      {list.length > 0 && (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Segmented value={women ? 'f' : 'm'} onChange={v => setWomen(v === 'f')} options={[{ value: 'm', label: 'Masculino' }, { value: 'f', label: 'Feminino' }]} />
            <div className="flex items-center gap-1">
              <span className="num mr-2 text-[13px] text-fg-3">{active + 1}/{list.length}</span>
              <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Campeão anterior" className="lift grid h-10 w-10 place-items-center rounded-full bg-surface ring-1 ring-fg/[0.08] disabled:opacity-40"><CaretLeft weight="bold" className="h-4 w-4" /></button>
              <button type="button" onClick={() => go(active + 1)} disabled={active === list.length - 1} aria-label="Próximo campeão" className="lift grid h-10 w-10 place-items-center rounded-full bg-fg text-bg disabled:opacity-40"><CaretRight weight="bold" className="h-4 w-4" /></button>
            </div>
          </div>
          <div ref={track} onScroll={onScroll} role="region" aria-roledescription="carrossel" aria-label={`Campeões ${women ? 'femininos' : 'masculinos'}`}
            className="champ-track no-scrollbar relative -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-2 sm:mx-0">
            {list.map((d, i) => {
              const c = d.champion!, mm = meta?.[c.slug], on = i === active;
              return (
                <Link key={d.id} to={fighterHref({ slug: c.slug, espnId: mm?.espnId })} viewTransition data-active={on} aria-current={on || undefined}
                  aria-label={`${c.name}, ${d.women ? "campeã" : "campeão"} ${d.name}${on ? "" : " (trazer para o centro)"}`}
                  onClick={e => { if (!on) { e.preventDefault(); go(i); } }}
                  className="champ-card cut group block shrink-0 snap-center overflow-hidden bg-surface shadow-[var(--shadow-soft)]">
                  <div className="inset-media relative h-[272px] bg-cream sm:h-[292px]">
                    <FlagBackdrop code={mm?.countryCode} className="inset-0 opacity-45 dark:opacity-35" />
                    {c.image && <img src={proxy(c.image, 640)} alt="" loading="lazy" decoding="async" className="absolute bottom-0 left-1/2 h-[96%] w-auto max-w-none -translate-x-1/2 object-contain" />}
                  </div>
                  <div className="px-5 pb-5 pt-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-fg-3"><BeltIcon className="h-4 w-4 shrink-0 text-gold" />{d.name}</span>
                    <div className="mt-1 line-clamp-1 font-display text-[22px] font-bold leading-tight text-fg group-hover:text-brand">{c.name}</div>
                    {mm?.record && <div className="num text-[14px] font-semibold text-fg-3">{mm.record}</div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- Card de um evento ---------- */

function EventCard({ id, title, limit = 6 }: { id?: string; title: string; limit?: number }) {
  const { data, isPending, isError, refetch } = useEvent(id);
  const isLoading = isPending && !!id; // sem id (consulta desligada) não há o que esperar
  const fights = data?.fights.filter(f => f.segment === 'main').slice(0, limit) ?? [];
  const main = fights.find(f => f.order === 1) ?? fights[0];
  const done = data?.status === 'post';
  const sum = done ? cardSummary(data.fights) : null;
  const accent = done ? 'var(--color-gold)' : 'var(--color-brand)';
  const winner = main?.result?.winnerId ? (main.result.winnerId === main.red.espnId ? main.red : main.blue) : undefined;
  const loser = winner && main ? (winner === main.red ? main.blue : main.red) : undefined;
  const where = data?.city ? ` em ${data.city.split(',')[0]}` : '';
  // manchete com verbo, montada dos dados (no lugar de "Últimos resultados" / "Card principal")
  const headline = !data || !main ? title
    : done ? (winner && loser ? `${lastName(winner.name)} vence ${lastName(loser.name)}${main.title ? ' e fica com o cinturão' : where}` : `${lastName(main.red.name)} e ${lastName(main.blue.name)} sem vencedor`)
    : data.status === 'in' ? `${lastName(main.red.name)} e ${lastName(main.blue.name)} lutam agora${where}`
    : `${lastName(main.red.name)} e ${lastName(main.blue.name)} fecham o ${weekdayLong(data.date)}${where}`;
  // data e lugar em frase, sem cadeia de "·"
  const meta = data && `${capitalize(dayLong(data.date))}${data.venue ? `, na ${data.venue}` : ''}.`;
  // o "lide": uma frase que conta a noite, com as palavras-chave sublinhadas na cor do método
  const lede = sum && sum.done ? (() => {
    const kinds = [
      { n: sum.ko, word: 'nocaute', color: 'var(--color-ko-fill)' },
      { n: sum.sub, word: 'finalização', color: 'var(--color-sub-fill)' },
      { n: sum.dec, word: 'decisões', color: 'var(--color-dec-fill)' },
    ].sort((x, y) => y.n - x.n);
    const top = kinds[0];
    const z = sum.biggestUpset, zw = z && (z.result!.winnerId === z.red.espnId ? z.red : z.blue);
    const zOdds = z && (z.result!.winnerId === z.red.espnId ? z.odds?.red : z.odds?.blue);
    const U = ({ c, children }: { c: string; children: React.ReactNode }) => <span className="font-semibold text-fg underline decoration-2 underline-offset-4" style={{ textDecorationColor: c }}>{children}</span>;
    return (
      <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-fg-2">
        Noite de <U c={top.color}>{top.word}</U>: <b className="num text-fg">{top.n}</b> em {sum.done} lutas
        {sum.r1 > 0 && <>, <b className="num text-fg">{sum.r1}</b> {sum.r1 === 1 ? 'acabou' : 'acabaram'} no 1º round</>}.
        {zw && <> A zebra foi <U c="var(--color-orange-fill)">{lastName(zw.name)}</U>{zOdds !== undefined && <> (<span className="num odds">{fmtMoneyline(zOdds)}</span>)</>}.</>}
      </p>
    );
  })() : null;
  return (
    <Tile accent={accent} className="p-0! sm:p-0!">
      {/* cabeçalho em pôster: a manchete à esquerda, a luta principal à direita (os dois entram pelos lados) */}
      <div className="relative flex items-start gap-4 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[24px] font-bold leading-[1.05] text-fg">{headline}</h2>
          {meta && <p className="mt-2 text-[14px] text-fg-3">{meta}</p>}
          {!done && data && (
            <p className="mt-3 inline-flex items-center gap-2 text-[14px] font-semibold text-brand">
              <Timer className="h-4 w-4" /><span>{data.status === 'in' ? 'Acontecendo agora' : capitalize(inDays(data.date))}, com {data.fights.length} lutas.</span>
            </p>
          )}
          {lede}
        </div>
        {main && (
          <div className="hidden shrink-0 items-center sm:flex">
            <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <Avatar src={main.red.headshot} name={main.red.name} size={64} ring="var(--color-red)" className={clsx(done && main.result?.winnerId === main.blue.espnId && 'opacity-50 grayscale')} />
            </motion.div>
            <motion.div className="-ml-3" initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
              <Avatar src={main.blue.headshot} name={main.blue.name} size={64} ring="var(--color-blue)" className={clsx(done && main.result?.winnerId === main.red.espnId && 'opacity-50 grayscale')} />
            </motion.div>
          </div>
        )}
      </div>
      {id && (
        <div className="px-5 sm:px-6">
          <Link to={`/eventos/${id}`} viewTransition className="group inline-flex items-center gap-1 text-[14px] font-semibold text-fg-2 hover:text-brand">
            {done ? 'Todos os resultados' : 'Ver o card inteiro'} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}
      <div className="mt-2 divide-y divide-line/70 px-2 pb-2">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="px-4 py-4"><Skeleton className="h-12" /></div>)}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {fights.map((f, i) => (
          <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.4, delay: Math.min(i, 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}>
            <FightRow fight={f} eventId={id} compact />
          </motion.div>
        ))}
      </div>
    </Tile>
  );
}

/* ---------- Agenda: a cor de cada data é o tipo do evento (mesma legenda do calendário) ---------- */


function Agenda({ events }: { events: UpcomingEvent[] }) {
  return (
    <Tile accent="var(--color-blue)">
      <h2 className="font-display text-[28px] font-bold leading-[1] text-fg">O que vem por aí</h2>
      <p className="mt-2 text-[14px] text-fg-3">Os próximos {events.length} cards, com a luta principal de cada um.</p>
      <ol className="relative mt-6 space-y-2">
        {/* linha do tempo ligando as datas: se desenha de cima para baixo ao aparecer */}
        <motion.span aria-hidden className="absolute bottom-7 left-[27px] top-7 w-[2px] origin-top rounded-full"
          style={{ background: 'linear-gradient(to bottom, var(--color-blue), var(--color-red))', opacity: 0.35 }}
          initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
        {events.map((e, i) => {
          const { series, title } = splitEventName(e.name);
          const m = e.main;
          return (
            <motion.li key={e.id} className="relative" initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}>
              <Link to={`/eventos/${e.id}`} viewTransition className="group flex items-center gap-4 rounded-xl p-1 pr-2 transition hover:bg-surface-2/60">
                <div className={`cut relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-[22.5deg] ${SERIES_TONE[e.series]}`} title={SERIES_LABEL[e.series]}>
                  <div className="text-center leading-none transition-transform duration-500 group-hover:-rotate-[22.5deg]">
                    <div className="num font-display text-[20px] font-semibold">{dayMonth(e.date).split(' ')[0]}</div>
                    <div className="mt-1 text-[12px] font-bold">{dayMonth(e.date).split(' ')[1]}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate text-[16px] font-bold text-fg group-hover:text-brand">
                    {title || series}{m?.title && <BeltIcon className="h-3.5 w-6 shrink-0 text-gold" />}
                  </div>
                  <div className="flex items-center gap-1.5 truncate text-[13px] text-fg-3">
                    <MapPin className="h-3 w-3 shrink-0" />{title ? `${series.replace(/^UFC (?=Fight Night)/, '')} em ` : ''}{e.city ? e.city.split(',')[0] : 'local a definir'}
                  </div>
                  <div className="mt-0.5 text-[13px] font-semibold text-fg-2">
                    {e.status === 'in' ? <span className="text-brand">Acontecendo agora</span> : <>{capitalize(inDays(e.date))} · <span className="num">{capitalize(weekday(e.date))}, {time(e.date)}</span></>}
                  </div>
                </div>
                {m && (
                  <span className="hidden shrink-0 transition-transform duration-300 group-hover:scale-105 sm:flex">
                    <Avatar src={m.red.headshot} name={m.red.name} size={36} ring="var(--color-red)" />
                    <Avatar src={m.blue.headshot} name={m.blue.name} size={36} ring="var(--color-blue)" className="-ml-2.5" />
                  </span>
                )}
              </Link>
            </motion.li>
          );
        })}
      </ol>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-fg-3">
          {(['ppv', 'fight-night'] as const).map(k => <span key={k} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-md ${SERIES_TONE[k].split(' ')[0]}`} />{SERIES_LABEL[k]}</span>)}
        </div>
        <Link to="/eventos" className="group inline-flex items-center gap-1 text-[14px] font-semibold text-fg-2 hover:text-brand">Abrir o calendário <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
      </div>
    </Tile>
  );
}

/* ---------- Página ---------- */

/* ---------- Faixa do momento: o início muda conforme o calendário ----------
   ao vivo > resumo (até 3 dias depois do evento) > nada. */

type Moment = { kind: 'live'; ev: UpcomingEvent } | { kind: 'recap'; id: string } | null;

function useMoment(next: UpcomingEvent | undefined, last: { id: string; date: string } | undefined): Moment {
  const now = Date.now(), DAY = 86_400_000;
  if (next?.status === 'in') return { kind: 'live', ev: next };
  const untilNext = next ? Date.parse(next.date) - now : Infinity;
  if (last && now - Date.parse(last.date) < 3 * DAY && untilNext > DAY) return { kind: 'recap', id: last.id };
  return null;
}

function LiveStrip({ ev }: { ev: UpcomingEvent }) {
  const { data } = useEvent(ev.id);
  const now = data?.fights.find(f => f.status === 'in');
  return (
    <Link to={`/eventos/${ev.id}`} className="group mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-band px-5 py-4 text-white">
      <LiveTag />
      <span className="font-semibold">{splitEventName(ev.name).series} está acontecendo agora</span>
      {now && <span className="text-white/75">Na luta agora: <b className="text-white">{lastName(now.red.name)} × {lastName(now.blue.name)}</b>{now.live?.round ? ` · R${now.live.round} ${now.live.clock ?? ''}` : ''}</span>}
      <span className="ml-auto inline-flex items-center gap-1 font-semibold group-hover:gap-2">Acompanhar ao vivo <ArrowRight className="h-4 w-4" /></span>
    </Link>
  );
}

function RecapStrip({ id }: { id: string }) {
  const { data: ev } = useEvent(id);
  if (ev?.status !== 'post') return null;
  const { title, series } = splitEventName(ev.name);
  return (
    <section className="mb-8 grid items-center gap-4 border-y border-line py-5 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div>
        <p className="text-[14px] text-fg-3">{series} · {longDate(ev.date)}</p>
        <h2 className="display mt-1 text-[32px] text-fg">{title || series}: como foi a noite</h2>
        <Link to={`/eventos/${ev.id}`} className="mt-2 inline-flex items-center gap-1 text-[14px] font-semibold text-fg-2 hover:text-brand">Ver todos os resultados <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <NightStories ev={ev} />
    </section>
  );
}

export default function Home() {
  const upcoming = useUpcoming(10);
  const splashGone = useSplashGone();
  const schedule = useSchedule(new Date().getFullYear());
  const ufcOnly = (upcoming.data ?? []).filter(e => e.series !== 'dwcs');
  const next = ufcOnly[0];

  // com um card na janela ao vivo (ou acabando de sair dela) o último evento é reconsultado a cada 15 s
  const liveWindow = (upcoming.data ?? []).some(e => e.status === 'in') || (schedule.data ?? []).some(e => e.series !== 'dwcs' && inLiveWindow(e.date));
  const last = useLastEvent(liveWindow);
  // até a resposta chegar, usa o critério por horário (evento que começou há mais de 6 h)
  const lastId = useMemo(() => {
    if (last.data) return last.data.id;
    if (last.isPending) {
      const now = Date.now();
      return [...(schedule.data ?? [])].reverse().find(e => e.series !== 'dwcs' && new Date(e.date).getTime() < now - 6 * 3600_000)?.id;
    }
    return undefined;
  }, [last.data, last.isPending, schedule.data]);

  const lastEv = useMemo(() => (schedule.data ?? []).find(e => e.id === lastId), [schedule.data, lastId]);
  const moment = useMoment(next, lastEv);

  return (
    <div className="-mx-5 px-5 max-sm:overflow-x-clip sm:-mx-8 sm:px-8">
      {moment?.kind === 'live' && <LiveStrip ev={moment.ev} />}
      {moment?.kind === 'recap' && <RecapStrip id={moment.id} />}
      {/* esqueleto com a altura do destaque real (927 px no celular, 628 no desktop): o mosaico abaixo não salta quando os dados chegam */}
      {upcoming.isPending && (
        <div className="grid min-h-[927px] items-center gap-10 pb-10 pt-6 sm:min-h-[999px] lg:min-h-[628px] lg:grid-cols-[1.05fr_1fr]">
          <div role="status" aria-busy="true" aria-label="Carregando o próximo evento" className="space-y-5"><Skeleton className="h-4 w-60" /><Skeleton className="h-24 w-[90%]" /><Skeleton className="h-24 w-[60%]" /><Skeleton className="h-16 max-w-[520px]" /><Skeleton className="h-12 w-56 rounded-full" /></div>
          <div className="mx-auto aspect-square w-full max-w-[420px] skeleton" style={{ clipPath: 'polygon(29.3% 0, 70.7% 0, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0 70.7%, 0 29.3%)' }} />
        </div>
      )}
      {upcoming.isError && <Panel><ErrorState onRetry={() => upcoming.refetch()} /></Panel>}
      {/* a entrada do destaque recomeça quando a abertura sai (key muda), em vez de rodar escondida atrás dela */}
      {next && <Hero key={splashGone ? 'in' : 'pre'} e={next} />}
      {!upcoming.isPending && !next && <Panel><Empty>Octógono vazio: nenhum evento anunciado por enquanto.</Empty></Panel>}

      <Bento next={next} lastId={lastId} />
      <Defer minHeight={520}><Champions /></Defer>
      <Defer minHeight={420}><TrendingFighters events={ufcOnly} /></Defer>

      <Defer minHeight={1400}>
        <section className="grid gap-10 py-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-8">
            {next && <Reveal><EventCard id={next.id} title="Próximo card" /></Reveal>}
            <Reveal delay={0.05}><EventCard id={lastId} title="Último card" /></Reveal>
          </div>
          {/* altura do conteúdo (não da coluna ao lado) e acompanha a rolagem ao lado das listas */}
          {ufcOnly.length > 1 && <Reveal delay={0.1} className="self-start lg:sticky lg:top-24"><Agenda events={ufcOnly.slice(1, 7)} /></Reveal>}
        </section>
      </Defer>
    </div>
  );
}
