import { useState } from 'react';
import { motion } from 'motion/react';
import { Crown } from '@phosphor-icons/react';
import type { BeltReign } from '@shared/types';
import { useBeltHistory } from '@/lib/api';
import { fullDate } from '@/lib/format';
import { Panel, Tip } from './kit';

/* Linha do tempo do cinturão (D6): cada reinado é um trecho da faixa, do tamanho do tempo com o título; os vãos são
   períodos de cinturão vago. O reinado atual fica em dourado (a cor do título no site). Fonte: Wikipédia (CC BY-SA). */

const DAY = 86_400_000;
const endOf = (r: BeltReign) => (r.incumbent ? Date.now() : Date.parse(r.start) + (r.days ?? 0) * DAY);
const daysOf = (r: BeltReign) => Math.max(1, Math.round((endOf(r) - Date.parse(r.start)) / DAY));
const span = (d: number) => (d >= 365 ? `${(d / 365).toFixed(1).replace('.', ',')} anos` : `${d} dias`);
const surname = (n: string) => n.split(' ').slice(-1)[0];

export function BeltTimeline({ division }: { division: string }) {
  const { data } = useBeltHistory(division);
  const [all, setAll] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
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
                className="absolute inset-y-0 flex cursor-pointer items-center overflow-hidden border-r-2 border-surface-2 px-1.5 outline-none hover:brightness-110 focus-visible:brightness-110"
                style={{ left: `${left}%`, width: `${width}%`, background: bg, transformOrigin: 'left' }}
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.45, delay: Math.min(i, 30) * 0.03, ease: [0.22, 1, 0.36, 1] }}>
                {width > 7 && <span className={`hidden truncate font-display sm:block text-[12px] font-bold uppercase ${r.incumbent ? 'text-[#14183e]' : 'text-bg'}`}>{surname(r.name)}</span>}
              </motion.div>
            </Tip>
          );
        })}
      </div>
      <div className="relative mt-1.5 h-5 text-[12px] text-fg-3">
        <span className="absolute right-0 -bottom-5 flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm border border-dashed border-line-2 bg-surface-2" />vago</span>
        <span className="absolute left-0">{y0}</span>
        {ticks.map(y => <span key={y} className="num absolute -translate-x-1/2" style={{ left: `${pos(Date.UTC(y, 0, 1))}%` }}>{y}</span>)}
      </div>

      {/* recordes e os últimos reinados */}
      <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <dl className="space-y-3">
          <div><dt className="label">Reinado mais longo</dt><dd className="mt-0.5 text-[16px] font-semibold text-fg">{longest.name} <span className="font-normal text-fg-3">· {span(daysOf(longest))}</span></dd></div>
          <div><dt className="label">Mais defesas</dt><dd className="mt-0.5 text-[16px] font-semibold text-fg">{mostDef.name} <span className="font-normal text-fg-3">· {mostDef.defenses} defesas</span></dd></div>
        </dl>
        <div>
        <div className="label mb-1">{recent.length === ordered.length ? `Todos os ${ordered.length} reinados` : 'Últimos 6 reinados'}</div>
        <ol className="divide-y divide-line/70">
          {recent.map(r => (
            <li key={keyOf(r)} className={`flex items-baseline justify-between gap-3 rounded-md py-2 text-[14px] transition-colors ${focus === keyOf(r) ? 'bg-gold-soft px-2' : ''}`}>
              <span className="flex min-w-0 items-center gap-1.5 font-semibold text-fg">
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
      <p className="mt-3 text-[13px] text-fg-3">Fonte: <a href="https://en.wikipedia.org/wiki/List_of_UFC_champions" target="_blank" rel="noreferrer" className="underline underline-offset-4">Wikipédia, List of UFC champions</a> (CC BY-SA). Os vãos na faixa são períodos com o cinturão vago; interinos não entram.</p>
    </Panel>
  );
}
