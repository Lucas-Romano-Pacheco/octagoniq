import { describe, expect, it } from 'vitest';
import type { Fight } from '@shared/types';
import { scorableRounds, summarizeFans } from './fanscore.ts';

const f = (o: Partial<Fight>) => ({ rounds: 3, status: 'post', ...o }) as Fight;

describe('seja o 4º juiz', () => {
  it('rounds que dá para pontuar', () => {
    expect(scorableRounds(f({ result: { winnerId: '1', method: 'Decisão unânime', round: 3, clock: '5:00' } }))).toEqual([1, 2, 3]);
    expect(scorableRounds(f({ result: { winnerId: '1', method: 'KO/TKO', round: 3, clock: '1:00' } }))).toEqual([1, 2]);
    expect(scorableRounds(f({ result: { winnerId: '1', method: 'KO/TKO', round: 1, clock: '1:00' } }))).toEqual([]);
    expect(scorableRounds(f({ status: 'in', live: { round: 2 } }))).toEqual([1]);
    expect(scorableRounds(f({ status: 'pre' }))).toEqual([]);
  });
  it('soma a galera por round e conta só cartões completos', () => {
    const s = summarizeFans(
      [{ round: 1, red: 10, blue: 9, votes: 3 }, { round: 1, red: 9, blue: 10, votes: 1 }, { round: 2, red: 10, blue: 8, votes: 2 }],
      [{ rounds: 3, red: 29, blue: 28 }, { rounds: 3, red: 28, blue: 29 }, { rounds: 3, red: 30, blue: 27 }, { rounds: 1, red: 10, blue: 9 }], 3);
    expect(s.rounds.get(1)).toEqual({ red: 3, blue: 1, votes: 4 });
    expect(s.cards).toEqual({ red: 2, blue: 1, draw: 0, total: 3 });
  });
});
