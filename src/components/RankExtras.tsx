import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import type { DivisionAverages, OfficialStats, RankEntry, RankingsMeta } from '@shared/types';
import { fighterHref } from '@/lib/api';
import { fighterStyle } from '@/lib/style';
import { proxy } from '@/lib/img';
import { Avatar, Flag } from './kit';
import { Crown } from './icons';

/* Ranking em cartões (posição gigante e vazada no fundo, como no app do UFC) e o filtro por estilo (chips no estilo
   do Clutch Lens), que usa as mesmas etiquetas de estilo do perfil, calculadas com as estatísticas da divisão. */

const headshot = (espnId?: string) => (espnId ? `https://a.espncdn.com/i/headshots/mma/players/full/${espnId}.png` : undefined);

export type StyleGroup = 'todos' | 'trocadores' | 'grapplers' | 'finalizadores';
const GROUP_KEYS: Record<Exclude<StyleGroup, 'todos'>, string[]> = {
  trocadores: ['volume', 'ko', 'defense'],
  grapplers: ['wrestler', 'antitd'],
  finalizadores: ['sub'],
};
const GROUP_LABEL: Record<StyleGroup, string> = { todos: 'Todos', trocadores: 'Trocadores', grapplers: 'Grapplers', finalizadores: 'Finalizadores' };

/** Estilo de cada ranqueado (slug → chaves das etiquetas), montado a partir das listas da média da divisão. */
export function stylesBySlug(avg?: DivisionAverages) {
  const out = new Map<string, string[]>();
  if (!avg) return out;
  const stats = new Map<string, Partial<OfficialStats>>();
  for (const [k, list] of Object.entries(avg.ranks)) {
    for (const { slug, value } of list ?? []) stats.set(slug, { ...stats.get(slug), [k]: value });
  }
  for (const [slug, s] of stats) out.set(slug, fighterStyle(s as OfficialStats).map(t => t.key));
  return out;
}

export const inGroup = (styles: Map<string, string[]>, slug: string, g: StyleGroup) =>
  g === 'todos' || (styles.get(slug) ?? []).some(k => GROUP_KEYS[g].includes(k));

export function StyleChips({ value, onChange, counts }: { value: StyleGroup; onChange: (g: StyleGroup) => void; counts: Record<StyleGroup, number> }) {
  return (
    <div role="group" aria-label="Filtrar por estilo" className="mb-4 flex flex-wrap gap-2 px-2">
      {(Object.keys(GROUP_LABEL) as StyleGroup[]).map(g => (
        <button key={g} type="button" aria-pressed={value === g} onClick={() => onChange(g)} disabled={g !== 'todos' && !counts[g]}
          className={clsx('inline-flex h-9 items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors disabled:opacity-40',
            value === g ? 'bg-fg text-bg' : 'bg-surface-2 text-fg-2 hover:text-fg')}>
          {GROUP_LABEL[g]}<span className={clsx('num text-[12px]', value === g ? 'opacity-70' : 'text-fg-3')}>{counts[g]}</span>
        </button>
      ))}
    </div>
  );
}

export function RankCards({ entries, meta }: { entries: RankEntry[]; meta?: RankingsMeta }) {
  if (!entries.length) return <p className="px-2 pb-4 text-[15px] text-fg-2">Ninguém do ranking com esse estilo.</p>;
  return (
    <ul className="grid gap-3 px-2 pb-3 sm:grid-cols-2">
      {entries.map((e, i) => {
        const m = meta?.[e.slug];
        const champ = e.rank === 0;
        return (
          <motion.li key={e.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}>
            <Link to={fighterHref({ slug: e.slug, espnId: m?.espnId })} viewTransition
              className={clsx('cut group relative flex h-[118px] items-center gap-4 overflow-hidden bg-surface pl-3 pr-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]', champ && 'ring-2 ring-gold')}>
              {/* a posição, gigante e vazada, cortada pela borda direita */}
              <span aria-hidden className="pointer-events-none absolute -right-3 top-1/2 -translate-y-1/2 font-display text-[132px] font-black italic leading-none text-transparent transition-colors duration-300 group-hover:[-webkit-text-stroke-color:var(--color-brand)]"
                style={{ WebkitTextStroke: '2px color-mix(in oklab, var(--color-fg) 12%, transparent)' }}>
                {champ ? 'C' : `#${e.rank}`}
              </span>
              <div className="relative h-full w-[92px] shrink-0 overflow-hidden">
                {/* o retrato da ESPN (mesmo enquadramento para todos); sem ele, o recorte do UFC.com */}
                {m?.espnId || !e.image
                  ? <div className="grid h-full place-items-center transition-transform duration-500 group-hover:scale-105"><Avatar src={headshot(m?.espnId)} name={e.name} size={76} ring={champ ? 'var(--color-gold)' : undefined} /></div>
                  : <img src={proxy(e.image, 240)} alt="" loading="lazy" decoding="async" className="absolute left-1/2 top-2 h-[180%] w-auto max-w-none -translate-x-1/2 object-contain object-top" />}
              </div>
              <div className="relative min-w-0">
                <div className={clsx('inline-flex items-center gap-1 text-[12px] font-bold', champ ? 'text-gold-ink dark:text-gold' : 'text-fg-3')}>
                  {champ ? <><Crown weight="fill" className="h-3.5 w-3.5" /> Campeão</> : `Nº ${e.rank} no ranking`}
                </div>
                <div className="mt-0.5 line-clamp-1 font-display text-[22px] font-bold leading-tight text-fg group-hover:text-brand">{e.name}</div>
                <div className="mt-1 flex items-center gap-2 text-[14px] text-fg-2">
                  <Flag code={m?.countryCode} title={m?.country} size={18} /><span className="num font-semibold">{m?.record ?? '—'}</span>
                </div>
              </div>
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}
