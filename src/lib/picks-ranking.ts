import type { Fight } from '@shared/types';
import { FOTN, scoreFight, scoreFotn, type MethodKey, type Pick, type Scored } from './picks';

/* Ranking entre usuários: funções puras (testadas em picks-ranking.test.ts) sobre as linhas da tabela `picks`
   e as lutas da ESPN. Um palpite gravado depois do horário da luta não conta (a hora gravada é a do servidor). */

/** Linha da tabela `picks` como o ranking a recebe (a do próprio usuário ou a de uma luta que já começou). */
export interface PickRow { user_id: string; event_id: string; fight_id: string; winner: string; method: MethodKey | null; round: number | null; updated_at: string }

export interface RankRow {
  userId: string;
  points: number; hits: number; scored: number; perfects: number;
  /** palpites que valem (feitos antes da luta) */
  made: number;
  /** posição, com empate dividindo o lugar (1, 1, 3) */
  pos: number;
}

/** Palpite feito depois do horário da luta: não vale. */
export const isLate = (row: { updated_at: string }, f: Fight) => !!f.date && Date.parse(row.updated_at) > Date.parse(f.date);

const toPick = (r: PickRow): Pick => ({ winner: r.winner, method: r.method ?? undefined, round: r.round ?? undefined, at: Date.parse(r.updated_at) });

/** Pontuação de um palpite de outra pessoa (null = não vale, feito depois do início). */
export function scoreRow(r: PickRow, f: Fight): Scored | null {
  return isLate(r, f) ? null : scoreFight(toPick(r), f);
}

/** Por evento: quando o card começa (fecha o voto de luta da noite) e as lutas premiadas (undefined = não saiu). */
export interface EventInfo { start?: string; awarded?: string[] }

/** Pontuação do voto de luta da noite de alguém (null = feito depois de o card começar). */
export function scoreFotnRow(r: PickRow, ev: EventInfo): Scored | null {
  return ev.start && Date.parse(r.updated_at) > Date.parse(ev.start) ? null : scoreFotn(toPick(r), ev.awarded);
}

/** Classificação: soma por usuário em todas as lutas conhecidas (e nos votos de luta da noite).
    Desempate: pontos, acertos, perfeitos. */
export function leaderboard(rows: PickRow[], fights: Map<string, Fight>, events: Map<string, EventInfo> = new Map()): RankRow[] {
  const by = new Map<string, Omit<RankRow, 'pos'>>();
  for (const r of rows) {
    const isFotn = r.fight_id === FOTN;
    const f = fights.get(r.fight_id), ev = events.get(r.event_id);
    if (isFotn ? !ev : !f) continue;
    const sc = isFotn ? scoreFotnRow(r, ev!) : scoreRow(r, f!);
    if (!sc) continue;
    const u = by.get(r.user_id) ?? { userId: r.user_id, points: 0, hits: 0, scored: 0, perfects: 0, made: 0 };
    u.made++;
    // o voto de luta da noite soma pontos, mas não entra na conta de acertos de lutas
    if (sc.state === 'done') { u.points += sc.points; if (!isFotn) { u.scored++; if (sc.winner) u.hits++; if (sc.perfect) u.perfects++; } }
    by.set(r.user_id, u);
  }
  const list = [...by.values()].sort((a, b) => b.points - a.points || b.hits - a.hits || b.perfects - a.perfects);
  const out: RankRow[] = [];
  list.forEach((u, i) => {
    const p = out[i - 1];
    const tie = p && p.points === u.points && p.hits === u.hits && p.perfects === u.perfects;
    out.push({ ...u, pos: tie ? p.pos : i + 1 });
  });
  return out;
}
