/* Adaptador da ESPN (API pública não documentada, CORS aberto).
   site.api   → scoreboard anual com todos os cards (nomes, cartéis, bandeiras)
   core.api   → estrutura de cada luta, status/método, histórico (eventlog)
   web.api    → bio, estatísticas luta a luta, notícias */

import type { CardSegment, EventDetail, EventListItem, EventStatus, Fight, FightDetail, FightOdds, FightSideStats, FighterRef, HistoryFight, HistoryStats, MethodOdds, NewsItem, SearchHit } from '../shared/types.ts';
import { detailPt, feetInchesToCm, fold, methodPt, slugify, stancePt, toSeconds, weightClassPt } from '../shared/format.ts';
import { HOUR, MIN, getJson, https, remember, settle } from './http.ts';
import { countryInfo } from './countries.ts';

// Respostas da ESPN são grandes e irregulares; tipamos só o que usamos.
type J = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc';
const CORE = 'https://sports.core.api.espn.com/v2/sports/mma';
const WEB = 'https://site.web.api.espn.com/apis/common/v3/sports/mma';

export const headshotUrl = (id: string) => `https://a.espncdn.com/i/headshots/mma/players/full/${id}.png`;

const seriesOf = (name: string): EventListItem['series'] =>
  /^UFC \d+/.test(name) ? 'ppv' : /fight night/i.test(name) ? 'fight-night' : /contender/i.test(name) ? 'dwcs' : 'other';

const idFromRef = (ref?: string) => ref?.match(/events\/(\d+)/)?.[1] ?? '';

/* ---------- Agenda / eventos ---------- */

/** Scoreboard de um ano inteiro (todos os eventos com seus cards). */
function yearBoard(year: number) {
  const current = new Date().getUTCFullYear();
  // ano corrente muda durante eventos ao vivo; anos passados são estáveis
  const ttl = year >= current ? 5 * MIN : 24 * HOUR;
  return getJson<J>(`${SITE}/scoreboard?dates=${year}&limit=200`, ttl);
}

export async function schedule(year: number): Promise<EventListItem[]> {
  const d = await yearBoard(year);
  const cal: J[] = d.leagues?.[0]?.calendar ?? [];
  // horário do card principal = horário da luta principal (última da lista no scoreboard)
  const mainStart = new Map<string, string>();
  for (const e of d.events ?? []) {
    const comps: J[] = e.competitions ?? [];
    const last = comps[comps.length - 1];
    if (last) mainStart.set(String(e.id), last.startDate ?? last.date);
  }
  return cal.map(c => ({
    id: idFromRef(c.event?.$ref),
    name: c.label,
    date: mainStart.get(idFromRef(c.event?.$ref)) ?? c.startDate,
    numbered: /^UFC \d+/.test(c.label),
    series: seriesOf(c.label),
  })).filter(e => e.id);
}

function statusOf(t: J): EventStatus {
  const s = t?.state;
  return s === 'in' ? 'in' : s === 'post' ? 'post' : 'pre';
}

function refFromCompetitor(c: J): FighterRef {
  const a = c.athlete ?? {};
  return {
    espnId: String(c.id),
    name: a.displayName ?? a.fullName ?? '—',
    shortName: a.shortName,
    record: c.records?.[0]?.summary,
    country: countryInfo(a.flag?.alt)?.name ?? a.flag?.alt,
    countryCode: countryInfo(a.flag?.alt)?.code,
    flag: a.flag?.href,
    headshot: headshotUrl(String(c.id)),
    slug: slugify(a.displayName ?? ''),
  };
}

const SEGMENT: Record<string, CardSegment> = { main: 'main', prelims1: 'prelims', prelims2: 'early' };

/** Status da luta (método, round, tempo). Só existe com detalhe no core.api. */
function fightStatus(eventId: string, fightId: string, live: boolean) {
  return getJson<J>(`${CORE}/leagues/ufc/events/${eventId}/competitions/${fightId}/status`, live ? 30_000 : 12 * HOUR);
}

