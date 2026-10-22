import type { EventDetail, Fight, FighterRef } from '@shared/types';
import { bonusFightIds, cardSummary, fightSeconds, winnerChance } from './fights';

/* Resumo da noite em cartões (D5): quais cartões entram e o que cada um mostra, a partir do card encerrado e dos
   bônus do UFC. Função pura (testada em stories.test.ts); a interface fica em components/NightStories.tsx. */

export type Story =
  | { kind: 'cover'; ko: number; sub: number; dec: number; fights: number }
  | { kind: 'main'; fight: Fight; winner: FighterRef; loser: FighterRef }
  | { kind: 'upset'; fight: Fight; winner: FighterRef; loser: FighterRef; chance: number }
  | { kind: 'fastest'; fight: Fight; winner: FighterRef; loser: FighterRef; seconds: number }
  | { kind: 'bonus'; fotn: Fight[]; potn: FighterRef[] }
  | { kind: 'you'; points: number; hits: number; scored: number; pos?: number; of?: number }
  | { kind: 'crowd'; top: { name: string; points: number }[] }
  | { kind: 'end' };

const sides = (f: Fight) => {
  const red = f.result?.winnerId === f.red.espnId;
  return { winner: red ? f.red : f.blue, loser: red ? f.blue : f.red };
};
const surname = (n: string) => n.trim().split(/\s+/).pop()!.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export interface StoryExtras {
  bonus?: { fight: string[][]; performance: string[] };
  you?: { points: number; hits: number; scored: number; pos?: number; of?: number };
  crowd?: { name: string; points: number }[];
}

export function buildStories(ev: EventDetail, x: StoryExtras = {}): Story[] {
  const done = ev.fights.filter(f => f.status === 'post' && f.result?.winnerId);
  if (!done.length) return [];
  const s = cardSummary(ev.fights);
  const out: Story[] = [{ kind: 'cover', ko: s.ko, sub: s.sub, dec: s.dec, fights: s.done }];

  const main = [...done].sort((a, b) => a.order - b.order)[0];
  if (main) out.push({ kind: 'main', fight: main, ...sides(main) });

  const up = s.biggestUpset;
  const chance = up && winnerChance(up);
  if (up && chance !== undefined && up.id !== main?.id) out.push({ kind: 'upset', fight: up, ...sides(up), chance });

  const finishes = done.filter(f => !/decis/i.test(f.result!.method)).map(f => ({ f, t: fightSeconds(f) })).filter((x): x is { f: Fight; t: number } => x.t !== undefined);
  const fast = finishes.sort((a, b) => a.t - b.t)[0];
  if (fast) out.push({ kind: 'fastest', fight: fast.f, ...sides(fast.f), seconds: fast.t });

  if (x.bonus) {
    const ids = bonusFightIds(ev.fights, x.bonus.fight);
    const fotn = ev.fights.filter(f => ids.includes(f.id));
    const all = ev.fights.flatMap(f => [f.red, f.blue]);
    const potn = x.bonus.performance.map(n => all.find(p => surname(p.name) === surname(n))).filter((p): p is FighterRef => !!p);
    if (fotn.length || potn.length) out.push({ kind: 'bonus', fotn, potn });
  }
  if (x.you && x.you.scored > 0) out.push({ kind: 'you', ...x.you });
  if (x.crowd && x.crowd.length >= 2) out.push({ kind: 'crowd', top: x.crowd.slice(0, 3) });
  out.push({ kind: 'end' });
  return out;
}
