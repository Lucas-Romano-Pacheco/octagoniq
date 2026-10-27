import { clsx } from 'clsx';
import { motion } from 'motion/react';
import { Barbell, ChartLineUp, HandGrabbing, Lightning, Scales, Shield, ShieldCheck } from '@/components/icons';
import type { OfficialStats } from '@shared/types';
import { fighterStyle, strikeDiff } from '@/lib/style';
import { Panel, Tip } from './kit';

/* Etiquetas de estilo (N5) e o painel "Trocação em resumo" (N4). Regras em src/lib/style.ts. */

const ICON = { volume: ChartLineUp, ko: Lightning, sub: HandGrabbing, wrestler: Barbell, antitd: ShieldCheck, defense: Shield, points: Scales } as const;
const COLOR: Record<string, string> = { volume: 'var(--color-brand)', ko: 'var(--color-ko-fill)', sub: 'var(--color-sub-fill)', wrestler: 'var(--color-slate-fill)', antitd: 'var(--color-slate-fill)', defense: 'var(--color-slate-fill)', points: 'var(--color-dec-fill)' };

export function StyleTags({ stats, className, align = 'start' }: { stats?: OfficialStats; className?: string; align?: 'start' | 'end' }) {
  const tags = fighterStyle(stats);
  if (!tags.length) return null;
  return (
    <div className={clsx('flex flex-wrap gap-2', align === 'end' && 'justify-end', className)}>
      {tags.map((t, i) => {
        const Icon = ICON[t.key as keyof typeof ICON] ?? ChartLineUp;
        return (
          <Tip key={t.key} title={t.label} content={<>{t.why}. Calculado das estatísticas {stats?.source === 'espn' ? 'das lutas no UFC (ESPN)' : 'oficiais do UFC.com'}.</>}>
            <motion.span tabIndex={0} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 420, damping: 20 }}
              className="inline-flex h-7 cursor-help items-center gap-2 rounded-full bg-surface px-3 font-display text-[12px] font-bold text-fg ring-1 ring-line">
              <Icon weight="fill" className="h-3.5 w-3.5" style={{ color: COLOR[t.key] }} />{t.label}
            </motion.span>
          </Tip>
        );
      })}
    </div>
  );
}

const n2 = (n?: number) => (n === undefined ? '—' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/** Painel pequeno em vez de um número só: diferencial, ritmo, precisão e defesa juntos. */
export function StrikingPanel({ s }: { s: OfficialStats }) {
  const diff = strikeDiff(s);
  if (diff === undefined) return null;
  const good = diff > 0;
  const cells: [string, string, string][] = [
    ['Ritmo', `${n2(s.slpm)}/min`, 'golpes sig. conectados'],
    ['Apanha', `${n2(s.sapm)}/min`, 'golpes sig. absorvidos'],
    ['Precisão', s.strAcc !== undefined ? `${Math.round(s.strAcc)}%` : '—', 'dos golpes tentados'],
    ['Defesa', s.strDef !== undefined ? `${Math.round(s.strDef)}%` : '—', 'dos golpes do rival evitados'],
  ];
  return (
    <Panel plain title="Trocação em resumo" action={<span className="text-[13px] text-fg-3">{s.source === 'espn' ? 'ESPN · lutas no UFC' : 'UFC.com'}</span>}>
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:items-center">
        <div>
          <div className="label">Diferencial de golpes</div>
          <div className="display text-[64px] leading-none" style={{ color: good ? 'var(--color-win)' : diff < 0 ? 'var(--color-loss)' : 'var(--color-fg)' }}>{diff > 0 ? '+' : ''}{n2(diff)}</div>
          <p className="mt-1 text-[14px] text-fg-2">{good ? 'acerta mais do que apanha, por minuto' : diff < 0 ? 'apanha mais do que acerta, por minuto' : 'acerta o mesmo que apanha'}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          {cells.map(([k, v, d]) => (
            <div key={k}><dt className="label">{k}</dt><dd className="num font-display text-[24px] font-bold text-fg">{v}</dd><dd className="text-[13px] text-fg-3">{d}</dd></div>
          ))}
        </dl>
      </div>
    </Panel>
  );
}