export async function eventDetail(eventId: string): Promise<EventDetail | null> {
  const core = await getJson<J>(`${CORE}/leagues/ufc/events/${eventId}`, 10 * MIN);
  const year = new Date(core.date).getUTCFullYear();
  const board = await yearBoard(year);
  const ev: J = board.events?.find((e: J) => e.id === eventId);
  if (!ev) return null;

  const status = statusOf(ev.status?.type);
  const coreComp = new Map<string, J>((core.competitions ?? []).map((c: J) => [String(c.id), c]));
  const comps: J[] = ev.competitions ?? [];
  const n = comps.length;

  const statuses = await settle(comps.map(c => {
    const st = statusOf(c.status?.type);
    return st === 'pre' ? Promise.resolve(null) : fightStatus(eventId, c.id, st === 'in');
  }));

  const oddsList = await settle(comps.map(c => fightOdds(eventId, String(c.id), statusOf(c.status?.type) === 'pre')));

  const fights: Fight[] = comps.map((c, i) => {
    const cc = coreComp.get(String(c.id));
    const [a, b] = [...c.competitors].sort((x: J, y: J) => x.order - y.order);
    const st = statusOf(c.status?.type);
    const s = statuses[i];
    const r = s?.result;
    const winner = c.competitors.find((x: J) => x.winner);
    const rounds = cc?.format?.regulation?.periods ?? c.format?.regulation?.periods ?? 3;
    return {
      id: String(c.id),
      order: cc?.matchNumber ?? n - i,
      segment: SEGMENT[cc?.cardSegment?.name] ?? 'main',
      weightClass: weightClassPt(c.type?.abbreviation),
      title: /title|championship/i.test(cc?.description ?? '') || (n - i === 1 && rounds === 5 && /^UFC \d+/.test(ev.name)),
      rounds,
      status: st,
      red: refFromCompetitor(a),
      blue: refFromCompetitor(b),
      broadcast: c.broadcasts?.[0]?.names?.[0],
      odds: oddsFor(oddsList[i], String(a.id), String(b.id)),
      date: c.startDate ?? c.date,
      live: st === 'in' && s ? { round: s.period, clock: s.displayClock } : undefined,
      result: st === 'post' && r ? {
        winnerId: winner ? String(winner.id) : null,
        method: methodPt(r.name, r.displayName),
        detail: detailPt(r.description),
        round: s.period,
        clock: s.displayClock,
      } : undefined,
    };
  }).sort((x, y) => x.order - y.order);

  const segmentStart: EventDetail['segmentStart'] = {};
  for (const f of fights) if (f.date && (!segmentStart[f.segment] || f.date < segmentStart[f.segment]!)) segmentStart[f.segment] = f.date;

  const venue = comps[0]?.venue;
  return {
    id: eventId,
    name: ev.name,
    date: segmentStart.main ?? ev.date,  // horário do card principal, como no calendário
    numbered: /^UFC \d+/.test(ev.name),
    series: seriesOf(ev.name),
    status,
    venue: venue?.fullName,
    city: [venue?.address?.city, venue?.address?.state].filter(Boolean).join(', '),
    country: countryInfo(venue?.address?.country)?.name ?? venue?.address?.country,
    fights,
    segmentStart,
  };
}

/* ---------- Odds (DraftKings, via ESPN) ---------- */

const american = (v: J) => { const n = Number(String(v?.american ?? v ?? '').replace('+', '')); return Number.isFinite(n) && n !== 0 ? n : undefined; };

function fightOdds(eventId: string, fightId: string, upcoming: boolean) {
  return getJson<J>(`${CORE}/leagues/ufc/events/${eventId}/competitions/${fightId}/odds`, upcoming ? 15 * MIN : 24 * HOUR).catch(() => null);
}

