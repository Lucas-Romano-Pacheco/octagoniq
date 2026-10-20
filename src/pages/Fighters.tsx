import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowRight, CalendarCheck, Crown, UsersThree } from '@phosphor-icons/react';
import type { BookedMap, RankEntry, RankingDivision, RankingsMeta } from '@shared/types';
import { fighterHref, useBooked, useRankings, useRankingsMeta } from '@/lib/api';
import { FighterPicker } from '@/components/FighterPicker';
import { Avatar, BookedTag, Empty, morphPhoto, ErrorState, Flag, PageHeader, Panel, Skeleton, usePageTitle } from '@/components/kit';

/* Lutadores: a busca em destaque; abaixo, os ranqueados agrupados por divisão em listas editoriais
   (sem cards), com filtros rápidos (brasileiros, campeões, luta marcada) e por divisão, guardados na URL. */

type Quick = 'todos' | 'br' | 'campeoes' | 'marcada';
const headshot = (espnId?: string) => (espnId ? `https://a.espncdn.com/i/headshots/mma/players/full/${espnId}.png` : undefined);

function Row({ e, meta, booked }: { e: RankEntry; meta?: RankingsMeta; booked?: BookedMap }) {
  const m = meta?.[e.slug];
  const champ = e.rank === 0;
  return (
    // "stretched link": o nome cobre a linha inteira; a etiqueta de luta marcada fica por cima, clicável
    <li className={clsx('item-fx group flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5', champ && 'is-active')}
      style={{ ['--item-accent' as string]: champ ? 'var(--color-gold)' : m?.countryCode === 'br' ? 'var(--color-win)' : 'var(--color-blue)' }}>
      <span className="num w-5 shrink-0 text-right text-[14px] font-semibold text-fg-3">
        {champ ? <Crown weight="fill" className="ml-auto h-4 w-4 text-gold" aria-label="Campeão" /> : e.rank}
      </span>
      <Avatar src={headshot(m?.espnId)} name={e.name} size={38} flag={m?.countryCode} />
      <Link to={fighterHref({ slug: e.slug, espnId: m?.espnId })} viewTransition onClick={morphPhoto}
        className={clsx('min-w-0 flex-1 truncate after:absolute after:inset-0', champ ? 'text-[16px] font-bold text-fg' : 'text-[16px] font-semibold text-fg-2 group-hover:text-fg')}>
        {e.name}
      </Link>
      <span className="relative z-10"><BookedTag b={m?.espnId ? booked?.[m.espnId] : undefined} /></span>
      <span className="num w-[62px] shrink-0 text-right text-[14px] font-semibold text-fg-3">{m?.record ?? ''}</span>
    </li>
  );
}

function Chip({ on, onClick, children, count }: { on: boolean; onClick: () => void; children: React.ReactNode; count?: number }) {
  return (
    <button onClick={onClick} aria-pressed={on}
      className={clsx('lift inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-semibold ring-1',
        on ? 'bg-fg text-bg ring-fg' : 'bg-surface text-fg-2 ring-fg/[0.08] hover:bg-surface-2 hover:text-fg hover:ring-fg/20')}>
      {children}
      {count !== undefined && <span className={clsx('num rounded-md px-1.5 text-[12px]', on ? 'bg-bg/15' : 'bg-surface-2 text-fg-3')}>{count}</span>}
    </button>
  );
}

