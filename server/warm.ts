/* Aquecimento do cache: ao subir o servidor, carrega em segundo plano o que quase todo
   visitante abre primeiro (agenda, rankings, eventos próximos e os perfis dos lutadores
   dos próximos cards e dos campeões). Depois renova a agenda e os rankings periodicamente. */

import * as espn from './espn.ts';
import * as ufc from './ufc.ts';
import { remember, HOUR } from './http.ts';
import { fighterProfile, rankingsMeta, upcoming } from './routes.ts';

let started = false;

async function inBatches<T>(items: T[], size: number, fn: (x: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await Promise.allSettled(items.slice(i, i + size).map(fn));
}

async function run() {
  const t = Date.now();
  const [rankings, next] = await Promise.all([
    remember('rankings', 1 * HOUR, () => ufc.rankings()).catch(() => null),
    upcoming(6).catch(() => []),
  ]);
  const events = await Promise.all(next.filter(e => e.series !== 'dwcs').slice(0, 2).map(e => espn.eventDetail(e.id).catch(() => null)));

  // lutadores do card principal dos 2 próximos eventos + campeões
  const targets = new Map<string, string | undefined>();
  for (const ev of events) for (const f of ev?.fights.filter(x => x.segment === 'main') ?? []) {
    targets.set(f.red.slug, f.red.espnId);
    targets.set(f.blue.slug, f.blue.espnId);
  }
  for (const d of rankings?.divisions ?? []) if (d.champion && !targets.has(d.champion.slug)) targets.set(d.champion.slug, undefined);

  // dois perfis por vez, para não sobrecarregar as fontes
  await inBatches([...targets], 2, ([slug, id]) => fighterProfile(slug, id));
  const meta = await rankingsMeta().catch(() => ({}));
  console.log(`[warm] ${Object.keys(meta).length} ranqueados com bandeira e cartel`);
  console.log(`[warm] ${targets.size} perfis, ${events.filter(Boolean).length} eventos e rankings prontos em ${Math.round((Date.now() - t) / 1000)}s`);
}

export function warmUp() {
  if (started) return;
  started = true;
  setTimeout(() => { run().catch(e => console.warn('[warm] falhou:', e)); }, 1500);
  setInterval(() => { run().catch(() => { /* tenta de novo no próximo ciclo */ }); }, 30 * 60_000).unref();
}
