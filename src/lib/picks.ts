import { useCallback, useSyncExternalStore } from 'react';
import type { Fight } from '@shared/types';
import { fairProbs } from '@shared/format';

/* Palpites: modelo, pontuação e armazenamento.
   - A pontuação é uma função pura (scoreFight), testada em picks.test.ts.
   - O armazenamento fica atrás de PickStore: hoje usa o localStorage do navegador (sem conta, sem servidor);
     para guardar num banco, basta outra implementação dessa interface. */

export type MethodKey = 'ko' | 'sub' | 'dec';
export interface Pick { winner: string; method?: MethodKey; round?: number; at: number }
/** eventId → fightId → palpite */
export type PickBook = Record<string, Record<string, Pick>>;

export const METHODS: { key: MethodKey; label: string }[] = [
  { key: 'ko', label: 'KO/TKO' }, { key: 'sub', label: 'Finalização' }, { key: 'dec', label: 'Decisão' },
];

/** Pontos de cada acerto (ver "Como funciona" na página). */
export const POINTS = { winner: 10, method: 5, round: 5, perfect: 5, zebra: 5, bigZebra: 10 } as const;

export const methodKey = (m?: string): MethodKey | undefined => (/KO/i.test(m ?? '') ? 'ko' : /Finaliza/i.test(m ?? '') ? 'sub' : /Decis/i.test(m ?? '') ? 'dec' : undefined);

/** Palpite travado: a luta já começou/terminou ou o horário dela passou. */
export const isLocked = (f: Fight, now = Date.now()) => f.status !== 'pre' || (!!f.date && new Date(f.date).getTime() <= now);

/** Máximo possível numa luta (vencedor + método + round + perfeito + maior zebra), para mostrar o teto. */
export const MAX_POINTS = POINTS.winner + POINTS.method + POINTS.round + POINTS.perfect + POINTS.bigZebra;

export interface Scored {
  state: 'pending' | 'void' | 'done';
  winner: boolean; method: boolean; round: boolean; perfect: boolean;
  points: number;
  parts: { label: string; pts: number }[];
}

/** Compara o palpite com o resultado. Empate e sem resultado anulam a luta; só pontua método se acertou o vencedor e
    só pontua round se acertou vencedor e método numa luta que acabou antes da decisão. */
export function scoreFight(pick: Pick | undefined, f: Fight): Scored {
  const none: Scored = { state: 'pending', winner: false, method: false, round: false, perfect: false, points: 0, parts: [] };
  const r = f.result;
  if (!pick || f.status !== 'post' || !r) return none;
  if (!r.winnerId) return { ...none, state: 'void' };
  const parts: Scored['parts'] = [];
  const winner = pick.winner === r.winnerId;
  if (!winner) return { ...none, state: 'done' };
  parts.push({ label: 'Vencedor', pts: POINTS.winner });
  const real = methodKey(r.method);
  const method = !!pick.method && pick.method === real;
  if (method) parts.push({ label: 'Método', pts: POINTS.method });
  const finish = real === 'ko' || real === 'sub';
  const round = method && finish && !!pick.round && pick.round === r.round;
  if (round) parts.push({ label: 'Round', pts: POINTS.round });
  const perfect = method && (!finish || round);
  if (perfect) parts.push({ label: 'Palpite perfeito', pts: POINTS.perfect });
  // bônus por acertar o azarão (chance do vencedor pelas odds sem margem)
  const p = fairProbs(f.odds?.red, f.odds?.blue);
  const chance = p ? (r.winnerId === f.red.espnId ? p[0] : p[1]) : undefined;
  if (chance !== undefined && chance < 0.2) parts.push({ label: 'Grande zebra', pts: POINTS.bigZebra });
  else if (chance !== undefined && chance < 0.35) parts.push({ label: 'Zebra', pts: POINTS.zebra });
  return { state: 'done', winner, method, round, perfect, parts, points: parts.reduce((n, x) => n + x.pts, 0) };
}

export interface Summary { made: number; scored: number; pending: number; hits: number; points: number; methods: number; perfects: number }

/** Resumo de um evento (ou de vários, somando) a partir dos palpites e das lutas. */
export function summarize(book: Record<string, Pick>, fights: Fight[]): Summary {
  const s: Summary = { made: 0, scored: 0, pending: 0, hits: 0, points: 0, methods: 0, perfects: 0 };
  for (const f of fights) {
    const pick = book[f.id];
    if (!pick) continue;
    s.made++;
    const sc = scoreFight(pick, f);
    if (sc.state === 'pending') s.pending++;
    if (sc.state === 'done') { s.scored++; s.points += sc.points; if (sc.winner) s.hits++; if (sc.method) s.methods++; if (sc.perfect) s.perfects++; }
  }
  return s;
}

/* ---------- Rascunho x salvo ---------- */

/** Palpites salvos de um evento: é o que conta para a pontuação (e o que vai para a nuvem). */
export interface SavedEvent { savedAt: number; picks: Record<string, Pick> }
export type SavedBook = Record<string, SavedEvent>;

const same = (a?: Pick, b?: Pick) => !!a && !!b ? a.winner === b.winner && a.method === b.method && a.round === b.round : !a && !b;

/** O rascunho difere do que está salvo? (ignora a data do palpite) */
export function isDirty(draft: Record<string, Pick>, saved: Record<string, Pick> = {}) {
  const ids = new Set([...Object.keys(draft), ...Object.keys(saved)]);
  return [...ids].some(id => !same(draft[id], saved[id]));
}

/** Monta o que será salvo: lutas abertas recebem o rascunho; lutas já travadas mantêm o que estava salvo antes
    (não dá para mudar ou criar palpite depois que a luta começa). */