/** Monta as odds por canto: a ESPN rotula "home/away", então ligamos pelo id do atleta. */
function oddsFor(d: J, redId: string, blueId: string): FightOdds | undefined {
  const o = d?.items?.[0];
  if (!o) return undefined;
  const sides = [o.awayAthleteOdds, o.homeAthleteOdds].filter(Boolean);
  const pick = (id: string) => sides.find((x: J) => String(x.athlete?.$ref ?? '').includes(`/athletes/${id}`));
  const r = pick(redId), b = pick(blueId);
  if (!r && !b) return undefined;
  const ml = (x: J) => american(x?.close?.moneyLine) ?? (typeof x?.moneyLine === 'number' ? x.moneyLine : undefined);
  const methods = (x: J): MethodOdds | undefined => {
    const v = x?.close?.victoryMethod ?? x?.open?.victoryMethod;
    return v ? { ko: american(v.koTkoDq), sub: american(v.submission), dec: american(v.points) } : undefined;
  };
  return {
    provider: o.provider?.name ?? 'Casa de apostas',
    red: ml(r), blue: ml(b),
    redOpen: american(r?.open?.moneyLine), blueOpen: american(b?.open?.moneyLine),
    methods: { red: methods(r), blue: methods(b) },
  };
}

/* ---------- Detalhe de uma luta ---------- */

function sideStats(d: J): FightSideStats | undefined {
  const cats: J[] = d?.splits?.categories ?? [];
  if (!cats.length) return undefined;
  const m = new Map<string, number>();
  for (const c of cats) for (const x of c.stats ?? []) m.set(x.name, Number(x.value ?? x.displayValue) || 0);
  if (!m.get('totalStrikesAttempted') && !m.get('sigStrikesAttempted')) return undefined;
  const g = (k: string) => m.get(k) ?? 0;
  const pair = (zone: 'Head' | 'Body' | 'Leg'): [number, number] =>
    (['Distance', 'Clinch', 'Ground'] as const).reduce<[number, number]>((acc, pos) => [acc[0] + g(`sig${pos}${zone}StrikesLanded`), acc[1] + g(`sig${pos}${zone}StrikesAttempted`)], [0, 0]);
  const pos = (p: 'Distance' | 'Clinch' | 'Ground'): [number, number] =>
    (['Head', 'Body', 'Leg'] as const).reduce<[number, number]>((acc, z) => [acc[0] + g(`sig${p}${z}StrikesLanded`), acc[1] + g(`sig${p}${z}StrikesAttempted`)], [0, 0]);
  return {
    kd: g('knockDowns'),
    sigLanded: g('sigStrikesLanded'), sigAttempted: g('sigStrikesAttempted'),
    totalLanded: g('totalStrikesLanded'), totalAttempted: g('totalStrikesAttempted'),
    tdLanded: g('takedownsLanded'), tdAttempted: g('takedownsAttempted'),
    subAttempts: g('submissions'), reversals: g('reversals'), advances: g('advances'),
    head: pair('Head'), body: pair('Body'), leg: pair('Leg'),
    distance: pos('Distance'), clinch: pos('Clinch'), ground: pos('Ground'),
  };
}

/** Luta completa: dados do card + estatísticas de cada lado + odds. */
export async function fightDetail(eventId: string, fightId: string): Promise<FightDetail | null> {
  const ev = await eventDetail(eventId);
  const fight = ev?.fights.find(f => f.id === fightId);
  if (!ev || !fight) return null;
  const live = fight.status !== 'post';
  // a ESPN publica as estatísticas de uma luta encerrada horas depois (antes disso vêm vazias): nos 3 dias
  // seguintes ao evento a resposta vale só 10 min, para uma resposta vazia não ficar guardada por 24 h
  const recent = Date.now() - Date.parse(ev.date) < 72 * HOUR;
  const ttl = live ? 30_000 : recent ? 10 * MIN : 24 * HOUR;
  const stat = (id: string) => getJson<J>(`${CORE}/leagues/ufc/events/${eventId}/competitions/${fightId}/competitors/${id}/statistics`, ttl).catch(() => null);
  const [rs, bs] = fight.status === 'pre' ? [null, null] : await Promise.all([stat(fight.red.espnId), stat(fight.blue.espnId)]);
  return {
    eventId, eventName: ev.name, fight,
    red: { ...fight.red, stats: sideStats(rs) },
    blue: { ...fight.blue, stats: sideStats(bs) },
    seconds: toSeconds(fight.result?.round, fight.result?.clock),
  };
}

