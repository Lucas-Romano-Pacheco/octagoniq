/* =====================================================================
   OctagonIQ · motor de dados
   Normaliza a base, simula estatísticas round a round (determinístico),
   calcula o motor de estilo e o modelo de previsão.
   ===================================================================== */

/* ---------- utilidades ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = s => fold(s).replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const nf = (v, d = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), d);
const mmss = s => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const toSec = t => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };
const pctStr = (l, a) => a ? `${Math.round(l / a * 100)}%` : '—';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TODAY = new Date(DATA_AS_OF + 'T12:00:00');
const ageOf = dob => { if (!dob) return null; const d = new Date(dob + 'T12:00:00'); let a = TODAY.getFullYear() - d.getFullYear(); const m = TODAY.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && TODAY.getDate() < d.getDate())) a--; return a; };
const fmtDate = (iso, o = { day: '2-digit', month: 'short', year: 'numeric' }) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', o).replace(/\./g, '');
const daysUntil = iso => Math.round((new Date(iso + 'T12:00:00') - TODAY) / 864e5);
const ftIn = cm => { const t = Math.round(cm / 2.54); return `${Math.floor(t / 12)}′${t % 12}″`; };
const recStr = r => r ? `${r[0]}-${r[1]}-${r[2]}${r[3] ? ` (${r[3]} NC)` : ''}` : '—';
const lastName = n => { const p = n.split(' '); return p.length > 2 && /^(du|da|de|dos|van|del|della)$/i.test(p[p.length - 2]) ? p.slice(-2).join(' ') : p[p.length - 1]; };
const firstName = n => n.slice(0, n.length - lastName(n).length).trim();
function seedFn(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return (Math.imul(h ^ h >>> 16, 2246822507) ^ h >>> 13) >>> 0; }
function rng(str) { let a = seedFn(str); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function poisson(l, r) { if (l <= 0) return 0; const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= r(); } while (p > L && k < 40); return k - 1; }
function shuffle(arr, r) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

/* ---------- normalização ---------- */
const DIV = Object.fromEntries(DIVS.map((d, i) => [d.id, { ...d, order: i, kg: Math.round(d.lb * 0.45359 * 10) / 10 }]));
const FIGHTERS = {};
const STAT_KEYS = ['slpm', 'acc', 'sapm', 'def', 'kd', 'td', 'tdAcc', 'tdDef', 'sub'];
PROFILES.forEach(([name, nick, country, div, dob, rec, h, reach, stance, team, st, wins, extra = {}]) => {
  const f = { id: slug(name), name, nick, country, div, dob, rec, h, reach, stance, team, hasStats: true, legs: extra.legs || 0, wins: { ko: wins[0], sub: wins[1], dec: wins[2] } };
  STAT_KEYS.forEach((k, i) => f[k] = st[i]);
  FIGHTERS[f.id] = f;
});
function ensureFighter(name, div) {
  const id = slug(name);
  if (!FIGHTERS[id]) FIGHTERS[id] = { id, name, nick: '', div: div || null, hasStats: false };
  if (!FIGHTERS[id].div && div) FIGHTERS[id].div = div;
  return FIGHTERS[id];
}
Object.entries(RANKINGS).forEach(([div, r]) => {
  const c = ensureFighter(r.champ, div); c.champ = div; c.rank = 0; c.rankDiv = div;
  r.list.forEach((n, i) => { const f = ensureFighter(n, div); if (f.rank == null) { f.rank = i + 1; f.rankDiv = div; } });
});
P4P.men.forEach((n, i) => { ensureFighter(n).p4p = i + 1; });
P4P.women.forEach((n, i) => { ensureFighter(n).p4p = i + 1; ensureFighter(n).p4pW = true; });

