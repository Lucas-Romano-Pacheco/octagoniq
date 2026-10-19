import { describe, expect, it } from 'vitest';
import { fairProbs, fmtMoneyline, impliedProb, oddsTier, slugify, fold } from './format.ts';

describe('odds', () => {
  it('converte linha americana em probabilidade implícita', () => {
    expect(impliedProb(-200)).toBeCloseTo(2 / 3);
    expect(impliedProb(+200)).toBeCloseTo(1 / 3);
    expect(impliedProb(-100)).toBeCloseTo(0.5);
    expect(impliedProb(undefined)).toBeUndefined();
  });
  it('tira a margem da casa: as duas chances somam 100%', () => {
    const [a, b] = fairProbs(-344, 265)!;
    expect(a + b).toBeCloseTo(1);
    expect(a).toBeGreaterThan(0.73);
    expect(a).toBeLessThan(0.75);
  });
  it('sem uma das linhas, não há probabilidade', () => {
    expect(fairProbs(-150, undefined)).toBeUndefined();
  });
  it('formata a linha com sinal', () => {
    expect(fmtMoneyline(150)).toBe('+150');
    expect(fmtMoneyline(-150)).toBe('-150');
    expect(fmtMoneyline(undefined)).toBe('—');
  });
  it.each([
    [0.85, 'grande-favorito'], [0.8, 'grande-favorito'], [0.7, 'favorito'], [0.55, 'ligeiro-favorito'], [0.5, 'equilibrada'],
    [0.4, 'ligeiro-azarao'], [0.3, 'zebra'], [0.1, 'grande-zebra'],
  ])('classifica %s como %s', (p, tier) => expect(oddsTier(p).tier).toBe(tier));
});

describe('nomes', () => {
  it('ignora acentos e caixa', () => {
    expect(fold('Jéssica Andrade')).toBe('jessica andrade');
    expect(slugify('Alexandre Pantoja')).toBe('alexandre-pantoja');
  });
});
