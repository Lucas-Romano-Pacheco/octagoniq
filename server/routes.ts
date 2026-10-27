/* Rotas do BFF (/api/*). Independentes de framework: recebem a URL e devolvem
   { status, body, maxAge }. Usadas pelo plugin do Vite (dev) e por server/index.ts (prod). */

import type { BookedMap, DivisionAverages, EventDetail, EventListItem, FighterBio, FighterProfile, RankingsMeta } from '../shared/types.ts';
import { fold, slugify } from '../shared/format.ts';
import * as espn from './espn.ts';
import * as ufc from './ufc.ts';
import * as bfo from './bfo.ts';
import * as tracker from './tracker.ts';
import * as wiki from './wiki.ts';
import * as elo from './elo.ts';
import { UpstreamError, remember, settle, MIN, HOUR } from './http.ts';
import { captureError, traced } from './telemetry.ts';

export interface ApiResponse { status: number; body: unknown; maxAge: number }

type Handler = (params: Record<string, string>, query: URLSearchParams) => Promise<ApiResponse>;
const ok = (body: unknown, maxAge = 60): ApiResponse => ({ status: 200, body, maxAge });
const notFound = (msg: string): ApiResponse => ({ status: 404, body: { error: msg }, maxAge: 0 });

const thisYear = () => new Date().getUTCFullYear();

/* A ESPN apaga as odds semanas depois da luta: para lutas encerradas sem odds, busca o histórico do BestFightOdds. */
async function withHistoricalOdds(ev: EventDetail): Promise<EventDetail> {
  const fights = await Promise.all(ev.fights.map(async f => {
    if (f.odds || f.status !== 'post') return f;
    // sem resultado = erro: assim o "não achei" não fica 7 dias no cache e é tentado de novo depois
    const odds = await remember(`bfo-fight:v2:${f.id}`, 7 * 24 * HOUR, async () => {
      const o = await bfo.historicalOdds(f.red.name, f.blue.name, f.date ?? ev.date);
      if (!o) throw new Error('sem odds no BFO');
      return o;
    }).catch(() => undefined);
    return odds ? { ...f, odds } : f;
  }));
  return { ...ev, fights };
}

/** Evento completo (títulos + odds históricas). Única função que grava a chave `event:v6:id`: as rotas do evento
    e da luta compartilhavam a chave com conteúdos diferentes, e quem chegava primeiro deixava o cache sem odds. */
export const eventFull = (id: string) =>
  remember(`event:v7:${id}`, 8_000, async () => { const d = await espn.eventDetail(id); return d && withMainCutouts(await withHistoricalOdds(await withTitles(d))); });

/** Recortes de corpo inteiro (UFC.com) da luta principal, para o topo do evento em estilo pôster. */
async function withMainCutouts(ev: EventDetail): Promise<EventDetail> {
  const main = ev.fights.find(f => f.order === 1) ?? ev.fights[0];
  if (!main) return ev;
  const [rb, bb] = await Promise.all([main.red, main.blue].map(f => ufc.athletePage(f.slug).then(p => p?.bio.bodyImage).catch(() => undefined)));
  return { ...ev, fights: ev.fights.map(f => (f === main ? { ...f, red: { ...f.red, bodyImage: rb }, blue: { ...f.blue, bodyImage: bb } } : f)) };
}

/* A ESPN não marca disputa de cinturão: luta de 5 rounds com o campeão atual da divisão conta como título. */
async function withTitles(ev: EventDetail): Promise<EventDetail> {
  const r = await ufc.rankings().catch(() => null);
  if (!r) return ev;
  const champs = new Set(r.divisions.filter(d => d.champion).map(d => fold(d.champion!.name)));
  const isChamp = (n: string) => champs.has(fold(n));
  return { ...ev, fights: ev.fights.map(f => ({ ...f, title: f.title || (f.rounds === 5 && (isChamp(f.red.name) || isChamp(f.blue.name))) })) };
}

export async function upcoming(limit: number) {
  const now = Date.now();
  const lists = await Promise.all([espn.schedule(thisYear()), espn.schedule(thisYear() + 1).catch(() => [] as EventListItem[])]);
  // um evento segue "próximo" até ~8h depois do início (cards longos)
  return lists.flat().filter(e => new Date(e.date).getTime() > now - 8 * 3600_000).slice(0, limit);
}

const retry = <T>(fn: () => Promise<T>) => fn().catch(() => new Promise(res => setTimeout(res, 700)).then(fn));

