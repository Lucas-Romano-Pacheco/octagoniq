import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import type { FightOdds } from '@shared/types';
import { fairProbs, fmtMoneyline, oddsTier, type OddsTier } from '@shared/format';
import { Tip } from './kit';

/* Componentes de confronto vermelho × azul, usados na comparação e na página da luta. */

export type Side = 'a' | 'b';
export const CORNER = { a: 'var(--color-red)', b: 'var(--color-blue)' };

export const better = (a?: number, b?: number, lowerIsBetter = false): Side | null => {
  if (a === undefined || b === undefined || a === b) return null;
  return (a > b) !== lowerIsBetter ? 'a' : 'b';
};

/** Barra espelhada a partir do centro, nas cores dos cantos. */
export function DuelRow({ label, a, b, fmt = v => (v === undefined ? '—' : String(v)), lowerIsBetter, sub }: {
  label: string; a?: number; b?: number; fmt?: (v?: number) => string; lowerIsBetter?: boolean; sub?: [ReactNode, ReactNode];
}) {
  const max = Math.max(a ?? 0, b ?? 0) || 1;
  const win = better(a, b, lowerIsBetter);
  return (
    <div className="px-5 py-3">
      <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
        <span className={clsx('num text-right text-[15px]', win === 'a' ? 'font-bold text-fg' : 'text-fg-2')}>{fmt(a)}{sub && <span className="ml-1.5 text-[13px] font-normal text-fg-3">{sub[0]}</span>}</span>
        <span className="text-center text-[13.5px] text-fg-3">{label}{lowerIsBetter && <span className="text-fg-3/70"> (menor é melhor)</span>}</span>
        <span className={clsx('num text-[15px]', win === 'b' ? 'font-bold text-fg' : 'text-fg-2')}>{fmt(b)}{sub && <span className="ml-1.5 text-[13px] font-normal text-fg-3">{sub[1]}</span>}</span>
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
  'grande-favorito': 'bg-blue/12 text-blue',
  favorito: 'bg-blue/10 text-blue',
  'ligeiro-favorito': 'bg-surface-2 text-fg-2',
  equilibrada: 'bg-surface-2 text-fg-2',
  'ligeiro-azarao': 'bg-surface-2 text-fg-2',
  zebra: 'bg-gold-soft text-gold-ink',
  'grande-zebra': 'bg-gold-soft text-gold-ink',
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
      <span tabIndex={0} className={clsx('inline-flex h-7 cursor-help items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold', TIER_CLS[tier])}>
        <span className="num">{fmtMoneyline(ml)}</span>
        {!compact && <><span className="opacity-40">·</span><span>{label}</span></>}
      </span>
    </Tip>
  );
}
