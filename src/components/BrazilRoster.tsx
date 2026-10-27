import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import type { RankingDivision, RankingsMeta } from '@shared/types';
import { fighterHref } from '@/lib/api';
import { proxy } from '@/lib/img';
import { Avatar, Flag, Skeleton } from './kit';
import { Crown } from './icons';

/* Brasileiros no UFC: o plantel inteiro (lista da Wikipédia), não só os ranqueados. Em cima, um placar curto; embaixo,
   uma faixa por divisão com cartões de foto, os ranqueados primeiro e com a posição destacada. */

interface RosterFighter { name: string; slug: string; nickname?: string; division: string; record?: string }

const ORDER = ['Pesado', 'Meio-pesado', 'Médio', 'Meio-médio', 'Leve', 'Pena', 'Galo', 'Mosca', 'Galo (F)', 'Mosca (F)', 'Palha (F)', 'Pena (F)'];

/** Foto: o retrato da ESPN (ranqueados) ou, ao aparecer na tela, a do UFC.com pelo endereço do atleta. */
function Photo({ slug, name, espnId, ring }: { slug: string; name: string; espnId?: string; ring?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: '200px' });
  const { data } = useQuery({
    queryKey: ['photo', slug],
    queryFn: () => fetch(`/api/photo/${slug}`).then(r => (r.ok ? (r.json() as Promise<{ src?: string }>) : null)),
    enabled: seen, staleTime: Infinity,
  });
  // a foto do UFC.com (mesmo enquadramento para todos); sem ela, o retrato da ESPN no círculo
  // sem foto no UFC.com (nome escrito diferente lá): o retrato da ESPN, achado pela busca por nome
  const miss = seen && data === null && !espnId;
  const { data: hit } = useQuery({
    queryKey: ['search-photo', name],
    queryFn: () => fetch(`/api/search?q=${encodeURIComponent(name)}`).then(r => (r.ok ? (r.json() as Promise<{ slug: string; headshot?: string }[]>) : [])),
    enabled: miss, staleTime: Infinity,
  });
  const found = hit?.find(h => h.slug === slug) ?? hit?.[0];
  const body = data?.src, head = espnId ? `https://a.espncdn.com/i/headshots/mma/players/full/${espnId}.png` : found?.headshot;
  return (
    <div ref={ref} className="inset-media relative h-[128px] bg-surface-2">
      {body
        ? <img src={proxy(body, 400)} alt="" loading="lazy" decoding="async" className="absolute left-1/2 top-2 h-[300%] w-auto max-w-none -translate-x-1/2 object-cover object-top transition-transform duration-500 group-hover:scale-105" />
        : <div className="grid h-full place-items-center"><Avatar src={head} name={name} size={84} ring={ring} /></div>}
    </div>
  );
}

export function BrazilRoster({ divisions, meta }: { divisions: RankingDivision[]; meta?: RankingsMeta }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['roster', 'BRA'],
    queryFn: () => fetch('/api/roster/BRA').then(r => { if (!r.ok) throw new Error('roster'); return r.json() as Promise<RosterFighter[]>; }),
    staleTime: 60 * 60_000,
  });
  // posição no ranking oficial (0 = campeão) pelo endereço do atleta
  const rank = new Map<string, { pos: number; div: string }>();
  for (const d of divisions) {
    if (d.champion) rank.set(d.champion.slug, { pos: 0, div: d.name });
    for (const e of d.entries) rank.set(e.slug, { pos: e.rank, div: d.name });
  }

  if (isPending) return <div role="status" aria-busy="true" aria-label="Carregando os brasileiros" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>;
  if (isError || !data) return <p className="mt-8 text-[15px] text-fg-2">Não foi possível carregar o plantel agora.</p>;

  const ranked = data.filter(f => rank.has(f.slug));
  const champs = ranked.filter(f => rank.get(f.slug)!.pos === 0);
  const groups = ORDER.map(div => ({
    div,
    list: data.filter(f => f.division === div).sort((a, b) => (rank.get(a.slug)?.pos ?? 99) - (rank.get(b.slug)?.pos ?? 99) || a.name.localeCompare(b.name)),
  })).filter(g => g.list.length);

  return (
    <div className="mt-8">
      {/* placar curto */}
      <div className="flex flex-wrap items-end gap-x-10 gap-y-4 border-b border-line pb-6">
        <div className="flex items-center gap-4">
          <Flag code="br" size={44} />
          <div>
            <div className="font-display text-[64px] font-bold leading-[0.85] text-fg">{data.length}</div>
            <div className="mt-1 text-[15px] text-fg-2">brasileiros no plantel do UFC</div>
          </div>
        </div>
        <div><div className="font-display text-[32px] font-bold leading-none text-fg">{ranked.length}</div><div className="mt-1 text-[15px] text-fg-2">no ranking oficial</div></div>
        <div><div className="font-display text-[32px] font-bold leading-none text-gold-ink dark:text-gold">{champs.length}</div><div className="mt-1 text-[15px] text-fg-2">{champs.length === 1 ? 'campeão' : 'campeões'}</div></div>
        <div><div className="font-display text-[32px] font-bold leading-none text-fg">{groups.length}</div><div className="mt-1 text-[15px] text-fg-2">divisões com brasileiros</div></div>
      </div>

      <div className="mt-8 space-y-10">
        {groups.map(g => (
          <section key={g.div}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="font-display text-[28px] font-bold leading-none text-fg">{g.div}</h2>
              <span className="text-[15px] text-fg-3">{g.list.length} {g.list.length === 1 ? 'lutador' : 'lutadores'}</span>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {g.list.map((f, i) => {
                const r = rank.get(f.slug), m = meta?.[f.slug];
                const champ = r?.pos === 0;
                return (
                  <motion.li key={f.slug} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-20px' }}
                    transition={{ duration: 0.35, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}>
                    <Link to={fighterHref({ slug: f.slug, espnId: m?.espnId })} viewTransition
                      className={`cut group relative block h-full overflow-hidden bg-surface shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] ${champ ? 'ring-2 ring-gold' : ''}`}>
                      <Photo slug={f.slug} name={f.name} espnId={m?.espnId} ring={champ ? 'var(--color-gold)' : undefined} />
                      {r && (
                        <span className={`absolute left-4 top-4 z-10 inline-flex h-6 items-center gap-1 rounded-md px-2 font-display text-[13px] font-bold ${champ ? 'bg-gold text-[#14183e]' : 'bg-win text-white'}`}>
                          {champ ? <><Crown weight="fill" className="h-3.5 w-3.5" />Campeão</> : `Nº ${r.pos}`}
                        </span>
                      )}
                      <div className="px-3 pb-3 pt-2">
                        <div className="line-clamp-1 font-display text-[16px] font-bold leading-tight text-fg group-hover:text-brand">{f.name}</div>
                        <div className="line-clamp-1 text-[14px] text-fg-2">{f.nickname ? `“${f.nickname}”` : ' '}</div>
                        {f.record && <div className="num mt-1 text-[14px] font-semibold text-fg-2">{f.record}</div>}
                      </div>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-8 text-[14px] text-fg-3">Plantel: “List of current UFC fighters”, Wikipédia (CC BY-SA). Ranking: UFC.com.</p>
    </div>
  );
}