/** Perfil completo: UFC.com (bio e estatísticas oficiais) + ESPN (histórico, notícias). Cacheado 30 min, com SWR e disco. */
export function fighterProfile(slug: string, espnHint?: string | null): Promise<FighterProfile | null> {
  // a versão na chave invalida perfis salvos com um formato antigo
  return remember(`fighter:v5:${slug}`, 30 * MIN, async () => {
    const page = await ufc.athletePage(slug).catch(() => null);
    const guessName = page?.bio.name ?? slug.replace(/-/g, ' ');
    // o nome do UFC.com e o da ESPN às vezes diferem ("Muhammad Saidov" × "Muhammad Said"): sem achar pelo nome da
    // página, tenta o nome do endereço (o slug), sempre com a checagem de cartel da busca
    const slugName = slug.replace(/-/g, ' ');
    const espnId = espnHint || await espn.resolveEspnId(guessName, page?.bio.record)
      || (fold(slugName) !== fold(guessName) ? await espn.resolveEspnId(slugName, page?.bio.record) : null);
    if (!page && !espnId) return null;

    const [ea, hist, news] = espnId
      ? await Promise.all([
          // uma falha passageira da ESPN deixaria o perfil 30 min sem país e sem bio: tenta de novo antes de desistir
          retry(() => espn.athlete(espnId)).catch(() => null),
          retry(() => espn.history(espnId)).catch(() => []),
          espn.news(espnId).catch(() => []),
        ])
      : [null, [], []];

    const u = page?.bio ?? {};
    const bio: FighterBio = {
      name: u.name ?? ea?.name ?? guessName,
      nickname: u.nickname ?? ea?.nickname,
      slug: page ? slug : slugify(ea?.name ?? slug),
      espnId: espnId ?? undefined,
      division: u.division ?? ea?.division,
      rankLabel: u.rankLabel,
      p4pRank: u.p4pRank,
      status: u.status ?? ea?.status,
      age: ea?.age ?? u.age,
      dob: ea?.dob,
      heightCm: u.heightCm ?? ea?.heightCm,
      weightKg: u.weightKg,
      reachCm: u.reachCm ?? ea?.reachCm,
      legReachCm: u.legReachCm,
      stance: ea?.stance,
      style: u.style ?? ea?.style,
      team: u.team ?? ea?.team,
      hometown: u.hometown,
      country: ea?.country,
      countryCode: ea?.countryCode,
      flag: ea?.flag,
      debut: u.debut,
      record: ea?.record ?? u.record ?? { w: 0, l: 0, d: 0 },
      headshot: espnId ? espn.headshotUrl(espnId) : undefined,
      bodyImage: u.bodyImage,
      ufcUrl: u.ufcUrl,
      espnUrl: ea?.url,
    };
    // odds de cada luta do histórico: uma página do BestFightOdds cobre a carreira inteira
    const lines = await bfo.fighterLines(bio.name).catch(() => []);
    for (const h of hist) {
      const l = bfo.matchLine(lines, h.opponent.name, h.date);
      if (l && (l.close ?? l.open)) h.odds = { ml: l.close ?? l.open, oppMl: l.oppClose ?? l.oppOpen, provider: 'BestFightOdds' };
    }
    // o UFC.com às vezes publica a página do atleta sem os números (ex.: Jack Della Maddalena em out/2026):
    // nesse caso, as médias de carreira saem das lutas na ESPN, e as vitórias por método continuam as do UFC.com
    let stats = page?.stats ?? {};
    if (stats.slpm === undefined && espnId) {
      const derived = await espn.careerFromFights(espnId, hist).catch(() => null);
      if (derived) stats = { ...derived, winsBy: stats.winsBy ?? derived.winsBy };
    } else if (page) stats = { ...stats, source: 'ufc' };
    const profile: FighterProfile = {
      bio,
      stats,
      history: hist.filter(h => h.outcome !== 'pending'),
      nextFight: hist.filter(h => h.outcome === 'pending').sort((a, b) => a.date.localeCompare(b.date))[0],
      news,
      sources: [page ? 'UFC.com' : null, ea ? 'ESPN' : null].filter((s): s is string => !!s),
    };
    return profile;
  });
}

const officialRankings = () => remember('rankings', 1 * HOUR, () => ufc.rankings());

