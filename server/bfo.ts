/* Odds históricas do BestFightOdds (robots.txt libera tudo; os termos só se isentam de garantias).
   A ESPN apaga as linhas semanas depois da luta, então para lutas encerradas usamos o
   histórico do BFO: abertura e faixa de fechamento das casas. Acesso moderado: busca + 1 página
   por lutador, cache de 7 dias (odds de luta encerrada não mudam) e crédito na interface. */

import { parse } from 'node-html-parser';
import type { FightOdds } from '../shared/types.ts';
import { fold } from '../shared/format.ts';
import { HOUR, getText, remember } from './http.ts';

const BASE = 'https://www.bestfightodds.com';
const TTL = 7 * 24 * HOUR;

export interface BfoLine { opponent: string; date: string; open?: number; close?: number; oppOpen?: number; oppClose?: number }

const ml = (s?: string) => { const n = Number((s ?? '').replace(/[^\d+-]/g, '')); return Number.isFinite(n) && n !== 0 ? n : undefined; };
const toDec = (m: number) => (m > 0 ? 1 + m / 100 : 1 + 100 / -m);
const toMl = (d: number) => Math.round(d >= 2 ? (d - 1) * 100 : -100 / (d - 1));
/** Fechamento = média (em decimal) do menor e maior preço entre as casas. */
const mid = (a?: number, b?: number) => (a && b ? toMl((toDec(a) + toDec(b)) / 2) : a ?? b);
/** "Sep 12th 2026" → ISO */
const parseDate = (s: string) => { const d = new Date(s.replace(/(\d+)(st|nd|rd|th)/, '$1')); return Number.isNaN(d.getTime()) ? '' : d.toISOString(); };
const last = (n: string) => fold(n).split(/\s+/).pop() ?? '';

async function findFighter(name: string): Promise<string | undefined> {
  const html = await getText(`${BASE}/search?query=${encodeURIComponent(name)}`, TTL);
  const links = parse(html).querySelectorAll('a[href^="/fighters/"]').map(a => ({ href: a.getAttribute('href')!, name: a.textContent.trim() }));
  const target = fold(name);
  return (links.find(l => fold(l.name) === target) ?? links.find(l => last(l.name) === last(name) && fold(l.name)[0] === target[0]))?.href;
}

/** Histórico de odds de um lutador (todas as lutas listadas no BFO). */
export function fighterLines(name: string): Promise<BfoLine[]> {
  return remember(`bfo:${fold(name)}`, TTL, async () => {
    const href = await findFighter(name);
    if (!href) return [];
    const root = parse(await getText(`${BASE}${href}`, TTL));
    const out: BfoLine[] = [];
    for (const row of root.querySelectorAll('tr.main-row')) {
      const opp = row.nextElementSibling;
      if (!opp) continue;
      const nums = (tr: typeof row) => tr.querySelectorAll('td.moneyline').map(td => ml(td.textContent));
      const [o, lo, hi] = nums(row), [oo, olo, ohi] = nums(opp);
      const dateCell = opp.querySelectorAll('td').pop()?.textContent.trim() ?? '';
      out.push({
        opponent: opp.querySelector('.oppcell a')?.textContent.trim() ?? '',
        date: parseDate(dateCell),
        open: o, close: mid(lo, hi), oppOpen: oo, oppClose: mid(olo, ohi),
      });
    }
    return out;
  });
}

/** Linha de uma luta específica: procura pela data (±3 dias) e pelo sobrenome do adversário. */
export function matchLine(lines: BfoLine[], opponent: string, dateIso: string): BfoLine | undefined {
  const t = new Date(dateIso).getTime();
  return lines.find(l => l.date && Math.abs(new Date(l.date).getTime() - t) < 3.5 * 864e5 && last(l.opponent) === last(opponent))
    ?? lines.find(l => l.date && Math.abs(new Date(l.date).getTime() - t) < 1.5 * 864e5);
}

/** Odds históricas de uma luta, já no formato por canto. */
export async function historicalOdds(red: string, blue: string, dateIso: string): Promise<FightOdds | undefined> {
  const r = matchLine(await fighterLines(red).catch(() => []), blue, dateIso);
  if (r?.close || r?.open) return { provider: 'BestFightOdds', red: r.close ?? r.open, blue: r.oppClose ?? r.oppOpen, redOpen: r.open, blueOpen: r.oppOpen };
  const b = matchLine(await fighterLines(blue).catch(() => []), red, dateIso);
  if (b?.close || b?.open) return { provider: 'BestFightOdds', red: b.oppClose ?? b.oppOpen, blue: b.close ?? b.open, redOpen: b.oppOpen, blueOpen: b.open };
  return undefined;
}