export function buildSaved(draft: Record<string, Pick>, prev: Record<string, Pick> = {}, fights: Fight[], now = Date.now()): SavedEvent {
  const picks: Record<string, Pick> = {};
  for (const f of fights) {
    const p = isLocked(f, now) ? prev[f.id] : draft[f.id];
    if (p) picks[f.id] = p;
  }
  return { savedAt: now, picks };
}

/** Une dois cadernos salvos (ex.: este navegador e a nuvem): por luta, vale o palpite mais recente. */
export function mergeSaved(a: SavedBook, b: SavedBook): SavedBook {
  const out: SavedBook = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const picks: Record<string, Pick> = {};
    for (const fid of new Set([...Object.keys(a[id]?.picks ?? {}), ...Object.keys(b[id]?.picks ?? {})])) {
      const x = a[id]?.picks[fid], y = b[id]?.picks[fid];
      picks[fid] = !x ? y! : !y ? x : x.at >= y.at ? x : y;
    }
    out[id] = { savedAt: Math.max(a[id]?.savedAt ?? 0, b[id]?.savedAt ?? 0), picks };
  }
  return out;
}

/* ---------- Armazenamento ---------- */

/** Destino remoto (nuvem) dos palpites salvos; registrado quando há conta conectada. */
export interface RemoteSink {
  /** `locks`: horário de cada luta (vai junto para o banco; a partir dele o palpite fica visível no ranking) */
  saveEvent(eventId: string, next: SavedEvent, prev: SavedEvent | undefined, locks: Record<string, string>): void;
}

const locksOf = (fights: Fight[]) => Object.fromEntries(fights.filter(f => f.date).map(f => [f.id, f.date!]));
let remote: RemoteSink | null = null;
export const setRemoteSink = (r: RemoteSink | null) => { remote = r; };

export interface PickStore<T> { read(): T; write(v: T): void; subscribe(cb: () => void): () => void }

/** Armazenamento no localStorage, com cache e atualização entre abas. */
function localStore<T>(key: string): PickStore<T> {
  const listeners = new Set<() => void>();
  let cache: T | null = null;
  return {
    read() {
      if (cache) return cache;
      try { cache = JSON.parse(localStorage.getItem(key) ?? '{}') as T; } catch { cache = {} as T; }
      return cache;
    },
    write(v) {
      cache = v;
      try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* sem armazenamento: vale só nesta visita */ }
      listeners.forEach(l => l());
    },
    subscribe(cb) {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => { if (e.key === key) { cache = null; cb(); } };
      window.addEventListener('storage', onStorage);
      return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
    },
  };
}

export const draftStore = localStore<PickBook>('octagoniq-picks-v1');
export const savedStore = localStore<SavedBook>('octagoniq-saved-v1');

const EMPTY_DRAFT: PickBook = {}, EMPTY_SAVED: SavedBook = {};

/** Palpites do usuário: rascunho (salva a cada clique, só neste navegador) e salvos (contam pontos). */
export function usePicks() {
  const draft = useSyncExternalStore(draftStore.subscribe, draftStore.read, () => EMPTY_DRAFT);
  const saved = useSyncExternalStore(savedStore.subscribe, savedStore.read, () => EMPTY_SAVED);

  /** Rascunho efetivo de um evento: o que foi editado, ou, se nada foi editado ainda, o que está salvo. */
  const draftOf = useCallback((eventId: string): Record<string, Pick> => draft[eventId] ?? saved[eventId]?.picks ?? {}, [draft, saved]);

  const setPick = useCallback((eventId: string, fightId: string, pick: Pick | null) => {
    const d = draftStore.read(), s = savedStore.read();
    const ev = { ...(d[eventId] ?? s[eventId]?.picks ?? {}) };
    if (pick) ev[fightId] = pick; else delete ev[fightId];
    draftStore.write({ ...d, [eventId]: ev });
  }, []);

  /** Salva o rascunho do evento (lutas abertas) e envia para a nuvem, se houver conta. */
  const save = useCallback((eventId: string, fights: Fight[]) => {
    const d = draftStore.read(), s = savedStore.read();
    const next = buildSaved(d[eventId] ?? s[eventId]?.picks ?? {}, s[eventId]?.picks, fights);
    savedStore.write({ ...s, [eventId]: next });
    const { [eventId]: _x, ...rest } = d;
    draftStore.write(rest);
    remote?.saveEvent(eventId, next, s[eventId], locksOf(fights));
    return next;
  }, []);

  /** Descarta as alterações não salvas e volta ao que estava salvo. */
  const discard = useCallback((eventId: string) => {
    const { [eventId]: _x, ...rest } = draftStore.read();
    draftStore.write(rest);
  }, []);

  /** Apaga o rascunho e os palpites salvos das lutas que ainda não começaram (os das lutas fechadas ficam: já valem). */
  const clearEvent = useCallback((eventId: string, fights: Fight[]) => {
    const { [eventId]: _a, ...d } = draftStore.read();
    const s = savedStore.read();
    const prev = s[eventId];
    const kept = Object.fromEntries(fights.filter(f => isLocked(f) && prev?.picks[f.id]).map(f => [f.id, prev!.picks[f.id]]));
    const next: SavedEvent = { savedAt: Date.now(), picks: kept };
    draftStore.write(d);
    if (Object.keys(kept).length) savedStore.write({ ...s, [eventId]: next });
    else { const { [eventId]: _b, ...rest } = s; savedStore.write(rest); }
    if (prev) remote?.saveEvent(eventId, next, prev, locksOf(fights));
  }, []);

  return { draft, saved, draftOf, setPick, save, discard, clearEvent };
}
