import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CalendarBlank, CaretLeft, CaretRight, Check, Crown } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import type { EventListItem } from '@shared/types';
import { useSchedule, useUpcoming } from '@/lib/api';
import { SERIES_LABEL, SERIES_TONE } from '@/lib/series';
import { countdown, dayMonth, lastName, splitEventName, time, weekday } from '@/lib/format';
import { Avatar, Empty, ErrorState, PageHeader, Panel, Segmented, Skeleton, Tag, Tip, usePageTitle } from '@/components/kit';

type Filter = 'all' | 'ppv' | 'fight-night' | 'dwcs';
const FIRST_YEAR = 2010;

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const CHIP = SERIES_TONE;
/** Cor de cada tipo de evento (a mesma da legenda e do resto do site). */
const TONE: Record<EventListItem['series'], string> = { ppv: 'var(--color-brand)', 'fight-night': 'var(--color-blue)', dwcs: 'var(--color-gold)', other: 'var(--color-fg)' };
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default function Events() {
  const [params, setParams] = useSearchParams();
  const today = new Date();
  const [y, m] = (params.get('mes') ?? '').split('-').map(Number);
  const year = y || today.getFullYear(), month = m ? m - 1 : today.getMonth();
  const [view, setView] = useState<'mes' | 'lista'>('mes');
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isPending: isLoading, isError, refetch, isFetching } = useSchedule(year);
  usePageTitle('Calendário de eventos');

  // direção da troca de mês (para o deslize): para frente ou para trás
  const idx = year * 12 + month, prev = useRef(idx);
  const dir = idx >= prev.current ? 1 : -1;
  useEffect(() => { prev.current = idx; }, [idx]);

  const list = useMemo(() => (data ?? []).filter(e => filter === 'all' || e.series === filter), [data, filter]);
  const inThisMonth = useMemo(() => list.filter(e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === month; }), [list, year, month]);
  const perMonth = useMemo(() => { const c = Array(12).fill(0) as number[]; for (const e of list) c[new Date(e.date).getMonth()]++; return c; }, [list]);
  const setMonth = (yy: number, mm: number) => {
    const d = new Date(yy, mm, 1);
    const isNow = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    setParams(isNow ? {} : { mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
  };
  const count = (s: EventListItem['series']) => inThisMonth.filter(e => e.series === s).length;

  return (
    <div>
      <PageHeader title="Eventos" meta={data && `${data.length} eventos em ${year} · horários de Brasília`}>
        <Segmented value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'Todos' }, { value: 'ppv', label: 'Numerados' }, { value: 'fight-night', label: 'Fight Night' }, { value: 'dwcs', label: 'DWCS' },
        ]} />
      </PageHeader>

      <NextUp />

      {/* navegação do ano: um botão por mês, com o número de eventos */}
      <div className="no-scrollbar -mx-5 mb-6 flex gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label={`Meses de ${year}`}>
        {MONTHS.map((n, i) => {
          const on = i === month, now = i === today.getMonth() && year === today.getFullYear();
          return (
            <button key={n} role="tab" aria-selected={on} onClick={() => setMonth(year, i)}
              className={clsx('lift relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 font-display text-[13px] font-bold uppercase tracking-[0.06em] ring-1 transition-colors',
                on ? 'bg-fg text-bg ring-fg' : 'bg-surface text-fg-2 ring-fg/[0.08] hover:bg-surface-2 hover:text-fg')}>
              {n.slice(0, 3)}
              {perMonth[i] > 0 && <span className={clsx('num rounded px-1.5 text-[11.5px]', on ? 'bg-bg/15' : 'bg-surface-2 text-fg-3')}>{perMonth[i]}</span>}
              {now && !on && <span aria-label="mês atual" className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-blue ring-2 ring-bg" />}
            </button>
          );
        })}
      </div>

      {/* título do mês, navegação e números */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <button className="lift grid h-11 w-11 place-items-center rounded-full bg-surface ring-1 ring-fg/[0.08] disabled:opacity-40" disabled={year <= FIRST_YEAR && month === 0} onClick={() => setMonth(year, month - 1)} aria-label="Mês anterior"><CaretLeft weight="bold" className="h-5 w-5" /></button>
          <div className="relative h-[52px] min-w-0 flex-1 overflow-hidden sm:h-[64px] sm:w-[470px] sm:flex-none">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.h2 key={idx} custom={dir} initial={{ y: dir * 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: dir * -40, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={clsx('display absolute inset-0 whitespace-nowrap text-[40px] leading-[52px] text-fg sm:text-[56px] sm:leading-[64px]', isFetching && 'opacity-60')}>
                {MONTHS[month]} <span className="text-[0.55em] text-fg-3">{year}</span>
              </motion.h2>
            </AnimatePresence>
          </div>
          <button className="lift grid h-11 w-11 place-items-center rounded-full bg-fg text-bg" onClick={() => setMonth(year, month + 1)} aria-label="Próximo mês"><CaretRight weight="bold" className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn" onClick={() => setMonth(today.getFullYear(), today.getMonth())}><CalendarBlank weight="bold" className="h-4 w-4" /> Hoje</button>
          <Segmented value={view} onChange={setView} options={[{ value: 'mes', label: 'Mês' }, { value: 'lista', label: 'Lista' }]} />
        </div>
      </div>

      <div className="rule mb-6 grid grid-cols-2 gap-y-4 sm:grid-cols-4 sm:divide-x sm:divide-line">
        {[['No mês', inThisMonth.length, 'var(--color-fg)'], ['Numerados', count('ppv'), TONE.ppv], ['Fight Night', count('fight-night'), TONE['fight-night']], ['Contender Series', count('dwcs'), TONE.dwcs]].map(([l, v, c], i) => (
          <div key={l as string} className={clsx('flex items-center gap-3', i && 'sm:pl-6')}>
            <span className="h-9 w-1 rounded-full" style={{ background: c as string }} />
            <div><div className="label">{l}</div><motion.div key={`${idx}-${l}`} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="display text-[34px] text-fg">{v}</motion.div></div>
          </div>
        ))}
      </div>

      {isError && <Panel><ErrorState onRetry={() => refetch()} /></Panel>}
      {isLoading && <Skeleton className="h-[640px]" />}

      <AnimatePresence mode="wait" initial={false}>
        {data && view === 'mes' && (
          <motion.div key={`g-${idx}`} initial={{ opacity: 0, x: dir * 36 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -36 }} transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>
            <MonthGrid year={year} month={month} events={list} />
          </motion.div>
        )}
        {data && view === 'lista' && <motion.div key={`l-${idx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><MonthList year={year} month={month} events={list} /></motion.div>}
      </AnimatePresence>
    </div>
  );
}

/** Destaque do próximo evento, com a luta principal e a contagem regressiva. */
function NextUp() {
  const { data } = useUpcoming(6);
  const e = (data ?? []).find(x => x.series !== 'dwcs' && x.status !== 'post');
  if (!e) return <div className="mb-6 h-[132px]" />;
  const { series, title } = splitEventName(e.name), m = e.main;
  return (
    <Link to={`/eventos/${e.id}`} className="cut group relative mb-6 block overflow-hidden rounded-2xl bg-[#14183e] p-5 text-white shadow-[var(--shadow-lift)] transition-transform duration-300 hover:-translate-y-0.5 sm:p-6">
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-70" style={{ background: TONE[e.series] }} />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-display text-[12.5px] font-semibold uppercase tracking-[0.14em] text-white/70">
            <span className="h-2 w-2 animate-pulse rounded-full bg-gold" /> Próximo evento · {series}
          </div>
          <div className="display mt-2 text-[34px] sm:text-[44px]">{m ? `${lastName(m.red.name)} × ${lastName(m.blue.name)}` : title || series}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-white/75">
            <span className="first-letter:uppercase">{weekday(e.date)}, {dayMonth(e.date)} · {time(e.date)}</span>
            {e.city && <span className="text-white/55">{e.city}</span>}
            {m?.title && <span className="inline-flex items-center gap-1 rounded-md bg-gold px-2 py-0.5 font-display text-[12px] font-bold uppercase tracking-[0.06em] text-[#14183e]"><Crown weight="fill" className="h-3 w-3" /> Cinturão · {m.weightClass}</span>}
          </div>
        </div>
        <div className="flex items-center gap-5">
          {m && <span className="hidden items-center sm:flex"><Avatar src={m.red.headshot} name={m.red.name} size={72} ring="var(--color-red)" /><Avatar src={m.blue.headshot} name={m.blue.name} size={72} ring="var(--color-blue)" className="-ml-4" /></span>}
          <div className="text-right">
            <div className="num display text-[30px] text-gold sm:text-[38px]">{e.status === 'in' ? 'AO VIVO' : countdown(e.date)}</div>
            <div className="mt-1 inline-flex items-center gap-1.5 font-display text-[13px] font-bold uppercase tracking-[0.08em] text-white/80 transition-transform group-hover:translate-x-1">Ver card <ArrowRight weight="bold" className="h-4 w-4" /></div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Grade do mês (domingo a sábado): células altas que entram em cascata, hoje com pulso e etiquetas dos eventos. */
function MonthGrid({ year, month, events }: { year: number; month: number; events: EventListItem[] }) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const weeks = Math.ceil((first.getDay() + new Date(year, month + 1, 0).getDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const byDay = useMemo(() => {
    const m = new Map<string, EventListItem[]>();
    for (const e of events) { const k = dayKey(new Date(e.date)); m.set(k, [...(m.get(k) ?? []), e]); }
    return m;
  }, [events]);
  const todayKey = dayKey(new Date());
  const now = Date.now();
  // celular: dia escolhido (por toque). Padrão: hoje, se tiver evento; senão o próximo dia com evento no mês; senão o primeiro
  const monthDays = days.filter(d => d.getMonth() === month && byDay.has(dayKey(d)));
  const fallback = byDay.has(todayKey) ? todayKey : dayKey(monthDays.find(d => d >= new Date(new Date().toDateString())) ?? monthDays[0] ?? new Date());
  const [picked, setPicked] = useState<string | null>(null);
  const sel = picked ?? fallback;
  const selDate = days.find(d => dayKey(d) === sel);
  const selEvents = byDay.get(sel) ?? [];

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line bg-surface-2/50">
        {WEEKDAYS.map((d, i) => <div key={d} className={clsx('py-3 text-center font-display text-[13px] font-bold uppercase tracking-[0.14em]', i === 0 || i === 6 ? 'text-brand' : 'text-fg-3')}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7" style={{ gridTemplateRows: `repeat(${weeks}, minmax(138px, 1fr))` }}>
        {days.map((d, i) => {
          const inMonth = d.getMonth() === month;
          const isToday = dayKey(d) === todayKey;
          const evs = byDay.get(dayKey(d)) ?? [];
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div key={i} onClick={() => setPicked(dayKey(d))} style={{ animationDelay: `${(i % 7) * 25 + Math.floor(i / 7) * 45}ms` }}
              className={clsx('cell-in group/cell relative min-w-0 cursor-pointer border-line p-2 transition-colors duration-200 hover:bg-surface-2/80 sm:cursor-default', i % 7 !== 6 && 'border-r', i < (weeks - 1) * 7 && 'border-b',
                !inMonth && 'bg-surface-2/50', inMonth && weekend && 'bg-surface-2/25', dayKey(d) === sel && 'max-sm:bg-surface-2', isToday && 'bg-blue/[0.07]')}>
              {evs.length > 0 && inMonth && <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${TONE[evs[0].series]}, transparent)` }} />}
              <div className="mb-1.5 flex items-center justify-between">
                <span className={clsx('num grid h-9 min-w-9 place-items-center rounded-full px-1.5 font-display text-[19px] font-bold transition-transform duration-200 group-hover/cell:scale-110',
                  isToday ? 'today-pulse bg-blue text-white' : inMonth ? 'text-fg' : 'text-fg-3/70')}>
                  {d.getDate()}
                </span>
                {d.getDate() === 1 && <span className="hidden font-display text-[12px] font-bold uppercase tracking-[0.1em] text-fg-3 sm:inline">{MONTHS[d.getMonth()].slice(0, 3)}</span>}
              </div>
              {/* celular: só pontos coloridos (o nome não cabe); os eventos do dia aparecem abaixo da grade */}
              <div className="flex flex-wrap justify-center gap-1 sm:hidden">
                {evs.map(e => <span key={e.id} className={clsx('h-2.5 w-2.5 rounded-full', CHIP[e.series].split(' ')[0])} />)}
              </div>
              <div className="hidden space-y-1.5 sm:block">
                {evs.map(e => {
                  const { series, title } = splitEventName(e.name);
                  const past = new Date(e.date).getTime() < now - 8 * 3600_000;
                  return (
                    <Tip key={e.id} title={e.name} content={`${weekday(e.date)} ${dayMonth(e.date)} · ${time(e.date)} · ${SERIES_LABEL[e.series]}${past ? ' · encerrado' : ''}`}>
                      <Link to={`/eventos/${e.id}`}
                        className={clsx('cut block rounded-lg px-2 py-1.5 shadow-[0_1px_0_rgb(0_0_0/0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[var(--shadow-lift)] hover:brightness-110 active:scale-95', CHIP[e.series], (!inMonth || past) && 'opacity-70')}>
                        <span className="flex items-center justify-between gap-1 text-[11.5px] font-semibold opacity-85"><span className="num">{time(e.date)}</span>{past ? <Check weight="bold" className="h-3 w-3" aria-label="encerrado" /> : null}</span>
                        <span className="mt-0.5 block truncate text-[14px] font-bold leading-tight">{title || series}</span>
                      </Link>
                    </Tip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-line px-4 py-4 sm:hidden">
        <div className="label mb-3">{selDate ? selDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={sel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {selEvents.length === 0 ? <p className="text-[15px] text-fg-3">Nenhum evento neste dia.</p> : (
              <ul className="space-y-2.5">
                {selEvents.map(e => {
                  const { series, title } = splitEventName(e.name);
                  return (
                    <li key={e.id}>
                      <Link to={`/eventos/${e.id}`} className="cut flex items-center gap-3 rounded-xl bg-surface-2/60 px-3.5 py-3 transition-transform active:scale-[0.98]">
                        <span className={clsx('h-10 w-1.5 shrink-0 rounded-full', CHIP[e.series].split(' ')[0])} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16.5px] font-bold text-fg">{title || series}</span>
                          <span className="block text-[14px] text-fg-3">{series} · {time(e.date)}</span>
                        </span>
                        <ArrowRight weight="bold" className="h-4 w-4 text-fg-3" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap gap-5 border-t border-line bg-surface-2/40 px-5 py-3.5 text-[14px] font-medium text-fg-2">
        {(['ppv', 'fight-night', 'dwcs'] as const).map(k => (
          <span key={k} className="flex items-center gap-2"><span className={clsx('h-3 w-3 rounded', CHIP[k])} />{SERIES_LABEL[k]}</span>
        ))}
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue ring-2 ring-blue/30" />Hoje</span>
      </div>
    </div>
  );
}

/** Lista dos eventos do mês (alternativa à grade, melhor no celular). */
function MonthList({ year, month, events }: { year: number; month: number; events: EventListItem[] }) {
  const inMonth = events.filter(e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === month; });
  if (!inMonth.length) return <Panel><Empty>Mês de folga: nenhum evento marcado.</Empty></Panel>;
  return <EventTable title={`${MONTHS[month]} de ${year}`} events={inMonth} />;
}

function EventTable({ title, events }: { title: string; events: EventListItem[] }) {
  return (
    <Panel title={<h2 className="panel-title">{title} <span className="ml-1 font-mono text-[12.5px] font-normal text-fg-3">{events.length}</span></h2>}>
      <div className="overflow-x-auto">
        <table className="table table-fixed">
          <thead><tr><th className="w-28">Data</th><th>Evento</th><th className="hidden w-44 sm:table-cell">Tipo</th><th className="hidden w-20 text-right md:table-cell">Horário</th></tr></thead>
          <tbody>
            {events.map(e => {
              const { series, title: t } = splitEventName(e.name);
              return (
                <tr key={e.id} className="row-fx cursor-pointer" style={{ ['--item-accent' as string]: e.series === 'ppv' ? 'var(--color-brand)' : e.series === 'fight-night' ? 'var(--color-blue)' : 'var(--color-gold)' }}>
                  <td className="num font-mono text-[13px] text-fg-2"><Link to={`/eventos/${e.id}`} className="block">{weekday(e.date)} {dayMonth(e.date)}</Link></td>
                  <td className="truncate">
                    <Link to={`/eventos/${e.id}`} className="block truncate">
                      <span className="font-medium text-fg">{t || series}</span>
                      {t && <span className="ml-2 text-[13px] text-fg-3">{series}</span>}
                    </Link>
                  </td>
                  <td className="hidden sm:table-cell"><Tag tone={e.series === 'ppv' ? 'brand' : 'neutral'}>{SERIES_LABEL[e.series]}</Tag></td>
                  <td className="num hidden text-right font-mono text-[13px] text-fg-3 md:table-cell">{time(e.date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
