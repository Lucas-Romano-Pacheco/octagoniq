import { motion } from 'motion/react';
import type { Fight } from '@shared/types';
import { fairProbs } from '@shared/format';
import { crowdShare, useCrowd } from '@/lib/crowd';
import { useEloPair } from '@/lib/api';
import { lastName } from '@/lib/format';
import { CORNER, CORNER_INK } from './Duel';
import { Panel } from './kit';

/* Quem leva, segundo quem: a chance das casas de aposta (odds sem a margem) ao lado da divisão dos palpites da galera.
   A galera aparece só em totais, então dá para mostrar antes da luta sem revelar o palpite de ninguém. */

function Split({ label, sub, red, i }: { label: string; sub?: string; red: number; i: number }) {
  const pct = Math.round(red * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-semibold text-fg">{label}{sub && <span className="ml-1.5 text-[13px] font-normal text-fg-3">{sub}</span>}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="num w-10 text-right font-display text-[18px] font-bold" style={{ color: CORNER_INK.a }}>{pct}%</span>
        <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
          <motion.div style={{ background: CORNER.a }} initial={{ width: '50%' }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }} />
          <div className="flex-1" style={{ background: CORNER.b }} />
        </div>
        <span className="num w-10 font-display text-[18px] font-bold" style={{ color: CORNER_INK.b }}>{100 - pct}%</span>
      </div>
    </div>
  );
}

export function ProbCompare({ f, eventId, provider }: { f: Fight; eventId: string; provider?: string }) {
  const { data: crowd } = useCrowd(eventId);
  const { data: pair } = useEloPair(f.red.espnId, f.blue.espnId);
  // a nota Elo é de antes desta luta só quando ela ainda não aconteceu; depois, já inclui o resultado
  const elo = pair?.a && pair?.b && f.status === 'pre' ? 1 / (1 + 10 ** ((pair.b.rating - pair.a.rating) / 400)) : null;
  const book = fairProbs(f.odds?.red, f.odds?.blue);
  const fans = crowdShare(crowd, f);
  if (!fans && !elo) return null;
  const a = lastName(f.red.name), b = lastName(f.blue.name);
  const r = f.result;
  // a frase: onde a galera e as casas mais discordam, ou se a galera acertou
  const gap = book && fans ? Math.round((fans.red - book[0]) * 100) : 0;
  const fanFav = fans && (fans.red >= fans.blue ? f.red : f.blue);
  const line = !fans || !fanFav ? null : r?.winnerId
    ? (fans.red === fans.blue ? 'A galera ficou dividida.' : fanFav.espnId === r.winnerId ? `A galera acertou: a maioria foi de ${lastName(fanFav.name)}.` : `A galera errou: a maioria foi de ${lastName(fanFav.name)}.`)
    : book && Math.abs(gap) >= 8
      ? `A galera está ${Math.abs(gap)} pontos mais confiante em ${gap > 0 ? a : b} do que as casas de aposta.`
      : book ? 'A galera e as casas de aposta pensam parecido.' : null;
  return (
    <Panel title="Quem leva, segundo quem" eyebrow="Casas de aposta, nota Elo e palpites da galera" bodyClass="px-6 pb-6">
      <div className="mt-2 flex justify-between text-[13px] font-semibold">
        <span className="flex items-center gap-1.5 text-fg-2"><span className="h-2 w-2 rounded-full" style={{ background: CORNER.a }} />{a}</span>
        <span className="flex items-center gap-1.5 text-fg-2">{b}<span className="h-2 w-2 rounded-full" style={{ background: CORNER.b }} /></span>
      </div>
      <div className="mt-3 space-y-4">
        {book && <Split i={0} label="Casas de aposta" sub={provider ? `${provider}, sem a margem` : 'sem a margem'} red={book[0]} />}
        {elo !== null && <Split i={1} label="Nota Elo" sub={`${Math.round(pair!.a!.rating)} × ${Math.round(pair!.b!.rating)}`} red={elo} />}
        {fans && <Split i={2} label="Galera do OctagonIQ" sub={`${fans.votes} ${fans.votes === 1 ? 'palpite' : 'palpites'}`} red={fans.red} />}
      </div>
      {line && <p className="mt-4 text-[14px] text-fg-2">{line}</p>}
    </Panel>
  );
}
