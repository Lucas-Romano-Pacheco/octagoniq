import { describe, expect, it } from 'vitest';
import { matchLine, type BfoLine } from './bfo.ts';

const lines: BfoLine[] = [
  { opponent: 'Ian Machado Garry', date: '2026-08-15T00:00:00.000Z', open: -400, close: -344, oppOpen: 330, oppClose: 265 },
  { opponent: 'Dustin Poirier', date: '2025-06-01T00:00:00.000Z', open: -300 },
];

describe('odds históricas (BestFightOdds)', () => {
  it('casa a luta pela data (±3 dias) e pelo sobrenome do adversário', () => {
    expect(matchLine(lines, 'Ian Machado Garry', '2026-08-15T22:00Z')?.close).toBe(-344);
    expect(matchLine(lines, 'Ian Machado Garry', '2026-08-17T10:00Z')?.close).toBe(-344);
  });
  it('sem o mesmo adversário, só aceita se a data for praticamente a mesma', () => {
    expect(matchLine(lines, 'Outro Nome', '2026-08-15T22:00Z')?.open).toBe(-400);
    expect(matchLine(lines, 'Outro Nome', '2026-09-20T22:00Z')).toBeUndefined();
  });
  it('ignora lutas de outra data', () => {
    expect(matchLine(lines, 'Dustin Poirier', '2026-08-15T22:00Z')?.open).toBe(-400); // cai na luta da data, não na do Poirier de 2025
  });
});
