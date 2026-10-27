import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FighterRef } from '@shared/types';
import type { UpcomingEvent } from '@/lib/api';
import { fighterHref } from '@/lib/api';
import { dayMonth, lastName } from '@/lib/format';
import { proxy } from '@/lib/img';
import { CaretLeft, CaretRight } from './icons';
import { Avatar, Flag, SectionTitle } from './kit';

/* "Quem luta nas próximas semanas" (estilo FNT): carrossel dos lutadores das lutas principais da agenda. Cada cartão
   tem o recorte na frente do próprio nome, enorme e apagado, cortado pelas bordas; embaixo, divisão e cartel. Uma
   barrinha vermelha mostra quanto do carrossel já passou. */

interface Item { f: FighterRef; ev: UpcomingEvent; corner: 'red' | 'blue' }

function Card({ it }: { it: Item }) {
  const [failed, setFailed] = useState(false);
  const { f, ev } = it;
  const name = lastName(f.name);
  return (
    <li className="w-[220px] shrink-0 snap-start sm:w-[240px]">
      <Link to={fighterHref(f)} viewTransition className="cut group block overflow-hidden bg-surface shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
        <div className="inset-media relative h-[260px] overflow-hidden bg-surface-2">
          {/* o nome gigante atrás, em duas linhas cortadas pela borda */}
          <div aria-hidden className="absolute inset-0 flex flex-col justify-center overflow-hidden font-display text-[96px] font-black uppercase leading-[0.82] text-fg/[0.07] transition-colors duration-500 group-hover:text-brand/[0.14]">
            <span className="-ml-3 whitespace-nowrap">{name}</span>
            <span className="-ml-10 whitespace-nowrap">{name}</span>
          </div>
          <Flag code={f.countryCode} src={f.flag} title={f.country} size={20} className="absolute right-3 top-3 z-10" />
          {f.bodyImage && !failed
            ? <img src={proxy(f.bodyImage, 360)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)}
                className="absolute bottom-0 left-1/2 h-[96%] w-auto max-w-none -translate-x-1/2 object-contain transition-transform duration-500 group-hover:scale-105 [mask-image:linear-gradient(to_bottom,black_80%,transparent)]" />
            : <div className="absolute inset-0 grid place-items-center"><Avatar src={f.headshot} name={f.name} size={120} /></div>}
          <span aria-hidden className={`absolute bottom-0 left-0 h-1 w-full ${it.corner === 'red' ? 'bg-red' : 'bg-blue'}`} />
        </div>
        <div className="px-4 pb-4 pt-3">
          <div className="line-clamp-1 font-display text-[19px] font-bold uppercase leading-tight text-fg group-hover:text-brand">{f.name}</div>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2 text-[13px] text-fg-2">
            <span className="truncate">{ev.main?.weightClass} · {dayMonth(ev.date)}</span>
            <span className="num shrink-0 font-semibold text-fg">{f.record ?? '—'}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}

export function TrendingFighters({ events }: { events: UpcomingEvent[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [progress, setProgress] = useState(0);
  const items: Item[] = events.flatMap(ev => (ev.main ? [{ f: ev.main.red, ev, corner: 'red' as const }, { f: ev.main.blue, ev, corner: 'blue' as const }] : [])).slice(0, 12);
  if (items.length < 4) return null;
  const onScroll = () => {
    const el = ref.current;
    if (el) setProgress(el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth));
  };
  const nudge = (d: number) => ref.current?.scrollBy({ left: d * 260 * 2, behavior: 'smooth' });
  return (
    <section className="py-8">
      <SectionTitle title="Quem luta nas próximas semanas" action={
        <div className="flex gap-2">
          <button type="button" className="btn h-10 w-10 !px-0" aria-label="Voltar" onClick={() => nudge(-1)}><CaretLeft className="h-4 w-4" /></button>
          <button type="button" className="btn h-10 w-10 !px-0" aria-label="Avançar" onClick={() => nudge(1)}><CaretRight className="h-4 w-4" /></button>
        </div>
      } />
      <ul ref={ref} onScroll={onScroll} className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 pt-1 sm:-mx-8 sm:scroll-px-8 sm:px-8">
        {items.map(it => <Card key={`${it.ev.id}-${it.f.espnId}`} it={it} />)}
      </ul>
      <div className="mt-2 h-[3px] w-full max-w-[320px] overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: `${20 + progress * 80}%` }} />
      </div>
    </section>
  );
}
