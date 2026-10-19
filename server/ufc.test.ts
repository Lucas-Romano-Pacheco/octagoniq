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