/* ---------- Lutador ---------- */

export interface EspnAthlete {
  id: string; name: string; nickname?: string; age?: number; dob?: string;
  heightCm?: number; reachCm?: number; weightLb?: number; stance?: string; team?: string;
  division?: string; country?: string; countryCode?: string; flag?: string; status?: string; style?: string;
  record?: { w: number; l: number; d: number }; url?: string;
}

export async function athlete(id: string): Promise<EspnAthlete> {
  const d = await getJson<J>(`${WEB}/athletes/${id}`, 6 * HOUR);
  const a = d.athlete;
  const wld: string | undefined = a.statsSummary?.statistics?.find((s: J) => s.name === 'wins-losses-draws')?.displayValue;
  const [w, l, dr] = (wld ?? '').split('-').map(Number);
  const dob = a.displayDOB ? (() => { const [dd, m, y] = a.displayDOB.split('/'); /* ESPN usa dia/mês/ano */ return `${y}-${m.padStart(2, '0')}-${dd.padStart(2, '0')}`; })() : undefined;
  return {
    id,
    name: a.displayName,
    nickname: a.nickname,
    age: a.age,
    dob,
    heightCm: feetInchesToCm(a.displayHeight),
    reachCm: feetInchesToCm(a.displayReach),
    weightLb: parseFloat(a.displayWeight) || undefined,
    stance: stancePt(a.stance?.text),
    team: a.association?.name,
    division: weightClassPt(a.weightClass?.text),
    country: countryInfo(a.citizenship ?? a.flag?.alt)?.name ?? a.citizenship ?? a.flag?.alt,
    countryCode: countryInfo(a.citizenship ?? a.flag?.alt)?.code ?? countryInfo(a.flag?.alt)?.code,
    flag: a.flag?.href,
    status: a.status?.name,
    style: a.displayFightingStyle,
    record: wld ? { w, l, d: dr } : undefined,
    url: a.links?.find((x: J) => x.rel?.includes('playercard'))?.href,
  };
}

/** Estatísticas luta a luta, indexadas por id do evento. */
async function perFightStats(id: string): Promise<Map<string, HistoryStats>> {
  const d = await getJson<J>(`${WEB}/athletes/${id}/stats`, 6 * HOUR).catch(() => null);
  const out = new Map<string, HistoryStats>();
  if (!d?.categories) return out;
  const cat = (name: string) => d.categories.find((c: J) => fold(c.displayName ?? '') === name);
  const striking = cat('striking'), clinch = cat('clinch'), ground = cat('ground');
  const idx = (c: J, label: string) => c?.labels?.findIndex((l: string) => l.trim() === label) ?? -1;
  const num = (v?: string) => parseFloat(v ?? '') || 0;
  const pair = (v?: string) => { const [l, a] = (v ?? '0/0').split('/').map(Number); return [l || 0, a || 0]; };
  const rows = (c: J) => new Map<string, string[]>((c?.statistics ?? []).map((r: J) => [String(r.eventId), r.stats]));
  const S = rows(striking), C = rows(clinch), G = rows(ground);

  for (const [ev, s] of S) {
    const c = C.get(ev) ?? [], g = G.get(ev) ?? [];
    if (!num(s[idx(striking, 'TSA')]) && !num(s[idx(striking, 'SSA')])) continue; // sem dados (eventos fora do UFC)
    const [dbl] = pair(s[idx(striking, 'SDBL/A')]), [dhl] = pair(s[idx(striking, 'SDHL/A')]), [dll] = pair(s[idx(striking, 'SDLL/A')]);
    out.set(ev, {
      sigLanded: num(s[idx(striking, 'SSL')]),
      sigAttempted: num(s[idx(striking, 'SSA')]),
      totalLanded: num(s[idx(striking, 'TSL')]),
      totalAttempted: num(s[idx(striking, 'TSA')]),
      kd: num(s[idx(striking, 'KD')]),
      tdLanded: num(c[idx(clinch, 'TDL')]),
      tdAttempted: num(c[idx(clinch, 'TDA')]),
      subAttempts: num(g[idx(ground, 'SM')]),
      head: dhl + num(c[idx(clinch, 'SCHL')]) + num(g[idx(ground, 'SGHL')]),
      body: dbl + num(c[idx(clinch, 'SCBL')]) + num(g[idx(ground, 'SGBL')]),
      leg: dll + num(c[idx(clinch, 'SCLL')]) + num(g[idx(ground, 'SGLL')]),
    });
  }
  return out;
}