const BOUTS = {}, EVENT_LIST = [];
EVENTS.forEach(([name, date, venue, city, bouts], ei) => {
  const ev = { id: slug(name + '-' + date), name, date, venue, city, bouts: [] };
  bouts.forEach(([red, gold, div, method, detail, round, time, sched, o = {}], bi) => {
    const R = ensureFighter(red, div), Gd = ensureFighter(gold, div);
    const b = { id: `${ev.id}-${bi}`, ev, red: R.id, gold: Gd.id, div, method, detail, round, time, sched, title: !!o.t, nc: !!o.nc, est: !!o.est, cards: o.cards || '', label: o.label || '', winner: o.nc ? null : 'red', order: bi };
    ev.bouts.push(b); BOUTS[b.id] = b;
  });
  EVENT_LIST.push(ev);
});
const ALL_BOUTS = Object.values(BOUTS);
const UPCOMING_LIST = UPCOMING.map(([name, date, venue, city, bouts]) => ({
  id: slug(name + '-' + date), name, date, venue, city,
  bouts: bouts.map(([a, b, div, sched, label], i) => ({ id: `${slug(name)}-${i}`, a: ensureFighter(a, div).id, b: ensureFighter(b, div).id, div, sched, label }))
}));
const fighterBouts = id => ALL_BOUTS.filter(b => b.red === id || b.gold === id).sort((a, b) => b.ev.date.localeCompare(a.ev.date) || a.order - b.order);
const nextFight = id => { for (const e of UPCOMING_LIST) for (const b of e.bouts) if (b.a === id || b.b === id) return { ev: e, bout: b, opp: b.a === id ? b.b : b.a }; return null; };
const F = id => FIGHTERS[id];
const PROFILED = Object.values(FIGHTERS).filter(f => f.hasStats);

/* ---------- métricas ---------- */
const METRICS = {
  slpm: { label: 'Golpes sig. conectados por minuto', short: 'SLpM', d: 2 },
  acc: { label: 'Precisão de golpes significativos', short: 'Precisão', d: 0, unit: '%' },
  sapm: { label: 'Golpes sig. absorvidos por minuto', short: 'SApM', d: 2, low: true },
  def: { label: 'Defesa de golpes significativos', short: 'Defesa', d: 0, unit: '%' },
  kd: { label: 'Knockdowns por 15 minutos', short: 'Knockdowns', d: 2 },
  td: { label: 'Quedas conectadas por 15 minutos', short: 'Quedas', d: 2 },
  tdAcc: { label: 'Precisão de quedas', short: 'Precisão de quedas', d: 0, unit: '%' },
  tdDef: { label: 'Defesa de quedas', short: 'Defesa de quedas', d: 0, unit: '%' },
  sub: { label: 'Tentativas de finalização por 15 minutos', short: 'Finalizações', d: 1 }
};
const RANGE = {};
STAT_KEYS.forEach(k => { const v = PROFILED.map(f => f[k]); RANGE[k] = { min: Math.min(...v), max: Math.max(...v), avg: v.reduce((a, b) => a + b, 0) / v.length }; });
const divAvg = (div, k) => { const l = PROFILED.filter(f => f.div === div); return l.length ? l.reduce((a, f) => a + f[k], 0) / l.length : RANGE[k].avg; };
const fmtMetric = (k, v) => nf(v, METRICS[k].d) + (METRICS[k].unit || '');
const pctl = (f, k) => { const R = RANGE[k], p = clamp((f[k] - R.min) / ((R.max - R.min) || 1) * 100, 0, 100); return METRICS[k].low ? 100 - p : p; };

