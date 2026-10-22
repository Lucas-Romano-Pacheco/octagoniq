import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseAthleteHtml } from './ufc.ts';

const html = readFileSync(new URL('./__fixtures__/athlete-makhachev.html', import.meta.url), 'utf8');

describe('página de atleta do UFC.com', () => {
  const a = parseAthleteHtml(html, 'islam-makhachev')!;
  it('lê nome, cartel e status', () => {
    expect(a.bio.name).toBe('Islam Makhachev');
    expect(a.bio.record).toEqual({ w: 29, l: 1, d: 0 });
  });
  it('lê as estatísticas oficiais', () => {
    expect(a.stats.slpm).toBeCloseTo(2.27);
    expect(a.stats.sapm).toBeCloseTo(1.42);
    expect(a.stats.tdAvg).toBeCloseTo(3.22);
    expect(a.stats.strAcc).toBe(58);
    expect(a.stats.tdDef).toBe(91);
  });
  it('lê golpes e quedas tentadas', () => {
    expect(a.stats.sigLanded).toBe(507);
    expect(a.stats.sigAttempted).toBe(874);
    expect(a.stats.tdLanded).toBe(13);
    expect(a.stats.tdAttempted).toBe(88);
  });
  it('lê vitórias por método e golpes por alvo', () => {
    expect(a.stats.winsBy).toEqual({ ko: 5, dec: 11, sub: 13 });
    expect(a.stats.byTarget).toBeDefined();
  });
  it('página sem atleta devolve null', () => {
    expect(parseAthleteHtml('<html><body>nada</body></html>', 'x')).toBeNull();
  });
});

import { careerFrom } from './espn.ts';
describe('estatísticas calculadas das lutas (quando o UFC.com não publica)', () => {
  const side = (o: Partial<import('../shared/types.ts').FightSideStats>) => ({
    kd: 0, sigLanded: 0, sigAttempted: 0, totalLanded: 0, totalAttempted: 0, tdLanded: 0, tdAttempted: 0, subAttempts: 0, reversals: 0, advances: 0,
    head: [0, 0] as [number, number], body: [0, 0] as [number, number], leg: [0, 0] as [number, number],
    distance: [0, 0] as [number, number], clinch: [0, 0] as [number, number], ground: [0, 0] as [number, number], ...o,
  });
  it('médias por minuto e por 15 min, precisão e defesa, alvos e posições', () => {
    const s = careerFrom([
      { me: side({ sigLanded: 60, sigAttempted: 100, tdLanded: 1, tdAttempted: 2, kd: 1, head: [40, 70], distance: [50, 80] }), opp: side({ sigLanded: 30, sigAttempted: 90, tdLanded: 0, tdAttempted: 4 }), seconds: 900 },
      { me: side({ sigLanded: 40, sigAttempted: 100, head: [20, 50], clinch: [10, 15] }), opp: side({ sigLanded: 20, sigAttempted: 60 }), seconds: 600 },
    ])!;
    expect(s).toMatchObject({ slpm: 4, sapm: 2, strAcc: 50, strDef: 67, tdAvg: 0.6, tdAcc: 50, tdDef: 100, kdAvg: 0.6, avgFightTime: '12:30', source: 'espn', fights: 2 });
    expect(s.byTarget).toEqual({ head: 60, body: 0, leg: 0 });
    expect(s.byPosition).toEqual({ standing: 50, clinch: 10, ground: 0 });
  });
  it('sem lutas com duração, nada', () => expect(careerFrom([])).toBeNull());
});
