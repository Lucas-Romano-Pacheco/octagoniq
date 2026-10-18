import { Link, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowDown, ArrowRight, ArrowUp, Crown } from '@phosphor-icons/react';
import type { RankEntry, RankingDivision, RankingsMeta } from '@shared/types';
import { fighterHref, useRankings, useRankingsMeta } from '@/lib/api';
import { Avatar, ErrorState, FlagBackdrop, NationRecord, PageHeader, Panel, Skeleton, SortTh, Tag, Tip, useSort } from '@/components/kit';

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
            className={clsx('h-9 shrink-0 rounded-full px-4 text-[14px] font-semibold leading-9', d.id === active ? 'bg-fg text-bg' : 'bg-surface text-fg-2 shadow-[var(--shadow-soft)]')}>{d.name}</Link>
        ))}
      </div>
      {/* desktop: lista lateral */}
      <nav className="hidden space-y-5 lg:block">
        {groups.map(g => (
          <div key={g.label}>
            <div className="label mb-2 px-3">{g.label}</div>
            {g.items.map(d => (
              <Link key={d.id} to={`/rankings/${d.id}`}
                className={clsx('flex items-center justify-between rounded-xl px-3 py-2 text-[14px] transition-all',
                  d.id === active ? 'bg-surface font-bold text-fg shadow-[var(--shadow-soft)]' : 'font-medium text-fg-2 hover:bg-surface/70 hover:text-fg')}>
                <span>{d.name}</span>
                {d.champion && <span className="max-w-[110px] truncate text-[13px] text-fg-3">{d.champion.name.split(' ').slice(-1)[0]}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}

/** Tabela da divisão: ordena por posição, nome, variação ou vitórias. */
function RankTable({ entries, meta }: { entries: RankEntry[]; meta?: RankingsMeta }) {
  const { sorted, sort, toggle } = useSort(entries, {
    rank: e => e.rank,
    name: e => e.name,
    change: e => (e.isNew ? 99 : e.change ?? 0),
    wins: e => wins(meta?.[e.slug]?.record),
  }, 'rank', 'asc');
  return (
    <table className="table">
      <thead><tr>
        <SortTh k="rank" sort={sort} toggle={toggle} first="asc" className="w-14 text-right">#</SortTh>
        <SortTh k="name" sort={sort} toggle={toggle} first="asc">Lutador</SortTh>
        <SortTh k="change" sort={sort} toggle={toggle} className="w-24 text-center">Variação</SortTh>
        <SortTh k="wins" sort={sort} toggle={toggle} className="text-right">País · Cartel</SortTh>
      </tr></thead>
      <tbody>
        {sorted.map(e => {
          const m = meta?.[e.slug];
          return (
            <tr key={e.slug}>
              <td className="num text-right font-display text-[18px] font-semibold text-fg-3">{e.rank}</td>
              <td>
                <Link to={fighterHref({ slug: e.slug, espnId: m?.espnId })} className="flex items-center gap-3 text-[15px] font-semibold text-fg hover:text-brand">
                  <Avatar src={headshot(m?.espnId)} name={e.name} size={36} />{e.name}
                </Link>
              </td>
              <td className="text-center"><Change e={e} /></td>
              <td><NationRecord code={m?.countryCode} country={m?.country} record={m?.record} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function Rankings() {
  const { div } = useParams();
  const { data, isLoading, isError, refetch } = useRankings();
  const { data: meta } = useRankingsMeta();
  const division = data?.divisions.find(d => d.id === div) ?? data?.divisions[0];

  return (
    <div>
      <PageHeader eyebrow="Rankings oficiais do UFC" title="Quem manda em cada divisão" meta={data && <>Fonte: <a className="link" href={data.source} target="_blank" rel="noreferrer">UFC.com</a> · consultado às {new Date(data.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>} />
      {isError && <Panel><ErrorState onRetry={() => refetch()} /></Panel>}
      {isLoading && <div className="grid gap-6 lg:grid-cols-[220px_1fr]"><Skeleton className="hidden h-96 lg:block" /><Skeleton className="h-[600px]" /></div>}
      {data && division && (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <DivisionNav divisions={data.divisions} active={division.id} />
          <div className="min-w-0 space-y-4">
            {division.champion && (
              <Link to={fighterHref({ slug: division.champion.slug, espnId: meta?.[division.champion.slug]?.espnId })} className="group relative flex min-h-[220px] items-end justify-between overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-cream via-cream-2 to-cream-3 px-7 pt-7 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]">
                <FlagBackdrop code={meta?.[division.champion.slug]?.countryCode} shape="fade-left" className="inset-y-0 right-0 w-[64%] opacity-35 dark:opacity-25" />
                <div className="relative pb-7">
                  <Tag tone="dark"><Crown className="h-3.5 w-3.5 text-gold" /> {division.women ? 'Campeã' : 'Campeão'} · {division.name}</Tag>
                  <div className="display mt-4 text-[40px] text-fg sm:text-[56px]">{division.champion.name}</div>
                  {meta?.[division.champion.slug] && <div className="mt-3"><NationRecord className="justify-start" code={meta[division.champion.slug].countryCode} country={meta[division.champion.slug].country} record={meta[division.champion.slug].record} /></div>}
                  <div className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-fg-2 group-hover:text-brand">Ver perfil e histórico <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
                </div>
                {division.champion.image && <img src={division.champion.image} alt="" className="relative -mb-px h-44 w-auto object-contain transition-transform duration-500 group-hover:scale-[1.03] sm:h-56" />}
              </Link>
            )}
            <Panel title={division.p4p ? `${division.name} · top 15` : `${division.name} · desafiantes`}>
              <RankTable entries={division.entries} meta={meta} />
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
