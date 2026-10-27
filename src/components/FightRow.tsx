import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowRight, Lightning } from '@/components/icons';
import type { Fight, FighterRef } from '@shared/types';
import { fightHref, fighterHref } from '@/lib/api';
import { OddsChip, oddsView } from './Duel';
import type { ReactNode } from 'react';
import { Avatar, BeltIcon, FightCard, Flag, LiveTag, MethodTag, morphPhoto, OutcomeBadge, Spotlight, Tag } from './kit';

function Side({ f, align, state, tip, odds, compact }: { f: FighterRef; align: 'left' | 'right'; state: 'win' | 'loss' | 'none'; tip?: ReactNode; odds?: ReactNode; compact?: boolean }) {
  const right = align === 'right';
  return (
    // relative z-10: fica por cima do link da linha inteira (que abre a luta)
    <Link to={fighterHref(f)} viewTransition onClick={morphPhoto}
      className={clsx('group/side relative z-10 flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:gap-3', right ? 'sm:flex-row-reverse sm:text-right' : 'sm:text-left')}>
      <span data-corner={right ? 'a' : 'b'}><Avatar src={f.headshot} name={f.name} size={compact ? 56 : 64} ring={right ? 'var(--color-red)' : 'var(--color-blue)'} className={clsx(state === 'loss' && 'opacity-50 grayscale')} /></span>
      <div className="min-w-0 max-w-full">
        <div className={clsx('flex items-center justify-center gap-2', right ? 'sm:flex-row-reverse sm:justify-start' : 'sm:justify-start')}>
          {/* compacta (coluna estreita): nome curto da ESPN numa linha só ("A. Volkanovski") */}
          <span className={clsx('font-bold leading-tight tracking-[-0.01em] group-hover/side:underline group-hover/side:underline-offset-4',
            compact ? 'max-w-full truncate text-[16px]' : 'text-[16px] sm:text-[18px]', state === 'loss' ? 'text-fg-3' : 'text-fg')} title={compact ? f.name : undefined}>
            {compact ? f.shortName ?? f.name : f.name}
          </span>
          {state === 'win' && <OutcomeBadge outcome="W" size="sm" tip={tip} card />}
        </div>
        <div className={clsx('mt-1 flex items-center justify-center gap-2 text-[16px] text-fg-2', right ? 'sm:flex-row-reverse sm:justify-start' : 'sm:justify-start')}>
          <Flag code={f.countryCode} src={f.flag} title={f.country} size={22} />
          <span className="num font-semibold">{f.record ?? '—'}</span>
        </div>
        {odds && <div className={clsx('mt-2 flex justify-center', right ? 'sm:justify-end' : 'sm:justify-start')}>{odds}</div>}
      </div>
    </Link>
  );
}

/** Tooltip do selo de vencedor: o cartão da luta, com as fotos dos dois (mesmo visual do histórico). */
const winTip = (winner: FighterRef, loser: FighterRef, r: NonNullable<Fight['result']>, date?: string) => (
  <FightCard me={winner} opp={loser} outcome="W" method={r.method} detail={r.detail} round={r.round} clock={r.clock} date={date} />
);

/** Ao abrir a luta, as duas fotos da linha "voam" até os cantos do topo da página da luta (View Transitions);
    os nomes só são dados no clique, para não repetir o mesmo nome em várias linhas da lista. */
function morphFight(e: { currentTarget: Element }) {
  const row = e.currentTarget.closest('.group');
  row?.querySelectorAll<HTMLElement>('[data-corner]').forEach(el => { el.style.viewTransitionName = `fight-${el.dataset.corner}`; });
}

export function FightRow({ fight, compact, eventId }: { fight: Fight; compact?: boolean; eventId?: string }) {
  const r = fight.result;
  const winRed = r?.winnerId === fight.red.espnId, winBlue = r?.winnerId === fight.blue.espnId;
  const ov = oddsView(fight.odds);
  // zebra: o vencedor tinha menos de 35% de chance pelas odds
  const upset = ov && r?.winnerId && (winRed ? ov.red.p : winBlue ? ov.blue.p : 1) < 0.35;
  const state = (w: boolean) => (!r?.winnerId ? 'none' : w ? 'win' : 'loss') as 'win' | 'loss' | 'none';

  const href = eventId ? fightHref(eventId, fight.id) : undefined;
  return (
    <Spotlight duel className={clsx('group relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl px-3 transition-colors duration-150 max-sm:grid-cols-2 max-sm:gap-y-3 sm:gap-5 sm:px-4', compact ? 'py-4' : 'py-4')}>
      <Side f={fight.red} align="right" compact={compact} state={state(winRed)} tip={winRed && r ? winTip(fight.red, fight.blue, r, fight.date) : undefined} odds={ov && <OddsChip {...ov.red} compact />} />
      <div className={clsx('flex flex-col items-center gap-2 text-center max-sm:order-last max-sm:col-span-2 max-sm:flex-row max-sm:flex-wrap max-sm:justify-center max-sm:gap-x-3 max-sm:border-t max-sm:border-line/60 max-sm:pt-3', compact ? 'sm:w-[160px]' : 'sm:w-[196px]')}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {fight.title && <Tag tone="gold"><BeltIcon className="h-3.5 w-6" /> Título</Tag>}
          <span className="text-[16px] font-medium text-fg-3">{fight.weightClass}</span>
        </div>
        {fight.status === 'in' ? (
          <>
            <LiveTag />
            {fight.live?.round && <span className="num rounded-md bg-brand-soft px-2 py-1 text-[13px] font-semibold text-brand">R{fight.live.round} · {fight.live.clock}</span>}
          </>
        ) : r ? (
          <>
            <MethodTag method={r.method} size={compact ? 'sm' : 'md'} />
            {r.detail && !/decis/i.test(r.method) && !compact && <span className="text-[13px] text-fg-2">{r.detail}</span>}
            <span className="num rounded-md bg-surface-2 px-2 py-1 text-[13px] font-semibold text-fg-2">R{r.round} · {r.clock}</span>
          </>
        ) : (
          <span className="text-[16px] font-medium text-fg-3">{fight.rounds} rounds</span>
        )}
        {upset && <Tag tone="orange"><Lightning weight="fill" className="h-3.5 w-3.5" /> Zebra!</Tag>}
      </div>
      <Side f={fight.blue} align="left" compact={compact} state={state(winBlue)} tip={winBlue && r ? winTip(fight.blue, fight.red, r, fight.date) : undefined} odds={ov && <OddsChip {...ov.blue} compact />} />
      {/* a linha inteira abre a luta; a seta só aparece ao passar o mouse (no lugar dos links "Ver a luta" repetidos) */}
      {href && (
        <Link to={href} viewTransition onClick={morphFight} aria-label={`${fight.status === 'post' ? 'Ver a luta' : 'Odds e prévia'}: ${fight.red.name} × ${fight.blue.name}`} className="absolute inset-0 rounded-xl">
          <ArrowRight weight="bold" className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-brand opacity-0 transition group-hover:right-1 group-hover:opacity-100" />
        </Link>
      )}
    </Spotlight>
  );
}
