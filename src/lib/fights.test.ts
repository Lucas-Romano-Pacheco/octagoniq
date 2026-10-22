import { describe, expect, it } from 'vitest';
import type { Fight, FighterRef } from '@shared/types';
import { cardSummary, fightSeconds, isUpset, roundEdge, winnerChance } from './fights.ts';

const fighter = (id: string): FighterRef => ({ espnId: id, name: `Lutador ${id}`, slug: `l-${id}` });
type Opts = { win?: 'red' | 'blue' | null; method?: string; round?: number; clock?: string; red?: number; blue?: number };
/** Luta de teste: `red`/`blue` são as linhas de aposta; `win` o vencedor (omitido = luta sem resultado). */
const fight = ({ win, method = 'KO/TKO', round = 1, clock = '2:00', red: mlRed, blue: mlBlue }: Opts): Fight => ({
  id: String(Math.random()), order: 1, segment: 'main', weightClass: 'Leve', title: false, rounds: 3, status: 'post',
  red: fighter('1'), blue: fighter('2'),
  odds: mlRed !== undefined ? { provider: 'x', red: mlRed, blue: mlBlue } : undefined,
  result: win === undefined ? undefined : { winnerId: win === 'red' ? '1' : win === 'blue' ? '2' : undefined, method, round, clock } as Fight['result'],
}) as Fight;

describe('zebra', () => {
  it('é zebra quando o vencedor tinha menos de 35% de chance', () => {
    expect(isUpset(fight({ win: 'blue', red: -300, blue: +250 }))).toBe(true);
    expect(isUpset(fight({ win: 'red', red: -300, blue: +250 }))).toBe(false);
    expect(isUpset(fight({ win: 'blue', red: -120, blue: +100 }))).toBe(false); // luta equilibrada
  });
  it('sem odds ou sem vencedor, não é zebra', () => {
    expect(isUpset(fight({ win: 'blue' }))).toBe(false);
    expect(winnerChance(fight({ win: null, red: -200, blue: +170 }))).toBeUndefined();
  });
  it('a chance do vencedor usa as probabilidades sem margem', () => {
    expect(winnerChance(fight({ win: 'red', red: -200, blue: +170 }))).toBeGreaterThan(0.6);
  });
});

describe('resumo do card', () => {
  it('calcula segundos de luta (rounds de 5 minutos)', () => {
    expect(fightSeconds(fight({ win: 'red', round: 1, clock: '0:39' }))).toBe(39);
    expect(fightSeconds(fight({ win: 'red', round: 3, clock: '5:00' }))).toBe(900);
    expect(fightSeconds(fight({}))).toBeUndefined();
  });
  it('conta nocautes, finalizações, decisões, zebras e 1º round', () => {
    const s = cardSummary([
      fight({ win: 'red', method: 'KO/TKO', round: 1, clock: '1:00', red: -200, blue: +170 }),
      fight({ win: 'blue', method: 'Finalização', round: 2, clock: '2:00', red: -300, blue: +250 }),
      fight({ win: 'red', method: 'Decisão unânime', round: 3, clock: '5:00' }),
      fight({}),
    ]);
    expect(s).toMatchObject({ done: 3, ko: 1, sub: 1, dec: 1, r1: 1, upsets: 1 });
    expect(s.avgSeconds).toBe((60 + 420 + 900) / 3);
    expect(s.biggestUpset?.result?.method).toBe('Finalização');
  });
});

describe('domínio por round', () => {
  const side = (o: Partial<import('@shared/types').RoundSide>) => ({ sig: 0, sigAtt: 0, kd: 0, td: 0, tdAtt: 0, ctrl: 0, subs: 0, ...o });
  it('knockdown e queda pesam mais que golpes; positivo é o vermelho', () => {
    expect(roundEdge({ n: 1, red: side({ sig: 9, kd: 1 }), blue: side({ sig: 12 }) })).toBe(5);
    expect(roundEdge({ n: 2, red: side({ sig: 5 }), blue: side({ sig: 5, td: 2, ctrl: 150 }) })).toBe(-18);
  });
});
