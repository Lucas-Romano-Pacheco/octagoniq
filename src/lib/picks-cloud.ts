import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { draftStore, mergeSaved, savedStore, setRemoteSink, type MethodKey, type Pick, type RemoteSink, type SavedBook, type SavedEvent } from './picks';

/* Sincronização dos palpites SALVOS com a tabela `picks` do Supabase (docs/supabase.sql).
   Uma linha por (usuário, evento, luta); `updated_at` é a hora em que a pessoa salvou: a conta do ranking no servidor
   usa essa hora para ignorar palpites feitos depois do início da luta. */

export interface Row { user_id: string; event_id: string; fight_id: string; winner: string; method: MethodKey | null; round: number | null; updated_at: string; locks_at?: string | null }

/** `locksAt`: horário da luta. Fica de fora quando não se sabe (a linha do banco mantém o que já tinha). */
export const toRow = (userId: string, eventId: string, fightId: string, p: Pick, savedAt: number, locksAt?: string): Row =>
  ({ user_id: userId, event_id: eventId, fight_id: fightId, winner: p.winner, method: p.method ?? null, round: p.round ?? null, updated_at: new Date(savedAt).toISOString(), ...(locksAt ? { locks_at: locksAt } : {}) });

/** Linhas do banco → caderno salvo (a data do palpite vira `at`; `savedAt` do evento é a mais recente). */
export function fromRows(rows: Row[]): SavedBook {
  const book: SavedBook = {};
  for (const r of rows) {
    const at = Date.parse(r.updated_at);
    const ev = (book[r.event_id] ??= { savedAt: 0, picks: {} });
    ev.picks[r.fight_id] = { winner: r.winner, method: r.method ?? undefined, round: r.round ?? undefined, at };
    ev.savedAt = Math.max(ev.savedAt, at);
  }
  return book;
}

const same = (a?: Pick, b?: Pick) => !!a && !!b && a.winner === b.winner && a.method === b.method && a.round === b.round;

/** Diferença entre dois salvos de um evento: o que subir (novo ou mudou) e o que apagar. */
export function diffEvent(next: SavedEvent, prev?: SavedEvent) {
  const upsert = Object.entries(next.picks).filter(([id, p]) => !same(p, prev?.picks[id])).map(([id, p]) => ({ id, p }));
  const remove = Object.keys(prev?.picks ?? {}).filter(id => !next.picks[id]);
  return { upsert, remove };
}

/* ---------- Dono dos palpites deste navegador ---------- */

const OWNER_KEY = 'octagoniq-owner';
/** Marca este navegador como da conta `userId`. Devolve false quando os palpites guardados aqui são de outra conta
    (aparelho compartilhado): nesse caso eles não sobem, a conta nova começa só com o que já está no banco. */
function claimLocal(userId: string): boolean {
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    localStorage.setItem(OWNER_KEY, userId);
    return !owner || owner === userId;
  } catch { return true; }
}

/* ---------- Estado da nuvem (para a interface) ---------- */

type CloudState = 'off' | 'syncing' | 'ok' | 'error';
let state: { state: CloudState; at?: number; error?: string } = { state: 'off' };
const subs = new Set<() => void>();
const set = (s: typeof state) => { state = s; subs.forEach(f => f()); };
export const useCloudStatus = () => useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => state, () => state);

/** Liga a sincronização para a sessão: puxa os palpites da conta, junta com os do navegador (vale o mais recente de
    cada luta), grava o resultado dos dois lados e passa a enviar cada "Salvar". Devolve a função que desliga. */
export function startCloudSync(session: Session): () => void {
  const userId = session.user.id;
  let live = true;
  const run = async <T>(fn: () => Promise<T>) => {
    set({ ...state, state: 'syncing' });
    try { const r = await fn(); if (live) set({ state: 'ok', at: Date.now() }); return r; }
    catch (e) { if (live) set({ state: 'error', at: Date.now(), error: e instanceof Error ? e.message : String(e) }); }
  };

  const sink: RemoteSink = {
    saveEvent: (eventId, next, prev, locks) => void run(async () => {
      const sb = await getSupabase();
      const { upsert, remove } = diffEvent(next, prev);
      // todas as linhas de um upsert precisam das mesmas colunas: com horário conhecido para todas, ele vai junto
      const all = upsert.every(x => locks[x.id]);
      if (upsert.length) { const { error } = await sb.from('picks').upsert(upsert.map(x => toRow(userId, eventId, x.id, x.p, next.savedAt, all ? locks[x.id] : undefined)), { onConflict: 'user_id,event_id,fight_id' }); if (error) throw error; }
      if (remove.length) { const { error } = await sb.from('picks').delete().eq('user_id', userId).eq('event_id', eventId).in('fight_id', remove); if (error) throw error; }
    }),
  };

  void run(async () => {
    const sb = await getSupabase();
    const { data, error } = await sb.from('picks').select('*').eq('user_id', userId);
    if (error) throw error;
    const remote = fromRows((data ?? []) as Row[]);
    // o que está neste navegador só se junta à conta se for da mesma pessoa (ou de antes de existir conta)
    const mine = claimLocal(userId);
    if (!mine) draftStore.write({});
    const local = mine ? savedStore.read() : {};
    const merged = mergeSaved(local, remote);
    if (live) savedStore.write(merged);
    // sobe o que só existe (ou é mais novo) aqui
    const rows: Row[] = [];
    for (const [eventId, ev] of Object.entries(merged)) for (const x of diffEvent(ev, remote[eventId]).upsert) rows.push(toRow(userId, eventId, x.id, x.p, x.p.at));
    if (rows.length) { const { error: e2 } = await sb.from('picks').upsert(rows, { onConflict: 'user_id,event_id,fight_id' }); if (e2) throw e2; }
  }).then(() => { if (live) setRemoteSink(sink); });

  return () => { live = false; setRemoteSink(null); set({ state: 'off' }); };
}
