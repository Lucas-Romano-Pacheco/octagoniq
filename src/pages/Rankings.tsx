import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Link, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowDown, ArrowRight, ArrowUp, Crown } from '@/components/icons';
import type { BookedMap, RankEntry, RankingDivision, RankingsMeta } from '@shared/types';
import { fighterHref, useBooked, useDivisionAvg, useEloRanking, useRankings, useRankingsMeta } from '@/lib/api';
import { Avatar, BookedTag, ErrorState, FlagBackdrop, morphPhoto, NationRecord, PageHeader, Panel, Segmented, Skeleton, SortTh, Tag, Tip, usePageTitle, useSort } from '@/components/kit';
import { BeltTimeline } from '@/components/BeltTimeline';
import { EloTable } from '@/components/EloPanel';
import { proxy } from '@/lib/img';
import { inGroup, RankCards, StyleChips, stylesBySlug, type StyleGroup } from '@/components/RankExtras';

const headshot = (espnId?: string) => (espnId ? `https://a.espncdn.com/i/headshots/mma/players/full/${espnId}.png` : undefined);
const wins = (rec?: string) => (rec ? Number(rec.split('-')[0]) : undefined);

function Change({ e }: { e: RankEntry }) {
  if (e.isNew) return <Tag tone="blue">Novo</Tag>;
  if (!e.change) return null;
  const up = e.change > 0;
  return (
    <Tip content={`${up ? 'Subiu' : 'Caiu'} ${Math.abs(e.change)} ${Math.abs(e.change) === 1 ? 'posição' : 'posições'} desde a última atualização do ranking`}>
      <span tabIndex={0} className={clsx('inline-flex cursor-help items-center gap-1 font-mono text-[13px]', up ? 'text-win' : 'text-loss')}>
        {up ? <ArrowUp weight="bold" className="h-3 w-3" /> : <ArrowDown weight="bold" className="h-3 w-3" />}{Math.abs(e.change)}
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
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
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
            <ul className="overflow-hidden rounded-xl bg-surface/50 ring-1 ring-fg/[0.05]">
              {g.items.map(d => (
                <li key={d.id} className="contents">
                  <Link to={`/rankings/${d.id}`} aria-current={d.id === active ? 'page' : undefined} style={{ ['--item-accent' as string]: ACCENT[g.label] }}
                    className={clsx('item-fx flex items-center justify-between gap-3 px-4 py-3 text-[14px]', d.id === active ? 'is-active font-bold text-fg' : 'font-medium text-fg-2 hover:text-fg')}>
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

/** Tabela da divisão: ordena por posição, nome ou vitórias. A variação aparece junto da posição, só em quem mudou. */
/** Posição de cada lutador no ranking pelo Elo da divisão (id da ESPN → posição, 1 = maior nota). */
function useEloPositions(division?: string) {
  const { data } = useEloRanking(division);
  return useMemo(() => data && new Map(data.map((f, i) => [f.id, { pos: i + 1, rating: f.rating, name: f.name }])), [data]);
}

/** Selo da coluna "Elo": a posição pelo Elo e a seta para cima (o Elo o coloca melhor que o UFC) ou para baixo. */
function EloCell({ pos, official }: { pos?: number; official: number }) {
  if (!pos) return <Tip content="Fora do top 15 pela nota Elo"><span tabIndex={0} className="cursor-help text-[13px] text-fg-3">—</span></Tip>;
  const diff = official - pos; // positivo: o Elo coloca mais acima
  return (
    <Tip content={diff === 0 ? 'Mesma posição no ranking oficial e no Elo' : `${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'posição' : 'posições'} ${diff > 0 ? 'acima' : 'abaixo'} do ranking oficial`}>
      <span tabIndex={0} className="num inline-flex cursor-help items-center gap-1 text-[14px] font-semibold text-fg-2">
        {pos}º
        {diff !== 0 && <span className={clsx('inline-flex items-center text-[12px]', diff > 0 ? 'text-win' : 'text-loss')}>{diff > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{Math.abs(diff)}</span>}
      </span>
    </Tip>
  );
}

/** Quadro "Oficial × Elo": quem o Elo valoriza mais e menos que o UFC, e quem está no top 15 do Elo sem ranking oficial. */
function OfficialVsElo({ entries, meta, elo }: { entries: RankEntry[]; meta?: RankingsMeta; elo: Map<string, { pos: number; rating: number; name: string }> }) {
  const rows = entries.filter(e => e.rank > 0).map(e => ({ e, pos: meta?.[e.slug]?.espnId ? elo.get(meta[e.slug].espnId!)?.pos : undefined }));
  const rated = rows.filter((r): r is { e: RankEntry; pos: number } => r.pos !== undefined);
  const up = [...rated].sort((a, b) => (b.e.rank - b.pos) - (a.e.rank - a.pos))[0];
  const down = [...rated].sort((a, b) => (a.e.rank - a.pos) - (b.e.rank - b.pos))[0];
  const officialIds = new Set(entries.map(e => meta?.[e.slug]?.espnId).filter(Boolean));
  const outside = [...elo.entries()].filter(([id]) => !officialIds.has(id)).sort((a, b) => a[1].pos - b[1].pos).slice(0, 3);
  const items = [
    up && up.e.rank - up.pos > 0 && { tone: 'text-win', title: 'O Elo gosta mais', text: <><b className="text-fg">{up.e.name}</b> é {up.e.rank}º no UFC e {up.pos}º pela nota Elo.</> },
    down && down.e.rank - down.pos < 0 && { tone: 'text-loss', title: 'O Elo gosta menos', text: <><b className="text-fg">{down.e.name}</b> é {down.e.rank}º no UFC e {down.pos}º pela nota Elo.</> },
    outside.length > 0 && { tone: 'text-blue-ink', title: 'No top 15 do Elo, fora do oficial', text: <>{outside.map(([, f], i) => <span key={f.name}>{i ? ', ' : ''}<b className="text-fg">{f.name}</b> ({f.pos}º)</span>)}.</> },
  ].filter(Boolean) as { tone: string; title: string; text: ReactNode }[];
  if (!items.length) return null;
  return (
    <div className="mt-2 grid gap-3 border-t border-line/70 px-5 py-4 sm:grid-cols-3">
      {items.map((it, i) => (
        <motion.div key={it.title} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}>
          <div className={clsx('text-[13px] font-semibold', it.tone)}>{it.title}</div>
          <p className="mt-1 text-[14px] leading-snug text-fg-2">{it.text}</p>
        </motion.div>
      ))}
    </div>
  );
}

function RankTable({ entries, meta, booked, elo }: { entries: RankEntry[]; meta?: RankingsMeta; booked?: BookedMap; elo?: Map<string, { pos: number; rating: number; name: string }> }) {
  const { sorted, sort, toggle } = useSort(entries, {
    rank: e => e.rank,
    name: e => e.name,
    wins: e => wins(meta?.[e.slug]?.record),
  }, 'rank', 'asc');
  return (
    <table className="table w-full table-fixed sm:table-auto">
      <thead><tr>
        <SortTh k="rank" sort={sort} toggle={toggle} first="asc" className="w-12 text-right sm:w-14">#</SortTh>
        <SortTh k="name" sort={sort} toggle={toggle} first="asc">Lutador</SortTh>
        {elo && <th scope="col" className="hidden w-20 text-right sm:table-cell"><Tip content="Posição pela nota Elo do site (mesma divisão) e a diferença para o ranking oficial"><span tabIndex={0} className="cursor-help">Elo</span></Tip></th>}
        <SortTh k="wins" sort={sort} toggle={toggle} className="w-28 text-right sm:w-auto"><span className="sm:hidden">Cartel</span><span className="hidden sm:inline">País · Cartel</span></SortTh>
      </tr></thead>
      <tbody>
        {sorted.map((e, i) => {
          const m = meta?.[e.slug];
          // os três primeiros da lista ganham a cor da medalha (ouro, prata, bronze) no número e um leve tom na linha
          const medal = e.rank <= 3 ? MEDALS[e.rank - 1] : undefined;
          return (
            <motion.tr key={e.slug} className="row-fx group/r" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i, 15) * 0.025, ease: [0.22, 1, 0.36, 1] }}
              style={{ ['--item-accent' as string]: medal ?? (e.rank <= 5 ? 'var(--color-gold)' : 'var(--color-blue)'),
                background: medal ? `linear-gradient(90deg, color-mix(in oklab, ${medal} 12%, transparent), transparent 55%)` : undefined }}>
              <td className="num text-right font-display text-[18px] font-semibold text-fg-3" style={medal ? { color: medal } : undefined}>
                <span className="flex flex-col items-end leading-tight">{e.rank}<Change e={e} /></span>
              </td>
              <td>
                <div className="flex items-center gap-3">
                  <Link to={fighterHref({ slug: e.slug, espnId: m?.espnId })} viewTransition onClick={morphPhoto} className="flex min-w-0 items-center gap-3 text-[16px] font-semibold text-fg hover:text-brand">
                    <span className="transition-transform duration-200 group-hover/r:scale-110"><Avatar src={headshot(m?.espnId)} name={e.name} size={36} ring={medal} /></span><span className="truncate">{e.name}</span>
                  </Link>
                  <BookedTag b={m?.espnId ? booked?.[m.espnId] : undefined} />
                </div>
              </td>
              {elo && <td className="hidden text-right sm:table-cell"><EloCell pos={m?.espnId ? elo.get(m.espnId)?.pos : undefined} official={e.rank} /></td>}
              <td><NationRecord code={m?.countryCode} country={m?.country} record={m?.record} /></td>
            </motion.tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Classificação (estilo FNT): cabeçalho escuro e colunas de números (vitórias, derrotas, empates, aproveitamento e
    a nota Elo), como uma tabela de liga. */
function StandingsTable({ entries, meta, elo }: { entries: RankEntry[]; meta?: RankingsMeta; elo?: Map<string, { pos: number; rating: number; name: string }> }) {
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-0 text-[15px]">
        <thead>
          <tr className="text-left text-[12px] font-bold uppercase tracking-[0.08em] text-white">
            {['Pos', 'Lutador', 'V', 'D', 'E', '% Vit.', 'Elo'].map((h, i) => (
              <th key={h} scope="col" className={clsx('bg-[#14183e] px-3 py-3', i > 1 && 'text-right', i === 0 && 'rounded-l-lg', i === 6 && 'rounded-r-lg')}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const m = meta?.[e.slug];
            const [w, l, d] = (m?.record ?? '').split('-').map(Number);
            const pct = w + l + (d || 0) ? Math.round((w / (w + l + (d || 0))) * 100) : undefined;
            const rating = m?.espnId ? elo?.get(m.espnId)?.rating : undefined;
            return (
              <motion.tr key={e.slug} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 15) * 0.02 }} className="odd:bg-surface-2/50 hover:bg-brand-soft">
                <td className="num px-3 py-2.5 font-display text-[17px] font-bold text-fg">{e.rank === 0 ? <Crown weight="fill" className="h-4 w-4 text-gold" /> : e.rank}</td>
                <td className="px-3 py-2.5">
                  <Link to={fighterHref({ slug: e.slug, espnId: m?.espnId })} viewTransition className="flex items-center gap-2.5 font-semibold text-fg hover:text-brand">
                    <Avatar src={headshot(m?.espnId)} name={e.name} size={28} /><span className="truncate">{e.name}</span>
                  </Link>
                </td>
                <td className="num px-3 text-right font-semibold text-win">{Number.isFinite(w) ? w : '—'}</td>
                <td className="num px-3 text-right font-semibold text-loss">{Number.isFinite(l) ? l : '—'}</td>
                <td className="num px-3 text-right text-fg-2">{Number.isFinite(d) ? d : '—'}</td>
                <td className="num px-3 text-right text-fg">{pct !== undefined ? `${pct}%` : '—'}</td>
                <td className="num px-3 text-right text-fg-2">{rating ? Math.round(rating) : '—'}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Ouro, prata e bronze para os três primeiros de cada lista. */
const MEDALS = ['var(--color-gold)', '#a9b2c6', '#c07a4b'];

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
    <div className="cut group relative flex min-h-[220px] items-end justify-between overflow-hidden rounded-xl bg-cream px-7 pt-7 ring-1 ring-line transition-colors hover:bg-cream-2">
      <FlagBackdrop code={m?.countryCode} shape="fade-left" className="inset-y-0 right-0 w-[64%] opacity-35 dark:opacity-25" />
      <div className="relative pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="dark"><Crown className="h-3.5 w-3.5 text-gold" /> {label}</Tag>
          {!division.champion && beltOf && <Tag tone="gold">{division.women ? 'Campeã' : 'Campeão'} · {beltOf.name}</Tag>}
          <span className="relative z-10"><BookedTag b={m?.espnId ? booked?.[m.espnId] : undefined} /></span>
        </div>
        <Link to={fighterHref({ slug: leader.slug, espnId: m?.espnId })} className="display mt-4 block text-[44px] text-fg after:absolute after:inset-0 sm:text-[64px]">{leader.name}</Link>
        {m && <div className="mt-3"><NationRecord className="justify-start" code={m.countryCode} country={m.country} record={m.record} /></div>}
        <div className="mt-3 inline-flex items-center gap-2 text-[14px] font-semibold text-fg-2 group-hover:text-brand">Ver perfil e histórico <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
      </div>
      {image
        ? <img src={proxy(image, 560)} alt="" loading="lazy" decoding="async" className="relative -mb-px h-44 w-auto object-contain transition-transform duration-500 group-hover:scale-[1.03] sm:h-56" />
        : <Avatar src={headshot(m?.espnId)} name={leader.name} size={160} className="relative mb-6 hidden sm:block" />}
    </div>
  );
}

export default function Rankings() {
  const [mode, setMode] = useState<'oficial' | 'tabela' | 'cartoes' | 'elo'>('oficial')
  const [group, setGroup] = useState<StyleGroup>('todos');
  const { div } = useParams();
  const { data, isPending: isLoading, isError, refetch } = useRankings();
  const { data: meta } = useRankingsMeta();
  const { data: booked } = useBooked();
  const division = data?.divisions.find(d => d.id === div) ?? data?.divisions[0];
  usePageTitle(division && `Rankings · ${division.name}`);
  const eloPos = useEloPositions(division && !division.p4p ? division.name : undefined);
  const { data: avg } = useDivisionAvg(division && !division.p4p ? division.name : undefined);
  const styles = useMemo(() => stylesBySlug(avg), [avg]);
  const all = division ? (division.champion ? [division.champion, ...division.entries] : division.entries) : [];
  const keep = (e: RankEntry) => inGroup(styles, e.slug, group);
  const counts = { todos: all.length, trocadores: all.filter(e => inGroup(styles, e.slug, 'trocadores')).length, grapplers: all.filter(e => inGroup(styles, e.slug, 'grapplers')).length, finalizadores: all.filter(e => inGroup(styles, e.slug, 'finalizadores')).length };

  return (
    <div>
      <PageHeader title="Quem manda em cada divisão" meta={data && <>Fonte: <a className="link" href={data.source} target="_blank" rel="noreferrer">UFC.com</a> · consultado às {new Date(data.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>} />
      {isError && <Panel><ErrorState onRetry={() => refetch()} /></Panel>}
      {isLoading && <div role="status" aria-busy="true" aria-label="Carregando os rankings" className="grid min-h-[1200px] gap-6 lg:grid-cols-[220px_1fr]"><Skeleton className="hidden h-96 lg:block" /><Skeleton className="h-[1100px]" /></div>}
      {data && division && (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <DivisionNav divisions={data.divisions} active={division.id} />
          <div className="min-w-0 space-y-4">
            <LeaderCard division={division} divisions={data.divisions} meta={meta} booked={booked} />
            <Panel title={division.p4p ? `${division.name} · top 15` : mode === 'elo' ? `${division.name} · nota Elo` : `${division.name} · desafiantes`}
              action={division.p4p ? (!division.entries.some(e => e.isNew || e.change) && <span className="text-[13px] text-fg-3">Sem mudanças de posição na última atualização</span>) : (
                <Segmented value={mode} onChange={setMode} options={[{ value: 'oficial', label: 'Oficial' }, { value: 'tabela', label: 'Tabela' }, { value: 'cartoes', label: 'Cartões' }, { value: 'elo', label: 'Elo' }]} />
              )}>
              {!division.p4p && mode !== 'elo' && styles.size > 0 && <StyleChips value={group} onChange={setGroup} counts={counts} />}
              {/* no peso por peso o nº 1 já está no card de destaque, como o campeão nas divisões */}
              {mode === 'elo' && !division.p4p
                ? <EloTable division={division.name} />
                : mode === 'tabela' && !division.p4p
                ? <StandingsTable entries={all.filter(keep)} meta={meta} elo={eloPos} />
                : mode === 'cartoes' && !division.p4p
                ? <RankCards entries={all.filter(keep)} meta={meta} />
                : <>
                    <RankTable entries={(division.champion ? division.entries : division.entries.slice(1)).filter(e => division.p4p || keep(e))} meta={meta} booked={booked} elo={division.p4p ? undefined : eloPos} />
                    {!division.p4p && eloPos && <OfficialVsElo entries={division.entries} meta={meta} elo={eloPos} />}
                  </>}
            </Panel>
            {!division.p4p && <div className="pt-6"><BeltTimeline key={division.name} division={division.name} /></div>}
          </div>
        </div>
      )}
    </div>
  );
}
