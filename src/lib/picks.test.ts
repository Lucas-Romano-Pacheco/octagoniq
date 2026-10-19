import { describe, expect, it } from 'vitest';
import type { Fight } from '@shared/types';
import { buildSaved, isDirty, isLocked, mergeSaved, methodKey, scoreFight, summarize, type Pick } from './picks.ts';

const fight = (o: { win?: 'red' | 'blue' | null; method?: string; round?: number; odds?: [number, number]; status?: Fight['status']; date?: string }): Fight => ({
  id: 'f', order: 1, segment: 'main', weightClass: 'Leve', title: false, rounds: 3, status: o.status ?? (o.win === undefined ? 'pre' : 'post'),
  red: { espnId: '1', name: 'A', slug: 'a' }, blue: { espnId: '2', name: 'B', slug: 'b' }, date: o.date,
  odds: o.odds ? { provider: 'x', red: o.odds[0], blue: o.odds[1] } : undefined,
  result: o.win === undefined ? undefined : { winnerId: o.win === 'red' ? '1' : o.win === 'blue' ? '2' : null, method: o.method ?? 'KO/TKO', round: o.round ?? 1, clock: '2:00' },
}) as Fight;
const pick = (p: Partial<Pick>): Pick => ({ winner: '1', at: 0, ...p });

describe('método', () => {
  it('classifica o método do resultado', () => {
    expect(methodKey('KO/TKO')).toBe('ko');
    expect(methodKey('Finalização')).toBe('sub');
    expect(methodKey('Decisão unânime')).toBe('dec');
    expect(methodKey('Desqualificação')).toBeUndefined();
  });
});

describe('pontuação', () => {
  it('luta que não terminou fica pendente', () => expect(scoreFight(pick({}), fight({})).state).toBe('pending'));
  it('errou o vencedor: zero, mesmo acertando método e round', () => {
    const s = scoreFight(pick({ winner: '2', method: 'ko', round: 1 }), fight({ win: 'red', method: 'KO/TKO', round: 1 }));
    expect(s).toMatchObject({ state: 'done', points: 0, winner: false });
  });
  it('só o vencedor = 10', () => expect(scoreFight(pick({}), fight({ win: 'red', method: 'Finalização' })).points).toBe(10));
  it('vencedor + método = 15', () => expect(scoreFight(pick({ method: 'sub' }), fight({ win: 'red', method: 'Finalização', round: 2 })).points).toBe(15));
  it('palpite perfeito num nocaute (vencedor + método + round) = 25', () => {
    const s = scoreFight(pick({ method: 'ko', round: 2 }), fight({ win: 'red', method: 'KO/TKO', round: 2 }));
    expect(s.points).toBe(10 + 5 + 5 + 5);
    expect(s.perfect).toBe(true);
  });
  it('round errado: vencedor + método, sem perfeito', () => {
    const s = scoreFight(pick({ method: 'ko', round: 1 }), fight({ win: 'red', method: 'KO/TKO', round: 2 }));
    expect(s).toMatchObject({ points: 15, round: false, perfect: false });
  });
  it('decisão: vencedor + método já é perfeito (não há round) = 20', () => {
    const s = scoreFight(pick({ method: 'dec' }), fight({ win: 'red', method: 'Decisão unânime', round: 3 }));
    expect(s).toMatchObject({ points: 20, perfect: true, round: false });
  });
  it('round só vale se o método também estiver certo', () => {
    const s = scoreFight(pick({ method: 'sub', round: 2 }), fight({ win: 'red', method: 'KO/TKO', round: 2 }));
    expect(s).toMatchObject({ points: 10, round: false });
  });
  it('bônus de zebra (< 35%) e de grande zebra (< 20%)', () => {
    expect(scoreFight(pick({ winner: '2' }), fight({ win: 'blue', odds: [-300, 250] })).points).toBe(10 + 5);
    expect(scoreFight(pick({ winner: '2' }), fight({ win: 'blue', odds: [-900, 600] })).points).toBe(10 + 10);
    expect(scoreFight(pick({ winner: '1' }), fight({ win: 'red', odds: [-300, 250] })).points).toBe(10); // favorito: sem bônus
  });
  it('empate / sem resultado anula a luta', () => expect(scoreFight(pick({}), fight({ win: null })).state).toBe('void'));
  it('sem palpite não pontua', () => expect(scoreFight(undefined, fight({ win: 'red' })).state).toBe('pending'));
});

describe('trava e resumo', () => {
  it('trava quando a luta começou ou o horário passou', () => {
    expect(isLocked(fight({ date: '2099-01-01T00:00Z' }))).toBe(false);
    expect(isLocked(fight({ date: '2020-01-01T00:00Z' }))).toBe(true);
    expect(isLocked(fight({ status: 'in', date: '2099-01-01T00:00Z' }))).toBe(true);
  });
  it('resume acertos e pontos do evento', () => {
    const a = fight({ win: 'red', method: 'Decisão unânime' }); a.id = 'a';
    const b = fight({ win: 'blue' }); b.id = 'b';
    const c = fight({}); c.id = 'c';
    const s = summarize({ a: pick({ method: 'dec' }), b: pick({ winner: '1' }), c: pick({}) }, [a, b, c]);
    expect(s).toMatchObject({ made: 3, scored: 2, pending: 1, hits: 1, points: 20, perfects: 1, methods: 1 });
  });
});

describe('rascunho e salvo', () => {
  const open = (id: string) => ({ ...fight({ date: '2099-01-01T00:00Z' }), id });
  const locked = (id: string) => ({ ...fight({ date: '2020-01-01T00:00Z' }), id });
  it('detecta alterações não salvas (ignorando a data do palpite)', () => {
    expect(isDirty({ a: pick({ at: 1 }) }, { a: pick({ at: 99 }) })).toBe(false);
    expect(isDirty({ a: pick({ method: 'ko' }) }, { a: pick({}) })).toBe(true);
    expect(isDirty({}, { a: pick({}) })).toBe(true);
    expect(isDirty({}, {})).toBe(false);
  });
  it('salva o rascunho das lutas abertas', () => {
    const s = buildSaved({ a: pick({ method: 'ko' }) }, {}, [open('a')], 123);
    expect(s).toEqual({ savedAt: 123, picks: { a: pick({ method: 'ko' }) } });
  });
  it('luta já travada mantém o que estava salvo: não aceita palpite novo nem troca', () => {
    const prev = { a: pick({ winner: '1' }) };
    const s = buildSaved({ a: pick({ winner: '2' }), b: pick({}) }, prev, [locked('a'), locked('b')]);
    expect(s.picks).toEqual(prev); // b (sem palpite salvo antes) fica de fora
  });
  it('palpite apagado do rascunho some do salvo (se a luta ainda está aberta)', () => {
    expect(buildSaved({}, { a: pick({}) }, [open('a')]).picks).toEqual({});
  });
  it('une dois cadernos pegando o palpite mais recente de cada luta', () => {
    const m = mergeSaved(
      { e: { savedAt: 5, picks: { a: pick({ winner: '1', at: 10 }), b: pick({ at: 1 }) } } },
      { e: { savedAt: 9, picks: { a: pick({ winner: '2', at: 20 }) } }, f: { savedAt: 1, picks: { z: pick({ at: 1 }) } } });
    expect(m.e.picks.a.winner).toBe('2');
    expect(m.e.picks.b).toBeDefined();
    expect(m.e.savedAt).toBe(9);
    expect(m.f.picks.z).toBeDefined();
  });
});
