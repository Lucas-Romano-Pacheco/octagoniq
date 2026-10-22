import { useSyncExternalStore, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { ChartBarHorizontal, Table } from '@phosphor-icons/react';
import type { FightOdds } from '@shared/types';
import { fairProbs, fmtMoneyline, oddsTier, type OddsTier } from '@shared/format';
import { Segmented, Term, Tip } from './kit';

/* Componentes de confronto vermelho × azul, usados na comparação e na página da luta. */

export type Side = 'a' | 'b';
export const CORNER = { a: 'var(--color-red)', b: 'var(--color-blue)' };
/** Mesmas cores, em tom de preenchimento: para fundos com texto branco por cima (contraste >= 4.5:1). */
export const CORNER_FILL = { a: 'var(--color-red-fill)', b: 'var(--color-blue-fill)' };
/** Cor dos cantos para texto (números e nomes coloridos): contraste de leitura também no fundo claro. */
export const CORNER_INK = { a: 'var(--color-red-fill)', b: 'var(--color-blue-ink)' };

export const better = (a?: number, b?: number, lowerIsBetter = false): Side | null => {
  if (a === undefined || b === undefined || a === b) return null;
  return (a > b) !== lowerIsBetter ? 'a' : 'b';
};

/* ---------- Barras ou tabela ----------
   As barras espelhadas mostram quem leva vantagem, mas afastam os dois números. A tabela os deixa lado a lado.
   A escolha vale para o site todo e fica guardada no navegador. */

export type DuelMode = 'barras' | 'tabela';
const MODE_KEY = 'oiq:duel-mode';
const modeListeners = new Set<() => void>();
const readMode = (): DuelMode => {
  try { return localStorage.getItem(MODE_KEY) === 'tabela' ? 'tabela' : 'barras'; } catch { return 'barras'; }
};
let mode: DuelMode = readMode();
function setDuelMode(m: DuelMode) {
  mode = m;
  try { localStorage.setItem(MODE_KEY, m); } catch { /* navegador sem armazenamento: vale só nesta visita */ }
  modeListeners.forEach(l => l());
}
export function useDuelMode() {
  return useSyncExternalStore(l => { modeListeners.add(l); return () => modeListeners.delete(l); }, () => mode, () => 'barras' as DuelMode);
}

export function DuelModeToggle() {
  const m = useDuelMode();
  return (
    <Segmented value={m} onChange={setDuelMode} options={[
      { value: 'barras', label: <span className="flex items-center"><ChartBarHorizontal className="h-4 w-4" /><span className="sr-only">Barras</span></span> },
      { value: 'tabela', label: <span className="flex items-center"><Table className="h-4 w-4" /><span className="sr-only">Tabela</span></span> },
    ]} />
  );
}

/** Topo de uma lista de DuelRow: o nome de cada canto e a troca entre barras e tabela. */
export function DuelHead({ a, b }: { a: string; b: string }) {
  const view = useDuelMode();
  const name = (s: Side, n: string, end?: boolean) => (
    <span className={clsx('flex min-w-0 items-center gap-1.5', end && 'justify-end')}><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CORNER[s] }} /><span className="truncate">{n}</span></span>
  );
  return view === 'tabela' ? (
    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center gap-3 px-5 pb-1 pt-3 text-[13px] font-semibold text-fg-2 sm:grid-cols-[minmax(0,1fr)_8rem_8rem]">
      <span><DuelModeToggle /></span>{name('a', a, true)}{name('b', b, true)}
    </div>
  ) : (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-5 pb-1 pt-3 text-[13px] font-semibold text-fg-2">
      {name('a', a)}<DuelModeToggle /><span className="flex min-w-0 flex-row-reverse items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CORNER.b }} /><span className="truncate">{b}</span></span>
    </div>
  );
}

