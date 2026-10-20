import { describe, expect, it } from 'vitest';
import type { Fight } from '@shared/types';
import { isLate, leaderboard, type PickRow } from './picks-ranking.ts';

const START = '2026-10-24T18:00:00Z';
const fight = (id: string, win: '1' | '2', method = 'KO/TKO', round = 1): Fight => ({
  id, order: 1, segment: 'main', weightClass: 'Leve', title: false, rounds: 3, status: 'post', date: START,
  red: { espnId: '1', name: 'A', slug: 'a' }, blue: { espnId: '2', name: 'B', slug: 'b' },
  result: { winnerId: win, method, round, clock: '2:00' },
}) as Fight;
const row = (user: string, fightId: string, winner: string, o: Partial<PickRow> = {}): PickRow =>
  ({ user_id: user, event_id: 'e', fight_id: fightId, winner, method: null, round: null, updated_at: '2026-10-24T17:00:00Z', ...o });

const fights = new Map([['f1', fight('f1', '1')], ['f2', fight('f2', '2', 'Decisão unânime', 3)]]);

describe('ranking entre usuários', () => {
  it('palpite gravado depois do horário da luta não vale', () => {
    expect(isLate({ updated_at: '2026-10-24T18:00:01Z' }, fights.get('f1')!)).toBe(true);
    expect(isLate({ updated_at: '2026-10-24T17:59:59Z' }, fights.get('f1')!)).toBe(false);
    const r = leaderboard([row('ana', 'f1', '1', { updated_at: '2026-10-24T18:30:00Z' })], fights);
    expect(r).toEqual([]);
  });

  it('soma por pessoa e ordena por pontos', () => {
    const r = leaderboard([
      row('ana', 'f1', '1', { method: 'ko', round: 1 }), // 25
      row('ana', 'f2', '1'),                               // 0
      row('bia', 'f1', '1'),                               // 10
      row('bia', 'f2', '2', { method: 'dec' }),            // 20
    ], fights);
    expect(r.map(x => [x.userId, x.points, x.pos])).toEqual([['bia', 30, 1], ['ana', 25, 2]]);
    expect(r[0]).toMatchObject({ hits: 2, scored: 2, perfects: 1, made: 2 });
  });

  it('empate divide a posição (1, 1, 3)', () => {
    const r = leaderboard([row('ana', 'f1', '1'), row('bia', 'f1', '1'), row('caio', 'f1', '2')], fights);
    expect(r.map(x => x.pos)).toEqual([1, 1, 3]);
  });

  it('ignora lutas desconhecidas', () => expect(leaderboard([row('ana', 'zz', '1')], fights)).toEqual([]));
});
