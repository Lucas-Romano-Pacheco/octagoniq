import { describe, expect, it } from 'vitest';
import { glossaryFor } from './glossary.ts';

describe('glossário do modo iniciante', () => {
  it('acha o termo pelo rótulo exibido', () => {
    expect(glossaryFor('Golpes sig. / min')?.term).toBe('Golpe significativo');
    expect(glossaryFor('Absorvidos / min')?.term).toBe('Golpes absorvidos');
    expect(glossaryFor('Defesa de quedas')?.term).toBe('Defesa de quedas');
    expect(glossaryFor('Precisão de quedas')?.term).toBe('Precisão de quedas');
    expect(glossaryFor('Decisão dividida')?.term).toBe('Decisão dividida');
    expect(glossaryFor('Knockdowns / 15 min')?.term).toBe('Knockdown');
  });
  it('rótulo comum não vira termo', () => expect(glossaryFor('Altura')).toBeUndefined());
});
