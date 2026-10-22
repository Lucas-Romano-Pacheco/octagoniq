import { describe, expect, it } from 'vitest';
import type { EventDetail, Fight } from '@shared/types';
import { buildStories } from './stories.ts';

const f = (id: string, order: number, o: { win?: '1' | '2'; method?: string; round?: number; clock?: string; odds?: [number, number] }): Fight => ({
  id, order, segment: 'main', weightClass: 'Leve', title: false, rounds: 3, status: 'post',
  red: { espnId: `${id}-1`, name: `Ana Rubro${id}`, slug: 'r' }, blue: { espnId: `${id}-2`, name: `Bia Azul${id}`, slug: 'b' },
  odds: o.odds ? { provider: 'x', red: o.odds[0], blue: o.odds[1] } : undefined,
  result: { winnerId: `${id}-${o.win ?? '1'}`, method: o.method ?? 'KO/TKO', round: o.round ?? 1, clock: o.clock ?? '2:00' },
}) as Fight;

const ev = (fights: Fight[]) => ({ id: 'e', name: 'UFC 1', date: '2026-10-17T00:00:00Z', status: 'post', fights, segmentStart: {} }) as unknown as EventDetail;

describe('resumo da noite', () => {
  const fights = [
    f('a', 1, { method: 'Decisão unânime', round: 5, clock: '5:00' }),
    f('b', 2, { win: '2', odds: [-400, 320], round: 2, clock: '1:00' }),   // zebra (azul com ~22%)
    f('c', 3, { method: 'Finalização', round: 1, clock: '0:45' }),          // a mais rápida
  ];
  it('capa, luta principal, zebra, finalização mais rápida e fim, nessa ordem', () => {
    expect(buildStories(ev(fights)).map(s => s.kind)).toEqual(['cover', 'main', 'upset', 'fastest', 'end']);
  });
  it('a mais rápida é a interrupção com menos tempo, e decisão não entra', () => {
    const s = buildStories(ev(fights)).find(x => x.kind === 'fastest');
    expect(s && s.kind === 'fastest' && [s.fight.id, s.seconds]).toEqual(['c', 45]);
  });
  it('bônus casam pelos sobrenomes; "você" só entra com luta pontuada', () => {
    const s = buildStories(ev(fights), { bonus: { fight: [['Ana Rubrob', 'Bia Azulb']], performance: ['Bia Azulc'] }, you: { points: 0, hits: 0, scored: 0 } });
    const b = s.find(x => x.kind === 'bonus');
    expect(b && b.kind === 'bonus' && [b.fotn.map(x => x.id), b.potn.map(x => x.espnId)]).toEqual([['b'], ['c-2']]);
    expect(s.some(x => x.kind === 'you')).toBe(false);
  });
  it('evento sem resultado não tem resumo', () => expect(buildStories(ev([]))).toEqual([]));
});
