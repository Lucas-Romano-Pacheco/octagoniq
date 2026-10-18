/* =====================================================================
   OctagonIQ · interface
   ===================================================================== */
(function () {
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const C = { blood: '#ff2d46', gold: '#f2b33d', win: '#3ddc97', fg: '#f3f0e9', fg2: '#c4c0b7', muted: '#868c96', line: '#2a2e36', line2: '#3b414c', panel: '#15171c', panel2: '#1c1f25', panel3: '#252930', ink: '#0a0b0d' };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const icons = () => { if (window.lucide) lucide.createIcons(); };

/* =====================================================================
   1. GRÁFICOS (ECharts) · tema próprio
   ===================================================================== */
if (window.echarts) {
  const axisLabel = { color: C.muted, fontFamily: 'Martian Mono, monospace', fontSize: 10 };
  echarts.registerTheme('octagon', {
    color: [C.blood, C.gold, C.fg2, C.win],
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'Hanken Grotesk, system-ui, sans-serif', color: C.muted },
    legend: { textStyle: { color: C.fg2 } },
    tooltip: { backgroundColor: C.panel3, borderColor: C.line2, borderWidth: 1, padding: [8, 10], textStyle: { color: C.fg, fontSize: 12, fontFamily: 'Hanken Grotesk, sans-serif' }, extraCssText: 'border-radius:0;box-shadow:0 14px 34px rgba(0,0,0,.8);' },
    categoryAxis: { axisLine: { lineStyle: { color: C.line2 } }, axisTick: { show: false }, axisLabel, splitLine: { show: false } },
    valueAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel, splitLine: { lineStyle: { color: 'rgba(255,255,255,.05)' } } },
    timeAxis: { axisLine: { lineStyle: { color: C.line2 } }, axisTick: { show: false }, axisLabel, splitLine: { lineStyle: { color: 'rgba(255,255,255,.04)' } } }
  });
}
let charts = [];
function chart(id, option) {
  const el = document.getElementById(id);
  if (!el) return null;
  if (!window.echarts) { el.innerHTML = '<p class="empty">Gráfico indisponível: a biblioteca de gráficos não carregou.</p>'; return null; }
  const c = echarts.init(el, 'octagon', { renderer: 'canvas' });
  c.setOption({ animationDuration: REDUCED ? 0 : 700, animationEasing: 'cubicOut', ...option });
  charts.push(c);
  return c;
}
let resizeT;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => charts.forEach(c => c.resize()), 120); });
const grad = (top, bottom) => window.echarts ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: top }, { offset: 1, color: bottom }]) : top;
const tipFmt = (title, rows) => `<div style="font-family:Anybody,sans-serif;font-variation-settings:'wdth' 75;font-weight:800;font-size:14px;text-transform:uppercase;margin-bottom:4px">${esc(title)}</div>${rows.map(r => `<div style="display:flex;gap:14px;justify-content:space-between"><span style="color:${C.fg2}">${r[0]}</span><b style="font-family:Martian Mono,monospace;font-size:11px">${r[1]}</b></div>`).join('')}`;

/* =====================================================================
   2. MOVIMENTO (GSAP)
   ===================================================================== */
function animateIn(root) {
  if (!window.gsap || REDUCED) return;
  const items = $$('[data-anim]', root);
  if (items.length) gsap.from(items, { y: 16, opacity: .2, duration: .55, stagger: .035, ease: 'power3.out', clearProps: 'transform,opacity' });
  $$('[data-count]', root).forEach(el => {
    const end = +el.dataset.count, dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || '', o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.2, ease: 'power2.out', onUpdate: () => { el.textContent = nf(o.v, dec) + suf; } });
  });
  $$('[data-grow]', root).forEach(el => gsap.from(el, { width: 0, duration: .8, ease: 'power3.out', delay: .15 }));
}

/* =====================================================================
   3. TOOLTIP HTML (elementos com data-tip)
   ===================================================================== */
const tip = $('#tip');
const placeTip = (x, y) => { const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = clamp(x + 14, 8, innerWidth - w - 8) + 'px'; tip.style.top = clamp(y + 14, 8, innerHeight - h - 8) + 'px'; };
document.addEventListener('pointerover', e => { const t = e.target.closest('[data-tip]'); if (t) { tip.textContent = t.getAttribute('data-tip'); tip.hidden = false; placeTip(e.clientX, e.clientY); } });
document.addEventListener('pointermove', e => { if (!tip.hidden && e.target.closest('[data-tip]')) placeTip(e.clientX, e.clientY); });
document.addEventListener('pointerout', e => { const t = e.target.closest('[data-tip]'); if (t && !t.contains(e.relatedTarget)) tip.hidden = true; });
document.addEventListener('focusin', e => { const t = e.target.closest('[data-tip]'); if (t) { const r = t.getBoundingClientRect(); tip.textContent = t.getAttribute('data-tip'); tip.hidden = false; placeTip(r.left, r.bottom); } });
document.addEventListener('focusout', () => { tip.hidden = true; });
addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

/* =====================================================================
   4. ESTADO E NAVEGAÇÃO (somente em memória; sem History API)
   ===================================================================== */
const TABS = ['painel', 'rankings', 'lutadores', 'luta', 'confrontos', 'arquivo'];
let startTab = 'painel';
try { const h = (location.hash || '').slice(1); if (TABS.includes(h)) startTab = h; } catch (e) { /* frame sem acesso ao hash */ }
const findBout = (r, g) => ALL_BOUTS.find(b => b.red === slug(r) && b.gold === slug(g))?.id || ALL_BOUTS[0].id;
const state = {
  tab: startTab, rdiv: 'light', fighter: 'justin-gaethje', rq: '', fdiv: '', onlyStats: false,
  bout: findBout('Sean Strickland', 'Khamzat Chimaev'), round: 'all',
  h2h: ['petr-yan', 'merab-dvalishvili'], evq: '', evYear: 'all', evMethod: 'all', evDiv: '',
  open: new Set([EVENT_LIST[0].id]), focus: null
};
try { const s = JSON.parse(localStorage.getItem('octagoniq2') || '{}'); if (s.fighter && F(s.fighter)) state.fighter = s.fighter; } catch (e) { /* sem armazenamento */ }
const persist = () => { try { localStorage.setItem('octagoniq2', JSON.stringify({ fighter: state.fighter })); } catch (e) { /* ignora */ } };
function go(tab, patch = {}) {
  const changed = state.tab !== tab;
  Object.assign(state, patch); state.tab = tab;
  render().then(() => { if (state.focus) { const el = document.getElementById(state.focus); state.focus = null; if (el) el.scrollIntoView({ block: 'start' }); } else if (changed) scrollTo({ top: 0 }); });
}

/* =====================================================================
   5. PEÇAS REUTILIZÁVEIS
   ===================================================================== */
const divName = d => d ? DIV[d].name : '—';
const rankTag = f => {
  if (!f) return '';
  if (f.champ) return `<span class="slash s-gold"><i data-lucide="crown"></i>Campeão${DIV[f.champ].w ? 'a' : ''}</span>`;
  if (f.rank) return `<span class="slash s-ink">#${f.rank} ${esc(divName(f.rankDiv))}</span>`;
  return '';
};
const rankShort = f => f.champ ? 'C' : f.rank ? '#' + f.rank : '—';
const nameLink = (id, cls = '') => `<button class="${cls} hover:text-gold transition-colors text-left" data-fighter="${id}">${esc(F(id).name)}</button>`;
const methodShort = b => b.nc ? 'Sem resultado' : b.method === 'Decisão' ? `Dec. ${b.detail.toLowerCase()}` : b.method === 'KO/TKO' ? `KO/TKO · R${b.round} ${b.time}` : `Fin. · R${b.round} ${b.time}`;
const estMark = b => b.est ? `<span class="text-gold" data-tip="Round, tempo ou método não confirmados na pesquisa (estimativa)" tabindex="0">≈</span>` : '';
const resultFor = (b, id) => b.nc ? 'NC' : b.red === id ? 'V' : 'D';

/* =====================================================================
   6. CABEÇALHO, FAIXA DE RESULTADOS, BUSCA
   ===================================================================== */
$('#asof').textContent = `Dados de ${fmtDate(DATA_AS_OF)}`;
$('#sources').innerHTML = SOURCES.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('');
(function ticker() {
  const recent = ALL_BOUTS.slice().sort((a, b) => b.ev.date.localeCompare(a.ev.date) || a.order - b.order).slice(0, 16);
  const html = recent.map(b => `<span class="tick-item"><span class="tick-tag">${esc(b.ev.name.replace('UFC Fight Night: ', 'UFC FN · '))}</span>${b.nc ? `<b>${esc(lastName(F(b.red).name))}</b> × <b>${esc(lastName(F(b.gold).name))}</b>` : `<b>${esc(F(b.red).name)}</b> def. ${esc(F(b.gold).name)}`}<span class="tick-tag">${esc(methodShort(b))}</span></span>`).join('');
  $('#ticker').innerHTML = html + html;
})();
document.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });

const SEARCH = [
  ...Object.values(FIGHTERS).map(f => ({ type: 'Lutadores', id: f.id, title: f.name, sub: [f.nick && `“${f.nick}”`, divName(f.div), f.champ ? 'Campeão' : f.rank ? `#${f.rank}` : '', f.rec && recStr(f.rec)].filter(Boolean).join(' · '), key: fold(`${f.name} ${f.nick || ''} ${divName(f.div)} ${f.country || ''} ${f.team || ''}`) })),
  ...UPCOMING_LIST.map(e => ({ type: 'Próximos eventos', id: e.id, title: e.name, sub: `${fmtDate(e.date)} · ${e.venue}`, key: fold(`${e.name} ${e.venue} ${e.city} ${e.bouts.map(b => F(b.a).name + ' ' + F(b.b).name).join(' ')}`) })),
  ...EVENT_LIST.map(e => ({ type: 'Eventos realizados', id: e.id, title: e.name, sub: `${fmtDate(e.date)} · ${F(e.bouts[0].red).name} vs ${F(e.bouts[0].gold).name}`, key: fold(`${e.name} ${e.venue} ${e.city} ${e.bouts.map(b => F(b.red).name + ' ' + F(b.gold).name).join(' ')}`) }))
];
const qIn = $('#q'), qRes = $('#qres');
let qItems = [], qSel = 0;
function runSearch() {
  const q = fold(qIn.value.trim());
  if (!q) { qRes.hidden = true; qIn.setAttribute('aria-expanded', 'false'); return; }
  const terms = q.split(/\s+/);
  qItems = SEARCH.filter(it => terms.every(t => it.key.includes(t))).slice(0, 14); qSel = 0;
  let last = '', html = '';
  qItems.forEach((it, i) => {
    if (it.type !== last) { html += `<div class="qgroup eyebrow">${it.type}</div>`; last = it.type; }
    const ic = it.type === 'Lutadores' ? 'user' : it.type === 'Próximos eventos' ? 'calendar-clock' : 'archive';
    html += `<button class="qitem" role="option" id="qo-${i}" data-i="${i}" aria-selected="${i === 0}"><i data-lucide="${ic}" class="text-muted"></i><span class="min-w-0"><span class="block font-semibold">${esc(it.title)}</span><span class="block text-xs text-muted">${esc(it.sub)}</span></span></button>`;
  });
  qRes.innerHTML = html || `<div class="empty px-3">Nada encontrado para “${esc(qIn.value)}”. Tente um sobrenome ou o número do evento.</div>`;
  qRes.hidden = false; qIn.setAttribute('aria-expanded', 'true'); icons();
}
function pick(it) {
  qIn.value = ''; qRes.hidden = true; qIn.setAttribute('aria-expanded', 'false'); qIn.blur();
  if (it.type === 'Lutadores') go('lutadores', { fighter: it.id, rq: '', fdiv: '', onlyStats: false });
  else if (it.type === 'Próximos eventos') go('confrontos', { focus: 'up-' + it.id });
  else { state.open.add(it.id); go('arquivo', { evq: '', evYear: 'all', evMethod: 'all', evDiv: '', focus: 'ev-' + it.id }); }
}
qIn.addEventListener('input', runSearch);
qIn.addEventListener('focus', runSearch);
qIn.addEventListener('keydown', e => {
  if (qRes.hidden || !qItems.length) { if (e.key === 'Escape') qIn.blur(); return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); qSel = (qSel + (e.key === 'ArrowDown' ? 1 : -1) + qItems.length) % qItems.length;
    $$('.qitem', qRes).forEach((b, i) => b.setAttribute('aria-selected', String(i === qSel)));
    $(`#qo-${qSel}`)?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') { e.preventDefault(); pick(qItems[qSel]); }
  else if (e.key === 'Escape') qRes.hidden = true;
});
qRes.addEventListener('mousedown', e => { const b = e.target.closest('.qitem'); if (b) { e.preventDefault(); pick(qItems[+b.dataset.i]); } });
document.addEventListener('click', e => { if (!e.target.closest('.search')) qRes.hidden = true; });
document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); qIn.focus(); } });