export default function Fighters() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const quick = (params.get('filtro') as Quick) || 'todos';
  const div = params.get('divisao') ?? 'todas';
  const { data, isPending: isLoading, isError, refetch } = useRankings();
  const { data: meta } = useRankingsMeta();
  const { data: booked } = useBooked();
  usePageTitle('Lutadores');

  const set = (k: string, v: string, def: string) => {
    const next = new URLSearchParams(params);
    if (v === def) next.delete(k); else next.set(k, v);
    setParams(next, { replace: true });
  };

  const divisions = useMemo(() => data?.divisions.filter(d => !d.p4p) ?? [], [data]);
  const pass = useMemo(() => {
    const isBooked = (e: RankEntry) => { const id = meta?.[e.slug]?.espnId; return !!(id && booked?.[id]); };
    return (e: RankEntry): boolean =>
      quick === 'br' ? meta?.[e.slug]?.countryCode === 'br'
        : quick === 'campeoes' ? e.rank === 0
          : quick === 'marcada' ? isBooked(e)
            : true;
  }, [quick, meta, booked]);

  const all = (d: RankingDivision) => [...(d.champion ? [d.champion] : []), ...d.entries];
  const groups = divisions
    .filter(d => div === 'todas' || d.id === div)
    .map(d => ({ d, rows: all(d).filter(pass) }))
    .filter(g => g.rows.length);
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  const everyone = divisions.flatMap(all);
  const counts = {
    br: everyone.filter(e => meta?.[e.slug]?.countryCode === 'br').length,
    campeoes: divisions.filter(d => d.champion).length,
    marcada: everyone.filter(e => { const id = meta?.[e.slug]?.espnId; return id && booked?.[id]; }).length,
  };
  const phrase = { todos: 'ranqueados', br: 'brasileiros ranqueados', campeoes: 'campeões', marcada: 'ranqueados com luta marcada' }[quick];

  return (
    <div>
      <PageHeader title="Encontre um lutador" meta="Qualquer atleta com passagem pelo UFC, ativo ou aposentado. Abaixo, os ranqueados de cada divisão." />
      <FighterPicker size="lg" className="mb-8 max-w-2xl" autoFocus placeholder="Nome do lutador (ex.: Anderson Silva, Topuria, Zhang Weili)…" onPick={h => navigate(fighterHref(h))} />

      {/* filtros rápidos */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip on={quick === 'todos'} onClick={() => set('filtro', 'todos', 'todos')}><UsersThree weight="bold" className="h-4 w-4" />Todos</Chip>
        <Chip on={quick === 'br'} onClick={() => set('filtro', 'br', 'todos')} count={meta ? counts.br : undefined}><Flag code="br" size={18} />Brasileiros no UFC</Chip>
        <Chip on={quick === 'campeoes'} onClick={() => set('filtro', 'campeoes', 'todos')} count={counts.campeoes || undefined}><Crown weight="fill" className="h-4 w-4 text-gold" />Campeões</Chip>
        <Chip on={quick === 'marcada'} onClick={() => set('filtro', 'marcada', 'todos')} count={booked && meta ? counts.marcada : undefined}><CalendarCheck weight="bold" className="h-4 w-4" />Luta marcada</Chip>
      </div>

      {/* divisões */}
      {divisions.length > 0 && (
        <div className="no-scrollbar -mx-5 mt-3 flex gap-1 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ id: 'todas', name: 'Todas as divisões' }, ...divisions].map(d => (
            <button key={d.id} onClick={() => set('divisao', d.id, 'todas')}
              className={clsx('h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                div === d.id ? 'bg-surface-2 text-fg ring-1 ring-fg/15' : 'text-fg-3 hover:bg-surface-2/70 hover:text-fg')}>
              {d.name}
            </button>
          ))}
        </div>
      )}

      {isError && <Panel className="mt-8"><ErrorState onRetry={() => refetch()} /></Panel>}
      {isLoading && <div className="mt-10 space-y-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div>}

      {data && (
        <>
          <p className="mt-8 text-[14px] text-fg-3"><span className="num font-semibold text-fg">{total}</span> {phrase}{div !== 'todas' ? ` no ${divisions.find(d => d.id === div)?.name.toLowerCase()}` : ''}</p>
          {groups.length === 0 && <Empty>Ninguém neste filtro. Tente outra divisão.</Empty>}
          <div className="mt-4 space-y-10">
            {groups.map(({ d, rows }) => (
              <section key={d.id} className="rule">
                <div className="rule-header">
                  <h2 className="display text-[32px] text-fg">{d.name}</h2>
                  <Link to={`/rankings/${d.id}`} className="btn-ghost">Ranking completo <ArrowRight className="h-4 w-4" /></Link>
                </div>
                {/* duas colunas no desktop: metade da altura de uma lista única */}
                <ol className="grid grid-cols-[minmax(0,1fr)] gap-x-8 md:grid-cols-2 md:[grid-auto-flow:column]" style={{ gridTemplateRows: `repeat(${Math.ceil(rows.length / 2)}, auto)` }}>
                  {rows.map(e => <Row key={e.slug} e={e} meta={meta} booked={booked} />)}
                </ol>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
