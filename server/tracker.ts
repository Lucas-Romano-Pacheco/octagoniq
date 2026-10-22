/* Cartões dos juízes (round a round) do UFC Fight Tracker, a fonte do placar ao vivo do UFC.com.
   Não há busca por nome: a página do evento no UFC.com traz o id de cada luta (data-fmid); a luta aponta
   o id do evento no tracker, e o card do evento é casado com a luta da ESPN pelos sobrenomes. */

import type { RoundSide, RoundStat, Scorecards } from '../shared/types.ts';
import { fold } from '../shared/format.ts';
import { HOUR, getJson, getText, remember } from './http.ts';
import { UFC_BASE } from './ufc.ts';

const API = 'https://d29dxerjsp82wz.cloudfront.net/api/v3';
type J = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const last = (n: string) => fold(n).split(/\s+/).pop() ?? '';

/** Endereços prováveis da página do evento: "ufc-330" ou "ufc-fight-night-october-17-2026" (data local, ±1 dia). */
export function slugs(name: string, dateIso: string) {
  const num = name.match(/^UFC (\d{3})\b/)?.[1];
  if (num) return [`ufc-${num}`];
  const base = new Date(dateIso).getTime() - 5 * HOUR; // horário dos EUA: o card principal costuma virar o dia em UTC
  return [0, -1, 1].map(off => {
    const d = new Date(base + off * 24 * HOUR);
    return `ufc-fight-night-${MONTHS[d.getUTCMonth()]}-${d.getUTCDate()}-${d.getUTCFullYear()}`;
  });
}

/** Id do evento no tracker, a partir de uma luta listada na página do UFC.com. 30 dias em cache. */
function trackerEventId(name: string, dateIso: string): Promise<number | null> {
  return remember(`tracker-event:v1:${fold(name)}:${dateIso.slice(0, 10)}`, 30 * 24 * HOUR, async () => {
    for (const slug of slugs(name, dateIso)) {
      const html = await getText(`${UFC_BASE}/event/${slug}`, 24 * HOUR).catch(() => '');
      const fmid = html.match(/data-fmid="(\d+)"/)?.[1];
      if (!fmid) continue;
      const f = await getJson<J>(`${API}/fight/live/${fmid}.json`, 24 * HOUR).catch(() => null);
      const id = f?.LiveFightDetail?.Event?.EventId;
      if (id) return id as number;
    }
    throw new Error('evento não encontrado no tracker'); // não guarda o "não achei" por 30 dias
  }).catch(() => null);
}

/** Luta do card do tracker cujos dois lutadores têm o sobrenome dos nomes da ESPN. */
export function findFight(card: J[], red: string, blue: string): J | undefined {
  const want = new Set([last(red), last(blue)]);
  return card.find(f => (f.Fighters ?? []).length === 2 && (f.Fighters ?? []).every((x: J) => want.has(last(`${x.Name?.FirstName} ${x.Name?.LastName}`))));
}

/** Cartões por juiz e por round, com o canto da ESPN (vermelho = nome `red`); null sem cartões. */
export function buildScorecards(fight: J, red: string): Scorecards | null {
  const rounds: J[] = fight?.Result?.RoundScores ?? [];
  if (!rounds.length) return null;
  const side = new Map<number, 'red' | 'blue'>((fight.Fighters ?? []).map((x: J) => [x.FighterId, last(`${x.Name?.FirstName} ${x.Name?.LastName}`) === last(red) ? 'red' : 'blue']));
  const pair = (fs: J[]) => {
    const o = { red: 0, blue: 0 };
    for (const x of fs ?? []) o[side.get(x.FighterId) ?? 'blue'] = x.Score;
    return o;
  };
  return {
    source: 'UFC Fight Tracker',
    judges: rounds.map(j => {
      const rs = (j.Rounds ?? []).map((r: J) => ({ n: r.RoundNumber, ...pair(r.Fighters) }));
      const tot = rs.reduce((t: { red: number; blue: number }, r: { red: number; blue: number }) => ({ red: t.red + r.red, blue: t.blue + r.blue }), { red: 0, blue: 0 });
      return { name: `${j.JudgeFirstName ?? ''} ${j.JudgeLastName ?? ''}`.trim(), rounds: rs, red: tot.red, blue: tot.blue };
    }),
  };
}