const eventName = (ref: string) =>
  getJson<J>(https(ref), 24 * HOUR).then(e => ({ name: e.name as string, date: e.date as string }));

const athleteName = (ref: string) =>
  getJson<J>(https(ref), 24 * HOUR).then(a => {
    const c = countryInfo(a.flag?.alt);
    return { name: a.displayName as string, flag: a.flag?.href as string | undefined, country: c?.name ?? (a.flag?.alt as string | undefined), countryCode: c?.code };
  });

/** Histórico completo: eventlog (páginas) → luta, status e adversário de cada item. */
export function history(id: string): Promise<HistoryFight[]> {
  return remember(`history:${id}`, 2 * HOUR, async () => {
    const first = await getJson<J>(`${CORE}/athletes/${id}/eventlog?limit=100`, 2 * HOUR);
    const items: J[] = first.events?.items ?? [];
    const [stats, titles] = await Promise.all([perFightStats(id), titleFightIds(id)]);

    const fights = await settle(items.map(async (it): Promise<HistoryFight | null> => {
      const comp = await getJson<J>(https(it.competition.$ref), it.played ? 24 * HOUR : 30 * MIN);
      const me = comp.competitors.find((c: J) => String(c.id) === id);
      const opp = comp.competitors.find((c: J) => String(c.id) !== id);
      if (!opp) return null;
      const [ev, on, st] = await Promise.all([
        eventName(it.event.$ref),
        athleteName(opp.athlete.$ref).catch(() => ({ name: '—', flag: undefined, country: undefined, countryCode: undefined })),
        it.played ? getJson<J>(https(comp.status.$ref), 24 * HOUR).catch(() => null) : Promise.resolve(null),
      ]);
      const r = st?.result;
      const method = r ? methodPt(r.name, r.displayName) : undefined;
      const outcome: HistoryFight['outcome'] = !it.played ? 'pending'
        : me?.winner ? 'W' : opp.winner ? 'L'
        : method === 'Sem resultado' ? 'NC' : 'D';
      const eventId = String(comp.$ref ?? '').match(/events\/(\d+)/)?.[1] ?? idFromRef(it.event.$ref);
      const rounds = comp.format?.regulation?.periods;
      return {
        eventId,
        fightId: String(comp.id),
        eventName: ev.name,
        date: comp.date ?? ev.date,
        opponent: { espnId: String(opp.id), name: on.name, flag: on.flag, country: on.country, countryCode: on.countryCode, headshot: headshotUrl(String(opp.id)), slug: slugify(on.name) },
        outcome,
        method,
        detail: detailPt(r?.description),
        round: st?.period,
        clock: st?.displayClock,
        weightClass: weightClassPt(comp.type?.abbreviation ?? comp.type?.text),
        title: titles.has(String(comp.id)) || (!it.played && rounds === 5 && /^UFC \d+/.test(ev.name)),
        seconds: toSeconds(st?.period, st?.displayClock),
        stats: stats.get(eventId),
      };
    }));
    return fights.filter((f): f is HistoryFight => !!f).sort((a, b) => b.date.localeCompare(a.date));
  });
}

const overview = (id: string) => getJson<J>(`${WEB}/athletes/${id}/overview`, 1 * HOUR).catch(() => null);

/** uids "s:3301~l:3321~e:<evento>~c:<luta>" das disputas de cinturão do atleta. */
async function titleFightIds(id: string): Promise<Set<string>> {
  const d = await overview(id);
  return new Set<string>((d?.titleFights ?? []).map((uid: string) => uid.match(/~c:(\d+)/)?.[1]).filter(Boolean));
}

