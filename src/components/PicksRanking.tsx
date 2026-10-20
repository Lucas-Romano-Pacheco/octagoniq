import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Check, Crown, LockSimple, X } from '@phosphor-icons/react';
import type { EventDetail, Fight } from '@shared/types';
import { eventQuery } from '@/lib/api';
import { lastName, splitEventName } from '@/lib/format';
import { isLocked, METHODS } from '@/lib/picks';
import { leaderboard, scoreRow, type PickRow } from '@/lib/picks-ranking';
import { getSupabase, useAuth } from '@/lib/supabase';
import { CORNER } from './Duel';
import { Empty, Panel, Segmented, Skeleton, Tag } from './kit';

/* Aba "Ranking" dos palpites: classificação entre os usuários (do evento ou geral) e os palpites de cada um.
   O banco só entrega o palpite de outra pessoa depois do horário da luta (RLS em docs/supabase.sql), então nada aqui
   revela palpite de luta aberta. Os pontos são calculados com o resultado real (ESPN), em src/lib/picks-ranking.ts. */

type Scope = 'evento' | 'geral';
const COLS = 'user_id,event_id,fight_id,winner,method,round,updated_at';

function usePickRows(eventId: string | undefined, scope: Scope) {
  return useQuery({
    queryKey: ['ranking', scope === 'geral' ? 'geral' : eventId],
    enabled: scope === 'geral' || !!eventId,
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const sb = await getSupabase();
      const q = sb.from('picks').select(COLS).limit(10_000);
      const { data, error } = await (scope === 'evento' ? q.eq('event_id', eventId!) : q);
      if (error) throw error;
      return (data ?? []) as PickRow[];
    },
  });
}

function useNames(ids: string[]) {
  const key = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ['profiles', key],
    enabled: key.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const sb = await getSupabase();
      const { data, error } = await sb.from('profiles').select('id,username').in('id', key);
      if (error) throw error;
      return new Map((data ?? []).map(p => [p.id as string, p.username as string]));
    },
  });
}

const Initial = ({ name, me, className }: { name: string; me?: boolean; className?: string }) => (
  <span aria-hidden className={clsx('grid shrink-0 place-items-center rounded-full font-display font-bold uppercase', me ? 'bg-brand text-white' : 'bg-fg text-bg', className)}>{name.slice(0, 1)}</span>
);

const METHOD_LABEL = Object.fromEntries(METHODS.map(m => [m.key, m.label]));

