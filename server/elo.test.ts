import { describe, expect, it } from 'vitest';
import { boutsFromBoard, computeElo, eloChance, ELO_START, type Bout } from './elo.ts';

const bout = (date: string, a: string, b: string, winner: 'a' | 'b' | null): Bout => ({ date, a: { id: a, name: a }, b: { id: b, name: b }, winner, division: 'Leve' });

describe('nota Elo', () => {
  it('quem vence sobe o que o outro desce (mesmo K) e a chance é simétrica', () => {
    const t = computeElo([bout('2020-01-01', 'ana', 'bia', 'a')]);
    expect(t.ana.rating - ELO_START).toBe(24);
    expect(ELO_START - t.bia.rating).toBe(24);
    expect(eloChance(1600, 1400) + eloChance(1400, 1600)).toBeCloseTo(1);
  });
  it('vitória sobre alguém mais forte vale mais; ordem por data; empate não mexe', () => {
    const t = computeElo([
      bout('2020-03-01', 'caio', 'ana', 'a'),   // caio (novato) vence ana, que já tinha subido
      bout('2020-01-01', 'ana', 'bia', 'a'),
      bout('2020-02-01', 'ana', 'dani', null),
    ]);
    expect(t.caio.rating - ELO_START).toBeGreaterThan(24);
    expect(t.ana.fights).toBe(2);
    expect(t.ana.history.map(h => h.d)).toEqual(['2020-01-01', '2020-03-01']);
    expect(t.ana.peak).toBe(1524);
  });
  it('lê o placar da ESPN e pula o Contender Series e lutas não encerradas', () => {
    const board = { events: [
      { name: 'UFC 1', date: '1993-11-12', competitions: [{ status: { type: { name: 'STATUS_FINAL' } }, type: { abbreviation: 'Lightweight' }, competitors: [{ id: 1, winner: true, athlete: { displayName: 'A' } }, { id: 2, winner: false, athlete: { displayName: 'B' } }] },
        { status: { type: { name: 'STATUS_SCHEDULED' } }, competitors: [{ id: 3 }, { id: 4 }] }] },
      { name: "Dana White's Contender Series", competitions: [{ status: { type: { name: 'STATUS_FINAL' } }, competitors: [{ id: 5, winner: true }, { id: 6 }] }] },
    ] };
    const b = boutsFromBoard(board);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ a: { id: '1', name: 'A' }, winner: 'a', division: 'Leve' });
  });
});