export async function news(id: string): Promise<NewsItem[]> {
  const d = await overview(id);
  return (d?.news ?? []).slice(0, 8).map((n: J) => ({
    title: n.headline,
    url: n.links?.web?.href,
    date: n.published ?? n.lastModified,
    image: n.images?.[0]?.url,
    source: 'ESPN',
  })).filter((n: NewsItem) => n.url);
}

/* ---------- Busca ---------- */

/* A busca v2 é a que encontra os atletas certos ("Anderson Silva" na v3 devolve outro lutador).
   Ela mistura esportes, então filtramos por sport === "mma". */
/** Nomes que diferem por no máximo 2 letras (distância de edição), ignorando acentos e caixa. */
function nearName(a: string, b: string) {
  const x = fold(a), y = fold(b);
  if (Math.abs(x.length - y.length) > 2) return false;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length] <= 2;
}

export async function search(q: string, limit = 8): Promise<SearchHit[]> {
  if (q.trim().length < 2) return [];
  const d = await getJson<J>(`https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(q)}&limit=40&type=player`, 6 * HOUR);
  const contents: J[] = (d.results ?? []).find((r: J) => r.type === 'player')?.contents ?? [];
  const hits = contents
    .filter(c => c.sport === 'mma')
    .map(c => {
      const id = String(c.uid ?? '').match(/~a:(\d+)/)?.[1] ?? '';
      return { espnId: id, name: c.displayName as string, slug: slugify(c.displayName ?? ''), headshot: c.image?.default ?? headshotUrl(id), hasImage: !!c.image?.default };
    })
    .filter(h => h.espnId);
  // a ESPN tem cadastros duplicados com o nome digitado errado e sem foto ("Islam Makhackev");
  // descarta o sem foto quando há um com foto de nome quase igual
  return hits
    .filter(h => h.hasImage || !hits.some(o => o.hasImage && o !== h && nearName(o.name, h.name)))
    .slice(0, limit)
    .map(({ hasImage: _, ...h }) => h);
}

/** Busca v3: pior em geral, mas encontra alguns atletas que a v2 não indexa. */
async function searchV3(q: string): Promise<SearchHit[]> {
  const d = await getJson<J>(`https://site.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(q)}&limit=10&type=player&sport=mma`, 6 * HOUR);
  return (d.items ?? []).map((x: J) => ({ espnId: String(x.id), name: x.displayName, slug: slugify(x.displayName), headshot: x.headshot?.href }));
}

/** Resolve um nome (vindo do UFC.com) para o id ESPN. Só aceita nome equivalente; com homônimos, desempata
    pelo cartel oficial (se conhecido), depois pela divisão e por fim pelo número de lutas (o atleta do UFC costuma
    ter mais lutas que um homônimo amador). Sem correspondência segura, devolve undefined. */
export async function resolveEspnId(name: string, record?: { w: number; l: number; d: number }, division?: string): Promise<string | undefined> {
  const slug = slugify(name);
  const match = (hs: SearchHit[]) => hs.filter(h => h.slug === slug || fold(h.name) === fold(name));
  let same = match(await search(name, 10).catch(() => [] as SearchHit[]));
  if (!same.length) same = match(await searchV3(name).catch(() => [] as SearchHit[])); // a v2 às vezes não indexa estreantes
  if (same.length <= 1) return same[0]?.espnId;
  const athletes = await settle(same.map(h => athlete(h.espnId)));
  const total = (r: { w: number; l: number; d: number }) => r.w + r.l + r.d;
  const scored = same.map((h, i) => {
    const a = athletes[i], r = a?.record;
    const diff = !record ? 0 : r ? Math.abs(r.w - record.w) + Math.abs(r.l - record.l) + Math.abs(r.d - record.d) : 99;
    const sameDiv = division && a?.division === division ? 0 : 1;
    return { id: h.espnId, diff, sameDiv, size: r ? total(r) : 0 };
  }).sort((a, b) => a.diff - b.diff || a.sameDiv - b.sameDiv || b.size - a.size);
  return scored[0].id;
}
