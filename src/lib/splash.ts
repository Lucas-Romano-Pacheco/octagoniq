import { useSyncExternalStore } from 'react';
import type { QueryClient } from '@tanstack/react-query';

/* Tela de entrada (o HTML e o CSS estão em index.html). Fica animada enquanto o site carrega; pronto o site, mostra
   "Entrar" e espera a pessoa: clique, toque, rolagem ou qualquer tecla levam ao início. Até lá o site por trás fica
   inerte (sem foco, sem rolagem, sem atalhos). Na saída o site entra em sequência: faixa, cabeçalho, conteúdo
   (.entering, em styles.css). Quem tem entrada própria (o destaque da página inicial) usa useSplashGone() para
   começar só quando a tela sai, em vez de animar escondido atrás dela.

   "Pronto" = dados da primeira tela e fontes (até 2,5 s), e no mínimo ~1,3 s para a animação do logo terminar.
   Uma interação antes disso também vale: a tela sai assim que o site fica pronto. */

const KEY = 'octagoniq-splash';
const MIN_MS = 1300;
const MAX_WAIT_MS = 2500;

let gone = typeof document === 'undefined' || !document.getElementById('splash') || document.documentElement.classList.contains('no-splash');
const subs = new Set<() => void>();
const markGone = () => { gone = true; subs.forEach(f => f()); };

/** true quando não há abertura na tela (já saiu, ou nem apareceu nesta sessão). */
export const useSplashGone = () =>
  useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => gone, () => true);

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** Espera as consultas em andamento terminarem (as da primeira tela), sem passar do limite. */
function settled(client: QueryClient, limitMs: number) {
  return new Promise<void>(resolve => {
    if (!client.isFetching()) return resolve();
    const stop = client.getQueryCache().subscribe(() => { if (!client.isFetching()) { stop(); resolve(); } });
    setTimeout(() => { stop(); resolve(); }, limitMs);
  });
}

const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'CapsLock']);

export async function hideSplash(client: QueryClient) {
  const el = document.getElementById('splash');
  const root = document.documentElement;
  const app = document.getElementById('root');
  if (!el) return;
  if (root.classList.contains('no-splash')) { el.remove(); return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (app) app.inert = true;
  root.style.overflow = 'hidden';

  // a interação conta desde já, mesmo antes de o site ficar pronto
  let enter!: () => void;
  const interacted = new Promise<void>(r => { enter = r; });
  const onKey = (e: KeyboardEvent) => {
    if (MODIFIERS.has(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault(); e.stopPropagation(); // a tecla só entra no site, não dispara atalhos (ex.: "/" abre a busca)
    enter();
  };
  const onPointer = () => enter();
  window.addEventListener('keydown', onKey, true);
  for (const t of ['pointerdown', 'wheel', 'touchmove'] as const) window.addEventListener(t, onPointer, { capture: true, passive: true });

  const left = Math.max(0, MAX_WAIT_MS - performance.now());
  await sleep(50); // um quadro para as consultas da primeira tela começarem
  await Promise.all([
    Promise.race([Promise.all([settled(client, left), document.fonts?.ready]), sleep(left)]),
    sleep(Math.max(0, (reduce ? 300 : MIN_MS) - performance.now())),
  ]);
  el.classList.add('ready');
  document.getElementById('splash-go')?.focus({ preventScroll: true });

  await interacted;
  window.removeEventListener('keydown', onKey, true);
  for (const t of ['pointerdown', 'wheel', 'touchmove'] as const) window.removeEventListener(t, onPointer, true);
  if (app) app.inert = false;
  root.style.overflow = '';
  el.classList.add('out');
  if (!reduce) root.classList.add('entering');
  markGone();
  try { sessionStorage.setItem(KEY, '1'); } catch { /* aba anônima sem armazenamento: mostra de novo, sem problema */ }
  await sleep(900);
  el.remove();
  root.classList.remove('entering');
}
