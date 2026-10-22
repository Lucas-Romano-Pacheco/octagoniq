import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Fight } from '@shared/types';
import { getSupabase, supabaseEnabled, useAuth } from './supabase';

/* "Seja o 4º juiz" (N2): a nota de cada round dada pelos usuários (tabela round_scores em docs/supabase.sql),
   as notas da galera em totais e as contas que comparam com os juízes. */

export type RoundNote = { red: number; blue: number };
export const NOTES: RoundNote[] = [{ red: 10, blue: 8 }, { red: 10, blue: 9 }, { red: 9, blue: 10 }, { red: 8, blue: 10 }];

/** Rounds que já dá para pontuar: ao vivo, os que terminaram; encerrada por decisão, todos; por interrupção, os completos. */
export function scorableRounds(f: Fight): number[] {
  const upTo = f.status === 'in' ? (f.live?.round ?? 1) - 1
    : f.status === 'post' && f.result ? (/decis/i.test(f.result.method) ? f.rounds : (f.result.round ?? 1) - 1) : 0;
  return Array.from({ length: Math.max(0, upTo) }, (_, i) => i + 1);
}

export function useMyNotes(eventId: string, fightId: string) {
  const auth = useAuth();
  return useQuery({
    queryKey: ['my-notes', eventId, fightId, auth.user?.id],
    enabled: supabaseEnabled && !!auth.user,
    queryFn: async () => {
      const sb = await getSupabase();
      const { data, error } = await sb.from('round_scores').select('round,red,blue').eq('event_id', eventId).eq('fight_id', fightId).eq('user_id', auth.user!.id);
      if (error) throw error;
      return new Map((data ?? []).map(r => [r.round as number, { red: r.red as number, blue: r.blue as number }]));
    },
  });
}

export interface FanSummary {
  /** por round: votos em cada canto */
  rounds: Map<number, { red: number; blue: number; votes: number }>;
  /** cartões completos (todas as rondas pontuadas): quantos deram a luta a cada canto */
  cards: { red: number; blue: number; draw: number; total: number };
}

export function useFanSummary(eventId: string, fightId: string, nRounds: number) {
  return useQuery({
    queryKey: ['fan-notes', eventId, fightId],
    enabled: supabaseEnabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<FanSummary> => {
      const sb = await getSupabase();
      const [r, c] = await Promise.all([sb.rpc('fight_fan_rounds', { eid: eventId, fid: fightId }), sb.rpc('fight_fan_cards', { eid: eventId, fid: fightId })]);
      if (r.error) throw r.error;
      if (c.error) throw c.error;
      return summarizeFans((r.data ?? []) as { round: number; red: number; blue: number; votes: number }[], (c.data ?? []) as { rounds: number; red: number; blue: number }[], nRounds);
    },
  });
}

/** Junta as notas da galera (função pura, testada em fanscore.test.ts). */
export function summarizeFans(rows: { round: number; red: number; blue: number; votes: number }[], cards: { rounds: number; red: number; blue: number }[], nRounds: number): FanSummary {
  const rounds = new Map<number, { red: number; blue: number; votes: number }>();
  for (const x of rows) {
    const v = Number(x.votes), cur = rounds.get(x.round) ?? { red: 0, blue: 0, votes: 0 };
    if (x.red > x.blue) cur.red += v; else if (x.blue > x.red) cur.blue += v;
    cur.votes += v;
    rounds.set(x.round, cur);
  }
  const full = cards.filter(c => Number(c.rounds) >= nRounds);
  return {
    rounds,
    cards: {
      red: full.filter(c => Number(c.red) > Number(c.blue)).length,
      blue: full.filter(c => Number(c.blue) > Number(c.red)).length,
      draw: full.filter(c => Number(c.red) === Number(c.blue)).length,
      total: full.length,
    },
  };
}

export function useSaveNote(eventId: string, fightId: string) {
  const qc = useQueryClient();
  const auth = useAuth();
  return useMutation({
    mutationFn: async ({ round, note }: { round: number; note: RoundNote | null }) => {
      const sb = await getSupabase();
      const uid = auth.user!.id;
      const { error } = note
        ? await sb.from('round_scores').upsert({ user_id: uid, event_id: eventId, fight_id: fightId, round, red: note.red, blue: note.blue, updated_at: new Date().toISOString() }, { onConflict: 'user_id,event_id,fight_id,round' })
        : await sb.from('round_scores').delete().eq('user_id', uid).eq('event_id', eventId).eq('fight_id', fightId).eq('round', round);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-notes', eventId, fightId] });
      void qc.invalidateQueries({ queryKey: ['fan-notes', eventId, fightId] });
    },
  });
}
