import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowsClockwise, CaretDown, Crown, MapPin, Target } from '@phosphor-icons/react';
import type { CardSegment, EventDetail, Fight, FighterRef } from '@shared/types';
import { fighterHref, useEvent } from '@/lib/api';
import { longDate, mmss, SEGMENT_LABEL, splitEventName, time } from '@/lib/format';
import { cardSummary } from '@/lib/fights';
import { FightRow } from '@/components/FightRow';
import { LiveBar, useFightNotices, useLiveTitle } from '@/components/LiveBar';
import { EventSkeleton } from '@/components/Skeletons';
import { Defer, ErrorState, FlagBackdrop, LiveTag, OctagonFrame, Panel, Tag, usePageTitle } from '@/components/kit';
import { proxy } from '@/lib/img';

/* ---------- Resumo da noite (faixa de placar) ---------- */

function Summary({ fights }: { fights: Fight[] }) {
  const s = cardSummary(fights);
  if (!s.done) return null;
  const p = (n: number) => `${Math.round((n / s.done) * 100)}% das lutas`;
  const items = [
    { label: 'Nocautes', value: s.ko, sub: p(s.ko) },
    { label: 'Finalizações', value: s.sub, sub: p(s.sub) },
    { label: 'Decisões', value: s.dec, sub: p(s.dec) },
    { label: 'Encerradas no R1', value: s.r1, sub: `${s.done} lutas realizadas` },
    { label: 'Zebras', value: s.upsets, sub: 'vencedor com menos de 35% de chance' },
    { label: 'Duração média', value: s.avgSeconds !== undefined ? mmss(s.avgSeconds) : '—', sub: 'por luta' },
  ];
  return (
    <div className="rule grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-line">
      {items.map((it, i) => (
        <div key={it.label} className={i ? 'lg:pl-5' : 'lg:pr-5'}>
          <div className="label">{it.label}</div>
          <div className="display mt-1 text-[44px] text-fg">{it.value}</div>
          <div className="mt-1 text-[13px] text-fg-3">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Topo em estilo pôster: luta principal em destaque ---------- */

function Cutout({ f, right }: { f: FighterRef; right?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!f.bodyImage || failed) return null;
  return (
    <Link to={fighterHref(f)} aria-label={f.name} className={clsx('absolute bottom-0 h-[96%] w-[52%]', right ? 'right-0' : 'left-0')}>
      <img src={proxy(f.bodyImage, 640)} alt={f.name} fetchPriority="high" decoding="async" onError={() => setFailed(true)}
        className={clsx('absolute bottom-0 h-full w-auto max-w-none object-contain drop-shadow-[0_30px_40px_var(--cutout-shadow)] [mask-image:linear-gradient(to_bottom,black_82%,transparent)]',
          right ? 'right-0 -scale-x-100' : 'left-0')} />
    </Link>
  );
}

function Poster({ e, live }: { e: EventDetail; live?: React.ReactNode }) {
  const { series, title } = splitEventName(e.name);
  const main = e.fights.find(f => f.order === 1) ?? e.fights[0];
  const hasCutouts = !!(main?.red.bodyImage || main?.blue.bodyImage);
  return (
    <section className="grid items-end gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="min-w-0 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">{series}</span>
          {e.status === 'in' && <LiveTag />}
          {e.status === 'post' && <Tag>Encerrado</Tag>}
        </div>
        <h1 className="display mt-4 text-[48px] text-fg sm:text-[72px]">{title || series}</h1>
        {main?.title && <div className="mt-4"><Tag tone="gold"><Crown weight="fill" className="h-3.5 w-3.5" /> Disputa de cinturão · {main.weightClass}</Tag></div>}
        <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[15px] text-fg-2">
          <span className="first-letter:uppercase">{longDate(e.date)} · card principal às {time(e.date)} (Brasília)</span>
          {e.venue && <span className="inline-flex items-center gap-1 text-fg-3"><MapPin className="h-3.5 w-3.5" />{e.venue} · {e.city}{e.country ? `, ${e.country}` : ''}</span>}
        </p>
        {live}
      </div>
      {hasCutouts && main && (
        <div className="relative mx-auto h-[300px] w-full max-w-[560px] sm:h-[400px]">
          <OctagonFrame className="bottom-0 left-1/2 h-[92%] -translate-x-1/2">
            <div className="absolute inset-0 bg-cream" />
            <FlagBackdrop code={main.red.countryCode} shape="fade-right" className="inset-y-0 left-0 w-[62%] opacity-40 dark:opacity-30" />
            <FlagBackdrop code={main.blue.countryCode} shape="fade-left" className="inset-y-0 right-0 w-[62%] opacity-40 dark:opacity-30" />
          </OctagonFrame>
          <Cutout f={main.red} />
          <Cutout f={main.blue} right />
        </div>
      )}
    </section>
  );
}

/* ---------- Partes do card: navegação fixa e seções recolhíveis ---------- */

const ORDER: CardSegment[] = ['main', 'prelims', 'early'];

function SegmentNav({ e }: { e: EventDetail }) {
  const segs = ORDER.filter(s => e.fights.some(f => f.segment === s));
  if (segs.length < 2) return null;
  return (
    <nav aria-label="Partes do card" className="sticky top-[76px] z-20 -mx-5 flex gap-2 overflow-x-auto bg-bg/85 px-5 py-2.5 backdrop-blur-md no-scrollbar sm:-mx-8 sm:px-8">
      {segs.map(s => (
        <a key={s} href={`#${s}`} className="lift inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface px-4 text-[14px] font-semibold text-fg ring-1 ring-fg/[0.08]">
          {SEGMENT_LABEL[s]}
          {e.segmentStart[s] && <span className="num text-[13px] font-medium text-fg-3">{time(e.segmentStart[s]!)}</span>}
        </a>
      ))}
    </nav>
  );
}

function Segment({ e, seg }: { e: EventDetail; seg: CardSegment }) {
  const fights = e.fights.filter(f => f.segment === seg);
  const [open, setOpen] = useState(true);
  if (!fights.length) return null;
  return (
    <Panel key={seg} bodyClass={clsx('divide-y divide-line/70 px-2 pb-2', !open && 'hidden')}
      title={<h2 className="panel-title">{SEGMENT_LABEL[seg]} <span className="ml-1.5 align-middle font-sans text-[14px] font-semibold text-fg-3">{fights.length} lutas</span></h2>}
      action={
        <div className="flex items-center gap-2">
          <span className="num rounded-md bg-surface-2 px-2.5 py-1 text-[13.5px] font-semibold text-fg-2">{[e.segmentStart[seg] && time(e.segmentStart[seg]!), fights[0].broadcast].filter(Boolean).join(' · ')}</span>
          <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="btn-ghost">
            {open ? 'Recolher' : 'Mostrar'} <CaretDown weight="bold" className={clsx('h-3.5 w-3.5 transition-transform', !open && '-rotate-90')} />
          </button>
        </div>
      }>
      {fights.map(f => <FightRow key={f.id} fight={f} eventId={e.id} />)}
    </Panel>
  );
}

/* ---------- Página ---------- */

export default function Event() {
  const { id } = useParams();
  const { data: e, isPending: isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useEvent(id);
  const notices = useFightNotices(e);
  usePageTitle(e?.name);
  useLiveTitle(e); // depois do título da página: durante a luta, o título ao vivo vence

  if (isLoading) return <EventSkeleton />;
  if (isError || !e) return <Panel><ErrorState message={error?.message} onRetry={() => refetch()} /></Panel>;

  return (
    <div className="space-y-6">
      <Link to="/eventos" className="btn-ghost -ml-2.5"><ArrowLeft className="h-3.5 w-3.5" /> Eventos</Link>
      <Poster e={e} live={e.status === 'in' && (
        <div className="mt-4 flex items-center gap-2 text-[13px] text-fg-3">
          <ArrowsClockwise className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Atualiza a cada 20 s · {new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')}
        </div>
      )} />
      {e.status === 'in' && <LiveBar e={e} notices={notices} />}
      {e.status !== 'post' && (
        <Link to={`/palpites/${e.id}`} className="btn-primary w-fit"><Target weight="bold" className="h-5 w-5" /> Fazer meus palpites</Link>
      )}
      <Summary fights={e.fights} />
      <SegmentNav e={e} />
      {ORDER.map((seg, i) => (
        // o id fica no invólucro (sempre presente): o menu fixo rola até ele mesmo com a seção ainda adiada
        <div key={seg} id={seg} className="scroll-mt-40">
          {i === 0 ? <Segment e={e} seg={seg} /> : <Defer minHeight={e.fights.filter(f => f.segment === seg).length * 100 + 80} margin="700px"><Segment e={e} seg={seg} /></Defer>}
        </div>
      ))}
    </div>
  );
}
