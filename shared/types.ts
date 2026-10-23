/* Tipos do domínio do OctagonIQ, compartilhados entre o servidor (BFF) e a interface.
   O servidor normaliza ESPN, UFC.com e Fight Tracker para estes formatos. */

export type EventStatus = 'pre' | 'in' | 'post';
export type CardSegment = 'main' | 'prelims' | 'early';

export interface EventListItem {
  id: string;            // id ESPN
  name: string;          // "UFC 333: Volkanovski vs. Evloev"
  date: string;          // ISO
  numbered: boolean;     // UFC 3xx
  series: 'ppv' | 'fight-night' | 'dwcs' | 'other';
}

export interface FighterRef {
  espnId: string;
  name: string;
  shortName?: string;
  record?: string;       // "20-0-0"
  country?: string;      // nome em pt-BR
  countryCode?: string;  // ISO 3166 ("br", "gb-eng") para as bandeiras em SVG
  flag?: string;
  headshot?: string;
  bodyImage?: string;    // recorte de corpo inteiro (UFC.com)
  slug: string;          // slug de ufc.com (derivado do nome)
}

interface FightResult {
  winnerId: string | null;   // espnId; null = empate/NC
  method: string;            // "Decisão unânime", "KO/TKO", "Finalização"
  detail?: string;           // "Kimura", "Socos"
  round?: number;
  clock?: string;            // "4:19"
}

export interface Fight {
  id: string;
  order: number;             // 1 = luta principal
  segment: CardSegment;
  weightClass: string;       // pt-BR
  title: boolean;
  rounds: number;
  status: EventStatus;
  red: FighterRef;
  blue: FighterRef;
  result?: FightResult;
  /** luta em andamento: round e relógio atuais */
  live?: { round?: number; clock?: string };
  broadcast?: string;
  date?: string;
  odds?: FightOdds;
}

export interface EventDetail extends EventListItem {
  status: EventStatus;
  venue?: string;
  city?: string;
  country?: string;
  fights: Fight[];
  segmentStart: Partial<Record<CardSegment, string>>;  // horário de início de cada parte do card
}

export interface RankEntry {
  rank: number;              // 0 = campeão
  name: string;
  slug: string;
  change?: number;           // + subiu, - caiu
  isNew?: boolean;
  image?: string;
}

export interface RankingDivision {
  id: string;                // slug estável: "peso-leve", "p4p-masculino"
  name: string;
  p4p: boolean;
  women: boolean;
  champion?: RankEntry;
  entries: RankEntry[];
}

export interface Rankings {
  updatedAt: string;
  source: string;
  divisions: RankingDivision[];
}

export interface OfficialStats {
  slpm?: number;             // golpes sig. conectados por minuto
  sapm?: number;             // golpes sig. absorvidos por minuto
  strAcc?: number;           // % precisão
  strDef?: number;           // % defesa
  tdAvg?: number;            // quedas por 15 min
  tdAcc?: number;
  tdDef?: number;
  subAvg?: number;           // finalizações tentadas por 15 min
  kdAvg?: number;
  avgFightTime?: string;
  sigLanded?: number;
  sigAttempted?: number;
  tdLanded?: number;
  tdAttempted?: number;
  byPosition?: { standing: number; clinch: number; ground: number };
  byTarget?: { head: number; body: number; leg: number };
  winsBy?: { ko: number; dec: number; sub: number };
  /** de onde vieram os números: UFC.com (oficial) ou calculados das lutas na ESPN, quando o UFC.com não publica */
  source?: 'ufc' | 'espn';
  /** quantas lutas entraram na conta (só quando calculado das lutas) */
  fights?: number;
}

export interface FighterBio {
  name: string;
  nickname?: string;
  slug: string;
  espnId?: string;
  division?: string;
  rankLabel?: string;        // "Campeão", "#3" (na divisão)
  p4pRank?: number;          // posição no peso por peso
  status?: string;
  age?: number;
  dob?: string;
  heightCm?: number;
  weightKg?: number;
  reachCm?: number;
  legReachCm?: number;
  stance?: string;
  style?: string;
  team?: string;
  hometown?: string;
  country?: string;
  countryCode?: string;
  flag?: string;
  debut?: string;
  record: { w: number; l: number; d: number; nc?: number };
  headshot?: string;
  bodyImage?: string;
  ufcUrl?: string;
  espnUrl?: string;
}

export interface HistoryStats {
  sigLanded: number;
  sigAttempted: number;
  totalLanded: number;
  totalAttempted: number;
  kd: number;
  tdLanded: number;
  tdAttempted: number;
  subAttempts: number;
  head: number; body: number; leg: number;
}