/** Uma luta já começada: o resultado e o palpite de cada pessoa, com os pontos. */
function FightPicks({ f, rows, names, me }: { f: Fight; rows: PickRow[]; names: Map<string, string>; me?: string }) {
  const r = f.result;
  const winner = r?.winnerId ? (r.winnerId === f.red.espnId ? f.red : f.blue) : undefined;
  const sorted = [...rows].sort((a, b) => (scoreRow(b, f)?.points ?? -1) - (scoreRow(a, f)?.points ?? -1));
  return (
    <div className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-display text-[16px] font-bold uppercase tracking-[0.02em] text-fg">{lastName(f.red.name)} <span className="text-fg-3">×</span> {lastName(f.blue.name)}</span>
        <span className="text-[13px] text-fg-3">
          {f.status === 'post' && r ? (winner ? <><b className="font-semibold text-fg-2">{lastName(winner.name)}</b> · {r.method}{r.round && !/decis/i.test(r.method) ? `, R${r.round}` : ''}</> : 'Sem vencedor (não conta)')
            : f.status === 'in' ? 'Ao vivo' : 'Aguardando o resultado'}
        </span>
      </div>
      {sorted.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {sorted.map(row => {
            const sc = scoreRow(row, f);
            const name = names.get(row.user_id) ?? '…';
            const side = row.winner === f.red.espnId ? 'a' : 'b';
            const picked = side === 'a' ? f.red : f.blue;
            const done = sc?.state === 'done';
            return (
              <li key={row.user_id} className={clsx('flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[13px] ring-1',
                !sc ? 'bg-surface-2 text-fg-3 ring-line' : done && sc.winner ? 'bg-win-soft text-fg ring-win/30' : done ? 'bg-surface-2 text-fg-3 ring-line' : 'bg-surface text-fg-2 ring-line')}>
                <Initial name={name} me={row.user_id === me} className="h-6 w-6 text-[12px]" />
                <b className="font-semibold text-fg">{name}</b>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: CORNER[side] }} />{lastName(picked.name)}</span>
                {row.method && <span>· {METHOD_LABEL[row.method]}{row.round && row.method !== 'dec' ? ` R${row.round}` : ''}</span>}
                {!sc ? <span>· fora do prazo</span>
                  : done && sc.winner ? <span className="num inline-flex items-center gap-0.5 font-bold text-win"><Check weight="bold" className="h-3.5 w-3.5" />+{sc.points}</span>
                  : done ? <X weight="bold" className="h-3.5 w-3.5 text-loss" aria-label="errou" /> : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="mt-2 text-[13px] text-fg-3">Ninguém palpitou nesta luta.</p>}
    </div>
  );
}

export function PicksRanking({ event }: { event: EventDetail }) {
  const auth = useAuth();
  const me = auth.user?.id;
  const [scope, setScope] = useState<Scope>('evento');
  const rows = usePickRows(event.id, scope);
  // nesta coluna ficam sempre os palpites do evento escolhido, qualquer que seja o recorte do ranking
  const eventRows = usePickRows(event.id, 'evento');

  // lutas de todos os eventos que aparecem no ranking geral (o evento atual já está carregado)
  const eventIds = useMemo(() => [...new Set((rows.data ?? []).map(r => r.event_id))].filter(id => id !== event.id), [rows.data, event.id]);
  const others = useQueries({ queries: scope === 'geral' ? eventIds.map(id => eventQuery(id)) : [] });
  const fights = useMemo(() => {
    const m = new Map<string, Fight>(event.fights.map(f => [f.id, f]));
    for (const q of others) for (const f of (q.data as EventDetail | undefined)?.fights ?? []) m.set(f.id, f);
    return m;
  }, [event.fights, others]);

  // só lutas que já começaram: as abertas não contam (nem as do próprio usuário, para todos verem o mesmo ranking)
  const closed = (rows.data ?? []).filter(r => { const f = fights.get(r.fight_id); return f && isLocked(f); });
  const board = leaderboard(closed, fights);
  const locked = [...event.fights].filter(f => isLocked(f)).sort((a, b) => a.order - b.order);
  const open = event.fights.length - locked.length;
  const byFight = new Map<string, PickRow[]>();
  for (const r of eventRows.data ?? []) if (locked.some(f => f.id === r.fight_id)) byFight.set(r.fight_id, [...(byFight.get(r.fight_id) ?? []), r]);
  const names = useNames([...board.map(b => b.userId), ...(eventRows.data ?? []).map(r => r.user_id)]);
  const nameOf = (id: string) => names.data?.get(id) ?? '…';
  const { title, series } = splitEventName(event.name);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <Panel plain className="lg:sticky lg:top-24 lg:self-start" title="Classificação" action={
        <Segmented value={scope} onChange={setScope} options={[{ value: 'evento', label: 'Este evento' }, { value: 'geral', label: 'Geral' }]} />}>
        <p className="-mt-1 mb-3 text-[13px] text-fg-3">{scope === 'evento' ? `${title || series} · só as lutas que já começaram` : 'Todos os eventos somados'}</p>
        {rows.isPending ? <div className="space-y-2">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
          : rows.isError ? <Empty>Não foi possível carregar o ranking agora.</Empty>
          : !board.length ? <Empty>{open === event.fights.length && scope === 'evento' ? 'O ranking começa quando a primeira luta do card começar.' : 'Ninguém pontuou ainda. Os pontos aparecem quando as lutas terminam.'}</Empty>
          : (
            <ol className="space-y-1">
              {board.map((u, i) => {
                const name = nameOf(u.userId);
                const lead = u.pos === 1 && u.points > 0;
                return (
                  <motion.li key={u.userId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.04 }}
                    className={clsx('grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-3 py-3', lead ? 'bg-cream ring-1 ring-line' : 'hover:bg-surface-2/60', u.userId === me && !lead && 'bg-surface-2')}>
                    <span className={clsx('display flex items-center gap-1 text-[24px]', lead ? 'text-gold-ink' : 'text-fg-3')}>{lead && <Crown weight="fill" className="h-4 w-4" />}{u.pos}º</span>
                    <span className="flex min-w-0 items-center gap-3">
                      <Initial name={name} me={u.userId === me} className="h-9 w-9 text-[16px]" />
                      <span className="truncate text-[16px] font-semibold text-fg">{name}</span>
                      {u.userId === me && <Tag tone="neutral">você</Tag>}
                    </span>
                    <span className="text-right">
                      <span className="num display text-[24px] text-fg">{u.points}</span> <span className="text-[13px] text-fg-3">pts</span>
                      <span className="block text-[13px] text-fg-3">{u.scored ? `${u.hits}/${u.scored} certos` : 'aguardando'}{u.perfects ? ` · ${u.perfects} ${u.perfects === 1 ? 'perfeito' : 'perfeitos'}` : ''}</span>
                    </span>
                  </motion.li>
                );
              })}
            </ol>
          )}
      </Panel>

      <Panel plain title="Palpites da galera" action={<span className="text-[13px] text-fg-3">{title || series}</span>} bodyClass="divide-y divide-line/70">
        {eventRows.isPending ? <Skeleton className="h-40" />
          : !locked.length ? (
            <Empty><LockSimple weight="bold" className="mx-auto mb-2 h-6 w-6" />Os palpites de cada luta aparecem quando ela começar. Até lá, ninguém vê o palpite de ninguém.</Empty>
          ) : (
            <>
              {locked.map(f => <FightPicks key={f.id} f={f} rows={byFight.get(f.id) ?? []} names={names.data ?? new Map()} me={me} />)}
              {open > 0 && <p className="flex items-center gap-2 py-4 text-[13px] text-fg-3"><LockSimple className="h-4 w-4" /> {open} {open === 1 ? 'luta ainda aberta' : 'lutas ainda abertas'}: os palpites aparecem quando cada uma começar.</p>}
            </>
          )}
      </Panel>
    </div>
  );
}
