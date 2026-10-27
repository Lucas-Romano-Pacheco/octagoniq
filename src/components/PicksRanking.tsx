import { useMemo, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { CaretDown, Check, Crown, LockSimple, Star, Trophy, Users, X } from '@/components/icons';
import type { EventDetail, Fight } from '@shared/types';
import { bonusQuery, eventQuery, useBonuses } from '@/lib/api';
import { fotnAwarded } from '@/lib/fights';
import { lastName, splitEventName, time } from '@/lib/format';
import { cardStart, FOTN, fotnLocked, isLocked, methodKey, METHODS, POINTS, type Scored } from '@/lib/picks';
import { leaderboard, scoreRow, type EventInfo, type PickRow, type RankRow } from '@/lib/picks-ranking';
import { getSupabase, supabaseEnabled, useAuth } from '@/lib/supabase';
import { CORNER, CORNER_FILL, CORNER_INK } from './Duel';
import { METHOD_COLOR, METHOD_ICON } from './pick-style';
import { Avatar, CountUp, Empty, Panel, Segmented, Skeleton, Tag, Tip } from './kit';

/* Aba "Ranking" dos palpites: pódio e classificação (do evento ou geral) e o quadro de quem está palpitando.
   O banco só entrega o palpite de outra pessoa depois do horário da luta (RLS em docs/supabase.sql); antes disso,
   a função event_participation diz apenas QUEM já palpitou. Pontos calculados em src/lib/picks-ranking.ts. */

type Scope = 'evento' | 'geral';
const COLS = 'user_id,event_id,fight_id,winner,method,round,updated_at';
const METHOD_LABEL = Object.fromEntries(METHODS.map(m => [m.key, m.label]));
/** Medalhas do pódio: ouro (o "campeão" do bolão), prata e bronze. */
const MEDAL = ['var(--color-gold)', '#a9b2c6', '#c07a4b'];

/* ---------- Dados ---------- */

function usePickRows(eventId: string | undefined, scope: Scope) {
  return useQuery({
    queryKey: ['ranking', scope === 'geral' ? 'geral' : eventId],
    enabled: supabaseEnabled && (scope === 'geral' || !!eventId),
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

/** Classificação de um evento (a mesma da aba Ranking), para a imagem de compartilhar mostrar a posição. */
export function useEventBoard(event?: EventDetail) {
  const rows = usePickRows(event?.id, 'evento');
  const { data: bonus } = useBonuses(event?.status === 'post' ? event.id : undefined);
  return useMemo(() => {
    if (!event || !rows.data) return [];
    const fights = new Map(event.fights.map(f => [f.id, f]));
    const start = cardStart(event.fights);
    const events = new Map<string, EventInfo>([[event.id, { start, awarded: fotnAwarded(event, bonus) }]]);
    const closed = rows.data.filter(r => (r.fight_id === FOTN ? !!start && Date.parse(start) <= Date.now() : isLocked(fights.get(r.fight_id) ?? ({ status: 'pre' } as Fight))));
    return leaderboard(closed, fights, events);
  }, [event, rows.data, bonus]);
}

/** Quem já palpitou em cada luta (sem o palpite). */
function useParticipation(eventId: string) {
  return useQuery({
    queryKey: ['participation', eventId],
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const sb = await getSupabase();
      const { data, error } = await sb.rpc('event_participation', { eid: eventId });
      if (error) throw error;
      return (data ?? []) as { user_id: string; fight_id: string }[];
    },
  });
}

export function useNames(ids: string[]) {
  const key = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ['profiles', key],
    enabled: supabaseEnabled && key.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const sb = await getSupabase();
      const { data, error } = await sb.from('profiles').select('id,username').in('id', key);
      if (error) throw error;
      return new Map((data ?? []).map(p => [p.id as string, p.username as string]));
    },
  });
}

/* ---------- Peças ---------- */

/** Cor estável por pessoa (a mesma em todo o quadro), fora do vermelho/azul dos cantos. */
const PERSON = ['#7c5cd6', '#13865c', '#c4501d', '#0f7c8c', '#b0367a', '#5b6178', '#8a6a00', '#3d6fb8'];
const personColor = (id: string) => PERSON[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % PERSON.length];