/* =====================================================================
   7. VIEW · PAINEL
   ===================================================================== */
function champSince(div, id) { const l = TITLE_CHANGES.filter(t => t[1] === div && slug(t[2]) === id); return l.length ? l[l.length - 1][0] : null; }
function viewPainel() {
  const today = UPCOMING_LIST.find(e => daysUntil(e.date) === 0);
  const feat = UPCOMING_LIST.find(e => daysUntil(e.date) > 0 && /^UFC \d/.test(e.name)) || UPCOMING_LIST.find(e => daysUntil(e.date) > 0);
  const fm = feat.bouts[0], co = feat.bouts[1], A = F(fm.a), Bf = F(fm.b), dLeft = daysUntil(feat.date);
  const recent = ALL_BOUTS.slice().sort((a, b) => b.ev.date.localeCompare(a.ev.date) || a.order - b.order).slice(0, 8);
  const belts = DIVS.map(d => {
    const id = slug(RANKINGS[d.id].champ), f = F(id), since = champSince(d.id, id), nx = nextFight(id);
    return `<button class="belt" data-fighter="${id}" data-anim>
      <span class="flex items-center justify-between gap-2"><span class="eyebrow">${esc(d.name)} · ${d.lb} lb</span><i data-lucide="crown" class="text-gold"></i></span>
      <span class="disp belt-name">${esc(f.name)}</span>
      <span class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted"><span class="num">${recStr(f.rec)}</span>${since ? `<span>desde ${fmtDate(since, { month: 'short', year: 'numeric' })}</span>` : ''}</span>
      ${nx ? `<span class="text-xs text-fg2 border-t border-line pt-2">Próxima: vs ${esc(F(nx.opp).name)} · ${esc(nx.ev.name.replace('UFC Fight Night: ', 'UFC FN · '))}</span>` : `<span class="text-xs text-muted border-t border-line pt-2">Sem defesa anunciada</span>`}
    </button>`;
  }).join('');
  const p4pList = (list, w) => list.slice(0, 10).map((n, i) => { const f = F(slug(n)); return `<button class="p4p-row" data-fighter="${f.id}"><span class="n">${i + 1}</span><span class="min-w-0"><span class="block font-semibold truncate">${esc(f.name)}</span><span class="block text-[11px] text-muted">${esc(divName(f.div))}${f.champ ? ' · campeão' + (w ? 'a' : '') : ''}</span></span>${f.champ ? '<i data-lucide="crown" class="text-gold"></i>' : '<span></span>'}</button>`; }).join('');
  return {
    html: `
    ${today ? `<section class="live-strip" data-anim>
      <span class="live-dot" aria-hidden="true"></span><span class="slash s-blood">Hoje</span>
      <span class="min-w-0"><b class="font-semibold">${esc(today.name)}</b> <span class="text-fg2">· ${esc(today.venue)}, ${esc(today.city)}</span></span>
      <span class="text-fg2 text-sm">${esc(F(today.bouts[0].a).name)} × ${esc(F(today.bouts[0].b).name)} · ${today.bouts.length} lutas</span>
      <button class="btn btn-sm ml-auto" data-go-card="${today.id}"><i data-lucide="list"></i>Ver card</button></section>` : ''}

    <section class="spot cut px-5 py-6 md:px-8 md:py-8 flex flex-col gap-6" data-anim>
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex flex-col gap-2">
          <span class="slash s-gold w-fit"><i data-lucide="zap"></i>Próximo evento numerado</span>
          <p class="eyebrow">${esc(feat.name)} · ${fmtDate(feat.date, { weekday: 'long', day: '2-digit', month: 'long' })} · ${esc(feat.venue)}, ${esc(feat.city)}</p>
        </div>
        <div class="cd" aria-label="Contagem regressiva">
          <div class="cd-cell"><b data-count="${dLeft}">${dLeft}</b><span>dias</span></div>
          <div class="cd-cell"><b>${feat.bouts.length}</b><span>lutas</span></div>
          <div class="cd-cell"><b>${feat.bouts.filter(b => /Cinturão/.test(b.label)).length}</b><span>títulos</span></div>
        </div>
      </div>
      <div class="spot-names">
        <button class="text-left min-w-0" data-fighter="${A.id}"><span class="disp spot-name text-blood"><small>${esc(firstName(A.name))} ${A.champ ? '· campeão' : A.rank ? '· #' + A.rank : ''}</small>${esc(lastName(A.name))}</span></button>
        <span class="spot-vs">vs</span>
        <button class="text-right min-w-0 b" data-fighter="${Bf.id}"><span class="disp spot-name text-gold"><small>${esc(firstName(Bf.name))} ${Bf.champ ? '· campeão' : Bf.rank ? '· #' + Bf.rank : ''}</small>${esc(lastName(Bf.name))}</span></button>
      </div>
      <div class="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <span class="eyebrow">${esc(fm.label)} · ${esc(divName(fm.div))}</span>
        ${co ? `<span class="text-fg2 text-sm">Co-principal: <b class="text-fg">${esc(F(co.a).name)} × ${esc(F(co.b).name)}</b> · ${esc(co.label || divName(co.div))}</span>` : ''}
        <span class="ml-auto flex gap-2">
          ${A.hasStats && Bf.hasStats ? `<button class="btn btn-hot" data-sim="${A.id}|${Bf.id}"><i data-lucide="radar"></i>Simular confronto</button>` : ''}
          <button class="btn" data-go-card="${feat.id}"><i data-lucide="list"></i>Card completo</button>
        </span>
      </div>
    </section>

    <section class="panel grid grid-cols-2 md:grid-cols-5" data-anim>
      <div class="kpi"><span class="eyebrow">Lutadores na base</span><b data-count="${STATS.fighters}">${STATS.fighters}</b><small>${STATS.profiled} com estatísticas de carreira</small></div>
      <div class="kpi"><span class="eyebrow">Eventos no arquivo</span><b data-count="${STATS.events}">${STATS.events}</b><small>${STATS.years[0]}–${STATS.years[STATS.years.length - 1]}</small></div>
      <div class="kpi"><span class="eyebrow">Lutas registradas</span><b data-count="${STATS.bouts}">${STATS.bouts}</b><small>destaques de cada card</small></div>
      <div class="kpi"><span class="eyebrow">Taxa de finalização</span><b data-count="${STATS.finishRate}" data-suffix="%">${STATS.finishRate}%</b><small>${STATS.ko} KO/TKO · ${STATS.sub} finalizações</small></div>
      <div class="kpi col-span-2 md:col-span-1"><span class="eyebrow">Disputas de cinturão</span><b data-count="${STATS.titles}">${STATS.titles}</b><small>no período do arquivo</small></div>
    </section>

    <section>
      <div class="flex flex-wrap items-end justify-between gap-3 mb-3"><div><p class="eyebrow">11 divisões · ${fmtDate(DATA_AS_OF)}</p><h2 class="sec-title">Cinturões</h2></div><button class="btn" data-go="rankings"><i data-lucide="trophy"></i>Rankings completos</button></div>
      <div class="grid gap-3 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">${belts}
        <div class="panel pad flex flex-col justify-between gap-3" data-anim><p class="eyebrow">Peso por peso · masculino</p><div>${P4P.men.slice(0, 3).map((n, i) => `<p class="flex gap-3 items-baseline"><span class="num text-muted text-xs">${i + 1}</span><b class="font-semibold">${esc(n)}</b></p>`).join('')}</div><button class="btn btn-sm w-fit" data-go="rankings">Ver P4P</button></div>
      </div>
    </section>

    <section class="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div class="panel pad" data-anim><div class="flex flex-wrap items-end justify-between gap-3 mb-2"><div><p class="eyebrow">2025 – 2026 · passe o mouse nos pontos</p><h2 class="sec-title sm">Mapa de mudanças de título</h2></div><div class="legend"><span><i style="background:${C.gold}"></i>novo campeão</span><span><i style="background:${C.blood}"></i>cinturão interino ou vago</span></div></div>
        <div id="ch-titles" class="chart tall" role="img" aria-label="Mudanças de título por divisão ao longo do tempo"></div></div>
      <div class="panel pad flex flex-col" data-anim><div class="flex items-end justify-between gap-3 mb-2"><div><p class="eyebrow">Últimos eventos</p><h2 class="sec-title sm">Resultados</h2></div><button class="btn btn-sm" data-go="arquivo">Arquivo</button></div>
        <div class="flex flex-col">${recent.map(b => `<button class="hist-item" data-bout="${b.id}"><span class="slash ${b.method === 'KO/TKO' ? 's-blood' : b.method === 'Finalização' ? 's-gold' : 's-ink'}">${b.nc ? 'NC' : b.method === 'Decisão' ? 'DEC' : b.method === 'KO/TKO' ? 'KO' : 'FIN'}</span><span class="min-w-0"><span class="block font-semibold truncate">${esc(F(b.red).name)} <span class="text-muted font-normal">${b.nc ? '×' : 'def.'}</span> ${esc(F(b.gold).name)}</span><span class="block text-xs text-muted truncate">${esc(b.ev.name)} · ${esc(methodShort(b))}</span></span><i data-lucide="chevron-right" class="text-muted"></i></button>`).join('')}</div></div>
    </section>

    <section class="grid gap-5 lg:grid-cols-3">
      <div class="panel pad lg:col-span-1" data-anim><p class="eyebrow">Por ano · lutas do arquivo</p><h2 class="sec-title sm mb-2">Como as lutas terminam</h2><div id="ch-methods" class="chart" role="img" aria-label="Métodos de vitória por ano"></div></div>
      <div class="panel pad" data-anim><div class="flex items-end justify-between mb-2"><h2 class="sec-title sm">P4P masculino</h2><span class="eyebrow">top 10</span></div>${p4pList(P4P.men, false)}</div>
      <div class="panel pad" data-anim><div class="flex items-end justify-between mb-2"><h2 class="sec-title sm">P4P feminino</h2><span class="eyebrow">top 10</span></div>${p4pList(P4P.women, true)}</div>
    </section>`,
    after() {
      const ys = DIVS.map(d => d.name);
      chart('ch-titles', {
        grid: { left: 92, right: 18, top: 10, bottom: 34 },
        tooltip: { trigger: 'item', formatter: p => tipFmt(p.data.name, [[DIV[p.data.div].name, fmtDate(p.data.date)], ['', esc(p.data.note)]]) },
        xAxis: { type: 'time', min: '2025-01-01', max: '2026-12-31', axisLabel: { formatter: v => new Date(v).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '') } },
        yAxis: { type: 'category', data: ys, inverse: true, axisLabel: { color: C.fg2, fontFamily: 'Hanken Grotesk, sans-serif', fontSize: 11 }, splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,.04)' } } },
        series: [{
          type: 'scatter', symbol: 'diamond', symbolSize: 15,
          data: TITLE_CHANGES.map(([date, div, name, note]) => ({ value: [date, DIV[div].name], date, div, name, note, itemStyle: { color: /interino|vaga|vago/i.test(note) ? C.blood : C.gold, borderColor: C.ink, borderWidth: 2 } })),
          markLine: { silent: true, symbol: 'none', label: { formatter: 'hoje', color: C.muted, fontFamily: 'Martian Mono', fontSize: 10 }, lineStyle: { color: C.fg2, type: 'dashed', opacity: .5 }, data: [{ xAxis: DATA_AS_OF }] }
        }]
      });
      chart('ch-methods', {
        grid: { left: 36, right: 8, top: 30, bottom: 26 },
        legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: C.fg2, fontSize: 11 } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: { type: 'category', data: STATS.perYear.map(p => p.y) },
        yAxis: { type: 'value', minInterval: 1 },
        series: [['KO/TKO', 'ko', C.blood], ['Finalização', 'sub', C.gold], ['Decisão', 'dec', C.line2]].map(([n, k, c]) => ({ name: n, type: 'bar', stack: 'm', barWidth: '46%', itemStyle: { color: c }, data: STATS.perYear.map(p => p[k]) }))
      });
    }
  };
}