/** Detalhe da luta no tracker (cartões e estatísticas por round). `red`/`blue` são os nomes da ESPN. */
function trackerFight(eventName: string, eventDate: string, red: string, blue: string): Promise<J | null> {
  return remember(`tracker-fight:v1:${fold(red)}:${fold(blue)}:${eventDate.slice(0, 10)}`, 7 * 24 * HOUR, async () => {
    const eventId = await trackerEventId(eventName, eventDate);
    if (!eventId) throw new Error('sem evento');
    const ev = await getJson<J>(`${API}/event/live/${eventId}.json`, 6 * HOUR);
    const card: J[] = ev?.LiveEventDetail?.FightCard ?? [];
    const match = findFight(card, red, blue);
    if (!match) throw new Error('luta não encontrada no card');
    const fight = (await getJson<J>(`${API}/fight/live/${match.FightId}.json`, 24 * HOUR))?.LiveFightDetail;
    if (!fight) throw new Error('sem detalhe');
    return fight;
  }).catch(() => null);
}

const secs = (t?: string) => { const [m, s] = (t ?? '0:00').split(':').map(Number); return (m || 0) * 60 + (s || 0); };

/** Estatísticas round a round, no canto da ESPN; null sem dados. */
export function buildRounds(fight: J, red: string): RoundStat[] | null {
  const list: J[] = fight?.RoundStats ?? [];
  if (list.length !== 2) return null;
  const nameOf = new Map<number, string>((fight.Fighters ?? []).map((x: J) => [x.FighterId, `${x.Name?.FirstName} ${x.Name?.LastName}`]));
  const redStats = list.find(x => last(nameOf.get(x.FighterId) ?? '') === last(red)) ?? list[0];
  const blueStats = list.find(x => x !== redStats)!;
  const side = (r?: J): RoundSide => ({
    sig: r?.SigStrikesLanded ?? 0, sigAtt: r?.SigStrikesAttempted ?? 0, kd: r?.Knockdowns ?? 0,
    td: r?.TakedownsLanded ?? 0, tdAtt: r?.TakedownsAttempted ?? 0, ctrl: secs(r?.ControlTime), subs: r?.SubmissionsAttempted ?? 0,
  });
  const ns = [...new Set([...(redStats.Rounds ?? []), ...(blueStats.Rounds ?? [])].map((r: J) => r.RoundNumber as number))].sort((a, b) => a - b);
  const rounds = ns.map(n => ({ n, red: side(redStats.Rounds?.find((r: J) => r.RoundNumber === n)), blue: side(blueStats.Rounds?.find((r: J) => r.RoundNumber === n)) }));
  return rounds.length && rounds.some(r => r.red.sigAtt + r.blue.sigAtt + r.red.tdAtt + r.blue.tdAtt > 0) ? rounds : null;
}

/** Cartões dos juízes (decisão inteira ou até a interrupção). */
export async function scorecards(eventName: string, eventDate: string, red: string, blue: string): Promise<Scorecards | null> {
  const fight = await trackerFight(eventName, eventDate, red, blue);
  return fight ? buildScorecards(fight, red) : null;
}

/** Estatísticas por round de uma luta (para o gráfico de domínio). */
export async function roundStats(eventName: string, eventDate: string, red: string, blue: string): Promise<RoundStat[] | null> {
  const fight = await trackerFight(eventName, eventDate, red, blue);
  return fight ? buildRounds(fight, red) : null;
}

/** Bônus da noite do UFC (Performance, Luta, KO e Finalização da Noite), pelos nomes dos lutadores. */
export function eventBonuses(eventName: string, eventDate: string): Promise<{ fight: string[][]; performance: string[] } | null> {
  return remember(`bonuses:v1:${fold(eventName)}:${eventDate.slice(0, 10)}`, 24 * HOUR, async () => {
    const id = await trackerEventId(eventName, eventDate);
    if (!id) throw new Error('sem evento');
    const card: J[] = (await getJson<J>(`${API}/event/live/${id}.json`, 6 * HOUR))?.LiveEventDetail?.FightCard ?? [];
    const full = (x: J) => `${x.Name?.FirstName ?? ''} ${x.Name?.LastName ?? ''}`.trim();
    const fight = card.filter(f => f.Result?.FightOfTheNight).map(f => (f.Fighters ?? []).map(full));
    const performance = card.flatMap(f => (f.Fighters ?? []).filter((x: J) => x.PerformanceOfTheNight || x.KOOfTheNight || x.SubmissionOfTheNight).map(full));
    if (!fight.length && !performance.length) throw new Error('sem bônus');
    return { fight, performance };
  }).catch(() => null);
}