function Face({ id, name, me, size = 36, className, ring }: { id: string; name: string; me?: boolean; size?: number; className?: string; ring?: string }) {
  return (
    <span aria-hidden className={clsx('grid shrink-0 place-items-center rounded-full font-display font-bold uppercase text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.42, background: me ? 'var(--color-brand)' : personColor(id), boxShadow: ring ? `0 0 0 3px var(--color-surface), 0 0 0 5px ${ring}` : undefined }}>
      {name.slice(0, 1)}
    </span>
  );
}

function Podium({ top, nameOf, me }: { top: RankRow[]; nameOf: (id: string) => string; me?: string }) {
  // ordem visual: 2º, 1º, 3º; alturas diferentes como num pódio
  const slots = [top[1], top[0], top[2]];
  const height = ['h-28 sm:h-32', 'h-36 sm:h-44', 'h-20 sm:h-24'];
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {slots.map((u, i) => {
        if (!u) return <span key={i} />;
        const place = u.pos - 1, c = MEDAL[Math.min(place, 2)];
        const name = nameOf(u.userId);
        return (
          <motion.div key={u.userId} className="flex min-w-0 flex-col items-center" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: [0.15, 0, 0.3][i], ease: [0.22, 1, 0.36, 1] }}>
            <motion.div initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.25 + [0.15, 0, 0.3][i] }} className="relative">
              {place === 0 && <Crown weight="fill" className="absolute -top-6 left-1/2 h-6 w-6 -translate-x-1/2" style={{ color: c }} />}
              <Face id={u.userId} name={name} me={u.userId === me} size={i === 1 ? 72 : 56} ring={c} />
            </motion.div>
            <div className="mt-3 max-w-full truncate px-1 text-center text-[14px] font-semibold text-fg sm:text-[16px]">{name}{u.userId === me && <span className="text-fg-3"> (você)</span>}</div>
            <div className="num display text-[24px] text-fg sm:text-[32px]"><CountUp value={u.points} /><span className="ml-1 font-sans text-[13px] font-semibold text-fg-3">pts</span></div>
            <div className={clsx('relative mt-2 flex w-full items-start justify-center overflow-hidden rounded-t-xl pt-3', height[i])}
              style={{ background: `linear-gradient(180deg, color-mix(in oklab, ${c} 55%, var(--color-surface)), color-mix(in oklab, ${c} 14%, var(--color-surface)))` }}>
              <span className="display text-[32px] text-white drop-shadow sm:text-[44px]">{u.pos}º</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function Standings({ board, nameOf, me }: { board: RankRow[]; nameOf: (id: string) => string; me?: string }) {
  const lead = Math.max(board[0]?.points ?? 0, 1);
  return (
    <ol className="space-y-2">
      {board.map((u, i) => {
        const name = nameOf(u.userId);
        return (
          <motion.li key={u.userId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 12) * 0.04 }}
            className={clsx('relative overflow-hidden rounded-xl px-4 py-3 ring-1', u.userId === me ? 'bg-brand-soft ring-brand/30' : 'bg-surface ring-line')}>
            <div className="relative grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3">
              <span className="display text-[24px] text-fg-3">{u.pos}º</span>
              <span className="flex min-w-0 items-center gap-3">
                <Face id={u.userId} name={name} me={u.userId === me} size={36} />
                <span className="truncate text-[16px] font-semibold text-fg">{name}</span>
                {u.userId === me && <Tag tone="brand">você</Tag>}
              </span>
              <span className="text-right">
                <span className="num display text-[24px] text-fg">{u.points}</span><span className="ml-1 text-[13px] text-fg-3">pts</span>
                <span className="block text-[13px] text-fg-3">{u.scored ? `${u.hits}/${u.scored} certos` : 'aguardando'}{u.perfects ? ` · ${u.perfects} ${u.perfects === 1 ? 'perfeito' : 'perfeitos'}` : ''}</span>
              </span>
            </div>
            {/* distância para o líder */}
            <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <motion.div className="h-full rounded-full" style={{ background: u.userId === me ? 'var(--color-brand)' : personColor(u.userId) }}
                initial={{ width: 0 }} animate={{ width: `${(u.points / lead) * 100}%` }} transition={{ duration: 0.8, delay: 0.1 + Math.min(i, 12) * 0.04, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

/** Um rosto no quadro, com o palpite no balão (quando já dá para ver). */
function Voter({ id, name, me, tip, state }: { id: string; name: string; me?: boolean; tip: ReactNode; state?: 'won' | 'lost' | 'late' }) {
  return (
    <Tip title={name} content={tip}>
      <motion.span tabIndex={0} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }} className="relative inline-flex outline-none">
        <Face id={id} name={name} me={me} size={32} className={clsx(state === 'lost' && 'opacity-45 grayscale', state === 'late' && 'opacity-40')} ring={state === 'won' ? 'var(--color-win)' : undefined} />
        {state === 'won' && <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-win text-white ring-2 ring-surface"><Check weight="bold" className="h-2.5 w-2.5" /></span>}
        {state === 'lost' && <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-loss text-white ring-2 ring-surface"><X weight="bold" className="h-2.5 w-2.5" /></span>}
      </motion.span>
    </Tip>
  );
}

/** Selo de acerto/erro no canto de cada parte do palpite (só depois de a luta acabar). */
const Mark = ({ hit }: { hit: boolean }) => (
  <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.25 }}
    className={clsx('absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-white ring-2 ring-surface', hit ? 'bg-win' : 'bg-loss')}>
    {hit ? <Check weight="bold" className="h-2.5 w-2.5" /> : <X weight="bold" className="h-2.5 w-2.5" />}
  </motion.span>
);

/** Palpite de uma pessoa em miniatura, no mesmo desenho da tela de palpites: os dois lutadores lado a lado (o escolhido
    pintado com a cor do canto e um pouco maior), o ícone do método e o round. Depois da luta, cada parte ganha um selo. */
function PickLine({ row, f, name, me, i }: { row: PickRow; f: Fight; name: string; me?: boolean; i: number }) {
  const sc: Scored | null = scoreRow(row, f);
  const done = sc?.state === 'done', winnerHit = !!sc?.winner;
  const finish = (() => { const k = f.result ? methodKey(f.result.method) : undefined; return k === 'ko' || k === 'sub'; })();
  const got = (label: string) => !!sc?.parts.some(p => p.label === label);
  const pickSide: 'a' | 'b' = row.winner === f.red.espnId ? 'a' : 'b';
  const Icon = row.method ? METHOD_ICON[row.method] : null;
  const fighter = (s: 'a' | 'b') => {
    const fr = s === 'a' ? f.red : f.blue, on = s === pickSide;
    return (
      <motion.span transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        className={clsx('relative flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1', on ? 'flex-[1.4] text-white' : 'flex-1 bg-surface-2/70 text-fg-3')}
        style={on ? { background: `linear-gradient(${s === 'a' ? '135deg' : '225deg'}, ${CORNER_FILL[s]}, color-mix(in oklab, ${CORNER_FILL[s]} 60%, #0d0f22))` } : undefined}>
        <Avatar src={fr.headshot} name={fr.name} size={22} ring={on ? '#fff' : undefined} className={clsx(!on && 'opacity-60 grayscale')} />
        <span className="truncate text-[13px] font-semibold">{lastName(fr.name)}</span>
        {on && done && <Mark hit={winnerHit} />}
      </motion.span>
    );
  };
  return (
    <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
      <span className="flex w-36 min-w-0 items-center gap-2">
        <Face id={row.user_id} name={name} me={me} size={24} />
        <b className="truncate text-[13px] font-semibold text-fg">{name}{me && <span className="ml-1 font-normal text-fg-3">(você)</span>}</b>
      </span>
      {/* vencedor: os dois cantos, o escolhido pintado */}
      <span className="flex w-56 min-w-0 gap-1">{fighter('a')}{fighter('b')}</span>
      {/* método: o ícone com a cor dele */}
      {Icon && row.method ? (
        <Tip title={METHOD_LABEL[row.method]} content={done ? (got('Método') ? 'Acertou o método' : 'Errou o método') : 'Método do palpite'}>
          <span tabIndex={0} className="relative grid h-8 w-8 place-items-center rounded-lg text-white outline-none"
            style={{ background: METHOD_COLOR[row.method].c, opacity: done && winnerHit && !got('Método') ? 0.55 : 1 }}>
            <Icon weight="fill" className="h-4 w-4" />
            {done && winnerHit && <Mark hit={got('Método')} />}
          </span>
        </Tip>
      ) : <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2/70 text-[12px] text-fg-3" title="Só o vencedor">—</span>}
      {/* round: no mesmo padrão do método (quadrado na cor do método). Decisão = luta completa: mostra o último round */}
      {row.method && (row.round || row.method === 'dec') ? (() => {
        const n = row.round ?? f.rounds, isDec = row.method === 'dec';
        const judged = done && winnerHit && finish && got('Método') && !isDec;
        return (
          <Tip title={isDec ? `Até o fim: ${f.rounds} rounds` : `Round ${n}`} content={judged ? (got('Round') ? 'Acertou o round' : 'Errou o round') : isDec ? 'Palpite de decisão: a luta vai até o último round' : 'Round do palpite'}>
            <span tabIndex={0} className="num relative grid h-8 w-8 place-items-center rounded-lg font-display text-[13px] font-bold text-white outline-none"
              style={{ background: METHOD_COLOR[row.method].c, opacity: judged && !got('Round') ? 0.55 : 1 }}>
              R{n}
              {judged && <Mark hit={got('Round')} />}
            </span>
          </Tip>
        );
      })() : <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2/70 text-[12px] text-fg-3" title="Sem round">—</span>}
      <span className="num ml-auto text-[13px] font-semibold">
        {!sc ? <span className="text-fg-3">fora do prazo</span>
          : sc.state === 'void' ? <span className="text-fg-3">anulada</span>
          : !done ? <span className="text-fg-3">aguardando</span>
          : winnerHit ? <span className="text-win">+{sc.points}{sc.perfect ? ' · perfeito' : ''}</span>
          : <span className="text-loss">0</span>}
      </span>
    </motion.li>
  );
}

/** Todos os palpites de uma luta, em linhas compactas, com o resultado oficial no topo. */
function PickDetails({ f, revealed, names, me }: { f: Fight; revealed: PickRow[]; names: Map<string, string>; me?: string }) {
  const r = f.result;
  const winnerSide = r?.winnerId === f.red.espnId ? f.red : r?.winnerId === f.blue.espnId ? f.blue : null;
  // quem acertou primeiro, depois por pontos
  const rows = [...revealed].sort((x, y) => (scoreRow(y, f)?.points ?? -1) - (scoreRow(x, f)?.points ?? -1));
  return (
    <div className="mt-3 rounded-lg bg-surface-2/50 px-3 py-2 sm:px-4">
      <p className="py-1 text-[13px] text-fg-3">
        {r ? <>Resultado: <b className="font-semibold text-fg">{winnerSide ? `${lastName(winnerSide.name)} venceu` : 'sem vencedor'}</b> · {r.method}{r.round && !/decis/i.test(r.method) ? `, R${r.round} ${r.clock ?? ''}` : ''}</>
          : 'Os pontos saem quando a luta terminar.'}
      </p>
      <ul className="divide-y divide-line/60">{rows.map((row, i) => <PickLine key={row.user_id} i={i} row={row} f={f} name={names.get(row.user_id) ?? '…'} me={row.user_id === me} />)}</ul>
    </div>
  );
}

/** Uma luta no quadro: antes de começar, quem palpitou (sem revelar); depois, de que lado cada um ficou. */
function FightBoard({ f, voters, revealed, names, me, fotnVotes, awarded, i, open, onToggle }: {
  f: Fight; voters: string[]; revealed: PickRow[]; names: Map<string, string>; me?: string; fotnVotes: string[]; awarded: boolean; i: number; open: boolean; onToggle: () => void;
}) {
  const locked = isLocked(f), r = f.result;
  const nameOf = (id: string) => names.get(id) ?? '…';
  const sides = { a: revealed.filter(x => x.winner === f.red.espnId), b: revealed.filter(x => x.winner === f.blue.espnId) };
  const total = sides.a.length + sides.b.length;
  const pct = total ? Math.round((sides.a.length / total) * 100) : 50;
  const won = r?.winnerId === f.red.espnId ? 'a' : r?.winnerId === f.blue.espnId ? 'b' : undefined;
  const voterTip = (row: PickRow) => {
    const sc = scoreRow(row, f), side = row.winner === f.red.espnId ? f.red : f.blue;
    return <>{lastName(side.name)}{row.method ? ` · ${METHOD_LABEL[row.method]}` : ''}{row.round && row.method !== 'dec' ? ` · R${row.round}` : ''}
      {!sc ? ' · fora do prazo' : sc.state === 'done' ? (sc.winner ? ` · +${sc.points} pts` : ' · errou') : ''}</>;
  };
  const stateOf = (row: PickRow) => { const sc = scoreRow(row, f); return !sc ? 'late' : sc.state === 'done' ? (sc.winner ? 'won' : 'lost') : undefined; };
  const column = (s: 'a' | 'b') => (
    <div className={clsx('flex min-h-8 flex-wrap gap-2', s === 'b' && 'justify-end')}>
      {sides[s].map(row => <Voter key={row.user_id} id={row.user_id} name={nameOf(row.user_id)} me={row.user_id === me} tip={voterTip(row)} state={stateOf(row)} />)}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.05 }}
      className="rounded-xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex -space-x-3">
          <Avatar src={f.red.headshot} name={f.red.name} size={40} ring={CORNER.a} />
          <Avatar src={f.blue.headshot} name={f.blue.name} size={40} ring={CORNER.b} />
        </span>
        <span className="font-display text-[18px] font-bold uppercase tracking-[0.02em] text-fg">{lastName(f.red.name)} <span className="text-fg-3">×</span> {lastName(f.blue.name)}</span>
        {awarded && <Tag tone="gold"><Trophy weight="fill" className="h-3 w-3" /> Luta da noite</Tag>}
        <span className="ml-auto text-[13px] text-fg-3">
          {r ? (won ? <><b className="font-semibold text-fg-2">{lastName((won === 'a' ? f.red : f.blue).name)}</b> · {r.method}{r.round && !/decis/i.test(r.method) ? `, R${r.round}` : ''}</> : 'Sem vencedor')
            : f.status === 'in' ? <span className="font-semibold text-loss">● Ao vivo</span>
            : locked ? 'Aguardando o resultado' : f.date ? <span className="inline-flex items-center gap-1"><LockSimple className="h-3.5 w-3.5" /> revela às {time(f.date)}</span> : 'Aberta'}
        </span>
      </div>

      {!locked ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {voters.map(id => <Voter key={id} id={id} name={nameOf(id)} me={id === me} tip={id === me ? 'Seu palpite fica escondido até a luta começar' : 'Já palpitou: o palpite aparece quando a luta começar'} />)}
          </div>
          <span className="text-[14px] text-fg-3">{voters.length ? `${voters.length} ${voters.length === 1 ? 'pessoa palpitou' : 'pessoas palpitaram'}` : 'Ninguém palpitou ainda'}</span>
        </div>
      ) : total ? (
        <div className="mt-4">
          <div className="mb-2 flex justify-between text-[13px] font-semibold">
            <span style={{ color: CORNER_INK.a }}>{pct}% · {lastName(f.red.name)}</span>
            <span style={{ color: CORNER_INK.b }}>{lastName(f.blue.name)} · {100 - pct}%</span>
          </div>
          {/* divisão da galera entre os dois cantos */}
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
            <motion.div style={{ background: CORNER.a }} initial={{ width: '50%' }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2 + Math.min(i, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }} className={clsx(won === 'b' && 'opacity-40')} />
            <motion.div style={{ background: CORNER.b }} className={clsx('flex-1', won === 'a' && 'opacity-40')} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">{column('a')}{column('b')}</div>
          <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`palpites-${f.id}`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md py-1 text-[14px] font-semibold text-fg-2 hover:text-fg">
            <CaretDown weight="bold" className={clsx('h-4 w-4 transition-transform duration-200', open && 'rotate-180')} />
            {open ? 'Esconder palpites' : `Ver os ${total} ${total === 1 ? 'palpite' : 'palpites'} e o resultado de cada um`}
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div id={`palpites-${f.id}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
                <PickDetails f={f} revealed={revealed} names={names} me={me} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : <p className="mt-3 text-[14px] text-fg-3">Ninguém palpitou nesta luta.</p>}

      {fotnVotes.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/70 pt-3 text-[13px] text-fg-2">
          <Star weight="fill" className="h-4 w-4 text-gold" />
          <b className="font-semibold">{fotnVotes.length} {fotnVotes.length === 1 ? 'voto' : 'votos'}</b> para luta da noite
          <span className="flex -space-x-2">{fotnVotes.map(id => <Face key={id} id={id} name={nameOf(id)} me={id === me} size={22} />)}</span>
          {awarded && <span className="font-semibold text-win">+{POINTS.fotn} para cada um</span>}
        </div>
      )}
    </motion.div>
  );
}

/* ---------- Aba ---------- */

export function PicksRanking({ event }: { event: EventDetail }) {
  const auth = useAuth();
  const me = auth.user?.id;
  const [scope, setScope] = useState<Scope>('evento');
  const rows = usePickRows(event.id, scope);
  const eventRows = usePickRows(event.id, 'evento');
  const part = useParticipation(event.id);
  const { data: bonus } = useBonuses(event.status === 'post' ? event.id : undefined);

  // no ranking geral entram as lutas e os bônus de todos os eventos com palpite
  const eventIds = useMemo(() => [...new Set((rows.data ?? []).map(r => r.event_id))].filter(id => id !== event.id), [rows.data, event.id]);
  const others = useQueries({ queries: scope === 'geral' ? eventIds.map(id => eventQuery(id)) : [] });
  const otherBonus = useQueries({ queries: scope === 'geral' ? eventIds.map((id, i) => bonusQuery((others[i]?.data as EventDetail | undefined)?.status === 'post' ? id : undefined)) : [] });
  const { fights, events } = useMemo(() => {
    const fights = new Map<string, Fight>(event.fights.map(f => [f.id, f]));
    const events = new Map<string, EventInfo>([[event.id, { start: cardStart(event.fights), awarded: fotnAwarded(event, bonus) }]]);
    others.forEach((q, i) => {
      const ev = q.data as EventDetail | undefined;
      if (!ev) return;
      for (const f of ev.fights) fights.set(f.id, f);
      events.set(ev.id, { start: cardStart(ev.fights), awarded: fotnAwarded(ev, otherBonus[i]?.data) });
    });
    return { fights, events };
  }, [event, bonus, others, otherBonus]);

  // só o que já fechou (para todos verem o mesmo ranking)
  const closed = (rows.data ?? []).filter(r => {
    if (r.fight_id === FOTN) { const ev = events.get(r.event_id); return !!ev?.start && Date.parse(ev.start) <= Date.now(); }
    const f = fights.get(r.fight_id); return !!f && isLocked(f);
  });
  const board = leaderboard(closed, fights, events);

  const ordered = [...event.fights].sort((a, b) => a.order - b.order);
  const voters = new Map<string, string[]>();
  for (const p of part.data ?? []) voters.set(p.fight_id, [...(voters.get(p.fight_id) ?? []), p.user_id]);
  const people = [...new Set((part.data ?? []).map(p => p.user_id).concat((eventRows.data ?? []).map(r => r.user_id)))];
  const revealed = new Map<string, PickRow[]>();
  for (const r of eventRows.data ?? []) revealed.set(r.fight_id, [...(revealed.get(r.fight_id) ?? []), r]);
  const fotnOpen = !fotnLocked(event.fights);
  // lutas com o detalhe dos palpites aberto ("Expandir todas" abre as que já têm palpites revelados)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const expandable = ordered.filter(f => isLocked(f) && (revealed.get(f.id)?.length ?? 0) > 0).map(f => f.id);
  const allOpen = expandable.length > 0 && expandable.every(id => openIds.has(id));
  const toggle = (id: string) => setOpenIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const awarded = events.get(event.id)?.awarded ?? [];
  const names = useNames([...board.map(b => b.userId), ...people]);
  const nameOf = (id: string) => names.data?.get(id) ?? '…';
  const { title, series } = splitEventName(event.name);
  const fightsOf = (id: string) => (part.data ?? []).filter(p => p.user_id === id && p.fight_id !== FOTN).length;

  return (
    <div className="space-y-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Panel plain title="Pódio" action={
          <Segmented value={scope} onChange={setScope} options={[{ value: 'evento', label: 'Este evento' }, { value: 'geral', label: 'Geral' }]} />}>
          <p className="-mt-1 mb-8 text-[13px] text-fg-3">{scope === 'evento' ? `${title || series} · só as lutas que já começaram` : 'Todos os eventos somados'}</p>
          {rows.isPending ? <Skeleton label="Carregando o ranking" className="h-64" />
            : rows.isError ? <Empty>Não foi possível carregar o ranking agora.</Empty>
            : board.length ? <Podium top={board.slice(0, 3)} nameOf={nameOf} me={me} />
            : <Empty><Trophy weight="duotone" className="mx-auto mb-2 h-10 w-10 text-gold" />{ordered.some(isLocked) || scope === 'geral' ? 'Ninguém pontuou ainda. Os pontos aparecem quando as lutas terminam.' : 'O pódio abre quando a primeira luta do card começar.'}</Empty>}
        </Panel>

        <Panel plain title="Classificação" action={<span className="num text-[13px] text-fg-3">{board.length} {board.length === 1 ? 'palpiteiro' : 'palpiteiros'}</span>}>
          {board.length ? <Standings board={board} nameOf={nameOf} me={me} /> : <Empty>Sem pontos por enquanto.</Empty>}
        </Panel>
      </div>

      <Panel plain title="Quem está palpitando" bodyClass="space-y-4" action={
        <span className="flex items-center gap-4 text-[13px] text-fg-3">
          {title || series}
          {expandable.length > 0 && <button type="button" onClick={() => setOpenIds(allOpen ? new Set() : new Set(expandable))} className="font-semibold text-fg-2 hover:text-fg">{allOpen ? 'Recolher todas' : 'Expandir todas'}</button>}
        </span>}>
        {/* participantes: rosto, apelido e quantas lutas do card já palpitou */}
        {people.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-cream px-4 py-4 ring-1 ring-line sm:px-5">
            <span className="flex items-center gap-2 font-display text-[14px] font-bold text-fg"><Users weight="bold" className="h-5 w-5" /> {people.length} {people.length === 1 ? 'palpiteiro' : 'palpiteiros'}</span>
            <ul className="flex flex-wrap gap-3">
              {people.map((id, i) => {
                const n = fightsOf(id), full = n >= event.fights.length;
                return (
                  <motion.li key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 ring-1 ring-line">
                    <Face id={id} name={nameOf(id)} me={id === me} size={30} />
                    <span className="text-[14px] font-semibold text-fg">{nameOf(id)}</span>
                    <span className={clsx('num text-[12px] font-semibold', full ? 'text-win' : 'text-fg-3')}>{n}/{event.fights.length}{full && <Check weight="bold" className="ml-1 inline h-3 w-3" />}</span>
                  </motion.li>
                );
              })}
            </ul>
            {fotnOpen && <span className="ml-auto flex items-center gap-2 text-[13px] text-fg-3"><LockSimple className="h-4 w-4" /> Palpites e votos aparecem quando cada luta começar</span>}
          </div>
        )}
        {part.isPending && eventRows.isPending ? <Skeleton label="Carregando a participação" className="h-48" />
          : !people.length ? <Empty><Users weight="duotone" className="mx-auto mb-2 h-10 w-10" />Ninguém palpitou neste evento ainda. Seja o primeiro na aba Meus palpites.</Empty>
          : ordered.map((f, i) => (
              <FightBoard key={f.id} i={i} f={f} open={openIds.has(f.id)} onToggle={() => toggle(f.id)} voters={voters.get(f.id) ?? []} revealed={revealed.get(f.id) ?? []} names={names.data ?? new Map()} me={me}
                fotnVotes={fotnOpen ? [] : (eventRows.data ?? []).filter(r => r.fight_id === FOTN && r.winner === f.id).map(r => r.user_id)} awarded={awarded.includes(f.id)} />
            ))}
      </Panel>
    </div>
  );
}
