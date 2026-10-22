import { useQuery } from '@tanstack/react-query';
import type { Fight } from '@shared/types';
import { getSupabase, supabaseEnabled } from './supabase';

/* Palpite da galera: total de votos em cada lutador por luta (função event_crowd em docs/supabase.sql).
   Só totais: quem votou em quem continua escondido até a luta começar. */

export type Crowd = Map<string, Map<string, number>>; // fightId → winnerId → votos

export function useCrowd(eventId?: string) {
  return useQuery({
    queryKey: ['crowd', eventId],
    enabled: supabaseEnabled && !!eventId,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async (): Promise<Crowd> => {
      const sb = await getSupabase();
      const { data, error } = await sb.rpc('event_crowd', { eid: eventId });
      if (error) throw error;
      const m: Crowd = new Map();
      for (const r of (data ?? []) as { fight_id: string; winner: string; votes: number }[]) {
        const f = m.get(r.fight_id) ?? new Map<string, number>();
        f.set(r.winner, Number(r.votes));
        m.set(r.fight_id, f);
      }
      return m;
    },
  });
}

/** Parte da galera em cada canto de uma luta (null sem votos). */
export function crowdShare(crowd: Crowd | undefined, f: Fight): { red: number; blue: number; votes: number } | null {
  const v = crowd?.get(f.id);
  const red = v?.get(f.red.espnId) ?? 0, blue = v?.get(f.blue.espnId) ?? 0;
  const votes = red + blue;
  return votes ? { red: red / votes, blue: blue / votes, votes } : null;
}