export interface HistoryFight {
  eventId: string;
  fightId: string;
  eventName: string;
  date: string;
  opponent: FighterRef;
  outcome: 'W' | 'L' | 'D' | 'NC' | 'pending';
  method?: string;
  detail?: string;
  round?: number;
  clock?: string;
  weightClass?: string;
  title: boolean;
  seconds?: number;          // duração da luta
  stats?: HistoryStats;
  odds?: { ml?: number; oppMl?: number; provider: string };
}

export interface FighterProfile {
  bio: FighterBio;
  stats: OfficialStats;
  history: HistoryFight[];
  nextFight?: HistoryFight;
  news: NewsItem[];
  sources: string[];
}

export interface NewsItem {
  title: string;
  url: string;
  date?: string;
  image?: string;
  source: string;
}

export interface SearchHit {
  espnId: string;
  name: string;
  slug: string;
  headshot?: string;
  active?: boolean;
}

/** Média das estatísticas oficiais dos ranqueados de uma divisão (campeão + top 15), para dar referência aos números. */
type AvgKey = 'slpm' | 'sapm' | 'strAcc' | 'strDef' | 'tdAvg' | 'tdAcc' | 'tdDef' | 'subAvg' | 'kdAvg';
export interface DivisionAverages {
  division: string;
  n: number;
  avg: Partial<Record<AvgKey, number>>;
  /** valores de cada ranqueado, do melhor para o pior (em "absorvidos", menor é melhor), para calcular posições */
  ranks: Partial<Record<AvgKey, { slug: string; value: number }[]>>;
}

/** Próxima luta marcada de um atleta (para "luta em breve" nas listas), indexada pelo id ESPN. */
export interface BookedFight { eventId: string; fightId: string; eventName: string; date: string; opponent: string; title: boolean }
export type BookedMap = Record<string, BookedFight>;

/** Dados extras de cada ranqueado (bandeira e cartel), indexados pelo slug do UFC.com. */
interface RankMeta { espnId?: string; record?: string; country?: string; countryCode?: string }
export type RankingsMeta = Record<string, RankMeta>;

/** Linha de aposta (americana) de cada canto. */
export interface FightOdds {
  provider: string;
  red?: number;          // moneyline atual/fechamento
  blue?: number;
  redOpen?: number;
  blueOpen?: number;
  methods?: { red?: MethodOdds; blue?: MethodOdds };
}
export interface MethodOdds { ko?: number; sub?: number; dec?: number }

/** Estatísticas de um lado numa luta (totais da luta). */
export interface FightSideStats {
  kd: number;
  sigLanded: number; sigAttempted: number;
  totalLanded: number; totalAttempted: number;
  tdLanded: number; tdAttempted: number;
  subAttempts: number; reversals: number; advances: number;
  head: [number, number]; body: [number, number]; leg: [number, number];         // [conectados, tentados]
  distance: [number, number]; clinch: [number, number]; ground: [number, number];
}

/** Cartões dos juízes (decisões): pontos por round de cada canto. */
export interface Scorecards {
  source: string;
  judges: { name: string; red: number; blue: number; rounds: { n: number; red: number; blue: number }[] }[];
}

/** Nota Elo de um lutador (calculada com todas as lutas do UFC). `history`: nota depois de cada luta. */
export interface EloFighter {
  id: string; name: string; rating: number; peak: number; peakDate?: string; fights: number; wins: number;
  lastDate?: string; division?: string; history: { d: string; r: number }[]; rank?: number; of?: number;
}

/** Um reinado de cinturão (Wikipédia). `days` falta no reinado atual (incumbent). */
export interface BeltReign { n: number; name: string; country?: string; event?: string; start: string; days?: number; defenses: number; incumbent: boolean }

/** Números de um lutador num round (UFC Fight Tracker). */
export interface RoundSide { sig: number; sigAtt: number; kd: number; td: number; tdAtt: number; ctrl: number /* segundos de controle */; subs: number }
export interface RoundStat { n: number; red: RoundSide; blue: RoundSide }

export interface FightDetail {
  eventId: string;
  eventName: string;
  fight: Fight;
  red: FighterRef & { stats?: FightSideStats };
  blue: FighterRef & { stats?: FightSideStats };
  seconds?: number;
  scorecards?: Scorecards;
  /** estatísticas round a round (UFC Fight Tracker), para o gráfico de domínio */
  rounds?: RoundStat[];
}
