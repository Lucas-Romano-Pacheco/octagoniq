import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Crown } from '@/components/icons';
import type { BeltReign } from '@shared/types';
import { fighterHref, useBeltHistory } from '@/lib/api';
import { fullDate } from '@/lib/format';
import { Avatar, Panel, Segmented, Tip } from './kit';
import { PolaroidFrame, sagPath } from './CareerBoard';

/* Linha do tempo do cinturão (D6): cada reinado é um trecho da faixa, do tamanho do tempo com o título; os vãos são
   períodos de cinturão vago. O reinado atual fica em dourado (a cor do título no site). Fonte: Wikipédia (CC BY-SA). */

const DAY = 86_400_000;
const endOf = (r: BeltReign) => (r.incumbent ? Date.now() : Date.parse(r.start) + (r.days ?? 0) * DAY);
const daysOf = (r: BeltReign) => Math.max(1, Math.round((endOf(r) - Date.parse(r.start)) / DAY));
const span = (d: number) => (d >= 365 ? `${(d / 365).toFixed(1).replace('.', ',')} anos` : `${d} dias`);
const surname = (n: string) => n.split(' ').slice(-1)[0];

/** Polaroide de um reinado: o retrato vem da busca por nome (ESPN) e a foto leva ao perfil. */
function ReignPolaroid({ r, rot, active }: { r: BeltReign; rot: number; active: boolean }) {
  const { data } = useQuery({
    queryKey: ['search-photo', r.name],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(r.name)}`).then(x => (x.ok ? (x.json() as Promise<{ slug: string; espnId: string; headshot?: string }[]>) : [])),
    staleTime: Infinity,
  });
  const hit = data?.[0];
  const y = new Date(r.start).getUTCFullYear(), y2 = r.incumbent ? 'hoje' : new Date(endOf(r)).getUTCFullYear();
  return (
    <PolaroidFrame rot={rot} gold={r.incumbent} active={active} to={hit ? fighterHref({ slug: hit.slug, espnId: hit.espnId }) : undefined}
      photo={<Avatar src={hit?.headshot} name={r.name} size={110} className="!ring-0" />}
      title={<span className="flex items-center gap-1">{r.incumbent && <Crown weight="fill" className="h-3.5 w-3.5 shrink-0 text-gold-ink" />}<span className="truncate">{r.name}</span></span>}
      lines={[`${r.n}º campeão · ${r.defenses} ${r.defenses === 1 ? 'defesa' : 'defesas'}`, `${y}${y2 !== y ? `–${y2}` : ''} · ${span(daysOf(r))}`]} />
  );
}

/** Mural dos reinados: da esquerda (o primeiro) para a direita (o atual), presos por uma linha vermelha; rola na
    horizontal e o reinado clicado na faixa vem para o meio. */
function ReignBoard({ data, focus }: { data: BeltReign[]; focus: string | null }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const W = 190, n = data.length, width = n * W + 40;
  const pts = data.map((_, i) => ({ x: ((20 + W / 2 + i * W) / width) * 100, y: i % 2 ? 38 : 5 }));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const i = focus ? data.findIndex(r => `${r.n}-${r.start}` === focus) : n - 1; // sem foco, começa no atual
    if (i >= 0) el.scrollTo({ left: 20 + i * W + W / 2 - el.clientWidth / 2, behavior: focus ? 'smooth' : 'auto' });
  }, [focus, data, n]);
  return (
    <div ref={ref} className="no-scrollbar -mx-2 overflow-x-auto rounded-[var(--radius-card)] bg-[#ebe8e1] dark:bg-[#24283f]"
      style={{ backgroundImage: 'linear-gradient(rgba(20,24,62,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(20,24,62,0.06) 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
      <div className="relative h-[470px]" style={{ width }}>
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible">
          <motion.path d={sagPath(pts, 10)} fill="none" stroke="var(--color-brand)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: [0.65, 0, 0.35, 1] }} />
        </svg>
        {data.map((r, i) => (
          <motion.div key={`${r.n}-${r.start}`} className="absolute z-[2] -translate-x-1/2" style={{ left: `${pts[i].x}%`, top: `calc(${pts[i].y}% + 6px)` }}
            initial={reduce ? false : { opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + Math.min(i, 20) * 0.06, type: 'spring', stiffness: 300, damping: 20 }}>
            <ReignPolaroid r={r} rot={[-4, 3, -2, 5, -3, 2][i % 6]} active={focus === `${r.n}-${r.start}`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function BeltTimeline({ division }: { division: string }) {
  const { data } = useBeltHistory(division);
  const [all, setAll] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [view, setViewState] = useState<'lista' | 'mural'>(() => { try { return localStorage.getItem('belt-view') === 'mural' ? 'mural' : 'lista'; } catch { return 'lista'; } });
  const setView = (v: 'lista' | 'mural') => { setViewState(v); try { localStorage.setItem('belt-view', v); } catch { /* sem armazenamento */ } };
  if (!data?.length) return null;
  const t0 = Date.parse(data[0].start), t1 = Date.now(), total = t1 - t0;
  const pos = (t: number) => ((t - t0) / total) * 100;
  const y0 = new Date(t0).getUTCFullYear(), y1 = new Date(t1).getUTCFullYear();
  const step = y1 - y0 > 20 ? 5 : y1 - y0 > 8 ? 2 : 1;
  const ticks = Array.from({ length: Math.floor((y1 - y0) / step) + 1 }, (_, i) => Math.ceil(y0 / step) * step + i * step).filter(y => y > y0 && y <= y1);
  const longest = [...data].sort((a, b) => daysOf(b) - daysOf(a))[0];
  const mostDef = [...data].sort((a, b) => b.defenses - a.defenses)[0];
  // a lista começa com os 6 mais recentes; "ver todos" mostra a divisão inteira (a faixa já mostra todos)
  const ordered = [...data].reverse();
  const keyOf = (r: BeltReign) => `${r.n}-${r.start}`;
  const recent = all || (focus && ordered.findIndex(r => keyOf(r) === focus) >= 6) ? ordered : ordered.slice(0, 6);

  return (
    <Panel plain title="Linha do tempo do cinturão" action={<span className="text-[13px] text-fg-3">{data.length} reinados desde {y0}</span>}>
      {/* faixa: um trecho por reinado */}
      <div className="relative mt-2 h-14 overflow-hidden rounded-md" style={{ background: 'var(--color-surface-2)', boxShadow: 'inset 0 0 0 1px var(--color-line-2)' }} role="img" aria-label={`Reinados do cinturão: ${data.map(r => r.name).join(', ')}`}>
        {data.map((r, i) => {
          const left = pos(Date.parse(r.start)), width = Math.max(pos(endOf(r)) - left, 0.35);
          const bg = r.incumbent ? 'var(--color-gold)' : i % 2 ? 'color-mix(in oklab, var(--color-fg) 62%, var(--color-surface))' : 'color-mix(in oklab, var(--color-fg) 82%, var(--color-surface))';
          return (
            <Tip key={`${r.n}-${r.start}`} title={`${r.n}º · ${r.name}`}
              content={<>{fullDate(r.start)} → {r.incumbent ? 'hoje' : fullDate(new Date(endOf(r)).toISOString())}<br />{span(daysOf(r))} · {r.defenses} {r.defenses === 1 ? 'defesa' : 'defesas'}{r.event ? ` · conquistou no ${r.event}` : ''}</>}>
              <motion.div tabIndex={0} onClick={() => setFocus(keyOf(r))} onKeyDown={e => e.key === 'Enter' && setFocus(keyOf(r))}
                className="absolute inset-y-0 flex cursor-pointer items-center overflow-hidden border-r-2 border-surface-2 px-2 outline-none hover:brightness-110 focus-visible:brightness-110"
                style={{ left: `${left}%`, width: `${width}%`, background: bg, transformOrigin: 'left' }}
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.45, delay: Math.min(i, 30) * 0.03, ease: [0.22, 1, 0.36, 1] }}>
                {width > 7 && <span className={`hidden truncate font-display sm:block text-[12px] font-bold ${r.incumbent ? 'text-[#14183e]' : 'text-bg'}`}>{surname(r.name)}</span>}
              </motion.div>
            </Tip>
          );
        })}
      </div>
      <div className="relative mt-2 h-5 text-[12px] text-fg-3">
        <span className="absolute right-0 -bottom-5 flex items-center gap-2"><span className="h-2.5 w-4 rounded-sm border border-dashed border-line-2 bg-surface-2" />vago</span>
        <span className="absolute left-0">{y0}</span>
        {ticks.map(y => <span key={y} className="num absolute -translate-x-1/2" style={{ left: `${pos(Date.UTC(y, 0, 1))}%` }}>{y}</span>)}
      </div>

      <div className="mt-8 flex justify-end">
        <Segmented value={view} onChange={setView} options={[{ value: 'lista', label: 'Lista' }, { value: 'mural', label: 'Mural' }]} />
      </div>
      {view === 'mural' ? <div className="mt-4"><ReignBoard data={data} focus={focus} />
        {data.length > 3 && <p className="mt-2 text-[13px] text-fg-3">Arraste para o lado para ver os reinados anteriores, ou clique num trecho da faixa.</p>}</div> : <>
      {/* recordes e os últimos reinados */}
      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <dl className="space-y-3">
          <div><dt className="label">Reinado mais longo</dt><dd className="mt-1 text-[16px] font-semibold text-fg">{longest.name} <span className="font-normal text-fg-3">· {span(daysOf(longest))}</span></dd></div>
          <div><dt className="label">Mais defesas</dt><dd className="mt-1 text-[16px] font-semibold text-fg">{mostDef.name} <span className="font-normal text-fg-3">· {mostDef.defenses} defesas</span></dd></div>
        </dl>
        <div>
        <div className="label mb-1">{recent.length === ordered.length ? `Todos os ${ordered.length} reinados` : 'Últimos 6 reinados'}</div>
        <ol className="divide-y divide-line/70">
          {recent.map(r => (
            <li key={keyOf(r)} className={`flex items-baseline justify-between gap-3 rounded-md py-2 text-[14px] transition-colors ${focus === keyOf(r) ? 'bg-gold-soft px-2' : ''}`}>
              <span className="flex min-w-0 items-center gap-2 font-semibold text-fg">
                {r.incumbent && <Crown weight="fill" className="h-3.5 w-3.5 shrink-0 text-gold" />}<span className="truncate">{r.name}</span>
              </span>
              <span className="num shrink-0 text-fg-3">{new Date(r.start).getUTCFullYear()}{r.incumbent ? '–hoje' : ''} · {span(daysOf(r))} · {r.defenses} def.</span>
            </li>
          ))}
        </ol>
        </div>
      </div>
      {ordered.length > 6 && (
        <div className="mt-2 flex justify-end">
          <button type="button" onClick={() => { const showing = recent.length === ordered.length; setAll(!showing); setFocus(null); }} className="btn-ghost">
            {recent.length === ordered.length ? 'Mostrar só os 6 mais recentes' : `Ver todos os ${ordered.length} reinados`}
          </button>
        </div>
      )}
      </>}
      <p className="mt-3 text-[13px] text-fg-3">Fonte: <a href="https://en.wikipedia.org/wiki/List_of_UFC_champions" target="_blank" rel="noreferrer" className="underline underline-offset-4">Wikipédia, List of UFC champions</a> (CC BY-SA). Os vãos na faixa são períodos com o cinturão vago; interinos não entram.</p>
    </Panel>
  );
}
