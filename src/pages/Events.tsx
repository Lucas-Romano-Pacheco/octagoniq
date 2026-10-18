import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import type { EventListItem } from '@shared/types';
import { useSchedule } from '@/lib/api';
import { dayMonth, splitEventName, time, weekday } from '@/lib/format';
import { Empty, ErrorState, PageHeader, Panel, Segmented, Skeleton, Tag, Tip } from '@/components/kit';

type Filter = 'all' | 'ppv' | 'fight-night' | 'dwcs';
const SERIES_LABEL: Record<EventListItem['series'], string> = { ppv: 'Numerado', 'fight-night': 'Fight Night', dwcs: 'Contender Series', other: 'Especial' };
const FIRST_YEAR = 2010;

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'];
const CHIP: Record<EventListItem['series'], string> = {
  ppv: 'bg-brand text-white',
  'fight-night': 'bg-blue text-white',
  dwcs: 'bg-gold text-[#14183e]',
  other: 'bg-fg text-bg',
};
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default function Events() {
  const [params, setParams] = useSearchParams();
  const today = new Date();
  const [y, m] = (params.get('mes') ?? '').split('-').map(Number);
  const year = y || today.getFullYear(), month = m ? m - 1 : today.getMonth();
  const [view, setView] = useState<'mes' | 'lista'>('mes');
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading, isError, refetch, isFetching } = useSchedule(year);

  const list = useMemo(() => (data ?? []).filter(e => filter === 'all' || e.series === filter), [data, filter]);
  const setMonth = (yy: number, mm: number) => {
    const d = new Date(yy, mm, 1);
    const isNow = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    setParams(isNow ? {} : { mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
  };

  return (
    <div>
      <PageHeader eyebrow="Calendário" title="Eventos" meta={data && `${data.length} eventos em ${year} · horários de Brasília`}>
        <Segmented value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'Todos' }, { value: 'ppv', label: 'Numerados' }, { value: 'fight-night', label: 'Fight Night' }, { value: 'dwcs', label: 'DWCS' },
        ]} />
      </PageHeader>

      {/* barra do calendário, como a do Google Agenda */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button className="btn h-9" onClick={() => setMonth(today.getFullYear(), today.getMonth())}>Hoje</button>
        <div className="flex items-center">
          <button className="btn-ghost h-9 w-9 justify-center px-0" disabled={year <= FIRST_YEAR && month === 0} onClick={() => setMonth(year, month - 1)} aria-label="Mês anterior"><CaretLeft className="h-4 w-4" /></button>
          <button className="btn-ghost h-9 w-9 justify-center px-0" onClick={() => setMonth(year, month + 1)} aria-label="Próximo mês"><CaretRight className="h-4 w-4" /></button>
        </div>
        <h2 className={clsx('font-display text-[24px] font-bold text-fg', isFetching && 'opacity-60')}>{MONTHS[month]} de {year}</h2>
        <Segmented className="ml-auto" value={view} onChange={setView} options={[{ value: 'mes', label: 'Mês' }, { value: 'lista', label: 'Lista' }]} />
      </div>

      {isError && <Panel><ErrorState onRetry={() => refetch()} /></Panel>}
      {isLoading && <Skeleton className="h-[640px]" />}

      {data && view === 'mes' && <MonthGrid year={year} month={month} events={list} />}
      {data && view === 'lista' && <MonthList year={year} month={month} events={list} />}
    </div>
  );
}

/** Grade do mês (domingo a sábado), com os eventos de cada dia em etiquetas coloridas. */
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

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS.map(d => <div key={d} className="py-2 text-center text-[12px] font-semibold uppercase tracking-wider text-fg-3">{d}</div>)}
      </div>
      <div className="grid grid-cols-7" style={{ gridTemplateRows: `repeat(${weeks}, minmax(112px, 1fr))` }}>
        {days.map((d, i) => {
          const inMonth = d.getMonth() === month;
          const isToday = dayKey(d) === todayKey;
          const evs = byDay.get(dayKey(d)) ?? [];
          return (
            <div key={i} className={clsx('min-w-0 border-line p-1.5', i % 7 !== 6 && 'border-r', i < (weeks - 1) * 7 && 'border-b', !inMonth && 'bg-surface-2/40')}>
              <div className="mb-1 flex justify-center">
                <span className={clsx('num grid h-7 min-w-7 place-items-center rounded-full px-1 text-[13px] font-semibold',
                  isToday ? 'bg-blue text-white' : inMonth ? 'text-fg' : 'text-fg-3')}>
                  {d.getDate() === 1 ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3).toLowerCase()}.` : d.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {evs.map(e => {
                  const { series, title } = splitEventName(e.name);
                  return (
                    <Tip key={e.id} title={e.name} content={`${weekday(e.date)} ${dayMonth(e.date)} · ${time(e.date)} · ${SERIES_LABEL[e.series]}`}>
                      <Link to={`/eventos/${e.id}`}
                        className={clsx('block truncate rounded-md px-1.5 py-0.5 text-[12px] font-semibold leading-5 transition-opacity hover:opacity-85', CHIP[e.series], !inMonth && 'opacity-60')}>
                        <span className="num mr-1 hidden opacity-80 md:inline">{time(e.date)}</span>{title || series}
                      </Link>
                    </Tip>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 border-t border-line px-4 py-3 text-[13px] text-fg-2">
        {(['ppv', 'fight-night', 'dwcs'] as const).map(k => (
          <span key={k} className="flex items-center gap-1.5"><span className={clsx('h-2.5 w-2.5 rounded-sm', CHIP[k])} />{SERIES_LABEL[k]}</span>
        ))}
      </div>
    </div>
  );
}

/** Lista dos eventos do mês (alternativa à grade, melhor no celular). */
function MonthList({ year, month, events }: { year: number; month: number; events: EventListItem[] }) {
  const inMonth = events.filter(e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === month; });
  if (!inMonth.length) return <Panel><Empty>Nenhum evento neste mês.</Empty></Panel>;
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
                <tr key={e.id} className="cursor-pointer">
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
