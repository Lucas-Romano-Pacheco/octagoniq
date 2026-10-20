import { Link, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowDown, ArrowRight, ArrowUp, Crown } from '@phosphor-icons/react';
import type { BookedMap, RankEntry, RankingDivision, RankingsMeta } from '@shared/types';
import { fighterHref, useBooked, useRankings, useRankingsMeta } from '@/lib/api';
import { Avatar, BookedTag, ErrorState, morphPhoto, FlagBackdrop, NationRecord, PageHeader, Panel, Skeleton, SortTh, Tag, Tip, useSort, usePageTitle } from '@/components/kit';
import { proxy } from '@/lib/img';

const headshot = (espnId?: string) => (espnId ? `https://a.espncdn.com/i/headshots/mma/players/full/${espnId}.png` : undefined);
const wins = (rec?: string) => (rec ? Number(rec.split('-')[0]) : undefined);

function Change({ e }: { e: RankEntry }) {
  if (e.isNew) return <Tag tone="blue">Novo</Tag>;
  if (!e.change) return <span className="text-fg-3">—</span>;
  const up = e.change > 0;
  return (
    <Tip content={`${up ? 'Subiu' : 'Caiu'} ${Math.abs(e.change)} ${Math.abs(e.change) === 1 ? 'posição' : 'posições'} desde a última atualização do ranking`}>
      <span tabIndex={0} className={clsx('inline-flex cursor-help items-center gap-0.5 font-mono text-[13px]', up ? 'text-win' : 'text-loss')}>
        {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{Math.abs(e.change)}
      </span>
    </Tip>
  );
}

/** Cor de cada grupo do menu: peso por peso dourado, masculino azul, feminino vermelho. */
const ACCENT: Record<string, string> = { 'Peso por peso': 'var(--color-gold)', Masculino: 'var(--color-blue)', Feminino: 'var(--color-brand)' };

function DivisionNav({ divisions, active }: { divisions: RankingDivision[]; active: string }) {
  const groups = [
    { label: 'Peso por peso', items: divisions.filter(d => d.p4p) },
    { label: 'Masculino', items: divisions.filter(d => !d.p4p && !d.women) },
    { label: 'Feminino', items: divisions.filter(d => !d.p4p && d.women) },
  ];
  return (
    <>
      {/* celular: faixa rolável */}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 lg:hidden">
        {divisions.map(d => (
          <Link key={d.id} to={`/rankings/${d.id}`}
            className={clsx('lift h-9 shrink-0 rounded-full px-4 text-[14px] font-semibold leading-9 transition-colors', d.id === active ? 'bg-fg text-bg' : 'bg-surface text-fg-2 shadow-[var(--shadow-soft)] hover:bg-surface-2 hover:text-fg')}>{d.name}</Link>
        ))}
      </div>
      {/* desktop: lista lateral */}
      <nav className="hidden space-y-6 lg:block">
        {groups.map(g => (
          <div key={g.label}>
            <div className="label mb-2 flex items-center gap-2 px-3"><span className="h-2 w-2 rounded-full" style={{ background: ACCENT[g.label] }} />{g.label}</div>
            <ul className="overflow-hidden rounded-2xl bg-surface/50 ring-1 ring-fg/[0.05]">
              {g.items.map(d => (
                <li key={d.id} className="contents">
                  <Link to={`/rankings/${d.id}`} aria-current={d.id === active ? 'page' : undefined} style={{ ['--item-accent' as string]: ACCENT[g.label] }}
                    className={clsx('item-fx flex items-center justify-between gap-3 px-4 py-3 text-[14.5px]', d.id === active ? 'is-active font-bold text-fg' : 'font-medium text-fg-2 hover:text-fg')}>
                    <span>{d.name}</span>
                    {d.champion && <span className={clsx('max-w-[110px] truncate text-[13px]', d.id === active ? 'text-fg-2' : 'text-fg-3')}>{d.champion.name.split(' ').slice(-1)[0]}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

/** Tabela da divisão: ordena por posição, nome, variação ou vitórias. */
function RankTable({ entries, meta, booked }: { entries: RankEntry[]; meta?: RankingsMeta; booked?: BookedMap }) {
  const { sorted, sort, toggle } = useSort(entries, {
    rank: e => e.rank,
    name: e => e.name,
    change: e => (e.isNew ? 99 : e.change ?? 0),
    wins: e => wins(meta?.[e.slug]?.record),
  }, 'rank', 'asc');
  // "Variação" só aparece se alguém mudou de posição desde a última atualização (senão era uma coluna inteira de "—")
  const moved = entries.some(e => e.isNew || e.change);
  return (
    <table className="table w-full table-fixed sm:table-auto">
      <thead><tr>
        <SortTh k="rank" sort={sort} toggle={toggle} first="asc" className="w-12 text-right sm:w-14">#</SortTh>
        <SortTh k="name" sort={sort} toggle={toggle} first="asc">Lutador</SortTh>
        {moved && <SortTh k="change" sort={sort} toggle={toggle} className="hidden w-24 text-center sm:table-cell">Variação</SortTh>}
        <SortTh k="wins" sort={sort} toggle={toggle} className="w-28 text-right sm:w-auto"><span className="sm:hidden">Cartel</span><span className="hidden sm:inline">País · Cartel</span></SortTh>
      </tr></thead>
      <tbody>
        {sorted.map(e => {
          const m = meta?.[e.slug];
          return (
            <tr key={e.slug} className="row-fx" style={{ ['--item-accent' as string]: e.rank <= 5 ? 'var(--color-gold)' : 'var(--color-blue)' }}>
              <td className="num text-right font-display text-[18px] font-semibold text-fg-3">{e.rank}</td>
              <td>
                <div className="flex items-center gap-3">
                  <Link to={fighterHref({ slug: e.slug, espnId: m?.espnId })} viewTransition onClick={morphPhoto} className="flex min-w-0 items-center gap-3 text-[15px] font-semibold text-fg hover:text-brand">
                    <Avatar src={headshot(m?.espnId)} name={e.name} size={36} /><span className="truncate">{e.name}</span>
                  </Link>
                  <BookedTag b={m?.espnId ? booked?.[m.espnId] : undefined} />
                </div>
              </td>
              {moved && <td className="hidden text-center sm:table-cell"><Change e={e} /></td>}
              <td><NationRecord code={m?.countryCode} country={m?.country} record={m?.record} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Destaque da divisão: o campeão ou, no peso por peso, o nº 1. O link cobre o card inteiro ("stretched link"),
    o que permite pôr a etiqueta de luta marcada (outro link) por cima. */
function LeaderCard({ division, divisions, meta, booked }: { division: RankingDivision; divisions: RankingDivision[]; meta?: RankingsMeta; booked?: BookedMap }) {
  const leader = division.champion ?? (division.p4p ? division.entries[0] : undefined);
  if (!leader) return null;
  const m = meta?.[leader.slug];
  // no peso por peso a lista não traz foto: usa o recorte do cinturão que ele tem em alguma divisão
  const beltOf = divisions.find(d => !d.p4p && d.champion?.slug === leader.slug);
  const image = leader.image ?? beltOf?.champion?.image;
  const label = division.champion
    ? `${division.women ? 'Campeã' : 'Campeão'} · ${division.name}`
    : `Nº 1 · ${division.name}`;
  return (
    <div className="cut group relative flex min-h-[220px] items-end justify-between overflow-hidden rounded-[18px] bg-gradient-to-br from-cream via-cream-2 to-cream-3 px-7 pt-7 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]">
      <FlagBackdrop code={m?.countryCode} shape="fade-left" className="inset-y-0 right-0 w-[64%] opacity-35 dark:opacity-25" />
      <div className="relative pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="dark"><Crown className="h-3.5 w-3.5 text-gold" /> {label}</Tag>
          {!division.champion && beltOf && <Tag tone="gold">{division.women ? 'Campeã' : 'Campeão'} · {beltOf.name}</Tag>}
          <span className="relative z-10"><BookedTag b={m?.espnId ? booked?.[m.espnId] : undefined} /></span>
        </div>
        <Link to={fighterHref({ slug: leader.slug, espnId: m?.espnId })} className="display mt-4 block text-[40px] text-fg after:absolute after:inset-0 sm:text-[56px]">{leader.name}</Link>
        {m && <div className="mt-3"><NationRecord className="justify-start" code={m.countryCode} country={m.country} record={m.record} /></div>}
        <div className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-fg-2 group-hover:text-brand">Ver perfil e histórico <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
      </div>
      {image
        ? <img src={proxy(image, 560)} alt="" decoding="async" className="relative -mb-px h-44 w-auto object-contain transition-transform duration-500 group-hover:scale-[1.03] sm:h-56" />
        : <Avatar src={headshot(m?.espnId)} name={leader.name} size={160} className="relative mb-6 hidden sm:block" />}
    </div>
  );
}

export default function Rankings() {
  const { div } = useParams();
  const { data, isPending: isLoading, isError, refetch } = useRankings();
  const { data: meta } = useRankingsMeta();
  const { data: booked } = useBooked();
  const division = data?.divisions.find(d => d.id === div) ?? data?.divisions[0];
  usePageTitle(division && `Rankings · ${division.name}`);

  return (
    <div>
      <PageHeader eyebrow="Rankings oficiais do UFC" title="Quem manda em cada divisão" meta={data && <>Fonte: <a className="link" href={data.source} target="_blank" rel="noreferrer">UFC.com</a> · consultado às {new Date(data.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>} />
      {isError && <Panel><ErrorState onRetry={() => refetch()} /></Panel>}
      {isLoading && <div className="grid min-h-[1200px] gap-6 lg:grid-cols-[220px_1fr]"><Skeleton className="hidden h-96 lg:block" /><Skeleton className="h-[1100px]" /></div>}
      {data && division && (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <DivisionNav divisions={data.divisions} active={division.id} />
          <div className="min-w-0 space-y-4">
            <LeaderCard division={division} divisions={data.divisions} meta={meta} booked={booked} />
            <Panel title={division.p4p ? `${division.name} · top 15` : `${division.name} · desafiantes`}
              action={!division.entries.some(e => e.isNew || e.change) && <span className="text-[13px] text-fg-3">Sem mudanças de posição na última atualização</span>}>
              {/* no peso por peso o nº 1 já está no card de destaque, como o campeão nas divisões */}
              <RankTable entries={division.champion ? division.entries : division.entries.slice(1)} meta={meta} booked={booked} />
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
