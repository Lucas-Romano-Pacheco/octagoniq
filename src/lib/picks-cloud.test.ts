import { describe, expect, it } from 'vitest';
import { diffEvent, fromRows, toRow, type Row } from './picks-cloud.ts';
import type { Pick } from './picks.ts';

const p = (o: Partial<Pick>): Pick => ({ winner: '1', at: 1000, ...o });

describe('palpites na nuvem', () => {
  it('converte um palpite em linha da tabela', () => {
    expect(toRow('u', 'e', 'f', p({ method: 'ko', round: 2 }), 5000)).toEqual({ user_id: 'u', event_id: 'e', fight_id: 'f', winner: '1', method: 'ko', round: 2, updated_at: new Date(5000).toISOString() });
    expect(toRow('u', 'e', 'f', p({}), 0)).toMatchObject({ method: null, round: null });
  });
  it('converte linhas de volta, com a data do palpite e a do evento (a mais recente)', () => {
    const rows: Row[] = [
      { user_id: 'u', event_id: 'e', fight_id: 'a', winner: '1', method: 'sub', round: 3, updated_at: new Date(2000).toISOString() },
      { user_id: 'u', event_id: 'e', fight_id: 'b', winner: '2', method: null, round: null, updated_at: new Date(9000).toISOString() },
    ];
    const b = fromRows(rows);
    expect(b.e.savedAt).toBe(9000);
    expect(b.e.picks.a).toEqual({ winner: '1', method: 'sub', round: 3, at: 2000 });
    expect(b.e.picks.b).toEqual({ winner: '2', method: undefined, round: undefined, at: 9000 });
  });
  it('só envia o que mudou e apaga o que sumiu', () => {
    const prev = { savedAt: 1, picks: { a: p({}), b: p({ winner: '2' }), c: p({}) } };
    const next = { savedAt: 2, picks: { a: p({}), b: p({ winner: '1' }), d: p({}) } };
    const d = diffEvent(next, prev);
    expect(d.upsert.map(x => x.id).sort()).toEqual(['b', 'd']);
    expect(d.remove).toEqual(['c']);
  });
  it('sem versão anterior, tudo sobe', () => {
    expect(diffEvent({ savedAt: 1, picks: { a: p({}) } }).upsert).toHaveLength(1);
  });
});
