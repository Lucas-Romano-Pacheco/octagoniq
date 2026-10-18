import { useEffect, useMemo, useState, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, CaretLeft, CaretRight, ArrowsLeftRight, CalendarDots, Crown, MapPin, Timer } from '@phosphor-icons/react';
import type { FighterRef } from '@shared/types';
import { fighterHref, useEvent, useRankings, useRankingsMeta, useSchedule, useUpcoming, type UpcomingEvent } from '@/lib/api';
import { capitalize, dayMonth, fullDate, lastName, longDate, splitEventName, time, weekday, weightPhrase } from '@/lib/format';
import { FightRow } from '@/components/FightRow';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Avatar, BlobClip, Brush, Empty, ErrorState, Flag, FlagBackdrop, LiveTag, OctagonMark, Panel, Reveal, SectionTitle, Skeleton, Spotlight, Tag } from '@/components/kit';

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
          <div className="num font-display text-[26px] font-semibold leading-none text-fg">{String(p.v).padStart(2, '0')}</div>
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
    <img src={f.bodyImage} alt={f.name} onError={() => setFailed(true)}
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
    // brilho dourado que segue o cursor; a camada ocupa a largura da janela e esmaece nas bordas, sem caixa visível
    <section onPointerMove={moveGlow} className="relative grid items-center gap-10 pb-10 pt-6 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-16">
      <div aria-hidden data-glow className="hero-glow" />
      {/* brilho lateral, como o gradiente suave da referência */}
      <div aria-hidden className="pointer-events-none absolute -left-40 top-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,var(--glow),transparent_65%)]" />

      <div className="relative">
        <motion.div {...fade(0)} className="eyebrow flex flex-wrap items-center gap-2">
          {e.status === 'in' ? <LiveTag /> : null}
          {series} · {dayMonth(e.date)} · {e.city?.split(',')[0]}
        </motion.div>
        {m ? (
          <motion.h1 {...fade(0.08)} className="display mt-5 text-[56px] text-fg sm:text-[84px] xl:text-[96px]">
            {lastName(m.red.name)}
            <br />
            <span className="relative inline-block">
              <span className="text-fg-3">×</span> {lastName(m.blue.name)}
              <Brush className="absolute -bottom-2 left-[18%] h-4 w-[82%] sm:-bottom-3 sm:h-5" />
            </span>
          </motion.h1>
        ) : <h1 className="display mt-5 text-[64px] text-fg">{series}</h1>}
        <motion.p {...fade(0.16)} className="mt-8 max-w-[520px] text-[16.5px] leading-[1.75] text-fg-2">
          {m?.title ? <>Disputa de cinturão do {weightPhrase(m.weightClass)}. </> : m ? <>Luta principal no {weightPhrase(m.weightClass)}. </> : null}
          {capitalize(longDate(e.date))}, às {time(e.date)} (Brasília){e.venue ? `, na ${e.venue}` : ''}. {e.fightCount} lutas no card.
        </motion.p>
        <motion.div {...fade(0.24)} className="mt-10 flex flex-wrap items-center gap-6">
          <Link to={`/eventos/${e.id}`} className="btn-primary">Ver card completo <ArrowRight className="h-4 w-4" /></Link>
          {m && (
            <Link to={`/comparar?a=${m.red.slug}&ae=${m.red.espnId}&b=${m.blue.slug}&be=${m.blue.espnId}`} className="group flex items-center gap-3 text-[15px] font-semibold text-fg-2 hover:text-fg">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-white shadow-[0_14px_28px_-10px_rgb(214_40_57/0.7)] transition-transform group-hover:scale-105">
                <ArrowsLeftRight className="h-5 w-5" />
              </span>
              Comparar os dois
            </Link>
          )}
        </motion.div>
      </div>

      {/* Lado direito: forma orgânica, recortes frente a frente e cartões flutuantes */}
      {m && (
        <div className="relative mx-auto h-[420px] w-full max-w-[600px] sm:h-[540px]">
          {/* forma orgânica com a bandeira de cada lutador do seu lado, esmaecendo até o centro */}
          <BlobClip className="inset-x-0 bottom-0 h-[92%]">
            <div className="absolute inset-0 bg-cream" />
            <FlagBackdrop code={m.red.countryCode} shape="fade-right" className="inset-y-0 left-0 w-[62%] opacity-40 dark:opacity-30" />
            <FlagBackdrop code={m.blue.countryCode} shape="fade-left" className="inset-y-0 right-0 w-[62%] opacity-40 dark:opacity-30" />
          </BlobClip>
          <OctagonMark className="float absolute left-6 top-10 h-10 w-10 opacity-80" />
          <OctagonMark className="float absolute bottom-24 right-0 h-7 w-7 opacity-60 [animation-delay:-3s]" stroke="var(--color-blue)" />

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
            className="absolute -bottom-4 left-1/2 w-max -translate-x-1/2 rounded-3xl bg-surface/95 px-5 py-4 shadow-[var(--shadow-lift)] backdrop-blur">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-fg-2"><Timer className="h-3.5 w-3.5 text-brand" /> {e.status === 'in' ? 'Acontecendo agora' : 'Começa em'}</div>
            {e.status === 'in' ? <LiveTag /> : <Countdown iso={e.date} />}
          </motion.div>

          {/* cartões: cada canto */}
          {[{ f: m.red, side: 'left-0 top-[60%] sm:-left-6', dot: 'bg-red' }, { f: m.blue, side: 'right-0 top-[50%] sm:-right-6', dot: 'bg-blue' }].map(({ f, side, dot }, i) => (
            <motion.div key={f.espnId} initial={reduce ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 + i * 0.1, duration: 0.5 }}
              className={`absolute ${side} hidden items-center gap-3 rounded-2xl bg-surface/95 py-2.5 pl-2.5 pr-4 shadow-[var(--shadow-lift)] backdrop-blur sm:flex`}>
              <Avatar src={f.headshot} name={f.name} size={38} />
              <div>
                <div className="flex items-center gap-1.5 text-[14px] font-bold text-fg"><span className={`h-2 w-2 rounded-full ${dot}`} />{f.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[13.5px] text-fg-2"><Flag code={f.countryCode} src={f.flag} title={f.country} size={16} /><span>{f.country}</span><span className="text-fg-3">·</span><span className="num font-semibold">{f.record}</span></div>
              </div>
            </motion.div>
          ))}
          {m.title && (
            <motion.div initial={reduce ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
              className="absolute left-1/2 top-2 -translate-x-1/2">
              <Tag tone="gold" className="h-8 px-3.5 text-[13.5px] shadow-[var(--shadow-soft)]"><Crown className="h-4 w-4" /> Cinturão · {m.weightClass}</Tag>
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

function Bento({ next }: { next?: UpcomingEvent }) {
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
  const tile = 'panel h-full overflow-hidden p-6';

  return (
    <section className="py-10">
      <Reveal><SectionTitle eyebrow="Em números" title="O UFC agora" /></Reveal>
      <div className="grid auto-rows-[minmax(150px,auto)] gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* P4P top 5 */}
        <Reveal className="md:row-span-2 lg:col-span-2">
          <div className={tile}>
            <div className="flex items-center justify-between">
              <div><div className="eyebrow">Peso por peso · {women ? 'feminino' : 'masculino'}</div><h3 className="panel-title mt-1">Top 5 do UFC</h3></div>
              <div className="flex items-center gap-1">
                <Link to={p4p ? `/rankings/${p4p.id}` : '/rankings'} className="btn-ghost">Ranking <ArrowUpRight className="h-4 w-4" /></Link>
                <button onClick={() => setWomen(w => !w)} aria-label={women ? 'Ver peso por peso masculino' : 'Ver peso por peso feminino'}
                  className="grid h-9 w-9 place-items-center rounded-full bg-fg text-bg transition-transform hover:scale-105">
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
                    <Link to={fighterHref({ slug: e.slug, espnId: mm?.espnId })} className="flex items-center gap-4 rounded-2xl px-2 py-2 transition-colors hover:bg-surface-2/70">
                      <span className="num w-6 text-right font-display text-[22px] font-semibold text-fg-3">{e.rank}</span>
                      <Avatar src={headshot(mm?.espnId)} name={e.name} size={44} flag={mm?.countryCode} />
                      <span className="min-w-0 flex-1 truncate text-[16px] font-bold text-fg">{e.name}</span>
                      <span className="num text-[14px] font-semibold text-fg-2">{mm?.record}</span>
                    </Link>
                  </li>
                );
              })}
              {!p4p && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </motion.ol>
            </AnimatePresence>
          </div>
        </Reveal>

        {/* próximo evento */}
        <Reveal delay={0.05} className="lg:col-span-2">
          <div className={tile}>
            <div className="eyebrow">Próximo evento</div>
            {next ? (
              <Link to={`/eventos/${next.id}`} className="mt-2 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="display truncate text-[30px] text-fg">{m ? `${lastName(m.red.name)} × ${lastName(m.blue.name)}` : splitEventName(next.name).series}</h3>
                  <p className="mt-1 text-[14px] text-fg-3">{capitalize(longDate(next.date))} · {next.fightCount} lutas</p>
                </div>
                {next.status === 'in' ? <LiveTag /> : <Countdown iso={next.date} />}
              </Link>
            ) : <Skeleton className="mt-3 h-16" />}
          </div>
        </Reveal>

        {/* campeões por país */}
        <Reveal delay={0.1}>
          <div className={tile}>
            <div className="eyebrow">Cinturões</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="display text-[64px] leading-[0.85] text-fg">{champs.length}</span>
              <span className="text-[14px] text-fg-3">campeões de {byCountry.length} países</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {byCountry.map(([code, v]) => (
                <span key={code} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-1 pr-2.5 text-[13px] font-semibold text-fg-2">
                  <Flag code={code} title={v.country} size={20} />{v.n}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* atalho para comparar */}
        <Reveal delay={0.15}>
          {m ? (
            <Link to={`/comparar?a=${m.red.slug}&ae=${m.red.espnId}&b=${m.blue.slug}&be=${m.blue.espnId}`} className="block h-full">
              <Spotlight duel className={`${tile} group flex flex-col justify-between`}>
                <div className="eyebrow">Frente a frente</div>
                <div className="my-3 flex items-center">
                  <Avatar src={m.red.headshot} name={m.red.name} size={60} ring="var(--color-red)" />
                  <span className="-mx-1 z-10 grid h-8 w-8 place-items-center rounded-full bg-fg text-[12px] font-bold text-bg">VS</span>
                  <Avatar src={m.blue.headshot} name={m.blue.name} size={60} ring="var(--color-blue)" />
                </div>
                <div className="flex items-center gap-1.5 text-[15px] font-bold text-fg group-hover:text-brand">Comparar a luta principal <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
              </Spotlight>
            </Link>
          ) : <Skeleton className="h-full" />}
        </Reveal>
      </div>
    </section>
  );
}

function Champions() {
  const { data, isLoading, isError, refetch } = useRankings();
  const { data: meta } = useRankingsMeta();
  const divs = data?.divisions.filter(d => d.champion) ?? [];
  return (
    <section className="py-12">
      <Reveal>
        <SectionTitle eyebrow="Rankings oficiais" title="Os donos dos cinturões" action={<Link to="/rankings" className="btn">Todos os rankings <ArrowUpRight className="h-4 w-4" /></Link>} />
      </Reveal>
      {isError && <Panel><ErrorState onRetry={() => refetch()} /></Panel>}
      {isLoading && <div className="flex gap-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[320px] w-[280px] shrink-0" />)}</div>}
      {divs.length > 0 && (
        <Reveal delay={0.1}>
          <Carousel opts={{ align: 'start', dragFree: true }} className="relative">
            <CarouselContent className="-ml-5 pb-8 pt-2">
              {divs.map(d => {
                const c = d.champion!;
                return (
                  <CarouselItem key={d.id} className="basis-[78%] pl-5 sm:basis-1/2 lg:basis-1/4">
                    <Link to={fighterHref({ slug: c.slug, espnId: meta?.[c.slug]?.espnId })} className="group block overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.04] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)]">
                      <div className="relative h-[190px] overflow-hidden bg-gradient-to-b from-cream to-cream-2">
                        <FlagBackdrop code={meta?.[c.slug]?.countryCode} className="inset-0 opacity-45 dark:opacity-35" />
                        {c.image && <img src={c.image} alt="" loading="lazy" className="absolute bottom-0 left-1/2 h-[96%] w-auto max-w-none -translate-x-1/2 object-contain transition-transform duration-500 group-hover:scale-[1.04]" />}
                      </div>
                      <div className="px-5 pb-5 pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[14px] font-semibold text-fg-3"><Crown weight="fill" className="h-4 w-4 text-gold" />{d.name}</span>
                          {meta?.[c.slug] && <span className="flex items-center gap-2"><Flag code={meta[c.slug].countryCode} title={meta[c.slug].country} size={18} /><span className="num text-[14px] font-semibold text-fg-2">{meta[c.slug].record}</span></span>}
                        </div>
                        <div className="mt-1.5 font-display text-[21px] font-semibold leading-tight text-fg">{c.name}</div>
                        <div className="mt-3 flex items-center gap-1.5 text-[14px] font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">Ver perfil <ArrowRight className="h-3.5 w-3.5" /></div>
                      </div>
                    </Link>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <div className="flex gap-2">
              <CarouselPrevious className="static size-11 translate-y-0 border-0 bg-surface text-fg shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.06] hover:bg-surface-2 dark:bg-surface dark:hover:bg-surface-2" />
              <CarouselNext className="static size-11 translate-y-0 border-0 bg-fg text-bg shadow-[var(--shadow-soft)] hover:bg-fg/90 hover:text-bg dark:bg-fg dark:hover:bg-fg/90" />
            </div>
          </Carousel>
        </Reveal>
      )}
    </section>
  );
}

/* ---------- Card de um evento ---------- */

function EventCard({ id, eyebrow, title, limit = 6 }: { id?: string; eyebrow: string; title: string; limit?: number }) {
  const { data, isLoading, isError, refetch } = useEvent(id);
  const fights = data?.fights.filter(f => f.segment === 'main').slice(0, limit) ?? [];
  return (
    <Panel eyebrow={eyebrow}
      title={<div><h2 className="panel-title">{title}</h2>{data && <p className="mt-0.5 truncate text-[14px] text-fg-3">{data.name} · {fullDate(data.date)}</p>}</div>}
      action={id && <Link to={`/eventos/${id}`} className="btn-ghost shrink-0">Ver evento <ArrowRight className="h-4 w-4" /></Link>}
      bodyClass="divide-y divide-line/70 px-2 pb-2">
      {isLoading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="px-4 py-4"><Skeleton className="h-12" /></div>)}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {fights.map(f => <FightRow key={f.id} fight={f} eventId={id} />)}
    </Panel>
  );
}

/* ---------- Agenda (como os "passos" coloridos da referência) ---------- */

const AGENDA_TONES = ['bg-gold text-[#14183e]', 'bg-brand text-white', 'bg-blue text-white', 'bg-fg text-bg'];

function Agenda({ events }: { events: UpcomingEvent[] }) {
  return (
    <div>
      <div className="eyebrow mb-2">Calendário</div>
      <h2 className="display text-[32px] text-fg">Próximas datas</h2>
      <ul className="mt-6 space-y-3">
        {events.map((e, i) => {
          const { series, title } = splitEventName(e.name);
          return (
            <li key={e.id}>
              <Link to={`/eventos/${e.id}`} className="group flex items-center gap-4 rounded-2xl p-2 pr-4 transition-all hover:bg-surface hover:shadow-[var(--shadow-soft)]">
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${AGENDA_TONES[i % AGENDA_TONES.length]}`}>
                  <div className="text-center leading-none">
                    <div className="num font-display text-[20px] font-semibold">{dayMonth(e.date).split(' ')[0]}</div>
                    <div className="mt-0.5 text-[11.5px] font-bold uppercase tracking-wider opacity-80">{dayMonth(e.date).split(' ')[1]}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold text-fg">{title || series}</div>
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
      <Link to="/eventos" className="btn mt-6"><CalendarDots className="h-4 w-4" /> Calendário completo</Link>
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
      {upcoming.isLoading && <div className="grid gap-10 py-10 lg:grid-cols-2"><div className="space-y-5"><Skeleton className="h-6 w-60" /><Skeleton className="h-40" /><Skeleton className="h-20" /></div><Skeleton className="h-[480px] rounded-[48%]" /></div>}
      {upcoming.isError && <Panel><ErrorState onRetry={() => upcoming.refetch()} /></Panel>}
      {next && <Hero e={next} />}
      {!upcoming.isLoading && !next && <Panel><Empty>Nenhum evento anunciado.</Empty></Panel>}

      <Bento next={next} />
      <Champions />

      <section className="grid gap-10 py-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          {next && <Reveal><EventCard id={next.id} eyebrow="Próximo evento" title="Card principal" /></Reveal>}
          <Reveal delay={0.05}><EventCard id={lastId} eyebrow="Encerrado" title="Últimos resultados" /></Reveal>
        </div>
        {ufcOnly.length > 1 && <Reveal delay={0.1}><Agenda events={ufcOnly.slice(1, 7)} /></Reveal>}
      </section>
    </div>
  );
}
