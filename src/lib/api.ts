import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import type { BookedMap, DivisionAverages, EventDetail, EventListItem, FightDetail, FighterProfile, FighterRef, Rankings, RankingsMeta, SearchHit } from '@shared/types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? `Erro ${res.status}`);
  return body as T;
}

export interface UpcomingEvent extends EventListItem {
  status: EventDetail['status'];
  venue?: string;
  city?: string;
  country?: string;
  fightCount: number;
  main?: { red: FighterRef; blue: FighterRef; weightClass: string; title: boolean };
}

const MIN = 60_000;

export const useUpcoming = (limit = 8) =>
  useQuery({ queryKey: ['upcoming', limit], queryFn: () => get<UpcomingEvent[]>(`/api/upcoming?limit=${limit}`), staleTime: 5 * MIN, refetchInterval: 5 * MIN });

export const useSchedule = (year: number) =>
  useQuery({ queryKey: ['schedule', year], queryFn: () => get<EventListItem[]>(`/api/schedule?year=${year}`), staleTime: 10 * MIN, placeholderData: keepPreviousData });

export const eventQuery = (id?: string) => queryOptions({
  queryKey: ['event', id],
  queryFn: () => get<EventDetail>(`/api/events/${id}`),
  enabled: !!id,
  staleTime: MIN,
});

/** Durante um evento ao vivo, atualiza a cada 20 s. */
export const useEvent = (id?: string) =>
  useQuery({ ...eventQuery(id), refetchInterval: q => (q.state.data?.status === 'in' ? 20_000 : false) });

/** Luta específica (estatísticas por alvo/posição e odds); ao vivo atualiza a cada 20 s. */
export const useFight = (eventId?: string, fightId?: string) =>
  useQuery({
    queryKey: ['fight', eventId, fightId],
    queryFn: () => get<FightDetail>(`/api/events/${eventId}/fights/${fightId}`),
    enabled: !!eventId && !!fightId,
    staleTime: MIN,
    refetchInterval: q => (q.state.data?.fight.status === 'in' ? 20_000 : false),
  });

export const fightHref = (eventId: string, fightId: string) => `/eventos/${eventId}/lutas/${fightId}`;

export const useRankings = () =>
  useQuery({ queryKey: ['rankings'], queryFn: () => get<Rankings>('/api/rankings'), staleTime: 30 * MIN });

/** Média dos ranqueados da divisão (referência para as estatísticas do perfil). */
export const useDivisionAvg = (division?: string) =>
  useQuery({ queryKey: ['divavg', division], queryFn: () => get<DivisionAverages>(`/api/divisions/average?name=${encodeURIComponent(division!)}`), enabled: !!division, staleTime: 6 * 60 * MIN, retry: false });

/** Bônus da noite do UFC (nomes dos lutadores). */
export const bonusQuery = (eventId?: string) => queryOptions({
  queryKey: ['bonuses', eventId],
  queryFn: () => get<{ fight: string[][]; performance: string[] }>(`/api/events/${eventId}/bonuses`),
  enabled: !!eventId,
  staleTime: 60 * MIN,
});
export const useBonuses = (eventId?: string) => useQuery(bonusQuery(eventId));

/** Quem tem luta marcada (id ESPN → próxima luta), para a etiqueta "luta marcada" nas listas. */
export const useBooked = () =>
  useQuery({ queryKey: ['booked'], queryFn: () => get<BookedMap>('/api/booked'), staleTime: 30 * MIN });

/** Bandeira e cartel dos ranqueados: chega depois da tabela (é mais pesado) e a completa. */
export const useRankingsMeta = () =>
  useQuery({ queryKey: ['rankings-meta'], queryFn: () => get<RankingsMeta>('/api/rankings/meta'), staleTime: 60 * MIN });

export const fighterQuery = (slug?: string, espnId?: string | null) => queryOptions({
  queryKey: ['fighter', slug],
  queryFn: () => get<FighterProfile>(`/api/fighters/${slug}${espnId ? `?espn=${espnId}` : ''}`),
  enabled: !!slug,
  staleTime: 10 * MIN,
  retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
});

export const useFighter = (slug?: string, espnId?: string | null) => useQuery(fighterQuery(slug, espnId));

export const useSearch = (q: string) =>
  useQuery({
    queryKey: ['search', q],
    queryFn: () => get<SearchHit[]>(`/api/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
    staleTime: 30 * MIN,
    placeholderData: keepPreviousData,
  });

/** Link para o perfil: slug do UFC.com + id ESPN quando conhecido (evita uma busca no servidor). */
export const fighterHref = (f: { slug: string; espnId?: string }) =>
  `/lutadores/${f.slug}${f.espnId ? `?espn=${f.espnId}` : ''}`;

/** Pré-carrega o perfil ou o evento quando o ponteiro para sobre um link (intenção de clique). */
export function prefetchFromHref(client: import('@tanstack/react-query').QueryClient, href: string) {
  const url = new URL(href, location.origin);
  if (url.origin !== location.origin) return;
  const f = url.pathname.match(/^\/lutadores\/([a-z0-9-]+)$/);
  if (f) return client.prefetchQuery(fighterQuery(f[1], url.searchParams.get('espn')));
  const e = url.pathname.match(/^\/eventos\/(\d+)$/);
  if (e) return client.prefetchQuery(eventQuery(e[1]));
}
