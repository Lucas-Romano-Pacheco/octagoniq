/* Normalização e tradução (pt-BR) usadas pelo servidor e pela interface. */

export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Slug no padrão de ufc.com/athlete/<slug>. */
export const slugify = (s: string) =>
  fold(s).replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const WEIGHT: [RegExp, string][] = [
  [/light ?heavy/i, 'Meio-pesado'],
  [/heavy/i, 'Pesado'],
  [/middle/i, 'Médio'],
  [/welter/i, 'Meio-médio'],
  [/light/i, 'Leve'],
  [/feather/i, 'Pena'],
  [/bantam/i, 'Galo'],
  [/fly/i, 'Mosca'],
  [/straw/i, 'Palha'],
  [/catch/i, 'Peso combinado'],
];

/** "Women's Flyweight" | "W Flyweight" → "Mosca (F)" */
export function weightClassPt(en?: string): string {
  if (!en) return '';
  const women = /^w\b|women/i.test(en);
  const hit = WEIGHT.find(([re]) => re.test(en));
  const base = hit ? hit[1] : en;
  return women && base !== 'Peso combinado' ? `${base} (F)` : base;
}

const DETAIL: Record<string, string> = {
  'punches': 'Socos', 'punch': 'Soco', 'kick': 'Chute', 'kicks': 'Chutes', 'knee': 'Joelhada', 'knees': 'Joelhadas',
  'elbow': 'Cotovelada', 'elbows': 'Cotoveladas', 'slam': 'Slam', 'retirement': 'Desistência', 'doctor stoppage': 'Interrupção médica',
  'rear naked choke': 'Mata-leão', 'guillotine choke': 'Guilhotina', 'arm triangle': 'Triângulo de braço', 'arm-triangle choke': 'Triângulo de braço',
  'triangle choke': 'Triângulo', 'kimura': 'Kimura', 'armbar': 'Chave de braço', 'neck crank': 'Neck crank', 'heel hook': 'Chave de calcanhar',
  "d'arce choke": "D'arce", 'anaconda choke': 'Anaconda', 'kneebar': 'Chave de joelho', 'brabo choke': 'Brabo', 'von flue choke': 'Von Flue',
  'peruvian necktie': 'Gravata peruana', 'ezekiel choke': 'Ezequiel', 'north-south choke': 'Norte-sul', 'face crank': 'Face crank',
  'injury': 'Lesão', 'verbal submission': 'Desistência verbal', 'technical submission': 'Finalização técnica',
};

export function detailPt(en?: string | null): string | undefined {
  if (!en || en === 'None') return undefined;
  return DETAIL[en.toLowerCase()] ?? en;
}

/** Método normalizado a partir do `result.name`/`displayName` da ESPN. */
export function methodPt(name?: string, display?: string): string {
  const n = (name ?? display ?? '').toLowerCase();
  if (!n) return '';
  if (n.includes('kotko') || n.includes('ko/tko') || n === 'ko' || n === 'tko') return 'KO/TKO';
  if (n.includes('submission')) return 'Finalização';
  if (n.includes('unanimous')) return 'Decisão unânime';
  if (n.includes('split')) return 'Decisão dividida';
  if (n.includes('majority')) return 'Decisão majoritária';
  if (n.includes('decision')) return 'Decisão';
  if (n.includes('draw')) return 'Empate';
  if (n.includes('no contest') || n.includes('overturned')) return 'Sem resultado';
  if (n.includes('dq') || n.includes('disqualification')) return 'Desclassificação';
  return display ?? name ?? '';
}

export const methodShort = (m?: string) =>
  !m ? '' : m.startsWith('Decisão') ? 'DEC' : m === 'Finalização' ? 'FIN' : m === 'KO/TKO' ? 'KO' : m === 'Empate' ? 'EMP' : m === 'Sem resultado' ? 'NC' : m;

const STANCE: Record<string, string> = { orthodox: 'Ortodoxa', southpaw: 'Canhota', switch: 'Alterna', 'open stance': 'Aberta' };
export const stancePt = (s?: string) => (s ? STANCE[s.toLowerCase()] ?? s : undefined);

export const inToCm = (v?: number) => (v ? Math.round(v * 2.54) : undefined);
export const lbToKg = (v?: number) => (v ? Math.round(v * 0.45359 * 10) / 10 : undefined);

/** "6' 0\"" → cm; "76\"" → cm */
export function feetInchesToCm(s?: string): number | undefined {
  if (!s) return undefined;
  const ft = s.match(/(\d+)\s*'/), inch = s.match(/(\d+(?:\.\d+)?)\s*"/);
  const total = (ft ? +ft[1] * 12 : 0) + (inch ? +inch[1] : 0);
  return total ? Math.round(total * 2.54) : undefined;
}

export const toSeconds = (period?: number, clock?: string) => {
  if (!period || !clock) return undefined;
  const [m, s] = clock.split(':').map(Number);
  return (period - 1) * 300 + m * 60 + s;
};

/* ---------- Odds ---------- */

/** Probabilidade implícita (0–1) de uma linha americana (-148, +124). */
export const impliedProb = (ml?: number) => (ml === undefined ? undefined : ml < 0 ? -ml / (-ml + 100) : 100 / (ml + 100));

export const fmtMoneyline = (ml?: number) => (ml === undefined ? '—' : ml > 0 ? `+${ml}` : String(ml));

/** Probabilidades sem a margem da casa (normalizadas para somar 100%). */
export function fairProbs(a?: number, b?: number): [number, number] | undefined {
  const pa = impliedProb(a), pb = impliedProb(b);
  if (pa === undefined || pb === undefined) return undefined;
  return [pa / (pa + pb), pb / (pa + pb)];
}

export type OddsTier = 'grande-favorito' | 'favorito' | 'ligeiro-favorito' | 'equilibrada' | 'ligeiro-azarao' | 'zebra' | 'grande-zebra';

/** Classificação no estilo do Tapology, a partir da probabilidade justa do lutador. */
export function oddsTier(p: number): { tier: OddsTier; label: string } {
  if (p >= 0.8) return { tier: 'grande-favorito', label: 'Grande favorito' };
  if (p >= 0.65) return { tier: 'favorito', label: 'Favorito' };
  if (p >= 0.53) return { tier: 'ligeiro-favorito', label: 'Ligeiro favorito' };
  if (p > 0.47) return { tier: 'equilibrada', label: 'Equilibrada' };
  if (p > 0.35) return { tier: 'ligeiro-azarao', label: 'Ligeiro azarão' };
  if (p > 0.2) return { tier: 'zebra', label: 'Zebra' };
  return { tier: 'grande-zebra', label: 'Grande zebra' };
}
