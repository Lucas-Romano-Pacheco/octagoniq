import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { Fight } from '@shared/types';
import { fightHref, useFight } from '@/lib/api';
import { lastName, mmss } from '@/lib/format';
import { FlagBackdrop } from './kit';
import { CORNER } from './Duel';

/* Placar da luta em andamento (inspirado no Clutch Lens): bandeiras grandes nas pontas, round e relógio no meio e,
   embaixo, barrinhas comparando golpes, quedas, knockdowns e controle. Os números vêm da página da luta, que já se
   atualiza sozinha durante o ao vivo. */

function Bar({ label, a, b, fmt = String }: { label: string; a: number; b: number; fmt?: (n: number) => string }) {
  const t = a + b || 1;
  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 text-[13px]">
        <span className="num font-bold text-white">{fmt(a)}</span>
        <span className="text-white/60">{label}</span>
        <span className="num text-right font-bold text-white">{fmt(b)}</span>
      </div>
      <div className="mt-1 flex h-1.5 gap-[2px] overflow-hidden rounded-full">
        <motion.div className="h-full rounded-l-full" style={{ background: CORNER.a }} animate={{ flexGrow: a / t || 0.0001 }} transition={{ duration: 0.6 }} />
        <motion.div className="h-full rounded-r-full" style={{ background: CORNER.b }} animate={{ flexGrow: b / t || 0.0001 }} transition={{ duration: 0.6 }} />
      </div>
    </div>
  );
}

export function LiveScoreboard({ eventId, fight }: { eventId: string; fight: Fight }) {
  const { data: d } = useFight(eventId, fight.id);
  const a = d?.red.stats, b = d?.blue.stats;
  const ctrl = (side: 'red' | 'blue') => d?.rounds?.reduce((n, r) => n + r[side].ctrl, 0) ?? 0;
  const live = d?.fight.live ?? fight.live;
  const side = (f: Fight['red'], right?: boolean) => (
    <div className={`relative flex h-full min-w-0 flex-col justify-center gap-2 overflow-hidden px-4 py-4 sm:px-6 ${right ? 'items-end text-right' : ''}`}>
      <FlagBackdrop code={f.countryCode} shape="rect" className="inset-0 opacity-30" />
      <div aria-hidden className={`absolute inset-0 ${right ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-[#14183e]/40 to-[#14183e]`} />
      <span className="relative h-1 w-8 rounded-full" style={{ background: right ? CORNER.b : CORNER.a }} />
      <div className="relative truncate font-display text-[24px] font-bold uppercase leading-none text-white sm:text-[36px]">{lastName(f.name)}</div>
      <div className="num relative text-[13px] text-white/70">{f.record}</div>
    </div>
  );
  return (
    <Link to={fightHref(eventId, fight.id)} className="group mb-5 block overflow-hidden rounded-[var(--radius-card)] bg-[#14183e] text-white shadow-[var(--shadow-lift)]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        {side(fight.red)}
        <div className="flex flex-col items-center justify-center px-3 py-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[#ff6b6b]"><span className="live-dot h-1.5 w-1.5 rounded-full bg-[#ff6b6b]" />Ao vivo</span>
          <div className="num mt-1 font-display text-[40px] font-bold leading-none sm:text-[56px]">{live?.round ? `R${live.round}` : '—'}</div>
          <div className="num mt-1 text-[15px] font-semibold text-white/80">{live?.clock && live.clock !== '-' ? live.clock : 'subindo ao octógono'}</div>
          <div className="mt-1 text-[12px] text-white/50">{fight.weightClass}</div>
        </div>
        {side(fight.blue, true)}
      </div>
      {a && b && (
        <div className="grid gap-3 border-t border-white/10 px-4 py-4 sm:grid-cols-2 sm:gap-x-10 sm:px-6">
          <Bar label="Golpes significativos" a={a.sigLanded} b={b.sigLanded} />
          <Bar label="Quedas" a={a.tdLanded} b={b.tdLanded} />
          <Bar label="Knockdowns" a={a.kd} b={b.kd} />
          {d?.rounds?.length ? <Bar label="Controle" a={ctrl('red')} b={ctrl('blue')} fmt={mmss} /> : <Bar label="Finalizações tentadas" a={a.subAttempts} b={b.subAttempts} />}
        </div>
      )}
    </Link>
  );
}