/** Bandeira, cartel e id ESPN de cada ranqueado. ~190 lutadores × 2 chamadas, então fica 12 h em cache (disco). */
export function rankingsMeta(): Promise<RankingsMeta> {
  return remember('rankings-meta:v3', 12 * HOUR, async () => {
    const r = await officialRankings();
    const people = new Map<string, { name: string; division?: string }>();
    for (const d of r.divisions) {
      const division = d.p4p ? undefined : d.name;
      if (d.champion) people.set(d.champion.slug, { name: d.champion.name, division });
      for (const e of d.entries) if (!people.get(e.slug)?.division) people.set(e.slug, { name: e.name, division });
    }
    const out: RankingsMeta = {};
    await settle([...people].map(async ([slug, { name, division }]) => {
      const id = await espn.resolveEspnId(name, undefined, division);
      if (!id) return;
      const a = await espn.athlete(id);
      out[slug] = { espnId: id, record: a.record && `${a.record.w}-${a.record.l}-${a.record.d}`, country: a.country, countryCode: a.countryCode };
    }));
    return out;
  });
}

const AVG_KEYS = ['slpm', 'sapm', 'strAcc', 'strDef', 'tdAvg', 'tdAcc', 'tdDef', 'subAvg', 'kdAvg'] as const;

/** Média dos ranqueados de uma divisão (nome em pt-BR, como no UFC.com: "Meio-médio", "Mosca (F)"). 24 h em cache. */
function divisionAverages(name: string): Promise<DivisionAverages | null> {
  return remember(`divavg:v2:${fold(name)}`, 24 * HOUR, async () => {
    const d = (await officialRankings()).divisions.find(x => !x.p4p && fold(x.name) === fold(name));
    if (!d) return null;
    const people = [...(d.champion ? [d.champion] : []), ...d.entries];
    const pages = await settle(people.map(p => ufc.athletePage(p.slug)));
    const rows = people.map((p, i) => ({ slug: p.slug, stats: pages[i]?.stats })).filter(r => r.stats && r.stats.slpm !== undefined);
    const avg: DivisionAverages['avg'] = {};
    const ranks: DivisionAverages['ranks'] = {};
    for (const k of AVG_KEYS) {
      const vals = rows.map(r => ({ slug: r.slug, value: r.stats![k] })).filter((v): v is { slug: string; value: number } => typeof v.value === 'number');
      if (vals.length < 5) continue;
      avg[k] = Math.round((vals.reduce((a, b) => a + b.value, 0) / vals.length) * 100) / 100;
      ranks[k] = vals.sort((x, y) => (k === 'sapm' ? x.value - y.value : y.value - x.value));
    }
    return { division: d.name, n: rows.length, avg, ranks };
  });
}

/** Quem tem luta marcada nos próximos eventos (exceto Contender Series): id ESPN → luta. A mais próxima vence. */
function bookedFights(): Promise<BookedMap> {
  return remember('booked:v1', 30 * MIN, async () => {
    const list = (await upcoming(14)).filter(e => e.series !== 'dwcs');
    const details = await settle(list.map(e => espn.eventDetail(e.id)));
    const out: BookedMap = {};
    for (const d of details) {
      if (!d || d.status === 'post') continue;
      for (const f of d.fights) {
        if (f.result) continue;
        for (const [me, opp] of [[f.red, f.blue], [f.blue, f.red]] as const) {
          if (!out[me.espnId]) out[me.espnId] = { eventId: d.id, fightId: f.id, eventName: d.name, date: d.date, opponent: /\btba\b/i.test(opp.name) ? 'adversário a definir' : opp.name, title: f.title };
        }
      }
    }
    return out;
  });
}

