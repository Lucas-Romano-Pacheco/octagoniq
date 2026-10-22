import { describe, expect, it } from 'vitest';
import { fighterStyle, strikeDiff } from './style.ts';

describe('estilo do lutador', () => {
  it('trocador de volume e nocauteador, do mais marcante para o menos', () => {
    const t = fighterStyle({ slpm: 8.4, sapm: 4, winsBy: { ko: 10, sub: 1, dec: 3 } });
    expect(t.map(x => x.key)).toEqual(['volume', 'ko']);
  });
  it('finalizador pelas vitórias, wrestler e anti-queda; no máximo 3 etiquetas', () => {
    const t = fighterStyle({ tdAvg: 3.2, tdDef: 91, strDef: 63, winsBy: { ko: 2, sub: 9, dec: 4 } });
    expect(t).toHaveLength(3);
    expect(t.map(x => x.key)).toContain('sub');
    expect(t.map(x => x.key)).toContain('wrestler');
  });
  it('poucas vitórias não viram etiqueta de método', () => expect(fighterStyle({ winsBy: { ko: 3, sub: 0, dec: 0 } })).toEqual([]));
  it('diferencial de golpes', () => {
    expect(strikeDiff({ slpm: 2.27, sapm: 1.42 })).toBe(0.85);
    expect(strikeDiff({ slpm: 2 })).toBeUndefined();
  });
});
