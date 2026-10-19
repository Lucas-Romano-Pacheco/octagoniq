import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildScorecards, findFight, slugs } from './tracker.ts';

const load = (n: string) => JSON.parse(readFileSync(new URL(`./__fixtures__/${n}`, import.meta.url), 'utf8'));
const card = load('tracker-event-1317.json').LiveEventDetail.FightCard;
const fight = load('tracker-fight-12910.json').LiveFightDetail;

describe('cartões dos juízes', () => {
  it('acha a luta do card pelos sobrenomes, em qualquer ordem', () => {
    expect(findFight(card, 'Islam Makhachev', 'Ian Machado Garry')?.FightId).toBe(12910);
    expect(findFight(card, 'Ian Machado Garry', 'Islam Makhachev')?.FightId).toBe(12910);
  });
  it('não casa luta de lutadores diferentes', () => {
    expect(findFight(card, 'Islam Makhachev', 'Alguém Qualquer')).toBeUndefined();
  });
  it('monta os cartões round a round (3 juízes, 49-46 para o vermelho)', () => {
    const sc = buildScorecards(fight, 'Islam Makhachev')!;
    expect(sc.judges).toHaveLength(3);
    expect(sc.judges[0]).toMatchObject({ red: 49, blue: 46 });
    expect(sc.judges[0].rounds).toHaveLength(5);
    expect(sc.judges[0].rounds[2]).toMatchObject({ n: 3, red: 9, blue: 10 }); // o round 3 foi do azul
  });
  it('troca os cantos quando o nome "vermelho" da ESPN é o outro lutador', () => {
    const sc = buildScorecards(fight, 'Ian Machado Garry')!;
    expect(sc.judges[0]).toMatchObject({ red: 46, blue: 49 });
  });
  it('sem cartões (luta que não foi a decisão), devolve null', () => {
    expect(buildScorecards({ Result: { RoundScores: [] }, Fighters: [] }, 'x')).toBeNull();
  });
});

describe('endereço do evento no UFC.com', () => {
  it('numerado: ufc-NNN', () => expect(slugs('UFC 330: Makhachev vs. Machado Garry', '2026-08-15T22:00Z')).toEqual(['ufc-330']));
  it('Fight Night: data local (EUA) e o dia anterior e seguinte como reserva', () => {
    const s = slugs('UFC Fight Night: Buckley vs. Malott', '2026-10-17T21:00Z');
    expect(s[0]).toBe('ufc-fight-night-october-17-2026');
    expect(s).toHaveLength(3);
  });
  it('card que vira o dia em UTC continua no dia local', () => {
    expect(slugs('UFC Fight Night: X vs. Y', '2026-11-08T02:00Z')[0]).toBe('ufc-fight-night-november-7-2026');
  });
});