/** Barra espelhada a partir do centro, nas cores dos cantos (ou linha de tabela, conforme o modo). */
export function DuelRow({ label, a, b, fmt = v => (v === undefined ? '—' : String(v)), lowerIsBetter, sub }: {
  label: string; a?: number; b?: number; fmt?: (v?: number) => string; lowerIsBetter?: boolean; sub?: [ReactNode, ReactNode];
}) {
  const view = useDuelMode();
  const max = Math.max(a ?? 0, b ?? 0) || 1;
  const win = better(a, b, lowerIsBetter);
  if (view === 'tabela') return (
    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-baseline gap-3 px-5 py-2.5 sm:grid-cols-[minmax(0,1fr)_8rem_8rem]">
      <span className="text-[14px] text-fg-2"><Term label={label} />{lowerIsBetter && <span className="text-[13px] text-fg-3"> (menor é melhor)</span>}</span>
      {([['a', a], ['b', b]] as const).map(([s, v], i) => (
        <span key={s} className={clsx('num text-right text-[16px]', win === s ? 'font-bold text-fg' : 'text-fg-2')}>
          {fmt(v)}{sub && <span className="block whitespace-nowrap text-[12px] font-normal text-fg-3">{sub[i]}</span>}
        </span>
      ))}
    </div>
  );
  return (
    <div className="px-5 py-3">
      <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
        {/* o complemento ("de 44 · 50%") fica ao lado no desktop e numa linha própria no celular */}
        <span className={clsx('num text-right text-[16px]', win === 'a' ? 'font-bold text-fg' : 'text-fg-2')}>{fmt(a)}{sub && <span className="block whitespace-nowrap text-[13px] font-normal text-fg-3 sm:ml-1.5 sm:inline sm:text-[13px]">{sub[0]}</span>}</span>
        <span className="text-center text-[13px] text-fg-3"><Term label={label} />{lowerIsBetter && <span className="text-fg-3"> (menor é melhor)</span>}</span>
        <span className={clsx('num text-[16px]', win === 'b' ? 'font-bold text-fg' : 'text-fg-2')}>{fmt(b)}{sub && <span className="block whitespace-nowrap text-[13px] font-normal text-fg-3 sm:ml-1.5 sm:inline sm:text-[13px]">{sub[1]}</span>}</span>
      </div>
      <div className="grid grid-cols-2 gap-[2px]">
        <div className="flex h-2 justify-end rounded-l-full bg-surface-2"><div className="h-full rounded-l-full transition-[width] duration-700" style={{ width: `${((a ?? 0) / max) * 100}%`, background: CORNER.a }} /></div>
        <div className="flex h-2 rounded-r-full bg-surface-2"><div className="h-full rounded-r-full transition-[width] duration-700" style={{ width: `${((b ?? 0) / max) * 100}%`, background: CORNER.b }} /></div>
      </div>
    </div>
  );
}

/* ---------- Odds ---------- */

const TIER_CLS: Record<OddsTier, string> = {
  'grande-favorito': 'bg-blue/12 text-blue-ink',
  favorito: 'bg-blue/10 text-blue-ink',
  'ligeiro-favorito': 'bg-surface-2 text-fg-2',
  equilibrada: 'bg-surface-2 text-fg-2',
  'ligeiro-azarao': 'bg-surface-2 text-fg-2',
  zebra: 'bg-orange/15 text-orange-ink',
  'grande-zebra': 'bg-orange/15 text-orange-ink',
};

/** Probabilidade justa e classificação de cada canto (null sem odds). */
export function oddsView(o?: FightOdds) {
  const p = fairProbs(o?.red, o?.blue);
  if (!o || !p) return null;
  return { red: { ml: o.red, p: p[0], ...oddsTier(p[0]) }, blue: { ml: o.blue, p: p[1], ...oddsTier(p[1]) } };
}

/** Selo "−148 · Favorito"; o tooltip nativo mostra a probabilidade implícita. */
export function OddsChip({ ml, p, tier, label, compact }: { ml?: number; p: number; tier: OddsTier; label: string; compact?: boolean }) {
  return (
    <Tip title={`${label} · ${Math.round(p * 100)}% de chance`}
      content={ml === undefined ? 'Probabilidade implícita, sem a margem da casa.' : `Linha ${fmtMoneyline(ml)}: ${ml < 0 ? `aposta ${-ml} para ganhar 100` : `aposta 100 para ganhar ${ml}`}. Probabilidade sem a margem da casa.`}>
      <span tabIndex={0} className={clsx('inline-flex h-8 cursor-help items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[14px] font-semibold', TIER_CLS[tier])}>
        <span className="num">{fmtMoneyline(ml)}</span>
        {!compact && <><span className="opacity-40">·</span><span>{label}</span></>}
      </span>
    </Tip>
  );
}
