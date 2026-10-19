/* Adaptador do UFC.com (versão pt-BR em ufc.com.br): rankings oficiais e página do atleta
   (bio + estatísticas oficiais). Não há API: lemos o HTML no servidor. */

import { parse, type HTMLElement } from 'node-html-parser';
import type { FighterBio, OfficialStats, RankEntry, RankingDivision, Rankings } from '../shared/types.ts';
import { inToCm, lbToKg, slugify } from '../shared/format.ts';
import { HOUR, UpstreamError, getText } from './http.ts';

export const UFC_BASE = 'https://www.ufc.com.br';

const txt = (el?: HTMLElement | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const num = (s?: string) => { const v = parseFloat((s ?? '').replace(',', '.').replace(/[^\d.]/g, '')); return Number.isFinite(v) ? v : undefined; };
const pctOf = (l?: number, a?: number) => (l !== undefined && a ? Math.round((l / a) * 100) : undefined);
/** Remove o estilo de redimensionamento do Drupal do UFC.com e devolve o arquivo original. */
export const originalImage = (u?: string) => u?.replace(/\/images\/styles\/[^/]+\/s3\//, '/images/').replace(/\?itok=.*$/, '');

const slugFromHref = (href?: string) => href?.match(/\/athlete\/([^/?#]+)/)?.[1];

/* ---------- Rankings ---------- */

const DIV_NAME: Record<string, string> = {
  "men's pound-for-pound top rank": 'Peso por peso',
  'peso por peso feminino top rank': 'Peso por peso (F)',
  'peso-mosca': 'Mosca', 'peso-galo': 'Galo', 'peso-pena': 'Pena', 'peso-leve': 'Leve',
  'peso meio-médio': 'Meio-médio', 'peso-médio': 'Médio', 'peso meio-pesado': 'Meio-pesado', 'peso-pesado': 'Pesado',
  'peso-palha feminino': 'Palha (F)', 'peso-mosca feminino': 'Mosca (F)', 'peso-galo feminino': 'Galo (F)',
};

export async function rankings(): Promise<Rankings> {
  const html = await getText(`${UFC_BASE}/rankings`, 1 * HOUR);
  const root = parse(html);
  const seen = new Set<string>();
  const divisions: RankingDivision[] = [];

  for (const g of root.querySelectorAll('.view-grouping')) {
    const raw = txt(g.querySelector('.view-grouping-header'));
    const key = raw.toLowerCase();
    const name = DIV_NAME[key] ?? raw;
    const id = slugify(name);
    if (seen.has(id)) continue; // a página repete a primeira divisão no fim
    seen.add(id);
    const p4p = /pound|por peso/i.test(raw);
    const women = /feminino|women/i.test(raw);

    const champLink = g.querySelector('.rankings--athlete--champion h5 a');
    const champion: RankEntry | undefined = champLink && !p4p ? {
      rank: 0,
      name: txt(champLink),
      slug: slugFromHref(champLink.getAttribute('href')) ?? slugify(txt(champLink)),
      image: originalImage(g.querySelector('.rankings--athlete--champion img')?.getAttribute('src')),
    } : undefined;

    const entries: RankEntry[] = g.querySelectorAll('tbody tr').map(tr => {
      const a = tr.querySelector('.views-field-title a');
      const changeCell = tr.querySelector('.views-field-weight-class-rank-change');
      const changeTxt = txt(changeCell);
      const up = changeCell?.querySelector('.athlete-rankings--rank-increase');
      const down = changeCell?.querySelector('.athlete-rankings--rank-decrease');
      const delta = num(changeTxt.replace(/\D+/, ' '));
      return {
        rank: num(txt(tr.querySelector('.views-field-weight-class-rank'))) ?? 0,
        name: txt(a),
        slug: slugFromHref(a?.getAttribute('href')) ?? slugify(txt(a)),
        change: up && delta ? delta : down && delta ? -delta : undefined,
        isNew: /novo|new/i.test(changeTxt),
      };
    }).filter(e => e.name);

    divisions.push({ id, name, p4p, women, champion, entries });
  }

  if (!divisions.length) throw new Error('Rankings: estrutura da página do UFC.com mudou');
  return { updatedAt: new Date().toISOString(), source: `${UFC_BASE}/rankings`, divisions };
}

/* ---------- Atleta ---------- */

export interface UfcAthlete { bio: Partial<FighterBio>; stats: OfficialStats }

export async function athletePage(slug: string): Promise<UfcAthlete | null> {
  let html: string;
  try {
    html = await getText(`${UFC_BASE}/athlete/${encodeURIComponent(slug)}`, 6 * HOUR);
  } catch (e) {
    if (e instanceof UpstreamError && e.status === 404) return null;
    throw e;
  }
  return parseAthleteHtml(html, slug);
}

/** Lê a página de um atleta do UFC.com (função pura, testável com HTML salvo). */
export function parseAthleteHtml(html: string, slug: string): UfcAthlete | null {
  const root = parse(html);
  const name = txt(root.querySelector('.hero-profile__name'));
  if (!name) return null;

  const bio: Record<string, string> = {};
  for (const f of root.querySelectorAll('.c-bio__field')) {
    const label = txt(f.querySelector('.c-bio__label')).toLowerCase();
    if (label) bio[label] = txt(f.querySelector('.c-bio__text'));
  }

  const rec = txt(root.querySelector('.hero-profile__division-body')).match(/(\d+)-(\d+)-(\d+)/);
  const tags = root.querySelectorAll('.hero-profile__tag').map(txt);
  // "Peso-mosca feminino Categoria" → "Mosca (F)"
  const division = txt(root.querySelector('.hero-profile__division-title'))
    .replace(/\s*Categoria$/i, '').replace(/^Peso[- ]/i, '').toLowerCase().replace(/\s+feminino$/i, ' (F)')
    .replace(/^./, c => c.toUpperCase());
  // tags: "Title Holder" / "Campeão", "#3 Peso-mosca", "#4 PFP" (peso por peso)
  const champ = tags.some(t => /title holder|campe/i.test(t));
  const divRank = tags.map(t => t.match(/^#(\d+)(?!.*(PFP|P4P|peso por peso))/i)?.[1]).find(Boolean);
  const p4p = tags.map(t => t.match(/^#(\d+)\s*(PFP|P4P)/i)?.[1]).find(Boolean);

  // Estatísticas "comparadas" (por minuto, por 15 min, defesa etc.)
  const compare: Record<string, string> = {};
  for (const g of root.querySelectorAll('.c-stat-compare__group')) {
    const label = txt(g.querySelector('.c-stat-compare__label')).toLowerCase();
    const value = txt(g.querySelector('.c-stat-compare__number'));
    if (label) compare[label] = value;
  }
  const pick = (re: RegExp) => { const k = Object.keys(compare).find(x => re.test(x)); return k ? compare[k] : undefined; };

  // Totais (golpes sig. conectados/desferidos, quedas aplicadas/tentadas)
  const totals: Record<string, number | undefined> = {};
  for (const block of root.querySelectorAll('.c-overlap__stats')) {
    const t = txt(block.querySelector('.c-overlap__stats-text')).toLowerCase();
    totals[t] = num(txt(block.querySelector('.c-overlap__stats-value')));
  }
  const total = (re: RegExp) => { const k = Object.keys(totals).find(x => re.test(x)); return k ? totals[k] : undefined; };

  // Precisão: círculos com título próprio
  const accuracy: Record<string, number | undefined> = {};
  for (const o of root.querySelectorAll('.c-overlap__inner')) {
    const t = txt(o.querySelector('.e-t3')).toLowerCase();
    accuracy[t] = num(txt(o.querySelector('.e-chart-circle__percent')));
  }
  const acc = (re: RegExp) => { const k = Object.keys(accuracy).find(x => re.test(x)); return k ? accuracy[k] : undefined; };

  // Barras de 3 (posição e método de vitória)
  const bars: Record<string, number> = {};
  for (const b of root.querySelectorAll('.c-stat-3bar__group')) {
    const label = txt(b.querySelector('.c-stat-3bar__label')).toLowerCase();
    const v = txt(b.querySelector('.c-stat-3bar__value')).match(/^(\d+)/);
    if (label && v) bars[label] = +v[1];
  }
  const svgVal = (part: string) => num(txt(root.querySelector(`#e-stat-body_x5F__x5F_${part}_value`)));

  const stats: OfficialStats = {
    slpm: num(pick(/conectados/)),
    sapm: num(pick(/absorvidos/)),
    tdAvg: num(pick(/média de quedas/)),
    subAvg: num(pick(/finaliza/)),
    strDef: num(pick(/defesa de golpes/)),
    tdDef: num(pick(/defesa de quedas/)),
    kdAvg: num(pick(/knockdown/)),
    avgFightTime: pick(/tempo médio/),
    strAcc: acc(/striking/) ?? pctOf(total(/golpes sig\. conectados/), total(/golpes sig\. desferidos/)),
    tdAcc: acc(/quedas/) ?? pctOf(total(/quedas aplicadas/), total(/tentativas de queda/)),
    sigLanded: total(/golpes sig\. conectados/),
    sigAttempted: total(/golpes sig\. desferidos/),
    tdLanded: total(/quedas aplicadas/),
    tdAttempted: total(/tentativas de queda/),
    byPosition: 'em pé' in bars ? { standing: bars['em pé'] ?? 0, clinch: bars['clinche'] ?? 0, ground: bars['solo'] ?? 0 } : undefined,
    winsBy: 'ko/tko' in bars ? { ko: bars['ko/tko'] ?? 0, dec: bars['dec'] ?? 0, sub: bars['fin'] ?? 0 } : undefined,
    byTarget: svgVal('head') !== undefined ? { head: svgVal('head') ?? 0, body: svgVal('body') ?? 0, leg: svgVal('leg') ?? 0 } : undefined,
  };

  const nickname = txt(root.querySelector('.hero-profile__nickname')).replace(/^["“]|["”]$/g, '') || undefined;
  return {
    bio: {
      name,
      nickname,
      slug,
      division: division || undefined,
      rankLabel: champ ? 'Campeão' : divRank ? `#${divRank}` : undefined,
      p4pRank: p4p ? Number(p4p) : undefined,
      status: bio['status'],
      age: num(bio['idade']),
      heightCm: inToCm(num(bio['altura'])),
      weightKg: lbToKg(num(bio['peso'])),
      reachCm: inToCm(num(bio['envergadura'])),
      legReachCm: inToCm(num(bio['alcance das pernas'])),
      style: bio['estilo de luta'],
      team: bio['equipe'],
      hometown: bio['cidade natal'],
      debut: bio['estreia no ufc'],
      record: rec ? { w: +rec[1], l: +rec[2], d: +rec[3] } : { w: 0, l: 0, d: 0 },
      bodyImage: root.querySelector('.hero-profile__image')?.getAttribute('src'),
      ufcUrl: `${UFC_BASE}/athlete/${slug}`,
    },
    stats,
  };
}
