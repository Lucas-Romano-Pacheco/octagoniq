/* Cartões dos juízes (round a round) do UFC Fight Tracker, a fonte do placar ao vivo do UFC.com.
   Não há busca por nome: a página do evento no UFC.com traz o id de cada luta (data-fmid); a luta aponta
   o id do evento no tracker, e o card do evento é casado com a luta da ESPN pelos sobrenomes. */

import type { Scorecards } from '../shared/types.ts';
import { fold } from '../shared/format.ts';
import { HOUR, getJson, getText, remember } from './http.ts';
import { UFC_BASE } from './ufc.ts';

const API = 'https://d29dxerjsp82wz.cloudfront.net/api/v3';
type J = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const last = (n: string) => fold(n).split(/\s+/).pop() ?? '';

/** Endereços prováveis da página do evento: "ufc-330" ou "ufc-fight-night-october-17-2026" (data local, ±1 dia). */
function slugs(name: string, dateIso: string) {
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

/** Cartões de uma luta encerrada por decisão. `red`/`blue` são os nomes da ESPN (o canto é recalculado pelo tracker). */
export function scorecards(eventName: string, eventDate: string, red: string, blue: string): Promise<Scorecards | null> {
  return remember(`scorecards:v1:${fold(red)}:${fold(blue)}:${eventDate.slice(0, 10)}`, 7 * 24 * HOUR, async () => {
    const eventId = await trackerEventId(eventName, eventDate);
    if (!eventId) throw new Error('sem evento');
    const ev = await getJson<J>(`${API}/event/live/${eventId}.json`, 6 * HOUR);
    const card: J[] = ev?.LiveEventDetail?.FightCard ?? [];
    const want = new Set([last(red), last(blue)]);
    const match = card.find(f => (f.Fighters ?? []).every((x: J) => want.has(last(`${x.Name?.FirstName} ${x.Name?.LastName}`))));
    if (!match) throw new Error('luta não encontrada no card');
    const fight = (await getJson<J>(`${API}/fight/live/${match.FightId}.json`, 24 * HOUR))?.LiveFightDetail;
    const rounds: J[] = fight?.Result?.RoundScores ?? [];
    if (!rounds.length) throw new Error('sem cartões');
    // FighterId → canto da ESPN (vermelho = nome `red`)
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
  }).catch(() => null);
}
