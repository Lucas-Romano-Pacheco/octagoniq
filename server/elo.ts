/* Nota Elo dos lutadores (N7): um ranking alternativo, calculado com todas as lutas da história do UFC, na ordem.
   Fonte: o placar anual da ESPN (uma requisição por ano, desde o UFC 1). Regras: todos começam com 1500; K = 48 nas
   5 primeiras lutas no UFC (a nota se ajusta rápido enquanto há poucos dados) e 32 depois; empate e luta sem
   resultado não mexem na nota; o Contender Series fica de fora. */

import type { EloFighter } from '../shared/types.ts';
import { weightClassPt } from '../shared/format.ts';
import { HOUR, getJson, remember, settle } from './http.ts';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc';
type J = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export const ELO_START = 1500;
export const kFactor = (fightsBefore: number) => (fightsBefore < 5 ? 48 : 32);
/** Chance de A vencer B pela diferença de notas. */
export const eloChance = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

export interface Bout { date: string; a: { id: string; name: string }; b: { id: string; name: string }; winner: 'a' | 'b' | null; division?: string }

/** Passa por todas as lutas em ordem e devolve a nota de cada lutador (função pura, testada em elo.test.ts). */
export function computeElo(bouts: Bout[]): Record<string, EloFighter> {
  const out: Record<string, EloFighter> = {};
  const get = (x: { id: string; name: string }) => (out[x.id] ??= { id: x.id, name: x.name, rating: ELO_START, peak: ELO_START, fights: 0, wins: 0, history: [] });
  for (const bt of [...bouts].sort((x, y) => x.date.localeCompare(y.date))) {
    const A = get(bt.a), B = get(bt.b);
    A.name = bt.a.name; B.name = bt.b.name;
    if (bt.division) { A.division = bt.division; B.division = bt.division; }
    A.lastDate = B.lastDate = bt.date;
    if (!bt.winner) continue;                                      // empate ou sem resultado
    const ea = eloChance(A.rating, B.rating), sa = bt.winner === 'a' ? 1 : 0;
    const ka = kFactor(A.fights), kb = kFactor(B.fights);
    A.rating = Math.round((A.rating + ka * (sa - ea)) * 10) / 10;
    B.rating = Math.round((B.rating + kb * ((1 - sa) - (1 - ea))) * 10) / 10;
    A.fights++; B.fights++;
    (bt.winner === 'a' ? A : B).wins++;
    for (const F of [A, B]) {
      F.history.push({ d: bt.date.slice(0, 10), r: Math.round(F.rating) });
      if (F.rating > F.peak) { F.peak = F.rating; F.peakDate = bt.date.slice(0, 10); }
    }
  }
  return out;
}

/** Lutas de um ano do placar da ESPN (só as encerradas). */
export function boutsFromBoard(board: J): Bout[] {
  const out: Bout[] = [];
  for (const ev of board?.events ?? []) {
    if (/contender series/i.test(ev.name ?? '')) continue;
    for (const c of ev.competitions ?? []) {
      if (c.status?.type?.name !== 'STATUS_FINAL' && !c.status?.type?.completed) continue;
      const [x, y] = c.competitors ?? [];
      if (!x?.id || !y?.id) continue;
      const nm = (k: J) => k.athlete?.displayName ?? k.athlete?.fullName ?? '';
      out.push({
        date: c.date ?? c.startDate ?? ev.date,
        a: { id: String(x.id), name: nm(x) }, b: { id: String(y.id), name: nm(y) },
        winner: x.winner ? 'a' : y.winner ? 'b' : null,
        division: c.type?.abbreviation ? weightClassPt(c.type.abbreviation) : undefined,
      });
    }
  }
  return out;
}

/** Tabela com todos os lutadores, recalculada a cada 12 h (anos passados ficam em cache por 30 dias). */
export function eloTable(): Promise<Record<string, EloFighter>> {
  return remember('elo:v1', 12 * HOUR, async () => {
    const now = new Date().getUTCFullYear();
    const years = Array.from({ length: now - 1993 + 1 }, (_, i) => 1993 + i);
    const boards = await settle(years.map(y => getJson<J>(`${SITE}/scoreboard?dates=${y}&limit=200`, y < now ? 30 * 24 * HOUR : HOUR)));
    if (boards.filter(Boolean).length < years.length - 2) throw new Error('placares da ESPN incompletos');
    return computeElo(boards.flatMap(b => (b ? boutsFromBoard(b) : [])));
  });
}

/** Ativo: lutou nos últimos 2 anos. */
const active = (f: EloFighter) => !!f.lastDate && Date.now() - Date.parse(f.lastDate) < 2 * 365 * 24 * HOUR;

/** Top da divisão pela nota (só ativos). */
export async function eloRanking(division: string, limit = 15) {
  const t = await eloTable();
  return Object.values(t).filter(f => f.division === division && active(f) && f.fights >= 3)
    .sort((a, b) => b.rating - a.rating).slice(0, limit)
    .map(({ history: _h, ...f }) => f);
}

/** Um lutador, com a posição na divisão. */
export async function eloFighter(id: string) {
  const t = await eloTable();
  const f = t[id];
  if (!f) return null;
  const peers = Object.values(t).filter(x => x.division === f.division && active(x) && x.fights >= 3).sort((a, b) => b.rating - a.rating);
  const pos = peers.findIndex(x => x.id === id);
  return { ...f, rank: pos >= 0 ? pos + 1 : undefined, of: peers.length };
}
