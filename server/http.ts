/* Cliente HTTP do BFF.
   - Cache em memória com TTL e deduplicação de requisições em voo
   - Stale-while-revalidate: valor vencido é devolvido na hora e atualizado em segundo plano
   - Agregados (`remember`) persistidos em disco (.cache/), então sobrevivem a reinícios
   - Limite de concorrência por host e fallback para o valor antigo quando a fonte falha */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
/** Além disso, um valor vencido não é mais servido: espera-se a fonte. */
const MAX_STALE = 3 * 24 * HOUR;

interface Entry { value: unknown; expires: number; stored: number }

/* ---------- Limite por host ---------- */

const slots = new Map<string, { active: number; queue: (() => void)[] }>();
const MAX_PER_HOST = 8;
/* fontes menores recebem menos requisições simultâneas */
const HOST_LIMIT: Record<string, number> = { 'www.bestfightodds.com': 2 };
async function acquire(host: string) {
  const s = slots.get(host) ?? { active: 0, queue: [] };
  slots.set(host, s);
  if (s.active >= (HOST_LIMIT[host] ?? MAX_PER_HOST)) await new Promise<void>(r => s.queue.push(r));
  s.active++;
  return () => { s.active--; s.queue.shift()?.(); };
}

export class UpstreamError extends Error {
  status: number;
  url: string;
  constructor(status: number, url: string) {
    super(`Upstream ${status}: ${url}`);
    this.status = status;
    this.url = url;
  }
}

async function raw(url: string, as: 'json' | 'text'): Promise<unknown> {
  const release = await acquire(new URL(url).host);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: as === 'json' ? 'application/json' : 'text/html', 'Accept-Language': 'pt-BR,pt;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new UpstreamError(res.status, url);
    return as === 'json' ? await res.json() : await res.text();
  } finally {
    release();
  }
}

/* ---------- Núcleo SWR (compartilhado pelo cache HTTP e pelos agregados) ---------- */

function swr<T>(store: Map<string, Entry>, inflight: Map<string, Promise<unknown>>, key: string, ttl: number, load: () => Promise<T>, onSet?: () => void): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  const refresh = () => {
    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;
    const p = load()
      .then(value => { store.set(key, { value, expires: Date.now() + ttl, stored: Date.now() }); onSet?.(); return value; })
      .catch(err => { if (hit) return hit.value as T; throw err; })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  };
  if (hit && hit.expires > now) return Promise.resolve(hit.value as T);
  if (hit && now - hit.expires < MAX_STALE) {
    refresh().catch(() => { /* fica com o valor antigo */ });
    return Promise.resolve(hit.value as T);
  }
  return refresh();
}

/* ---------- Respostas cruas das fontes (só memória) ---------- */

const httpCache = new Map<string, Entry>();
const httpInflight = new Map<string, Promise<unknown>>();
/* Teto de memória: descarta as respostas mais antigas (o Map mantém a ordem de inserção). */
function trimHttp() {
  if (httpCache.size <= 6000) return;
  let n = httpCache.size - 5000;
  for (const k of httpCache.keys()) { httpCache.delete(k); if (--n <= 0) break; }
}

export function cached<T>(url: string, ttl: number, as: 'json' | 'text' = 'json'): Promise<T> {
  return swr(httpCache, httpInflight, `${as}:${url}`, ttl, () => raw(url, as) as Promise<T>, trimHttp);
}
export const getJson = <T>(url: string, ttl: number) => cached<T>(url, ttl, 'json');
export const getText = (url: string, ttl: number) => cached<string>(url, ttl, 'text');

/* ---------- Agregados (memória + disco) ---------- */

// raiz do projeto nos dois modos (npm run dev e npm start rodam a partir dela);
// no Vercel o disco é só leitura, exceto /tmp (que dura enquanto a instância da função estiver viva)
const CACHE_DIR = process.env.OCTAGONIQ_CACHE_DIR ?? (process.env.VERCEL ? '/tmp/octagoniq' : join(process.cwd(), '.cache'));
const CACHE_FILE = join(CACHE_DIR, 'aggregates.json');
const memo = new Map<string, Entry>();
const memoInflight = new Map<string, Promise<unknown>>();

try {
  const saved = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as Record<string, Entry>;
  const now = Date.now();
  for (const [k, e] of Object.entries(saved)) if (now - e.expires < MAX_STALE) memo.set(k, e);
  console.log(`[cache] ${memo.size} itens carregados do disco`);
} catch { /* primeira execução */ }

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      mkdirSync(CACHE_DIR, { recursive: true });
      const tmp = CACHE_FILE + '.tmp';
      writeFileSync(tmp, JSON.stringify(Object.fromEntries(memo)));
      renameSync(tmp, CACHE_FILE); // troca atômica: nunca deixa o arquivo pela metade
    } catch (e) { console.warn('[cache] falha ao salvar:', e); }
  }, 3000);
}

/** Memoiza um resultado agregado, com SWR e persistência em disco. */
export function remember<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  return swr(memo, memoInflight, key, ttl, fn, scheduleSave);
}

/** Idade do valor em cache (ms), para a interface mostrar "atualizado há X". */
export const ageOf = (key: string) => { const e = memo.get(key); return e ? Date.now() - e.stored : undefined; };

/** Promise.allSettled que devolve só os valores resolvidos (com nulos no lugar dos erros). */
export async function settle<T>(items: Promise<T>[]): Promise<(T | null)[]> {
  const r = await Promise.allSettled(items);
  return r.map(x => (x.status === 'fulfilled' ? x.value : null));
}

/** Força https em $refs da ESPN (que vêm como http://). */
export const https = (u: string) => u.replace(/^http:\/\//, 'https://');
