import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowRight, Crown, Lightning } from '@phosphor-icons/react';
import type { Fight, FighterRef } from '@shared/types';
import { fightHref, fighterHref } from '@/lib/api';
import { OddsChip, oddsView } from './Duel';
import type { ReactNode } from 'react';
import { Avatar, Flag, LiveTag, OutcomeBadge, Spotlight, Tag } from './kit';

function Side({ f, align, state, tip, odds }: { f: FighterRef; align: 'left' | 'right'; state: 'win' | 'loss' | 'none'; tip?: ReactNode; odds?: ReactNode }) {
  const right = align === 'right';
  return (
    <Link to={fighterHref(f)}
      className={clsx('group flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:gap-3', right ? 'sm:flex-row-reverse sm:text-right' : 'sm:text-left')}>
      <Avatar src={f.headshot} name={f.name} size={56} ring={right ? 'var(--color-red)' : 'var(--color-blue)'} className={clsx(state === 'loss' && 'opacity-50 grayscale')} />
      <div className="min-w-0 max-w-full">
        <div className={clsx('flex items-center justify-center gap-2', right ? 'sm:flex-row-reverse sm:justify-start' : 'sm:justify-start')}>
          <span className={clsx('text-[14.5px] font-bold leading-tight tracking-[-0.01em] group-hover:underline group-hover:underline-offset-4 sm:text-[16px]',
            state === 'loss' ? 'text-fg-3' : 'text-fg')}>{f.name}</span>
          {state === 'win' && <OutcomeBadge outcome="W" size="sm" tip={tip} />}
        </div>
        <div className={clsx('mt-1 flex items-center justify-center gap-2 text-[13.5px] text-fg-2', right ? 'sm:flex-row-reverse sm:justify-start' : 'sm:justify-start')}>
          <Flag code={f.countryCode} src={f.flag} title={f.country} size={20} />
          <span className="num font-semibold">{f.record ?? '—'}</span>
        </div>
        {odds && <div className={clsx('mt-1.5 flex justify-center', right ? 'sm:justify-end' : 'sm:justify-start')}>{odds}</div>}
      </div>
    </Link>
  );
}

const winTip = (loser: string, r: NonNullable<Fight['result']>) => (
  <div className="space-y-0.5">
    <div className="text-[13.5px] font-semibold">Vitória sobre {loser}</div>
    <div className="text-[13px] opacity-80">{[r.method, r.detail].filter(Boolean).join(' · ')}</div>
    {r.round && <div className="text-[13px] opacity-60">R{r.round} · {r.clock}</div>}
  </div>
);

export function FightRow({ fight, compact, eventId }: { fight: Fight; compact?: boolean; eventId?: string }) {
  const r = fight.result;
  const winRed = r?.winnerId === fight.red.espnId, winBlue = r?.winnerId === fight.blue.espnId;
  const ov = oddsView(fight.odds);
  // zebra: o vencedor tinha menos de 35% de chance pelas odds
  const upset = ov && r?.winnerId && (winRed ? ov.red.p : winBlue ? ov.blue.p : 1) < 0.35;
  const state = (w: boolean) => (!r || !r.winnerId ? 'none' : w ? 'win' : 'loss') as 'win' | 'loss' | 'none';

  return (
    <Spotlight duel className={clsx('grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-2xl px-3 sm:gap-5 sm:px-4', compact ? 'py-3' : 'py-4')}>
      <Side f={fight.red} align="right" state={state(winRed)} tip={winRed && r ? winTip(fight.blue.name, r) : undefined} odds={ov && <OddsChip {...ov.red} compact={!!r} />} />
      <div className="flex w-[108px] flex-col items-center gap-1.5 text-center sm:w-[188px]">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {fight.title && <Tag tone="gold"><Crown weight="fill" className="h-3.5 w-3.5" /> Título</Tag>}
          <span className="text-[14px] font-medium text-fg-3">{fight.weightClass}</span>
        </div>
        {fight.status === 'in' ? <LiveTag /> : r ? (
          <>
            <span className="text-[14px] font-semibold text-fg">{r.method}{r.detail && r.method !== 'Decisão unânime' ? <span className="text-fg-2"> · {r.detail}</span> : null}</span>
            <span className="num rounded-full bg-surface-2 px-2.5 py-0.5 text-[13.5px] font-semibold text-fg-2">R{r.round} · {r.clock}</span>
          </>
        ) : (
          <span className="text-[14px] font-medium text-fg-3">{fight.rounds} rounds</span>
        )}
        {upset && <Tag tone="gold"><Lightning weight="fill" className="h-3.5 w-3.5" /> Zebra!</Tag>}
        {eventId && (
          <Link to={fightHref(eventId, fight.id)} className="mt-0.5 inline-flex items-center gap-1 text-[13.5px] font-semibold text-brand hover:underline hover:underline-offset-4">
            {fight.status === 'post' ? 'Ver a luta' : 'Odds e prévia'} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <Side f={fight.blue} align="left" state={state(winBlue)} tip={winBlue && r ? winTip(fight.red.name, r) : undefined} odds={ov && <OddsChip {...ov.blue} compact={!!r} />} />
    </Spotlight>
  );
}
