import { Link, useNavigate } from 'react-router-dom';
import { Crown } from '@phosphor-icons/react';
import { fighterHref, useRankings, useRankingsMeta } from '@/lib/api';
import { FighterPicker } from '@/components/FighterPicker';
import { ErrorState, Flag, PageHeader, Panel, Skeleton } from '@/components/kit';

export default function Fighters() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useRankings();
  const { data: meta } = useRankingsMeta();
  const divisions = data?.divisions.filter(d => !d.p4p) ?? [];

  return (
    <div>
      <PageHeader eyebrow="Lutadores" title="Lutadores" meta="Busque qualquer atleta com passagem pelo UFC, ativo ou aposentado, ou navegue pelos ranqueados de cada divisão." />
      <FighterPicker className="mb-8 max-w-xl" autoFocus placeholder="Nome do lutador (ex.: Anderson Silva, Topuria, Zhang Weili)…" onPick={h => navigate(fighterHref(h))} />

      {isError && <Panel><ErrorState onRetry={() => refetch()} /></Panel>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[420px]" />)}
        {divisions.map(d => (
          <Panel key={d.id} title={d.name} action={<Link to={`/rankings/${d.id}`} className="btn-ghost h-7 text-[13px]">Ranking</Link>}>
            <ol className="pb-3">
              {[...(d.champion ? [d.champion] : []), ...d.entries].map(e => {
                const m = meta?.[e.slug];
                const champ = e.rank === 0;
                return (
                  <li key={e.slug}>
                    <Link to={fighterHref({ slug: e.slug, espnId: m?.espnId })}
                      className={`group flex items-center gap-3 px-6 py-[7px] transition-colors hover:bg-surface-2/70 ${champ ? 'mb-1' : ''}`}>
                      {champ ? <Crown weight="fill" className="h-4 w-4 shrink-0 text-gold" /> : <span className="num w-4 shrink-0 text-right text-[13.5px] font-semibold text-fg-3">{e.rank}</span>}
                      <span className={`min-w-0 flex-1 truncate ${champ ? 'text-[15px] font-bold text-fg' : 'text-[14px] font-medium text-fg-2 group-hover:text-fg'}`}>{e.name}</span>
                      <Flag code={m?.countryCode} title={m?.country} size={18} />
                      <span className="num w-[58px] shrink-0 text-right text-[14px] font-semibold text-fg-3">{m?.record ?? ''}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Panel>
        ))}
      </div>
    </div>
  );
}
