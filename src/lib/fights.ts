import type { Fight, RoundSide, RoundStat } from '@shared/types';
import { fairProbs } from '@shared/format';

/* Contas sobre as lutas de um card, compartilhadas pelo resumo do evento e pela home. */

/** Segundos de luta a partir do round e do relógio em que terminou (rounds de 5 min). */
export const fightSeconds = (f: Fight) => {
  const r = f.result;
  if (!r?.round || !r.clock) return undefined;
  const [m, s] = r.clock.split(':').map(Number);
  return (r.round - 1) * 300 + m * 60 + (s || 0);
};

/** Chance que as odds davam ao vencedor (sem a margem da casa); undefined sem odds ou sem vencedor. */
export function winnerChance(f: Fight) {
  const p = fairProbs(f.odds?.red, f.odds?.blue);
  const r = f.result;
  if (!p || !r?.winnerId) return undefined;
  return r.winnerId === f.red.espnId ? p[0] : r.winnerId === f.blue.espnId ? p[1] : undefined;
}

/** Zebra: o vencedor tinha menos de 35% de chance. */
export const isUpset = (f: Fight) => (winnerChance(f) ?? 1) < 0.35;

export function cardSummary(fights: Fight[]) {
  const done = fights.filter(f => f.result);
  const count = (re: RegExp) => done.filter(f => re.test(f.result!.method)).length;
  const secs = done.map(fightSeconds).filter((x): x is number => x !== undefined);
  return {
    done: done.length,
    ko: count(/KO/), sub: count(/Finaliza/), dec: count(/Decis/),
    r1: done.filter(f => f.result!.round === 1 && !/Decis/.test(f.result!.method)).length,
    upsets: done.filter(isUpset).length,
    avgSeconds: secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : undefined,
    /** a maior zebra: o vencedor com a menor chance pelas odds */
    biggestUpset: done.filter(isUpset).sort((a, b) => (winnerChance(a) ?? 1) - (winnerChance(b) ?? 1))[0],
  };
}

const surname = (n: string) => n.trim().split(/\s+/).pop()!.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Lutas do card que levaram o bônus de luta da noite (os bônus vêm como pares de nomes do UFC Fight Tracker). */
export function bonusFightIds(fights: Fight[], pairs: string[][]): string[] {
  return pairs.map(pair => fights.find(f => pair.every(n => [f.red.name, f.blue.name].some(x => surname(x) === surname(n))))?.id)
    .filter((id): id is string => !!id);
}

/** Resultado da luta da noite para a pontuação: undefined enquanto o evento não acabou ou os bônus não chegaram. */
export const fotnAwarded = (ev: { status: string; fights: Fight[] } | undefined, bonus: { fight: string[][] } | undefined) =>
  ev && ev.status === 'post' && bonus ? bonusFightIds(ev.fights, bonus.fight) : undefined;

/** Peso de cada ação no domínio de um round: golpe significativo 1, knockdown 8, queda 4, finalização tentada 2,
    cada 15 s de controle 1. É uma régua simples para o gráfico, não o critério dos juízes. */
const EDGE_WEIGHTS = { sig: 1, kd: 8, td: 4, subs: 2, ctrlPer: 15 } as const;
const roundScore = (s: RoundSide) => s.sig * EDGE_WEIGHTS.sig + s.kd * EDGE_WEIGHTS.kd + s.td * EDGE_WEIGHTS.td + s.subs * EDGE_WEIGHTS.subs + s.ctrl / EDGE_WEIGHTS.ctrlPer;
/** Vantagem num round: positiva para o vermelho, negativa para o azul. */
export const roundEdge = (r: RoundStat) => roundScore(r.red) - roundScore(r.blue);