/* =====================================================================
   8. VIEW · RANKINGS
   ===================================================================== */
function lastResult(id) { const b = fighterBouts(id)[0]; if (!b) return ''; const r = resultFor(b, id), opp = b.red === id ? b.gold : b.red; return `<span class="flex items-center gap-2 text-xs text-muted justify-end"><span class="res res-${r}">${r}</span><span class="hidden sm:inline truncate max-w-[180px]">vs ${esc(lastName(F(opp).name))} · ${esc(b.ev.name.replace('UFC Fight Night: ', 'FN · '))}</span></span>`; }
function viewRankings() {
  const d = state.rdiv, R = RANKINGS[d], champ = F(slug(R.champ)), since = champSince(d, champ.id), nx = nextFight(champ.id);
  const chips = DIVS.map(x => `<button class="chip" data-rdiv="${x.id}" aria-pressed="${x.id === d}">${esc(x.name)}</button>`).join('');
  const p4p = (list, w) => list.map((n, i) => { const f = F(slug(n)); return `<button class="p4p-row" data-fighter="${f.id}"><span class="n">${i + 1}</span><span class="min-w-0"><span class="block font-semibold truncate">${esc(f.name)}</span><span class="block text-[11px] text-muted">${esc(divName(f.div))}${f.champ ? ' · campeão' + (w ? 'a' : '') : ''}</span></span>${f.champ ? '<i data-lucide="crown" class="text-gold"></i>' : '<span></span>'}</button>`; }).join('');
  return {
    html: `
    <div class="flex flex-wrap items-end justify-between gap-3"><div><p class="eyebrow">Release oficial de 25/08/2026 · ajustes até ${fmtDate(DATA_AS_OF)}</p><h1 class="sec-title" style="font-size:34px">Rankings</h1></div></div>
    <div class="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Divisão">${chips}</div>
    <section class="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div class="flex flex-col gap-4 min-w-0">
        <div class="champ-card cut" data-anim>
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <span class="slash s-gold"><i data-lucide="crown"></i>Campeão${DIV[d].w ? 'a' : ''} · ${esc(DIV[d].name)} · ${DIV[d].lb} lb (${nf(DIV[d].kg, 1)} kg)</span>
              <button class="block text-left mt-3" data-fighter="${champ.id}"><span class="disp block" style="font-size:clamp(40px,6vw,76px)">${esc(champ.name)}</span></button>
              ${champ.nick ? `<p class="hero-nick mt-1">“${esc(champ.nick)}”</p>` : ''}
            </div>
            <div class="text-right"><span class="record-big block">${champ.rec ? `${champ.rec[0]}<em>-</em>${champ.rec[1]}<em>-</em>${champ.rec[2]}` : '—'}</span><span class="eyebrow">V · D · E</span></div>
          </div>
          <div class="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-sm text-fg2 border-t border-line pt-4">
            ${since ? `<span><span class="eyebrow block">No topo desde</span>${fmtDate(since)}</span>` : ''}
            ${champ.country ? `<span><span class="eyebrow block">País</span>${esc(champ.country)}</span>` : ''}
            ${champ.p4p ? `<span><span class="eyebrow block">Peso por peso</span>#${champ.p4p}</span>` : ''}
            <span><span class="eyebrow block">Próxima defesa</span>${nx ? `vs ${esc(F(nx.opp).name)} · ${esc(nx.ev.name)} (${fmtDate(nx.ev.date, { day: '2-digit', month: 'short' })})` : 'não anunciada'}</span>
          </div>
        </div>
        ${R.note ? `<div class="notice" data-anim><i data-lucide="info"></i><span>${esc(R.note)}</span></div>` : ''}
        <div class="panel" data-anim>
          ${R.list.map((n, i) => { const f = F(slug(n)); return `<button class="rank-row" data-fighter="${f.id}"><span class="rank-n">${i + 1}</span><span class="min-w-0"><span class="rank-name block">${esc(f.name)}</span><span class="block text-xs text-muted">${[f.country, f.rec && recStr(f.rec), f.p4p && `P4P #${f.p4p}`].filter(Boolean).map(esc).join(' · ') || 'perfil sem estatísticas detalhadas'}</span></span>${lastResult(f.id)}<i data-lucide="${f.hasStats ? 'bar-chart-3' : 'chevron-right'}" class="${f.hasStats ? 'text-gold' : 'text-muted'}" ${f.hasStats ? 'data-tip="Com estatísticas de carreira"' : ''}></i></button>`; }).join('')}
        </div>
      </div>
      <aside class="flex flex-col gap-5 min-w-0">
        <div class="panel pad" data-anim><div class="flex items-end justify-between mb-2"><h2 class="sec-title sm">P4P masculino</h2><span class="eyebrow">25/08/2026</span></div>${p4p(P4P.men, false)}</div>
        <div class="panel pad" data-anim><div class="flex items-end justify-between mb-2"><h2 class="sec-title sm">P4P feminino</h2><span class="eyebrow">25/08/2026</span></div>${p4p(P4P.women, true)}</div>
      </aside>
    </section>`
  };
}

/* =====================================================================
   9. VIEW · LUTADORES
   ===================================================================== */
function rosterList() {
  const q = fold(state.rq.trim());
  return Object.values(FIGHTERS).filter(f => f.div && (!state.fdiv || f.div === state.fdiv) && (!state.onlyStats || f.hasStats) && (!q || fold(`${f.name} ${f.nick || ''} ${f.country || ''}`).includes(q)))
    .sort((a, b) => (DIV[a.div].order - DIV[b.div].order) || ((a.champ ? 0 : a.rank ?? 99) - (b.champ ? 0 : b.rank ?? 99)) || a.name.localeCompare(b.name));
}
function rosterItem(f) {
  return `<button class="roster-item" data-fighter="${f.id}" aria-current="${f.id === state.fighter}">
    <span class="ri-rank ${f.champ ? 'c' : ''}">${rankShort(f)}</span>
    <span class="min-w-0"><span class="ri-name">${esc(f.name)}</span><span class="ri-meta">${esc(divName(f.div))}${f.rec ? ' · ' + recStr(f.rec) : ''}</span></span>
    ${f.hasStats ? '<i data-lucide="bar-chart-3" class="text-gold" style="width:14px;height:14px"></i>' : '<span></span>'}</button>`;
}
function metricRow(f, k) {
  const m = METRICS[k], R = RANGE[k], v = f[k], dv = divAvg(f.div, k);
  const pos = x => clamp((x - R.min) / ((R.max - R.min) || 1) * 100, 0, 100);
  const good = m.low ? v < R.avg : v > R.avg;
  const t = `${m.label}\n${f.name}: ${fmtMetric(k, v)}\nMédia do elenco: ${fmtMetric(k, R.avg)}\nMédia da divisão: ${fmtMetric(k, dv)}${m.low ? '\nMenor é melhor' : ''}`;
  return `<div tabindex="0" data-tip="${esc(t)}"><div class="metric-top"><span class="font-semibold text-[13px]">${m.short}</span><span class="metric-val ${good ? 'good' : ''}">${fmtMetric(k, v)}</span></div>
    <div class="metric-bar"><span data-grow style="width:${pos(v)}%"></span><i style="left:${pos(R.avg)}%"></i><u style="left:${pos(dv)}%"></u></div>
    <p class="text-[11px] text-muted mt-1">${m.label}${m.low ? ' · menor é melhor' : ''}</p></div>`;
}
function historyList(f, bouts) {
  if (!bouts.length) return '<p class="empty">Sem lutas deste atleta nos cards do arquivo (2024–2026).</p>';
  return bouts.map(b => { const r = resultFor(b, f.id), opp = b.red === f.id ? b.gold : b.red; return `<button class="hist-item" data-bout="${b.id}"><span class="res res-${r}">${r}</span><span class="min-w-0"><span class="block font-semibold truncate">vs ${esc(F(opp).name)}</span><span class="block text-xs text-muted truncate">${esc(b.ev.name)} · ${fmtDate(b.ev.date, { month: 'short', year: 'numeric' })} · ${esc(methodShort(b))} ${b.est ? '≈' : ''}</span></span><i data-lucide="activity" class="text-muted"></i></button>`; }).join('');
}
function profileHtml(f) {
  const bouts = fighterBouts(f.id), nx = nextFight(f.id), d = f.div ? DIV[f.div] : null, st = f.hasStats ? styleOf(f) : null;
  const first = firstName(f.name), last = lastName(f.name), ape = f.hasStats ? f.reach - f.h : 0;
  const finPct = f.hasStats ? Math.round((f.wins.ko + f.wins.sub) / Math.max(1, f.rec[0]) * 100) : 0;
  const hero = `<section class="hero cut" data-anim>
    <div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] items-end">
      <div class="min-w-0">
        <div class="flex flex-wrap gap-2 items-center">${rankTag(f)}${f.p4p ? `<span class="slash s-ink">P4P${f.p4pW ? ' (F)' : ''} #${f.p4p}</span>` : ''}${d ? `<span class="eyebrow ml-1">${esc(d.name)} · ${d.id === 'heavy' ? 'até ' : ''}${d.lb} lb</span>` : ''}</div>
        <h1 class="disp hero-name mt-3">${first ? esc(first) + '<br>' : ''}<span>${esc(last)}</span></h1>
        ${f.nick ? `<p class="hero-nick mt-2">“${esc(f.nick)}”</p>` : ''}
        ${f.hasStats ? `<p class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg2 mt-3"><span class="inline-flex items-center gap-1.5"><i data-lucide="flag"></i>${esc(f.country)}</span><span class="inline-flex items-center gap-1.5"><i data-lucide="dumbbell"></i>${esc(f.team)}</span></p>` : ''}
      </div>
      ${f.rec ? `<div class="md:text-right"><span class="record-big block" aria-label="Cartel ${recStr(f.rec)}">${f.rec[0]}<em>-</em>${f.rec[1]}<em>-</em>${f.rec[2]}</span><span class="eyebrow">V · D · E${f.rec[3] ? ` · ${f.rec[3]} NC` : ''} · aprox.</span></div>` : ''}
    </div></section>`;
  const nextCard = nx ? `<div class="live-strip" data-anim><i data-lucide="calendar-clock" class="text-blood"></i><span class="min-w-0"><span class="eyebrow block">Próxima luta · ${esc(nx.ev.name)} · ${fmtDate(nx.ev.date)}</span><b class="font-semibold">vs ${esc(F(nx.opp).name)}</b> <span class="text-fg2">· ${esc(divName(nx.bout.div))}${nx.bout.label ? ' · ' + esc(nx.bout.label) : ''}</span></span>
    ${f.hasStats && F(nx.opp).hasStats ? `<button class="btn btn-sm ml-auto" data-sim="${f.id}|${nx.opp}"><i data-lucide="radar"></i>Simular</button>` : ''}</div>` : '';
  if (!f.hasStats) {
    return `${hero}${nextCard}
    <div class="notice" data-anim><i data-lucide="info"></i><span>Este perfil está na base pelo ranking e pelos resultados do arquivo, mas ainda não tem estatísticas de carreira carregadas. Com a API conectada, as métricas, o radar e as tendências aparecem aqui.</span></div>
    <section class="panel pad" data-anim><h2 class="sec-title sm mb-2">Lutas no arquivo</h2>${historyList(f, bouts)}</section>`;
  }
  return `${hero}${nextCard}
  <dl class="bio" data-anim>
    <div><dt class="eyebrow">Idade</dt><dd>${ageOf(f.dob) ?? '—'}${f.dob ? ' anos' : ''}</dd></div>
    <div><dt class="eyebrow">Altura</dt><dd>${f.h} cm<small>${ftIn(f.h)}</small></dd></div>
    <div><dt class="eyebrow">Envergadura</dt><dd>${f.reach} cm<small>${nf(f.reach / 2.54, 0)}″</small></dd></div>
    <div><dt class="eyebrow">Índice de envergadura</dt><dd>${ape > 0 ? '+' : ''}${ape} cm<small>env. − altura</small></dd></div>
    <div><dt class="eyebrow">Base</dt><dd>${esc(f.stance)}</dd></div>
    <div><dt class="eyebrow">Equipe</dt><dd>${esc(f.team)}</dd></div>
    <div><dt class="eyebrow">Nascimento</dt><dd>${f.dob ? fmtDate(f.dob) : '—'}</dd></div>
    <div><dt class="eyebrow">Vitórias antes do limite</dt><dd>${finPct}%<small>KO + fin.</small></dd></div>
  </dl>
  <section class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
    <div class="panel pad" data-anim>
      <div class="flex flex-wrap items-end justify-between gap-2"><div><p class="eyebrow">Percentil no elenco</p><h2 class="sec-title sm">Radar do octógono</h2></div><div class="legend"><span><i style="background:${C.blood}"></i>${esc(lastName(f.name))}</span><span><i style="background:${C.gold}"></i>média ${esc(divName(f.div).toLowerCase())}</span></div></div>
      <div id="pf-radar" class="chart tall" role="img" aria-label="Radar de atributos em formato de octógono"></div>
      <div class="flex items-center gap-3 border-t border-line pt-3"><i data-lucide="scan-line" class="text-gold"></i><div><p class="eyebrow">Arquétipo do motor de estilo</p><p class="disp" style="font-size:24px">${st.label}</p></div><p class="ml-auto num text-xs text-fg2 text-right">Trocação <b class="text-fg">${st.s}</b><br>Grappling <b class="text-fg">${st.g}</b></p></div>
    </div>
    <div class="panel pad" data-anim>
      <div class="flex flex-wrap items-end justify-between gap-2 mb-4"><div><p class="eyebrow">Carreira no UFC · aprox.</p><h2 class="sec-title sm">Métricas</h2></div><span class="legend"><span><i style="background:${C.fg}"></i>elenco</span><span><i style="background:${C.gold}"></i>divisão</span></span></div>
      <div class="grid gap-4 sm:grid-cols-2">${STAT_KEYS.map(k => metricRow(f, k)).join('')}</div>
    </div>
  </section>
  <section class="grid gap-5 lg:grid-cols-3">
    <div class="panel pad lg:col-span-2" data-anim><div class="flex flex-wrap items-end justify-between gap-2"><div><p class="eyebrow">Lutas do arquivo · estatísticas simuladas</p><h2 class="sec-title sm">Volume de golpes por luta</h2></div><div class="legend"><span><i style="background:${C.blood}"></i>conectados</span><span><i style="background:${C.line2}"></i>absorvidos</span><span><i style="background:${C.gold}"></i>controle</span></div></div>
      <div id="pf-vol" class="chart" role="img" aria-label="Golpes conectados e absorvidos por luta"></div></div>
    <div class="panel pad" data-anim><p class="eyebrow">${f.rec[0]} vitórias</p><h2 class="sec-title sm">Método de vitória</h2><div id="pf-win" class="chart short" role="img" aria-label="Distribuição dos métodos de vitória"></div>
      <div class="flex flex-col gap-1.5 mt-2">${[['KO/TKO', f.wins.ko, C.blood], ['Finalização', f.wins.sub, C.gold], ['Decisão', f.wins.dec, C.fg2]].map(([l, v, c]) => `<div class="grid grid-cols-[12px_1fr_auto_auto] gap-2 items-center text-sm"><i class="w-3 h-3" style="background:${c}"></i><span>${l}</span><b class="num text-xs">${v}</b><span class="num text-xs text-muted w-10 text-right">${Math.round(v / f.rec[0] * 100)}%</span></div>`).join('')}</div></div>
  </section>
  <section class="panel pad" data-anim><div class="flex flex-wrap items-end justify-between gap-2 mb-1"><h2 class="sec-title sm">Lutas no arquivo</h2><button class="btn btn-sm" data-h2h="${f.id}"><i data-lucide="arrow-left-right"></i>Comparar no H2H</button></div>${historyList(f, bouts)}</section>`;
}
function mountProfile(f) {
  if (!f.hasStats) return;
  const keys = [['Volume', 'slpm'], ['Precisão', 'acc'], ['Defesa', 'def'], ['Resistência', 'sapm'], ['Poder', 'kd'], ['Quedas', 'td'], ['Def. quedas', 'tdDef'], ['Finalização', 'sub']];
  const divProfile = Object.fromEntries(STAT_KEYS.map(k => [k, divAvg(f.div, k)]));
  chart('pf-radar', radarOption(keys, [{ name: f.name, f, color: C.blood, fill: 'rgba(255,45,70,.22)' }, { name: 'Média da divisão', f: divProfile, color: C.gold, fill: 'rgba(242,179,61,.06)', dashed: true }]));
  const bouts = fighterBouts(f.id).slice().reverse().slice(-8);
  if (bouts.length < 2) { const el = $('#pf-vol'); if (el) el.innerHTML = '<p class="empty">Poucas lutas no arquivo para traçar uma tendência. Conecte o histórico completo pela API.</p>'; }
  else {
    const rows = bouts.map(b => { const dt = fightDetail(b.id), me = b.red === f.id ? 0 : 1; return { b, opp: F(me ? b.red : b.gold).name, landed: dt.totals[me].sig[0], absorbed: dt.totals[1 - me].sig[0], ctrl: dt.totals[me].ctrl, res: resultFor(b, f.id) }; });
    chart('pf-vol', {
      grid: { left: 38, right: 46, top: 16, bottom: 46 },
      tooltip: { trigger: 'axis', formatter: ps => { const r = rows[ps[0].dataIndex]; return tipFmt(`vs ${r.opp}`, [[r.b.ev.name, r.res === 'V' ? 'vitória' : r.res === 'D' ? 'derrota' : 'NC'], ['Conectados', r.landed], ['Absorvidos', r.absorbed], ['Controle', mmss(r.ctrl)]]); } },
      xAxis: { type: 'category', data: rows.map(r => lastName(r.opp)), axisLabel: { interval: 0, rotate: rows.length > 5 ? 30 : 0 } },
      yAxis: [{ type: 'value' }, { type: 'value', axisLabel: { formatter: v => mmss(v) }, splitLine: { show: false } }],
      series: [
        { name: 'Controle', type: 'bar', yAxisIndex: 1, barWidth: '38%', itemStyle: { color: 'rgba(242,179,61,.28)', borderColor: C.gold, borderWidth: 1 }, data: rows.map(r => r.ctrl) },
        { name: 'Conectados', type: 'line', smooth: .3, symbolSize: 8, lineStyle: { width: 3, color: C.blood }, itemStyle: { color: C.blood }, areaStyle: { color: grad('rgba(255,45,70,.35)', 'rgba(255,45,70,0)') }, data: rows.map(r => ({ value: r.landed, symbol: r.res === 'V' ? 'circle' : 'emptyCircle' })) },
        { name: 'Absorvidos', type: 'line', smooth: .3, symbolSize: 6, lineStyle: { width: 2, color: C.line2 }, itemStyle: { color: C.line2 }, data: rows.map(r => r.absorbed) }
      ]
    });
  }
  chart('pf-win', {
    tooltip: { trigger: 'item', formatter: p => tipFmt(p.name, [['Vitórias', p.value], ['Parcela', p.percent + '%']]) },
    title: { text: String(f.rec[0]), subtext: 'vitórias', left: 'center', top: '36%', textStyle: { color: C.fg, fontFamily: 'Anybody', fontSize: 30, fontWeight: 800 }, subtextStyle: { color: C.muted, fontFamily: 'Martian Mono', fontSize: 9 } },
    series: [{ type: 'pie', radius: ['58%', '84%'], padAngle: 2, itemStyle: { borderColor: C.panel, borderWidth: 2 }, label: { show: false }, data: [{ name: 'KO/TKO', value: f.wins.ko, itemStyle: { color: C.blood } }, { name: 'Finalização', value: f.wins.sub, itemStyle: { color: C.gold } }, { name: 'Decisão', value: f.wins.dec, itemStyle: { color: C.fg2 } }] }]
  });
}
function radarOption(keys, sets) {
  return {
    tooltip: { trigger: 'item', formatter: p => tipFmt(p.name, keys.map((k, i) => [k[0], `percentil ${p.value[i]}`])) },
    radar: {
      shape: 'polygon', startAngle: 112.5, splitNumber: 4, radius: '68%', center: ['50%', '52%'],
      indicator: keys.map(k => ({ name: k[0], max: 100 })),
      axisName: { color: C.fg2, fontFamily: 'Martian Mono, monospace', fontSize: 10 },
      splitLine: { lineStyle: { color: [C.line, C.line, C.line, C.line2] } },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,.012)', 'rgba(255,255,255,.028)'] } },
      axisLine: { lineStyle: { color: C.line } }
    },
    series: [{ type: 'radar', symbol: 'circle', symbolSize: 5,
      data: sets.map(s => ({ name: s.name, value: keys.map(k => Math.round(pctl(s.f, k[1]))), lineStyle: { color: s.color, width: 2, type: s.dashed ? 'dashed' : 'solid' }, itemStyle: { color: s.color }, areaStyle: { color: s.fill } })) }]
  };
}
function viewLutadores() {
  const list = rosterList();
  if (!F(state.fighter)) state.fighter = list[0]?.id || 'justin-gaethje';
  const f = F(state.fighter);
  return {
    html: `<div class="grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)] items-start">
      <aside class="roster panel" aria-label="Elenco">
        <div class="p-3 flex flex-col gap-2 border-b border-line">
          <div class="flex items-center justify-between"><span class="eyebrow">Elenco</span><span class="num text-xs text-fg2">${list.length} de ${STATS.fighters}</span></div>
          <label class="sr-only" for="rq">Filtrar lutadores</label><input id="rq" class="input w-full" type="search" placeholder="Filtrar por nome ou país" value="${esc(state.rq)}">
          <div class="flex gap-2"><label class="sr-only" for="fdiv">Divisão</label><select id="fdiv" class="sel sel-sm flex-1"><option value="">Todas as divisões</option>${DIVS.map(d => `<option value="${d.id}" ${state.fdiv === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>
            <button class="chip" id="onlyStats" aria-pressed="${state.onlyStats}" data-tip="Mostrar só quem tem estatísticas de carreira"><i data-lucide="bar-chart-3"></i>Stats</button></div>
        </div>
        <div class="roster-list" id="rosterList">${list.length ? list.map(rosterItem).join('') : '<p class="empty px-2">Nenhum lutador com esses filtros.</p>'}</div>
      </aside>
      <div class="flex flex-col gap-5 min-w-0">${profileHtml(f)}</div></div>`,
    after() {
      mountProfile(f);
      $('.roster-item[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const refresh = () => { const l = rosterList(); $('#rosterList').innerHTML = l.length ? l.map(rosterItem).join('') : '<p class="empty px-2">Nenhum lutador com esses filtros.</p>'; icons(); };
      $('#rq').addEventListener('input', e => { state.rq = e.target.value; refresh(); });
      $('#fdiv').addEventListener('change', e => { state.fdiv = e.target.value; refresh(); });
      $('#onlyStats').addEventListener('click', e => { state.onlyStats = !state.onlyStats; e.currentTarget.setAttribute('aria-pressed', String(state.onlyStats)); refresh(); });
    }
  };
}

/* =====================================================================
   10. VIEW · ANÁLISE DE LUTA
   ===================================================================== */
function cmpRow(label, a, b, fa = a, fb = b) {
  const t = a + b, pa = t ? a / t * 100 : 50;
  return `<div><div class="cmp-vals"><span class="a ${a > b ? 'lead' : ''}">${fa}</span><span class="cmp-label">${label}</span><span class="b ${b > a ? 'lead' : ''}">${fb}</span></div>
    <div class="cmp-bar ${t ? '' : 'zero'}"><span style="width:${pa}%;background:${C.blood}"></span><span style="width:${100 - pa}%;background:${C.gold}"></span></div></div>`;
}
function bodyMap(st, side, name) {
  const rgb = side ? 'var(--gold-rgb)' : 'var(--blood-rgb)', total = st.sig[0], reg = { head: st.head, body: st.body, leg: st.leg };
  const max = Math.max(1, st.head[0], st.body[0], st.leg[0]), fill = k => `fill:rgb(${rgb} / ${(.1 + .82 * reg[k][0] / max).toFixed(2)})`;
  const share = k => total ? Math.round(reg[k][0] / total * 100) : 0, lab = { head: 'Cabeça', body: 'Tronco', leg: 'Pernas' };
  const t = k => esc(`${lab[k]} · ${name}\n${reg[k][0]} de ${reg[k][1]} conectados (${pctStr(reg[k][0], reg[k][1])} de acerto)\n${share(k)}% dos golpes significativos`);
  return `<div class="grid grid-cols-[104px_minmax(0,1fr)] gap-4 items-center">
    <svg viewBox="0 0 120 256" class="w-[104px] h-auto overflow-visible" role="img" aria-label="Mapa de golpes conectados por ${esc(name)}">
      <path class="bm-neutral" d="M31 60 L20 64 L11 128 L21 131 L32 84 Z"/><path class="bm-neutral" d="M89 60 L100 64 L109 128 L99 131 L88 84 Z"/><rect class="bm-neutral" x="53" y="46" width="14" height="10"/>
      <circle class="bm-region" cx="60" cy="27" r="20" style="${fill('head')}" data-tip="${t('head')}" tabindex="0"/>
      <path class="bm-region" d="M33 58 Q60 50 87 58 L83 140 Q60 147 37 140 Z" style="${fill('body')}" data-tip="${t('body')}" tabindex="0"/>
      <g data-tip="${t('leg')}" tabindex="0"><path class="bm-region" d="M38 147 L58 149 L56 250 L41 250 Z" style="${fill('leg')}"/><path class="bm-region" d="M62 149 L82 147 L79 250 L64 250 Z" style="${fill('leg')}"/></g>
      <text class="bm-text" x="60" y="31">${share('head')}%</text><text class="bm-text" x="60" y="102">${share('body')}%</text><text class="bm-text" x="60" y="205">${share('leg')}%</text>
    </svg>
    <div class="flex flex-col gap-2 min-w-0"><span class="disp" style="font-size:20px;color:${side ? C.gold : C.blood}">${esc(lastName(name))}</span><span class="eyebrow">${total} golpes sig. conectados</span>
      ${['head', 'body', 'leg'].map(k => `<div class="flex justify-between gap-2 text-xs border-b border-dashed border-line pb-1"><span>${lab[k]}</span><span class="num text-muted"><b class="text-fg">${reg[k][0]}/${reg[k][1]}</b> · ${share(k)}%</span></div>`).join('')}</div></div>`;
}
function posBar(st, side, name) {
  const rgb = side ? 'var(--gold-rgb)' : 'var(--blood-rgb)', tot = st.sig[0] || 1, segs = [['Distância', st.dist, 1], ['Clinch', st.clinch, .62], ['Solo', st.ground, .34]];
  return `<div><div class="flex justify-between text-xs mb-1.5"><b class="disp" style="font-size:17px;color:${side ? C.gold : C.blood}">${esc(lastName(name))}</b><span class="num text-muted">${st.sig[0]} conectados</span></div>
    <div class="posbar">${segs.map(([l, v, a]) => `<span style="width:${v[0] / tot * 100}%;background:rgb(${rgb} / ${a})" data-tip="${esc(`${l} · ${name}\n${v[0]} de ${v[1]} (${pctStr(v[0], v[1])})`)}" tabindex="0">${v[0] / tot > .1 ? v[0] : ''}</span>`).join('')}</div>
    <div class="flex flex-wrap gap-x-4 text-[11px] text-muted mt-1">${segs.map(([l, v]) => `<span>${l} <b class="num text-fg2">${v[0]}/${v[1]}</b></span>`).join('')}</div></div>`;
}
function progRow(label, aTxt, bTxt, aF, bF, note = '') {
  return `<div><div class="flex justify-between gap-2 eyebrow mb-1.5"><span>${label}</span><span>${note}</span></div>
    ${[[aTxt, aF, C.blood], [bTxt, bF, C.gold]].map(([t, fr, c]) => `<div class="grid grid-cols-[minmax(0,1fr)_128px] gap-3 items-center mt-1.5"><div class="prog-track"><span style="width:${clamp(fr, 0, 1) * 100}%;background:${c}"></span></div><span class="num text-xs text-right whitespace-nowrap">${t}</span></div>`).join('')}</div>`;
}
const MARK = { td: 'Q', kd: 'KD', sub: 'F', rev: 'I', end: '■' };
function timelineHtml(d, rounds) {
  const N = [F(d.bout.red).name, F(d.bout.gold).name];
  const rows = rounds.map(rd => `<div class="grid grid-cols-[34px_minmax(0,1fr)] gap-2.5 items-center"><span class="disp text-muted" style="font-size:16px">R${rd.n}</span><div class="tl-track">
    ${[60, 120, 180, 240].map(s => `<span class="tl-tick" style="left:${s / 3}%"></span>`).join('')}
    ${rd.dur < 300 ? `<span class="tl-over" style="width:${(300 - rd.dur) / 3}%" data-tip="Luta encerrada em ${mmss(rd.dur)}"></span>` : ''}
    ${rd.events.map(ev => `<span class="tl-mark ${ev.type === 'end' ? 'end' : ev.side ? 'g' : 'r'} ${ev.type === 'kd' ? 'kd' : ''}" style="left:${ev.t / 3}%" tabindex="0" data-tip="${esc(`R${rd.n} · ${mmss(ev.t)}\n${ev.type === 'end' ? ev.label : `${EVENT_LABEL[ev.type]} · ${N[ev.side]}`}`)}">${MARK[ev.type]}</span>`).join('')}
  </div></div>`).join('');
  const list = rounds.length === 1 ? `<div class="flex flex-col mt-3 max-h-56 overflow-auto">${rounds[0].events.length ? rounds[0].events.map(ev => `<div class="grid grid-cols-[52px_10px_minmax(0,1fr)] gap-2.5 items-center text-sm py-1.5 border-b border-line"><span class="num text-xs text-muted">${mmss(ev.t)}</span><span class="dot ${ev.type === 'end' ? 'dot-n' : ev.side ? 'dot-g' : 'dot-r'}"></span><span>${ev.type === 'end' ? `<b>${esc(ev.label)}</b>` : `${EVENT_LABEL[ev.type]} · <b>${esc(N[ev.side])}</b>`}</span></div>`).join('') : '<p class="empty">Round sem quedas, knockdowns ou tentativas de finalização: decidido em pé.</p>'}</div>` : '';
  return `<div class="flex flex-col gap-3">${rows}</div><div class="flex justify-between num text-[10px] text-muted mt-1.5 ml-[44px]"><span>0:00</span><span>1:00</span><span>2:00</span><span>3:00</span><span>4:00</span><span>5:00</span></div>
    <div class="legend mt-3"><span><b class="num">Q</b> queda</span><span><b class="num">KD</b> knockdown</span><span><b class="num">F</b> tent. de finalização</span><span><b class="num">I</b> inversão</span><span>vermelho em cima · dourado embaixo</span></div>${list}`;
}
function viewLuta() {
  const b = BOUTS[state.bout], ev = b.ev, d = fightDetail(b.id);
  if (state.round !== 'all' && state.round > d.rounds.length) state.round = 'all';
  const sel = state.round === 'all' ? d.rounds : [d.rounds[state.round - 1]], S = state.round === 'all' ? d.totals : sel[0].f;
  const A = F(b.red), Bp = F(b.gold), NA = A.name, NB = Bp.name, winA = b.winner === 'red';
  const elapsed = (b.round - 1) * 300 + toSec(b.time), selDur = sel.reduce((a, r) => a + r.dur, 0);
  const corner = (p, side, won) => `<div class="corner flex flex-col gap-1.5 min-w-0 ${side ? 'items-end text-right' : ''} ${b.nc || won ? '' : 'lost'}">
    <span class="eyebrow" style="color:${side ? C.gold : C.blood}">Canto ${side ? 'dourado' : 'vermelho'} ${rankShort(p) !== '—' ? '· ' + rankShort(p) : ''}</span>
    <button class="text-inherit ${side ? 'text-right' : 'text-left'}" data-fighter="${p.id}"><span class="disp corner-name block"><small>${esc(firstName(p.name))}</small>${esc(lastName(p.name))}</span></button>
    <span class="num text-xs text-fg2">${p.rec ? recStr(p.rec) : esc(divName(b.div))}${p.nick ? ' · “' + esc(p.nick) + '”' : ''}</span>
    ${won ? `<span class="slash s-win w-fit">Vencedor</span>` : ''}</div>`;
  const evOpts = EVENT_LIST.map(e => `<optgroup label="${esc(e.name)} · ${fmtDate(e.date)}">${e.bouts.map(x => `<option value="${x.id}" ${x.id === b.id ? 'selected' : ''}>${esc(F(x.red).name)} vs ${esc(F(x.gold).name)} · ${esc(divName(x.div))}</option>`).join('')}</optgroup>`).join('');
  const subDone = b.method === 'Finalização' && winA && (state.round === 'all' || state.round === b.round) ? 1 : 0;
  const tot = d.rounds.reduce((t, r) => r.score ? [t[0] + r.score[0], t[1] + r.score[1]] : t, [0, 0]);
  return {
    html: `
    <div class="flex flex-wrap gap-2 items-center"><label class="sr-only" for="boutSel">Escolher luta</label><select id="boutSel" class="sel flex-1 basis-80">${evOpts}</select>
      <button class="btn" data-step="-1" aria-label="Luta anterior"><i data-lucide="chevron-left"></i></button><button class="btn" data-step="1" aria-label="Próxima luta"><i data-lucide="chevron-right"></i></button></div>
    <section class="board cut" data-anim>
      <div class="board-grid">${corner(A, 0, winA)}
        <div class="board-mid flex flex-col items-center text-center gap-1.5 px-2">
          <span class="eyebrow">${esc(ev.name)}${b.title ? ' · cinturão' : ''}${b.label ? ' · ' + esc(b.label) : ''}</span>
          <span class="disp" style="font-size:clamp(30px,3.6vw,48px)">${esc(b.method)}</span>
          <span class="text-sm text-fg2">${esc(b.detail)}${b.cards ? ` · ${esc(b.cards)}` : ''}</span>
          <span class="num font-bold text-gold">R${b.round} · ${b.time} ${estMark(b)}</span>
        </div>${corner(Bp, 1, false)}</div>
      <dl class="board-meta">
        <div><dt class="eyebrow">Data</dt><dd>${fmtDate(ev.date)}</dd></div>
        <div><dt class="eyebrow">Local</dt><dd>${esc(ev.venue)}, ${esc(ev.city)}</dd></div>
        <div><dt class="eyebrow">Divisão</dt><dd>${esc(divName(b.div))} · ${DIV[b.div].lb} lb</dd></div>
        <div><dt class="eyebrow">Árbitro</dt><dd class="text-fg2" data-tip="Não informado nas fontes consultadas; chega pela API" tabindex="0">não informado</dd></div>
        <div><dt class="eyebrow">Duração oficial</dt><dd class="num">${mmss(elapsed)} <span class="text-muted font-normal">de ${b.sched * 5}:00</span></dd></div>
      </dl>
    </section>
    <div class="notice"><i data-lucide="info"></i><span>Resultado, método, round, tempo e placares seguem o registro do evento. As estatísticas round a round são simuladas a partir do perfil de cada lutador para demonstrar as visualizações; com a API de estatísticas, os números oficiais entram no mesmo formato.</span></div>
    <div class="flex flex-wrap gap-1.5 items-center" role="tablist" aria-label="Rounds">
      <button class="rtab" role="tab" data-round="all" aria-selected="${state.round === 'all'}">Luta toda</button>
      ${d.rounds.map(r => `<button class="rtab" role="tab" data-round="${r.n}" aria-selected="${state.round === r.n}"><span class="dot ${r.finished ? 'dot-n' : r.winner ? 'dot-g' : 'dot-r'}"></span>R${r.n}${r.finished ? ' ■' : ''}</button>`).join('')}
      <span class="sec-note ml-1.5">ponto = vencedor do round · ■ = round do desfecho</span></div>
    <section class="grid gap-5 lg:grid-cols-2">
      <div class="panel pad" data-anim><p class="eyebrow">${state.round === 'all' ? 'Luta toda' : 'Round ' + state.round} · ${mmss(selDur)} de luta</p><h2 class="sec-title sm mb-4">Comparativo</h2>
        <div class="flex flex-col gap-3.5"><div class="cmp-vals"><span class="disp" style="font-size:16px;color:${C.blood}">${esc(lastName(NA))}</span><span></span><span class="disp text-right" style="font-size:16px;color:${C.gold}">${esc(lastName(NB))}</span></div>
          ${cmpRow('Golpes sig.', S[0].sig[0], S[1].sig[0], `${S[0].sig[0]}/${S[0].sig[1]} · ${pctStr(...S[0].sig)}`, `${pctStr(...S[1].sig)} · ${S[1].sig[0]}/${S[1].sig[1]}`)}
          ${cmpRow('Knockdowns', S[0].kd, S[1].kd)}${cmpRow('Quedas', S[0].td[0], S[1].td[0], `${S[0].td[0]}/${S[0].td[1]}`, `${S[1].td[0]}/${S[1].td[1]}`)}
          ${cmpRow('Tent. finalização', S[0].subAtt, S[1].subAtt)}${cmpRow('Inversões', S[0].rev, S[1].rev)}${cmpRow('Controle', S[0].ctrl, S[1].ctrl, mmss(S[0].ctrl), mmss(S[1].ctrl))}</div></div>
      <div class="panel pad" data-anim><p class="eyebrow">Onde os golpes conectaram</p><h2 class="sec-title sm mb-4">Mapa de golpes</h2><div class="grid gap-4 sm:grid-cols-2">${bodyMap(S[0], 0, NA)}${bodyMap(S[1], 1, NB)}</div></div>
    </section>
    <section class="grid gap-5 lg:grid-cols-2">
      <div class="panel pad" data-anim><p class="eyebrow">Golpes sig. conectados por posição</p><h2 class="sec-title sm mb-4">Distância · Clinch · Solo</h2><div class="flex flex-col gap-4">${posBar(S[0], 0, NA)}${posBar(S[1], 1, NB)}</div></div>
      <div class="panel pad" data-anim><p class="eyebrow">Quedas, finalizações e controle</p><h2 class="sec-title sm mb-4">Grappling</h2><div class="flex flex-col gap-4">
        ${progRow('Quedas · taxa de sucesso', `${S[0].td[0]}/${S[0].td[1]} · ${pctStr(...S[0].td)}`, `${S[1].td[0]}/${S[1].td[1]} · ${pctStr(...S[1].td)}`, S[0].td[1] ? S[0].td[0] / S[0].td[1] : 0, S[1].td[1] ? S[1].td[0] / S[1].td[1] : 0)}
        ${progRow('Finalizações · tentadas × concluídas', `${S[0].subAtt} · ${subDone} concl.`, `${S[1].subAtt} · 0 concl.`, S[0].subAtt / Math.max(4, S[0].subAtt, S[1].subAtt), S[1].subAtt / Math.max(4, S[0].subAtt, S[1].subAtt), 'escala 4+')}
        ${progRow('Inversões', String(S[0].rev), String(S[1].rev), S[0].rev / Math.max(3, S[0].rev, S[1].rev), S[1].rev / Math.max(3, S[0].rev, S[1].rev), 'escala 3+')}
        ${progRow('Tempo de controle no solo', `${mmss(S[0].ctrl)} · ${Math.round(S[0].ctrl / selDur * 100)}%`, `${mmss(S[1].ctrl)} · ${Math.round(S[1].ctrl / selDur * 100)}%`, S[0].ctrl / selDur, S[1].ctrl / selDur, '% do tempo')}</div></div>
    </section>
    <section class="panel pad" data-anim>
      <div class="flex flex-wrap items-end justify-between gap-2"><div><p class="eyebrow">Golpes sig. conectados por minuto · faixa = diferencial</p><h2 class="sec-title sm">Momento da luta</h2></div><div class="legend"><span><i style="background:${C.blood}"></i>${esc(NA)}</span><span><i style="background:${C.gold}"></i>${esc(NB)}</span></div></div>
      <div id="ft-mom" class="chart tall" role="img" aria-label="Golpes por minuto e diferencial"></div>
    </section>
    <section class="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div class="panel pad" data-anim><p class="eyebrow">Eventos-chave por round</p><h2 class="sec-title sm mb-4">Linha do tempo</h2>${timelineHtml(d, sel)}</div>
      <div class="panel pad" data-anim><p class="eyebrow">Critério de 10 pontos · simulado</p><h2 class="sec-title sm mb-3">Placar por round</h2>
        <div class="scroll-x"><table class="score"><thead><tr><th class="eyebrow">Round</th><th class="eyebrow" style="color:${C.blood}">${esc(lastName(NA))}</th><th class="eyebrow" style="color:${C.gold}">${esc(lastName(NB))}</th></tr></thead><tbody>
          ${d.rounds.map(r => `<tr><td>R${r.n}</td>${r.score ? `<td class="num" style="color:${r.score[0] === 10 ? C.blood : ''}">${r.score[0]}</td><td class="num" style="color:${r.score[1] === 10 ? C.gold : ''}">${r.score[1]}</td>` : `<td colspan="2" class="text-muted text-xs">${b.nc ? 'interrompida' : 'encerrada'} em ${b.time}</td>`}</tr>`).join('')}
          <tr><td class="font-bold">Total</td><td class="num font-bold">${tot[0] || '—'}</td><td class="num font-bold">${tot[1] || '—'}</td></tr></tbody></table></div>
        <p class="sec-note mt-3">${b.cards ? `Placares oficiais: ${esc(b.cards)}.` : b.method === 'Decisão' ? `Decisão ${esc(b.detail.toLowerCase())} para ${esc(NA)}.` : 'O round do desfecho não vai para os juízes.'}</p></div>
    </section>`,
    after() {
      const labels = [], a = [], bb = [], marks = [];
      sel.forEach(rd => { const s = labels.length; rd.minutes[0].forEach((v, mi) => { labels.push(sel.length > 1 ? `R${rd.n}·${mi + 1}′` : `${mi + 1}′`); a.push(v); bb.push(rd.minutes[1][mi]); }); if (sel.length > 1) marks.push([{ xAxis: s, name: 'R' + rd.n }, { xAxis: labels.length - 1 }]); });
      const diff = a.map((v, i) => v - bb[i]);
      chart('ft-mom', {
        grid: [{ left: 34, right: 12, top: 18, height: '52%' }, { left: 34, right: 12, top: '74%', bottom: 26 }],
        tooltip: { trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: C.line2 } }, formatter: ps => tipFmt('Minuto ' + ps[0].axisValue.replace('·', ' · '), [[lastName(NA), a[ps[0].dataIndex]], [lastName(NB), bb[ps[0].dataIndex]], ['Diferencial', (diff[ps[0].dataIndex] > 0 ? '+' : '') + diff[ps[0].dataIndex]]]) },
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        xAxis: [{ type: 'category', data: labels, gridIndex: 0, axisLabel: { show: false } }, { type: 'category', data: labels, gridIndex: 1, axisLabel: { interval: 'auto' } }],
        yAxis: [{ type: 'value', gridIndex: 0, minInterval: 1 }, { type: 'value', gridIndex: 1, minInterval: 1, splitLine: { show: false } }],
        series: [
          { name: NA, type: 'line', smooth: .35, symbolSize: 5, lineStyle: { width: 2.5, color: C.blood }, itemStyle: { color: C.blood }, areaStyle: { color: grad('rgba(255,45,70,.3)', 'rgba(255,45,70,0)') }, data: a,
            markArea: marks.length ? { silent: true, itemStyle: { color: 'rgba(255,255,255,.025)', borderColor: C.line, borderWidth: 1, borderType: 'dashed' }, label: { color: C.muted, fontFamily: 'Martian Mono', fontSize: 10, position: 'insideTop' }, data: marks.filter((_, i) => i % 2 === 0) } : undefined },
          { name: NB, type: 'line', smooth: .35, symbolSize: 5, lineStyle: { width: 2.5, color: C.gold }, itemStyle: { color: C.gold }, areaStyle: { color: grad('rgba(242,179,61,.2)', 'rgba(242,179,61,0)') }, data: bb },
          { name: 'Diferencial', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, barWidth: '58%', data: diff.map(v => ({ value: v, itemStyle: { color: v >= 0 ? C.blood : C.gold } })) }
        ]
      });
      $('#boutSel').addEventListener('change', e => { state.bout = e.target.value; state.round = 'all'; render(true); });
    }
  };
}

/* =====================================================================
   11. VIEW · CONFRONTOS (agenda real + H2H)
   ===================================================================== */
function upBout(bt) {
  const a = F(bt.a), b = F(bt.b), ok = a.hasStats && b.hasStats, pr = ok ? predict(a, b) : null;
  return `<div class="up-bout">
    <div class="flex justify-between items-center gap-2"><span class="eyebrow">${bt.label ? esc(bt.label) + ' · ' : ''}${esc(divName(bt.div))} · ${bt.sched} rds</span>
      ${ok ? `<button class="btn btn-sm" data-sim="${a.id}|${b.id}"><i data-lucide="radar"></i>Simular</button>` : '<span class="text-[11px] text-muted" data-tip="Um dos lutadores ainda não tem estatísticas de carreira na base" tabindex="0">sem modelo</span>'}</div>
    <div class="ub-names"><button class="n text-left" style="color:${C.blood}" data-fighter="${a.id}">${esc(a.name)}</button><span class="num text-[10px] text-muted">vs</span><button class="n text-right" style="color:${C.gold}" data-fighter="${b.id}">${esc(b.name)}</button></div>
    <div class="flex justify-between text-[11px] text-muted num"><span>${a.champ ? 'C' : a.rank ? '#' + a.rank : ''} ${a.rec ? recStr(a.rec) : ''}</span><span>${b.rec ? recStr(b.rec) : ''} ${b.champ ? 'C' : b.rank ? '#' + b.rank : ''}</span></div>
    ${ok ? `<div class="probbar" data-tip="${esc(`Probabilidade estimada pelo modelo\n${a.name}: ${Math.round(pr.pA * 100)}%\n${b.name}: ${Math.round(pr.pB * 100)}%`)}" tabindex="0"><span style="width:${pr.pA * 100}%;background:${C.blood}"></span><span style="width:${pr.pB * 100}%;background:${C.gold}"></span></div>
      <div class="flex justify-between num text-xs"><span>${Math.round(pr.pA * 100)}% · <b>${odds(pr.pA).dec}</b></span><span><b>${odds(pr.pB).dec}</b> · ${Math.round(pr.pB * 100)}%</span></div>` : ''}
  </div>`;
}
function upCard(e) {
  const dd = daysUntil(e.date);
  return `<article class="up-card panel" id="up-${e.id}" data-anim>
    <header class="up-head"><div class="flex justify-between items-start gap-3"><div class="min-w-0"><p class="eyebrow">${fmtDate(e.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
      <h3 class="disp mt-1" style="font-size:26px">${esc(e.name.replace('UFC Fight Night: ', 'UFC Fight Night · '))}</h3>
      <p class="flex items-center gap-1.5 text-xs text-fg2 mt-1.5"><i data-lucide="map-pin" style="width:13px;height:13px"></i>${esc(e.venue)} · ${esc(e.city)}</p></div>
      <div class="text-right shrink-0">${dd === 0 ? '<span class="slash s-blood">Hoje</span>' : `<b class="disp-wide block" style="font-size:28px">${dd}</b><span class="eyebrow">dias</span>`}</div></div></header>
    <div class="flex flex-col">${e.bouts.map(upBout).join('')}</div></article>`;
}
function fighterOptions(selId, otherId) {
  return DIVS.map(d => { const fs = PROFILED.filter(f => f.div === d.id); return fs.length ? `<optgroup label="${esc(d.name)}">${fs.map(f => `<option value="${f.id}" ${f.id === selId ? 'selected' : ''} ${f.id === otherId ? 'disabled' : ''}>${esc(f.name)}</option>`).join('')}</optgroup>` : ''; }).join('');
}
function narrative(a, b, pr) {
  const sa = styleOf(a), sb = styleOf(b), out = [];
  out.push(`${a.name} chega como ${sa.label.toLowerCase()} (trocação ${sa.s}, grappling ${sa.g}); ${b.name}, como ${sb.label.toLowerCase()} (${sb.s} / ${sb.g}).`);
  if ((sa.kind === 'G' && sb.kind === 'S') || (sa.kind === 'S' && sb.kind === 'G')) {
    const Gf = sa.kind === 'G' ? a : b, Sf = Gf === a ? b : a;
    out.push(`Duelo clássico striker × grappler. ${Gf.name} conecta ${nf(Gf.td, 2)} quedas a cada 15 min contra ${Sf.tdDef}% de defesa de quedas de ${Sf.name}. Em pé, ${Sf.name} tem o volume (${nf(Sf.slpm, 2)} contra ${nf(Gf.slpm, 2)} golpes/min).`);
  } else {
    out.push(`Diferencial líquido de golpes (SLpM − SApM): ${signed(a.slpm - a.sapm)} para ${a.name} e ${signed(b.slpm - b.sapm)} para ${b.name}.`);
    const ta = tdEff(a, b), tb = tdEff(b, a);
    if (Math.abs(ta - tb) > .6) out.push(`No grappling, ${ta > tb ? a.name : b.name} projeta mais quedas efetivas (${nf(Math.max(ta, tb), 1)} contra ${nf(Math.min(ta, tb), 1)} por 15 min, já descontada a defesa do oponente).`);
  }
  const rd = a.reach - b.reach;
  if (Math.abs(rd) >= 5) out.push(`${rd > 0 ? a.name : b.name} leva ${Math.abs(rd)} cm de vantagem de envergadura, útil para ditar a distância.`);
  const prev = ALL_BOUTS.filter(x => (x.red === a.id && x.gold === b.id) || (x.red === b.id && x.gold === a.id));
  if (prev.length) out.push(`Histórico no arquivo: ${prev.map(x => `${F(x.red).name} venceu no ${x.ev.name} (${methodShort(x).toLowerCase()})`).join('; ')}.`);
  out.push(`Desfecho mais provável no modelo: vitória de ${pr.top.side ? b.name : a.name} por ${pr.top.method} (${Math.round(pr.top.prob * 100)}%).`);
  return out;
}
function viewConfrontos() {
  const [ia, ib] = state.h2h, a = F(ia), b = F(ib), pr = predict(a, b), oa = odds(pr.pA), ob = odds(pr.pB);
  const tape = [
    ['Cartel', recStr(a.rec), recStr(b.rec), winPct(a), winPct(b)], ['Idade', ageOf(a.dob) ?? '—', ageOf(b.dob) ?? '—', null, null],
    ['Altura', `${a.h} cm`, `${b.h} cm`, a.h, b.h], ['Envergadura', `${a.reach} cm`, `${b.reach} cm`, a.reach, b.reach], ['Base', a.stance, b.stance, null, null],
    ...STAT_KEYS.map(k => [METRICS[k].short, fmtMetric(k, a[k]), fmtMetric(k, b[k]), METRICS[k].low ? -a[k] : a[k], METRICS[k].low ? -b[k] : b[k]])
  ];
  const phases = [['Volume em pé', a.slpm, b.slpm, v => nf(v, 2)], ['Precisão', a.acc, b.acc, v => v + '%'], ['Defesa de golpes', a.def, b.def, v => v + '%'], ['Poder (KD/15)', a.kd, b.kd, v => nf(v, 2)], ['Quedas efetivas', tdEff(a, b), tdEff(b, a), v => nf(v, 2)], ['Ameaça de finalização', subEff(a, b), subEff(b, a), v => nf(v, 2)], ['Envergadura', a.reach, b.reach, v => v + ' cm']];
  return {
    html: `
    <section><div class="flex flex-wrap items-end justify-between gap-3 mb-3"><div><p class="eyebrow">Agenda anunciada · odds do modelo heurístico</p><h1 class="sec-title" style="font-size:34px">Próximos combates</h1></div><span class="slash s-ink">Horários oficiais chegam pela API</span></div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">${UPCOMING_LIST.map(upCard).join('')}</div></section>
    <section id="h2h" class="panel pad flex flex-col gap-4" data-anim>
      <div class="flex flex-wrap items-end justify-between gap-3"><div><p class="eyebrow">Head-to-head · ${PROFILED.length} perfis com estatísticas</p><h2 class="sec-title" style="font-size:30px">Comparação direta</h2></div></div>
      <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-end">
        <div><label for="h2hA" class="eyebrow block mb-1.5" style="color:${C.blood}">Canto vermelho</label><select id="h2hA" class="sel w-full">${fighterOptions(ia, ib)}</select></div>
        <button id="h2hSwap" class="btn h-[38px]" aria-label="Inverter cantos" data-tip="Inverter cantos"><i data-lucide="arrow-left-right"></i></button>
        <div><label for="h2hB" class="eyebrow block mb-1.5 text-right" style="color:${C.gold}">Canto dourado</label><select id="h2hB" class="sel w-full">${fighterOptions(ib, ia)}</select></div>
      </div>
      ${a.div !== b.div ? `<div class="notice"><i data-lucide="info"></i><span>Divisões diferentes (${esc(divName(a.div))} × ${esc(divName(b.div))}): trate como superluta hipotética. O modelo não ajusta por peso.</span></div>` : ''}
    </section>
    <section class="grid gap-5 lg:grid-cols-2">
      <div class="panel pad" data-anim><div class="grid grid-cols-2 gap-3 mb-2"><span class="disp" style="font-size:30px;color:${C.blood}">${esc(lastName(a.name))}</span><span class="disp text-right" style="font-size:30px;color:${C.gold}">${esc(lastName(b.name))}</span></div>
        <div class="scroll-x"><table class="tape"><tbody>${tape.map(([l, va, vb, na, nb]) => { const adv = na == null || na === nb ? '' : na > nb ? 'a' : 'b'; return `<tr><td class="${adv === 'a' ? 'adv-a' : ''}">${esc(va)}</td><td class="m">${l}</td><td class="r ${adv === 'b' ? 'adv-b' : ''}">${esc(vb)}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="sec-note mt-2">Valor destacado = vantagem estatística. Em SApM, menor é melhor.</p></div>
      <div class="panel pad" data-anim><div class="flex flex-wrap items-end justify-between gap-2"><div><p class="eyebrow">Percentil no elenco</p><h2 class="sec-title sm">Octógono comparado</h2></div><div class="legend"><span><i style="background:${C.blood}"></i>${esc(lastName(a.name))}</span><span><i style="background:${C.gold}"></i>${esc(lastName(b.name))}</span></div></div>
        <div id="h2h-radar" class="chart tall" role="img" aria-label="Radar comparativo"></div></div>
    </section>
    <section class="grid gap-5 lg:grid-cols-2">
      <div class="panel pad" data-anim><div class="flex flex-wrap items-end justify-between gap-2"><div><p class="eyebrow">Striker × Grappler · todo o elenco</p><h2 class="sec-title sm">Matriz de estilo</h2></div><span class="sec-note">pontos cinza = outros perfis</span></div>
        <div id="h2h-matrix" class="chart tall" role="img" aria-label="Matriz de estilo"></div></div>
      <div class="panel pad" data-anim><p class="eyebrow">Por fase da luta</p><h2 class="sec-title sm mb-4">Matriz de vantagem</h2>
        <div class="flex flex-col gap-3">${phases.map(([k, va, vb, f]) => { const e = k === 'Envergadura' ? clamp((va - vb) / 15, -1, 1) : clamp((va - vb) / (Math.max(Math.abs(va), Math.abs(vb)) || 1), -1, 1), w = Math.abs(e) * 50;
          return `<div class="adv-row"><span class="num text-xs ${e > .02 ? 'text-fg font-bold' : 'text-fg2'}">${f(va)}</span><div class="flex flex-col gap-1"><span class="cmp-label">${k}</span><div class="adv-track" data-tip="${esc(`${k}\n${e > .02 ? 'Vantagem ' + a.name : e < -.02 ? 'Vantagem ' + b.name : 'Equilibrado'}`)}" tabindex="0"><span style="${e >= 0 ? `right:50%;width:${w}%;background:${C.blood}` : `left:50%;width:${w}%;background:${C.gold}`}"></span></div></div><span class="num text-xs text-right ${e < -.02 ? 'text-fg font-bold' : 'text-fg2'}">${f(vb)}</span></div>`; }).join('')}</div></div>
    </section>
    <section class="panel pad" data-anim>
      <div class="flex flex-wrap items-end justify-between gap-3"><div><p class="eyebrow">Motor de estilo · modelo heurístico</p><h2 class="sec-title" style="font-size:30px">Previsão</h2></div><span class="slash s-ink">Demonstração · não é recomendação de aposta</span></div>
      <div class="pred-split" role="img" aria-label="${esc(`${a.name} ${Math.round(pr.pA * 100)}%, ${b.name} ${Math.round(pr.pB * 100)}%`)}"><span data-grow style="width:${pr.pA * 100}%;background:${C.blood}">${Math.round(pr.pA * 100)}%</span><span style="width:${pr.pB * 100}%;background:${C.gold}">${Math.round(pr.pB * 100)}%</span></div>
      <div class="flex justify-between flex-wrap gap-2 num text-xs"><span>${esc(a.name)} · odd <b>${oa.dec}</b> <span class="text-muted">(${oa.am})</span></span><span>${esc(b.name)} · odd <b>${ob.dec}</b> <span class="text-muted">(${ob.am})</span></span></div>
      <div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] mt-5">
        <div><p class="eyebrow mb-2">Como a luta termina</p><div id="h2h-meth" class="chart mini" role="img" aria-label="Probabilidade por método"></div></div>
        <div><p class="eyebrow mb-2">Leitura automática</p><div class="reading flex flex-col gap-2.5">${narrative(a, b, pr).map(p => `<p>${esc(p)}</p>`).join('')}</div></div>
      </div>
    </section>`,
    after() {
      const keys = [['Volume', 'slpm'], ['Precisão', 'acc'], ['Defesa', 'def'], ['Resistência', 'sapm'], ['Poder', 'kd'], ['Quedas', 'td'], ['Def. quedas', 'tdDef'], ['Finalização', 'sub']];
      chart('h2h-radar', radarOption(keys, [{ name: a.name, f: a, color: C.blood, fill: 'rgba(255,45,70,.2)' }, { name: b.name, f: b, color: C.gold, fill: 'rgba(242,179,61,.16)' }]));
      const pts = PROFILED.filter(f => f.id !== a.id && f.id !== b.id).map(f => { const s = styleOf(f); return { value: [s.s, s.g], name: f.name, label: s.label, id: f.id }; });
      const big = (f, c) => { const s = styleOf(f); return { value: [s.s, s.g], name: f.name, label: s.label, id: f.id, symbolSize: 18, itemStyle: { color: c, borderColor: C.ink, borderWidth: 2 }, label: { show: true, formatter: lastName(f.name).toUpperCase(), position: 'top', color: c, fontFamily: 'Anybody', fontWeight: 900, fontSize: 13 } }; };
      const mx = chart('h2h-matrix', {
        grid: { left: 44, right: 16, top: 16, bottom: 40 },
        tooltip: { trigger: 'item', formatter: p => tipFmt(p.data.name, [[p.data.label, ''], ['Trocação', p.data.value[0]], ['Grappling', p.data.value[1]]]) },
        xAxis: { type: 'value', min: 0, max: 100, name: 'Trocação →', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: C.fg2, fontFamily: 'Martian Mono', fontSize: 10 } },
        yAxis: { type: 'value', min: 0, max: 100, name: 'Grappling →', nameLocation: 'middle', nameGap: 30, nameTextStyle: { color: C.fg2, fontFamily: 'Martian Mono', fontSize: 10 } },
        series: [{ type: 'scatter', symbolSize: 8, itemStyle: { color: C.line2 }, emphasis: { itemStyle: { color: C.fg2 } }, data: [...pts, big(a, C.blood), big(b, C.gold)],
          markLine: { silent: true, symbol: 'none', lineStyle: { color: C.line2, type: 'dashed' }, label: { show: false }, data: [{ xAxis: 50 }, { yAxis: 50 }] },
          markArea: { silent: true, itemStyle: { color: 'transparent' }, label: { color: C.muted, fontFamily: 'Martian Mono', fontSize: 9, position: 'insideTopLeft' }, data: [[{ name: 'GRAPPLER', coord: [0, 100] }, { coord: [50, 50] }], [{ name: 'COMPLETO', coord: [50, 100] }, { coord: [100, 50] }], [{ name: 'EM AJUSTE', coord: [0, 50] }, { coord: [50, 0] }], [{ name: 'STRIKER', coord: [50, 50] }, { coord: [100, 0] }]] } }]
      });
      if (mx) mx.on('click', p => { if (p.data?.id && p.data.id !== a.id && p.data.id !== b.id) { state.h2h = [a.id, p.data.id]; render(true); } });
      chart('h2h-meth', {
        grid: { left: 86, right: 40, top: 4, bottom: 4 },
        tooltip: { trigger: 'item', formatter: p => tipFmt(p.name, [['Probabilidade', Math.round(p.value * 100) + '%']]) },
        xAxis: { type: 'value', max: 1, show: false }, yAxis: { type: 'category', data: ['Decisão', 'Finalização', 'KO/TKO'], axisLabel: { color: C.fg2, fontFamily: 'Hanken Grotesk', fontSize: 12 } },
        series: [{ type: 'bar', barWidth: 12, showBackground: true, backgroundStyle: { color: C.panel3 }, label: { show: true, position: 'right', color: C.fg, fontFamily: 'Martian Mono', fontSize: 11, formatter: p => Math.round(p.value * 100) + '%' }, data: [{ value: pr.methods.dec, itemStyle: { color: C.fg2 } }, { value: pr.methods.sub, itemStyle: { color: C.gold } }, { value: pr.methods.ko, itemStyle: { color: C.blood } }] }]
      });
      const upd = () => { state.h2h = [$('#h2hA').value, $('#h2hB').value]; render(true); };
      $('#h2hA').addEventListener('change', upd); $('#h2hB').addEventListener('change', upd);
      $('#h2hSwap').addEventListener('click', () => { state.h2h = [ib, ia]; render(true); });
    }
  };
}

/* =====================================================================
   12. VIEW · ARQUIVO
   ===================================================================== */
const boutMatches = b => (!state.evDiv || b.div === state.evDiv) && (state.evMethod === 'all' || (state.evMethod === 'nc' ? b.nc : b.method === state.evMethod)) ;
function evMatches(e) {
  if (state.evYear !== 'all' && !e.date.startsWith(state.evYear)) return false;
  const q = fold(state.evq.trim());
  if (q && !q.split(/\s+/).every(t => fold(`${e.name} ${e.venue} ${e.city} ${e.bouts.map(b => `${F(b.red).name} ${F(b.gold).name} ${b.method} ${b.detail}`).join(' ')}`).includes(t))) return false;
  return e.bouts.some(boutMatches);
}
function evCard(e) {
  const open = state.open.has(e.id), bouts = e.bouts.filter(boutMatches), main = e.bouts[0];
  return `<article class="panel" id="ev-${e.id}">
    <button class="ev-head" data-ev="${e.id}" aria-expanded="${open}" aria-controls="evb-${e.id}">
      <span class="ev-date"><span class="ev-name block">${esc(e.name.replace('UFC Fight Night: ', 'UFC FN · '))}</span><span class="num text-[11px] text-muted">${fmtDate(e.date)}</span></span>
      <span class="min-w-0"><span class="block font-semibold">${esc(F(main.red).name)} <span class="text-muted font-normal">${main.nc ? '×' : 'def.'}</span> ${esc(F(main.gold).name)}</span>
        <span class="flex flex-wrap gap-x-3 text-xs text-muted mt-0.5"><span>${esc(e.venue)}, ${esc(e.city)}</span><span>${e.bouts.length} luta${e.bouts.length > 1 ? 's' : ''} no destaque</span>${e.bouts.some(x => x.title) ? '<span class="text-gold">disputa de cinturão</span>' : ''}</span></span>
      <i data-lucide="chevron-down" class="ev-chev"></i></button>
    <div class="border-t border-line px-4 pb-3" id="evb-${e.id}" ${open ? '' : 'hidden'}><div class="scroll-x"><table class="bouts"><thead><tr><th>Divisão</th><th>Resultado</th><th>Método</th><th>Rd</th><th>Tempo</th><th>Duração</th><th>Placares</th><th></th></tr></thead><tbody>
      ${bouts.map(b => `<tr><td><span class="num text-[11px]">${esc(divName(b.div))}</span>${b.title ? ' <i data-lucide="crown" class="text-gold inline" style="width:13px;height:13px;vertical-align:-2px"></i>' : ''}${b.label ? `<br><span class="text-[11px] text-muted">${esc(b.label)}</span>` : ''}</td>
        <td>${nameLink(b.red, 'font-bold')} <span class="text-muted">${b.nc ? '×' : 'def.'}</span> ${nameLink(b.gold, b.nc ? 'font-bold' : 'text-muted')}</td>
        <td>${esc(b.method)}<br><span class="text-xs text-muted">${esc(b.detail)}</span></td><td class="num text-xs">${b.round}${b.est ? ' ≈' : ''}</td><td class="num text-xs">${b.time}${b.est ? ' ≈' : ''}</td>
        <td class="num text-xs">${mmss((b.round - 1) * 300 + toSec(b.time))}</td><td class="num text-[11px] text-muted">${esc(b.cards || '—')}</td>
        <td><button class="btn btn-sm" data-bout="${b.id}"><i data-lucide="activity"></i>Análise</button></td></tr>`).join('')}
    </tbody></table></div></div></article>`;
}
function evListHtml() {
  const list = EVENT_LIST.filter(evMatches);
  return `<p class="sec-note mb-1">${list.length} evento${list.length === 1 ? '' : 's'} · ${list.reduce((n, e) => n + e.bouts.filter(boutMatches).length, 0)} lutas com os filtros atuais</p>
    ${list.length ? list.map(evCard).join('') : '<p class="empty panel pad">Nenhum evento encontrado. Limpe a busca, troque o ano ou o método.</p>'}`;
}
function viewArquivo() {
  const byDiv = DIVS.map(d => { const l = ALL_BOUTS.filter(b => b.div === d.id && !b.nc); return { d: d.name, ko: l.filter(b => b.method === 'KO/TKO').length, sub: l.filter(b => b.method === 'Finalização').length, dec: l.filter(b => b.method === 'Decisão').length }; });
  return {
    html: `
    <div class="flex flex-wrap items-end justify-between gap-3"><div><p class="eyebrow">Resultados oficiais · ${STATS.events} eventos · ${STATS.bouts} lutas</p><h1 class="sec-title" style="font-size:34px">Arquivo de eventos</h1></div>
      <button class="btn" id="evToggle"><i data-lucide="chevrons-up-down"></i>${state.open.size ? 'Recolher todos' : 'Expandir todos'}</button></div>
    <section class="panel pad" data-anim><div class="flex flex-wrap items-end justify-between gap-2"><div><p class="eyebrow">Lutas do arquivo por divisão</p><h2 class="sec-title sm">Métodos de vitória</h2></div><div class="legend"><span><i style="background:${C.blood}"></i>KO/TKO</span><span><i style="background:${C.gold}"></i>Finalização</span><span><i style="background:${C.line2}"></i>Decisão</span></div></div>
      <div id="ar-div" class="chart short" role="img" aria-label="Métodos de vitória por divisão"></div></section>
    <div class="flex flex-wrap gap-2 items-center">
      <label class="sr-only" for="evq">Filtrar eventos</label><input id="evq" class="input flex-1 basis-64" type="search" placeholder="Lutador, arena, cidade ou método" value="${esc(state.evq)}">
      <label class="sr-only" for="evYear">Ano</label><select id="evYear" class="sel"><option value="all">Todos os anos</option>${STATS.years.slice().reverse().map(y => `<option ${state.evYear === y ? 'selected' : ''}>${y}</option>`).join('')}</select>
      <label class="sr-only" for="evDiv">Divisão</label><select id="evDiv" class="sel"><option value="">Todas as divisões</option>${DIVS.map(d => `<option value="${d.id}" ${state.evDiv === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select>
      <label class="sr-only" for="evMethod">Método</label><select id="evMethod" class="sel"><option value="all">Todos os métodos</option>${['KO/TKO', 'Finalização', 'Decisão'].map(m => `<option ${state.evMethod === m ? 'selected' : ''}>${m}</option>`).join('')}<option value="nc" ${state.evMethod === 'nc' ? 'selected' : ''}>Sem resultado</option></select>
    </div>
    <div class="flex flex-col gap-2.5" id="evList">${evListHtml()}</div>`,
    after() {
      chart('ar-div', {
        grid: { left: 36, right: 8, top: 10, bottom: 44 },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: { type: 'category', data: byDiv.map(x => x.d), axisLabel: { interval: 0, rotate: 30 } }, yAxis: { type: 'value', minInterval: 1 },
        series: [['KO/TKO', 'ko', C.blood], ['Finalização', 'sub', C.gold], ['Decisão', 'dec', C.line2]].map(([n, k, c]) => ({ name: n, type: 'bar', stack: 'm', barWidth: '52%', itemStyle: { color: c }, data: byDiv.map(x => x[k]) }))
      });
      const refresh = () => { $('#evList').innerHTML = evListHtml(); icons(); };
      $('#evq').addEventListener('input', e => { state.evq = e.target.value; refresh(); });
      [['evYear', 'evYear'], ['evDiv', 'evDiv'], ['evMethod', 'evMethod']].forEach(([id, k]) => $('#' + id).addEventListener('change', e => { state[k] = e.target.value; refresh(); }));
      $('#evToggle').addEventListener('click', () => { if (state.open.size) state.open.clear(); else EVENT_LIST.forEach(e => state.open.add(e.id)); render(true); });
    }
  };
}

/* =====================================================================
   13. RENDER + DELEGAÇÃO
   ===================================================================== */
const view = $('#view');
const VIEWS = { painel: viewPainel, rankings: viewRankings, lutadores: viewLutadores, luta: viewLuta, confrontos: viewConfrontos, arquivo: viewArquivo };
let renderToken = 0;
async function render(keepScroll = false) {
  const t = ++renderToken, y = scrollY;
  $$('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)));
  const v = VIEWS[state.tab]();
  if (t !== renderToken) return;
  charts.forEach(c => c.dispose()); charts = [];
  view.innerHTML = v.html;
  icons();
  v.after && v.after();
  if (keepScroll) scrollTo({ top: y }); else animateIn(view);
}
view.addEventListener('click', e => {
  const el = e.target.closest('[data-fighter],[data-bout],[data-h2h],[data-sim],[data-round],[data-step],[data-ev],[data-rdiv],[data-go-card]');
  if (!el) return;
  const ds = el.dataset;
  if (ds.fighter) { const changed = state.tab !== 'lutadores'; state.fighter = ds.fighter; persist(); if (changed) go('lutadores', { rq: '', fdiv: '', onlyStats: false }); else render(true).then(() => { const top = $('.hero'); if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' }); }); }
  else if (ds.bout) go('luta', { bout: ds.bout, round: 'all' });
  else if (ds.h2h) { const me = ds.h2h, other = state.h2h.find(x => x !== me && F(x).hasStats) || PROFILED.find(f => f.div === F(me).div && f.id !== me).id; go('confrontos', { h2h: [me, other], focus: 'h2h' }); }
  else if (ds.sim) go('confrontos', { h2h: ds.sim.split('|'), focus: 'h2h' });
  else if (ds.goCard) go('confrontos', { focus: 'up-' + ds.goCard });
  else if (ds.rdiv) { state.rdiv = ds.rdiv; render(true); }
  else if (ds.round) { state.round = ds.round === 'all' ? 'all' : +ds.round; render(true); }
  else if (ds.step) { const ids = EVENT_LIST.flatMap(x => x.bouts.map(b => b.id)), i = ids.indexOf(state.bout); state.bout = ids[(i + +ds.step + ids.length) % ids.length]; state.round = 'all'; render(true); }
  else if (ds.ev) {
    const id = ds.ev, body = document.getElementById('evb-' + id), open = body.hidden;
    body.hidden = !open; el.setAttribute('aria-expanded', String(open)); open ? state.open.add(id) : state.open.delete(id);
    const tg = $('#evToggle'); if (tg) tg.lastChild.textContent = state.open.size ? 'Recolher todos' : 'Expandir todos';
  }
});

render();
})();
