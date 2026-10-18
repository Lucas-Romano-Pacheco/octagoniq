import { useSyncExternalStore } from 'react';

/* Tema: "light" | "dark" | "system". A classe .dark no <html> é aplicada antes da
   primeira pintura por um script inline no index.html (sem flash branco). */

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'octagoniq-theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function readPref(): ThemePref {
  try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch { return 'system'; }
}

const resolve = (p: ThemePref) => (p === 'system' ? (media().matches ? 'dark' : 'light') : p);

function apply(p: ThemePref) {
  document.documentElement.classList.toggle('dark', resolve(p) === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolve(p) === 'dark' ? '#0d0f22' : '#faf8f4');
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function setTheme(p: ThemePref) {
  try { if (p === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, p); } catch { /* armazenamento bloqueado */ }
  apply(p);
  emit();
}

// acompanha a troca de tema do sistema enquanto a preferência for "system"
if (typeof window !== 'undefined') {
  media().addEventListener('change', () => { if (readPref() === 'system') { apply('system'); emit(); } });
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };

/** Tema efetivo ("light" | "dark") e a preferência salva. */
export function useTheme() {
  const pref = useSyncExternalStore(subscribe, readPref, () => 'system' as ThemePref);
  const theme = useSyncExternalStore(subscribe, () => resolve(readPref()), () => 'light' as const);
  return { theme, pref, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}