function styleOf(f) {
  const s = Math.round(.25 * pctl(f, 'slpm') + .2 * pctl(f, 'acc') + .2 * pctl(f, 'def') + .15 * pctl(f, 'sapm') + .2 * pctl(f, 'kd'));
  const g = Math.round(.35 * pctl(f, 'td') + .2 * pctl(f, 'tdAcc') + .25 * pctl(f, 'sub') + .2 * pctl(f, 'tdDef'));
  let label, kind;
  if (g - s > 12) { kind = 'G'; label = f.sub >= 1.2 && f.sub >= f.td / 3 ? 'Grappler finalizador' : 'Wrestler de pressão'; }
  else if (s - g > 12) { kind = 'S'; label = f.slpm >= 6 ? 'Striker de volume' : f.kd >= 1 ? 'Nocauteador' : 'Striker técnico'; }
  else { kind = 'H'; label = (s >= 55 && g >= 55) ? 'Lutador completo' : 'Híbrido'; }
  return { s, g, label, kind };
}
const winPct = f => f.rec[0] / Math.max(1, f.rec[0] + f.rec[1] + f.rec[2]);
const tdEff = (a, b) => a.td * (1.6 - b.tdDef / 100 * 1.4);
const subEff = (a, b) => a.sub * (1.4 - b.tdDef / 100);
function predict(a, b) {
  const strikeNet = a.slpm * (1.55 - b.def / 100) - b.slpm * (1.55 - a.def / 100);
  const z = .3 * strikeNet + .42 * (tdEff(a, b) - tdEff(b, a)) + .35 * (subEff(a, b) - subEff(b, a)) + .55 * (a.kd - b.kd) + .012 * (a.reach - b.reach) + 3 * (winPct(a) - winPct(b));
  const p = clamp(1 / (1 + Math.exp(-z)), .1, .9);
  const share = f => { const w = f.wins.ko + f.wins.sub + f.wins.dec || 1; return { ko: f.wins.ko / w, sub: f.wins.sub / w, dec: f.wins.dec / w }; };
  const sa = share(a), sb = share(b);
  const outs = [['KO/TKO', 'ko'], ['finalização', 'sub'], ['decisão', 'dec']].flatMap(([m, k]) => [{ side: 0, method: m, prob: p * sa[k] }, { side: 1, method: m, prob: (1 - p) * sb[k] }]);
  return { pA: p, pB: 1 - p, methods: { ko: p * sa.ko + (1 - p) * sb.ko, sub: p * sa.sub + (1 - p) * sb.sub, dec: p * sa.dec + (1 - p) * sb.dec }, top: outs.sort((x, y) => y.prob - x.prob)[0] };
}
function odds(p) {
  const pv = Math.min(.97, p * 1.045);
  const am = pv >= .5 ? -Math.round(100 * pv / (1 - pv)) : Math.round(100 * (1 - pv) / pv);
  return { dec: nf(1 / pv, 2), am: (am > 0 ? '+' : '') + am };
}