const routes: [RegExp, Handler][] = [
  [/^\/api\/health$/, async () => ok({ ok: true, time: new Date().toISOString() }, 0)],

  [/^\/api\/schedule$/, async (_, q) => {
    const year = Number(q.get('year')) || thisYear();
    return ok(await espn.schedule(year), 300);
  }],

  // Próximos eventos já com a luta principal (para a barra superior e a home)
  [/^\/api\/upcoming$/, async (_, q) => {
    const limit = Math.min(Number(q.get('limit')) || 8, 20);
    // com evento na janela ao vivo o destaque e a faixa do topo se renovam a cada 15 s (a chave muda junto,
    // então a troca de modo é imediata); fora dela, a cada 5 min
    const near = await espn.liveNow().catch(() => false);
    const body = await remember(`upcoming:v3:${limit}:${near ? 'live' : 'idle'}`, near ? 15_000 : 5 * MIN, async () => {
      // pede alguns a mais: um evento já encerrado sai da lista (o banner passa para o próximo) e o limite continua valendo
      const list = await upcoming(limit + 3);
      const details = await Promise.all(list.map(e => espn.eventDetail(e.id).then(d => d && withTitles(d)).catch(() => null)));
      // recortes de corpo inteiro da luta principal (UFC.com), para o destaque da home
      const bodies = await Promise.all(details.map(d => d?.fights[0]
        ? Promise.all([d.fights[0].red, d.fights[0].blue].map(f => ufc.athletePage(f.slug).then(p => p?.bio.bodyImage).catch(() => undefined)))
        : Promise.resolve([undefined, undefined])));
      return list.map((e, i) => {
        const d = details[i];
        const f0 = d?.fights[0];
        const main = f0 && { ...f0, red: { ...f0.red, bodyImage: bodies[i][0] }, blue: { ...f0.blue, bodyImage: bodies[i][1] } };
        return { ...e, status: d?.status ?? 'pre', venue: d?.venue, city: d?.city, country: d?.country, fightCount: d?.fights.length ?? 0, main: main ? { red: main.red, blue: main.blue, weightClass: main.weightClass, title: main.title } : undefined };
      }).filter(e => e.status !== 'post').slice(0, limit);
    });
    return ok(body, near ? 8 : 60);
  }],

  /* Último evento encerrado (status "post"), para o "como foi a noite" da home. Dentro da janela ao vivo é recalculado a
     cada 15 s, então o box troca sozinho assim que o card termina. */
  [/^\/api\/last-event$/, async () => {
    const near = await espn.liveNow().catch(() => false);
    const body = await remember(`last-event:v1:${near ? 'live' : 'idle'}`, near ? 15_000 : 10 * MIN, async () => {
      const past = (await espn.schedule(thisYear())).filter(e => e.series !== 'dwcs' && Date.parse(e.date) < Date.now()).reverse();
      for (const e of past.slice(0, 4)) {
        const d = await espn.eventDetail(e.id).catch(() => null);
        if (d?.status === 'post') return { id: e.id, date: e.date };
      }
      return null;
    });
    return ok(body, near ? 8 : 60);
  }],

  [/^\/api\/events\/(?<id>\d+)$/, async ({ id }) => {
    const ev = await eventFull(id);
    if (!ev) return notFound('Evento não encontrado');
    return ok(ev, ev.status === 'in' || espn.inLiveWindow(ev.date) ? 8 : 120);
  }],

  // luta específica: estatísticas de cada lado (alvo, posição, quedas) + odds; recortes de corpo inteiro do UFC.com
  [/^\/api\/events\/(?<id>\d+)\/fights\/(?<fight>\d+)$/, async ({ id, fight }) => {
    const d = await remember(`fight:v6:${id}:${fight}`, 60_000, async () => {
      const f = await espn.fightDetail(id, fight);
      if (!f) return null;
      const [rb, bb] = await Promise.all([f.red, f.blue].map(x => ufc.athletePage(x.slug).then(p => p?.bio.bodyImage).catch(() => undefined)));
      const ev = await eventFull(id);
      const evFight = ev?.fights.find(x => x.id === fight);
      const title = evFight?.title ?? f.fight.title;
      // cartões dos juízes (UFC Fight Tracker): na decisão, a luta inteira; num nocaute ou finalização, os rounds
      // completos até a interrupção (null se não achar ou se acabou no 1º round; a página segue sem eles)
      const ended = f.fight.status === 'post' && !!f.fight.result;
      const [scorecards, rounds] = ended && ev
        ? await Promise.all([tracker.scorecards(ev.name, ev.date, f.red.name, f.blue.name), tracker.roundStats(ev.name, ev.date, f.red.name, f.blue.name)])
        : [null, null];
      return { ...f, scorecards: scorecards ?? undefined, rounds: rounds ?? undefined, fight: { ...f.fight, title, odds: f.fight.odds ?? evFight?.odds }, red: { ...f.red, bodyImage: rb }, blue: { ...f.blue, bodyImage: bb } };
    });
    return d ? ok(d, d.fight.status === 'in' || espn.inLiveWindow(d.fight.date ?? "") ? 8 : 300) : notFound('Luta não encontrada');
  }],
  [/^\/api\/events\/(?<id>\d+)\/bonuses$/, async ({ id }) => {
    const ev = await eventFull(id);
    const b = ev && ev.status === 'post' ? await tracker.eventBonuses(ev.name, ev.date) : null;
    // sem bônus ainda (o UFC publica depois do card): não guardar a resposta vazia por muito tempo
    return b ? ok(b, 600) : ok({ fight: [], performance: [] }, 60);
  }],
  [/^\/api\/rankings$/, async () => ok(await officialRankings(), 600)],
  [/^\/api\/rankings\/meta$/, async () => ok(await rankingsMeta(), 3600)],
  [/^\/api\/booked$/, async () => ok(await bookedFights(), 900)],
  // nota Elo: ranking alternativo, um lutador e um par (chance de cada um)
  [/^\/api\/elo\/ranking$/, async (_, q) => ok(await elo.eloRanking(q.get('division') ?? ''), 6 * 3600)],
  [/^\/api\/elo\/fighter\/(?<id>\d+)$/, async ({ id }) => {
    const f = await elo.eloFighter(id);
    return f ? ok(f, 6 * 3600) : notFound('Sem nota Elo para este lutador');
  }],
  [/^\/api\/elo\/pair$/, async (_, q) => {
    const t = await elo.eloTable();
    const one = (id: string | null) => { const f = id ? t[id] : undefined; return f ? { rating: f.rating, fights: f.fights } : null; };
    return ok({ a: one(q.get('a')), b: one(q.get('b')) }, 3600);
  }],
  // linha do tempo do cinturão (Wikipédia, CC BY-SA)
  [/^\/api\/divisions\/belts$/, async (_, q) => {
    const reigns = await wiki.beltHistory(q.get('name') ?? '');
    return reigns ? ok(reigns, 6 * 3600) : notFound('Sem histórico para esta divisão');
  }],
  [/^\/api\/divisions\/average$/, async (_, q) => {
    const d = await divisionAverages(q.get('name') ?? '');
    return d ? ok(d, 3600) : notFound('Divisão não encontrada');
  }],

  [/^\/api\/search$/, async (_, q) => ok(await espn.search(q.get('q') ?? ''), 3600)],

  // plantel inteiro de um país (Wikipédia), não só os ranqueados
  [/^\/api\/roster\/(?<iso>[A-Z]{3})$/, async ({ iso }) => {
    const list = await wiki.rosterByCountry(iso);
    return list ? ok(list, 3600) : { status: 502, body: { error: 'Lista indisponível' }, maxAge: 60 };
  }],

  // foto alternativa (UFC.com, corpo inteiro) para quem ainda não tem retrato na ESPN (estreantes)
  [/^\/api\/photo\/(?<slug>[a-z0-9-]+)$/, async ({ slug }) => {
    const page = await ufc.athletePage(slug).catch(() => null);
    const src = page?.bio.bodyImage;
    return src ? ok({ src }, 86_400) : { status: 404, body: { error: 'sem foto' }, maxAge: 3600 };
  }],

  [/^\/api\/fighters\/(?<slug>[a-z0-9-]+)$/, async ({ slug }, q) => {
    const profile = await fighterProfile(slug, q.get('espn'));
    return profile ? ok(profile, 600) : notFound('Lutador não encontrado');
  }],
];

/** Nome da rota para o rastreamento: /^\/api\/fighters\/(?<slug>…)$/ → /api/fighters/:slug */
const routeName = (re: RegExp) => re.source.replace(/^\^|\$$/g, '').replaceAll('\\/', '/').replace(/\(\?<(\w+)>[^)]*\)/g, ':$1');

export async function handle(url: URL): Promise<ApiResponse> {
  for (const [re, fn] of routes) {
    const m = url.pathname.match(re);
    if (!m) continue;
    return traced(routeName(re), url.pathname, async () => {
      try {
        return await fn(m.groups ?? {}, url.searchParams);
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        const upstream = e instanceof UpstreamError;
        console.error(`[api] ${url.pathname}: ${detail}`);
        // fonte fora do ar (502) é esperado de vez em quando; erro nosso (500) vai para o Sentry
        if (!upstream) captureError(e, { path: url.pathname, query: url.search });
        return { status: upstream ? 502 : 500, body: { error: 'Falha ao consultar a fonte de dados', detail }, maxAge: 0 };
      }
    });
  }
  return notFound('Rota inexistente');
}
