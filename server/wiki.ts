/* Linha do tempo dos cinturões (D6): os reinados de cada divisão, da "List of UFC champions" da Wikipédia em inglês
   (conteúdo CC BY-SA, creditado na tela). Lê o wikitext pela API oficial e interpreta as tabelas de cada divisão. */

import type { BeltReign } from '../shared/types.ts';
import { HOUR, getJson, remember } from './http.ts';

const API = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&page=List_of_UFC_champions';
type J = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Nome da divisão no site (pt-BR) → título da seção na Wikipédia. */
const WIKI_SECTION: Record<string, string> = {
  'Pesado': 'Heavyweight Championship', 'Meio-pesado': 'Light Heavyweight Championship', 'Médio': 'Middleweight Championship',
  'Meio-médio': 'Welterweight Championship', 'Leve': 'Lightweight Championship', 'Pena': 'Featherweight Championship',
  'Galo': 'Bantamweight Championship', 'Mosca': 'Flyweight Championship',
  'Galo (F)': "Women's Bantamweight Championship", 'Mosca (F)': "Women's Flyweight Championship", 'Palha (F)': "Women's Strawweight Championship",
};

const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Sept: 8, Oct: 9, Nov: 10, Dec: 11 };
/** "Feb 23, 2001" → ISO (meio-dia UTC, para não virar o dia em fuso nenhum). */
export function wikiDate(s: string): string | undefined {
  const m = s.match(/([A-Z][a-z]{2,4})\.? (\d{1,2}), (\d{4})/);
  if (!m || MONTHS[m[1]] === undefined) return undefined;
  return new Date(Date.UTC(+m[3], MONTHS[m[1]], +m[2], 12)).toISOString();
}
/** [[Link|Texto]] → Texto; [[Link]] → Link. */
const unlink = (s: string) => s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1');

/** Reinados oficiais de uma tabela de divisão (ignora interinos, notas e linhas de título vago). */
export function parseReigns(wikitext: string): BeltReign[] {
  const out: BeltReign[] = [];
  for (const row of wikitext.split(/\n\|-/)) {
    const num = row.match(/^\s*!\s*(\d+)\s*$/m)?.[1];
    if (!num) continue;                                      // "! —" (interino) e "! colspan" (notas) ficam de fora
    const cells = row.split(/\n\|/).slice(1);                // célula de nome, evento, data, dias, defesas
    if (cells.length < 4) continue;
    const nameCell = cells[0];
    const name = unlink(nameCell.match(/\[\[[^\]]+\]\]/)?.[0] ?? '').trim();
    const country = nameCell.match(/\{\{flagicon\|([A-Z]{3})/)?.[1];
    const event = unlink(cells[1].match(/\[\[[^\]]+\]\]/)?.[0] ?? '').trim();
    const start = wikiDate(cells[2]);
    const daysTxt = cells[3];
    const incumbent = /incumbent/i.test(daysTxt);
    const days = Number(daysTxt.match(/(\d[\d,]*)\s*days?/)?.[1]?.replace(/,/g, '')) || undefined;
    const defCell = cells.slice(4).join('\n');
    const defenses = (defCell.match(/(^|<br>|\|)\s*\d+\.\s*def\./g) ?? []).length;
    if (!name || !start) continue;
    out.push({ n: +num, name, country, event, start, days, defenses, incumbent });
  }
  return out;
}

/** O wikitext inteiro da página, numa requisição só por dia (a API limita pedidos seguidos). */
const pageText = () => remember('belts-page:v1', 24 * HOUR, async () => {
  const text: string = (await getJson<J>(`${API}&prop=wikitext`, 24 * HOUR))?.parse?.wikitext ?? '';
  if (!text.includes('{|')) throw new Error('página vazia');
  return text;
});

/** Trecho da página entre o título "===Seção===" e o próximo título. */
export function sectionText(text: string, title: string): string | undefined {
  const lines = text.split('\n');
  const at = lines.findIndex(l => l.replace(/=/g, '').replace(/<[^>]+>|''/g, '').trim() === title && /^=+/.test(l));
  if (at < 0) return undefined;
  const end = lines.findIndex((l, i) => i > at && /^==/.test(l));
  return lines.slice(at + 1, end < 0 ? undefined : end).join('\n');
}

/** Reinados de uma divisão do site. */
export function beltHistory(division: string): Promise<BeltReign[] | null> {
  const title = WIKI_SECTION[division];
  if (!title) return Promise.resolve(null);
  return remember(`belts:v2:${title}`, 24 * HOUR, async () => {
    const sec = sectionText(await pageText(), title);
    const reigns = sec ? parseReigns(sec) : [];
    if (!reigns.length) throw new Error('tabela vazia');
    return reigns;
  }).catch(() => null);
}