/* ---------- simulação de estatísticas de luta ---------- */
const DEFAULT_P = { slpm: 4.2, acc: 46, sapm: 3.8, def: 55, kd: .4, td: 1.0, tdAcc: 38, tdDef: 65, sub: .4, legs: 0 };
const simProfile = id => { const f = F(id); return f.hasStats ? f : { ...DEFAULT_P, ...f }; };
function allocInt(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1, raw = weights.map(w => total * w / sum), fl = raw.map(Math.floor);
  const rem = total - fl.reduce((a, b) => a + b, 0), order = raw.map((v, i) => [v - fl[i], i]).sort((x, y) => y[0] - x[0]);
  for (let k = 0; k < rem; k++) fl[order[k % order.length][1]]++;
  return fl;
}
function allocPair(L, A, shares, accF) {
  const att = allocInt(A, shares.map((s, i) => s / accF[i]));
  let land = allocInt(L, shares), over = 0;
  land = land.map((l, i) => { if (l > att[i]) { over += l - att[i]; return att[i]; } return l; });
  for (let i = 0; i < land.length && over > 0; i++) { const m = Math.min(att[i] - land[i], over); land[i] += m; over -= m; }
  return land.map((l, i) => [l, att[i]]);
}
function genSide(p, opp, dur, mult, r, o) {
  const tdFactor = clamp((1 - opp.tdDef / 100) * 1.7, .15, 1.6);
  let tdL = poisson(p.td * dur / 900 * mult * tdFactor * (.7 + r() * .6), r);
  if (o.forceTd) tdL = Math.max(tdL, 1);
  const tdA = tdL + poisson(Math.max(.05, tdL * (100 / Math.max(p.tdAcc, 15) - 1) * .8 + (p.td > 1.5 ? r() * 1.4 : r() * .3)), r);
  let ctrl = tdL ? tdL * (40 + r() * 100) : (r() < .25 ? r() * 25 : 0);
  if (o.minCtrl) ctrl = Math.max(ctrl, dur * o.minCtrl);
  ctrl = Math.round(Math.min(ctrl, dur * .88));
  const ground = clamp(ctrl / dur * .9, 0, .78), clinch = .05 + r() * .12, dist = Math.max(.06, 1 - ground - clinch);
  let L = Math.round(p.slpm * (dur / 60) * mult * (.72 + r() * .56));
  if (o.minL) L = Math.max(L, o.minL);
  const acc = clamp(p.acc / 100 + (r() - .5) * .14, .22, .82), A = Math.max(L, Math.round(L / acc));
  let kd = poisson(p.kd * dur / 900 * mult * mult * mult * .7, r); if (o.forceKd) kd = Math.max(kd, o.forceKd);
  let subAtt = poisson(p.sub * dur / 900 * (tdL ? 1.5 : .5) * mult, r); if (o.forceSub) subAtt = Math.max(subAtt, 1);
  const leg = clamp(.14 + (p.legs || 0) + (r() - .5) * .1, .04, .42), body = clamp(.2 + (r() - .5) * .1, .06, .35);
  const head = Math.max(.25, 1 - leg - body + (o.headBias || 0));
  const tg = allocPair(L, A, [head, body, leg], [.82, 1.3, 1.5]), pos = allocPair(L, A, [dist, clinch, ground], [.9, 1.15, 1.35]);
  return { sig: [L, A], head: tg[0], body: tg[1], leg: tg[2], dist: pos[0], clinch: pos[1], ground: pos[2], kd, td: [tdL, tdA], subAtt, rev: 0, ctrl };
}
function minuteSplit(L, dur, r, spike) {
  const n = Math.max(1, Math.ceil(dur / 60)), w = Array.from({ length: n }, (_, i) => (Math.min(60, dur - i * 60) / 60) * (.55 + r() * .9));
  if (spike) w[n - 1] *= 2.4;
  return allocInt(L, w);
}
const EVENT_LABEL = { td: 'Queda', kd: 'Knockdown', sub: 'Tentativa de finalização', rev: 'Inversão', end: 'Fim da luta' };
function buildEvents(sides, dur, r, end) {
  const ev = [], T = () => Math.round(5 + r() * Math.max(1, dur - 10));
  sides.forEach((x, s) => {
    for (let k = 0; k < x.td[0]; k++) ev.push({ t: T(), side: s, type: 'td' });
    for (let k = 0; k < x.kd; k++) ev.push({ t: T(), side: s, type: 'kd' });
    for (let k = 0; k < x.subAtt; k++) ev.push({ t: T(), side: s, type: 'sub' });
    for (let k = 0; k < x.rev; k++) ev.push({ t: T(), side: s, type: 'rev' });
  });
  if (end) {
    const own = t => ev.filter(e => e.side === end.side && e.type === t);
    if (end.kind === 'ko') { const k = own('kd'); if (k.length) k[k.length - 1].t = Math.max(1, dur - 2 - Math.round(r() * 12)); }
    if (end.kind === 'sub') { const s = own('sub'); if (s.length) s[s.length - 1].t = Math.max(1, dur - 1); }
    ev.push({ t: dur, side: end.side, type: 'end', label: end.label });
  }
  return ev.sort((a, b) => a.t - b.t);
}
const ZERO = () => ({ sig: [0, 0], head: [0, 0], body: [0, 0], leg: [0, 0], dist: [0, 0], clinch: [0, 0], ground: [0, 0], kd: 0, td: [0, 0], subAtt: 0, rev: 0, ctrl: 0 });
function sumStats(list) {
  const t = ZERO();
  list.forEach(s => Object.keys(t).forEach(k => { if (Array.isArray(t[k])) { t[k][0] += s[k][0]; t[k][1] += s[k][1]; } else t[k] += s[k]; }));
  return t;
}
const DETAIL_CACHE = new Map();
function fightDetail(id) {
  if (DETAIL_CACHE.has(id)) return DETAIL_CACHE.get(id);
  const b = BOUTS[id], r = rng('bout:' + id), P = [simProfile(b.red), simProfile(b.gold)];
  const W = b.winner === 'red' ? 0 : -1, n = b.round, lastDur = toSec(b.time);
  const isDec = b.method === 'Decisão', isKO = b.method === 'KO/TKO', isSub = b.method === 'Finalização';
  const injury = /Lesão|córner/i.test(b.detail);
  let rw;
  if (W < 0) rw = Array.from({ length: n }, () => r() < .5 ? 0 : 1);
  else if (isDec) {
    const split = /Dividida/.test(b.detail);
    const need = split ? Math.floor(n / 2) + 1 : (n === 5 ? (r() < .55 ? 4 : 5) : (r() < .55 ? 2 : 3));
    const idx = shuffle([...Array(n).keys()], r).slice(0, need);
    rw = Array.from({ length: n }, (_, i) => idx.includes(i) ? W : 1 - W);
  } else rw = Array.from({ length: n }, (_, i) => i === n - 1 ? W : (r() < .58 ? W : 1 - W));
  const rounds = [];
  for (let i = 0; i < n; i++) {
    const dur = i === n - 1 ? lastDur : 300, final = i === n - 1 && !isDec && W >= 0;
    const sides = [0, 1].map(s => {
      const mult = W < 0 ? 1 : (rw[i] === s ? 1.18 : .86), o = {};
      if (final && s === W && !injury) {
        if (isKO) { o.forceKd = r() < .35 ? 2 : 1; o.headBias = .12; o.minL = Math.max(3, Math.round(dur / 60 * 2.5)); }
        if (isSub) { o.forceTd = true; o.minCtrl = .45; o.forceSub = true; }
      }
      return genSide(P[s], P[1 - s], dur, mult, r, o);
    });
    const cs = sides[0].ctrl + sides[1].ctrl;
    if (cs > dur * .9) sides.forEach(x => x.ctrl = Math.round(x.ctrl * dur * .9 / cs));
    sides.forEach((x, s) => { if (sides[1 - s].ctrl > 50 && r() < .3) x.rev = 1; });
    const minutes = sides.map((x, s) => minuteSplit(x.sig[0], dur, r, final && isKO && !injury && s === W));
    let end = null;
    if (final) end = { side: W, kind: injury ? 'inj' : isKO ? 'ko' : 'sub', label: `${b.method} · ${b.detail}` };
    else if (W < 0 && i === n - 1) end = { side: -1, kind: 'nc', label: `Sem resultado · ${b.detail}` };
    const events = buildEvents(sides, dur, r, end);
    let score = null;
    if (!end) {
      const w = rw[i], big = sides[w].kd >= 2 || (sides[w].sig[0] - sides[1 - w].sig[0] >= 30 && sides[w].ctrl - sides[1 - w].ctrl > 150);
      score = w === 0 ? [10, big ? 8 : 9] : [big ? 8 : 9, 10];
    }
    rounds.push({ n: i + 1, dur, f: sides, minutes, events, winner: rw[i], finished: !!end, score });
  }
  const d = { bout: b, rounds, totals: [sumStats(rounds.map(x => x.f[0])), sumStats(rounds.map(x => x.f[1]))] };
  DETAIL_CACHE.set(id, d);
  return d;
}

/* ---------- agregados da base ---------- */
const STATS = (() => {
  const real = ALL_BOUTS.filter(b => !b.nc);
  const by = m => real.filter(b => b.method === m).length;
  const years = [...new Set(EVENT_LIST.map(e => e.date.slice(0, 4)))].sort();
  const perYear = years.map(y => { const l = real.filter(b => b.ev.date.startsWith(y)); return { y, ko: l.filter(b => b.method === 'KO/TKO').length, sub: l.filter(b => b.method === 'Finalização').length, dec: l.filter(b => b.method === 'Decisão').length }; });
  return { fighters: Object.keys(FIGHTERS).length, profiled: PROFILED.length, events: EVENT_LIST.length, bouts: ALL_BOUTS.length, titles: ALL_BOUTS.filter(b => b.title).length, finishRate: Math.round((by('KO/TKO') + by('Finalização')) / real.length * 100), ko: by('KO/TKO'), sub: by('Finalização'), dec: by('Decisão'), perYear, years };
})();
