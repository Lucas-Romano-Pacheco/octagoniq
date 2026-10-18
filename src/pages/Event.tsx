import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowsClockwise, MapPin } from '@phosphor-icons/react';
import type { CardSegment, Fight } from '@shared/types';
import { useEvent } from '@/lib/api';
import { longDate, SEGMENT_LABEL, splitEventName, time } from '@/lib/format';
import { FightRow } from '@/components/FightRow';
import { ErrorState, LiveTag, Panel, Skeleton, Tag } from '@/components/kit';

function Summary({ fights }: { fights: Fight[] }) {
  const done = fights.filter(f => f.result);
  if (!done.length) return null;
  const count = (re: RegExp) => done.filter(f => re.test(f.result!.method)).length;
  const ko = count(/KO/), sub = count(/Finaliza/), dec = count(/Decis/);
  const r1 = done.filter(f => f.result!.round === 1 && !/Decis/.test(f.result!.method)).length;
  const p = (n: number) => `${Math.round((n / done.length) * 100)}%`;
  // faixa de placar do evento, sem cards: linhas finas entre os números
  return (
    <div className="rule grid grid-cols-2 gap-y-6 lg:grid-cols-4 lg:divide-x lg:divide-line">
      {[
        { label: 'Nocautes', value: ko, sub: p(ko) + ' das lutas' },
        { label: 'Finalizações', value: sub, sub: p(sub) + ' das lutas' },
        { label: 'Decisões', value: dec, sub: p(dec) + ' das lutas' },
        { label: 'Encerradas no R1', value: r1, sub: `${done.length} lutas realizadas` },
      ].map((s, i) => (
        <div key={s.label} className={i ? 'lg:pl-6' : 'lg:pr-6'}>
          <div className="label">{s.label}</div>
          <div className="display mt-1 text-[52px] text-fg">{s.value}</div>
          <div className="mt-1 text-[14px] text-fg-3">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

const ORDER: CardSegment[] = ['main', 'prelims', 'early'];

export default function Event() {
  const { id } = useParams();
  const { data: e, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useEvent(id);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-96" /></div>;
  if (isError || !e) return <Panel><ErrorState message={error?.message} onRetry={() => refetch()} /></Panel>;

  const { series, title } = splitEventName(e.name);
  return (
    <div className="space-y-6">
      <div>
        <Link to="/eventos" className="btn-ghost -ml-2.5 mb-3"><ArrowLeft className="h-3.5 w-3.5" /> Eventos</Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="eyebrow">{series}</span>
              {e.status === 'in' && <LiveTag />}
              {e.status === 'post' && <Tag>Encerrado</Tag>}
            </div>
            <h1 className="display mt-4 text-[48px] text-fg sm:text-[68px]">{title || series}</h1>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[14px] text-fg-2">
              <span className="first-letter:uppercase">{longDate(e.date)} · card principal às {time(e.date)} (Brasília)</span>
              {e.venue && <span className="inline-flex items-center gap-1 text-fg-3"><MapPin className="h-3.5 w-3.5" />{e.venue} · {e.city}{e.country ? `, ${e.country}` : ''}</span>}
            </p>
          </div>
          {e.status === 'in' && (
            <div className="flex items-center gap-2 text-[13px] text-fg-3">
              <ArrowsClockwise className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Atualiza a cada 20 s · {new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')}
            </div>
          )}
        </div>
      </div>

      <Summary fights={e.fights} />

      {ORDER.map(seg => {
        const fights = e.fights.filter(f => f.segment === seg);
        if (!fights.length) return null;
        return (
          <Panel key={seg}
            title={<h2 className="panel-title">{SEGMENT_LABEL[seg]} <span className="ml-1.5 align-middle font-sans text-[14px] font-semibold text-fg-3">{fights.length} lutas</span></h2>}
            action={<span className="num rounded-full bg-surface-2 px-3 py-1 text-[13.5px] font-semibold text-fg-2">{[e.segmentStart[seg] && time(e.segmentStart[seg]!), fights[0].broadcast].filter(Boolean).join(' · ')}</span>}
            bodyClass="divide-y divide-line/70 px-2 pb-2">
            {fights.map(f => <FightRow key={f.id} fight={f} eventId={e.id} />)}
          </Panel>
        );
      })}
    </div>
  );
}
