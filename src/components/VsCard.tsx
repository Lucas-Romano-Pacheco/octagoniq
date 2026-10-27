import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { Fight, FighterRef } from '@shared/types';
import { fightHref } from '@/lib/api';
import { lastName } from '@/lib/format';
import { proxy } from '@/lib/img';
import { Avatar, BeltIcon, Flag, MethodTag } from './kit';

/* Cartão de luta em pôster (estilo FNT): os dois recortes de frente um para o outro, um "VS" alto em degradê vermelho
   no meio, a bandeirinha de cada um nos cantos de cima e os nomes embaixo. Sem recorte, o retrato no círculo. */

function Cut({ f, right, lost }: { f: FighterRef; right?: boolean; lost?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative flex h-full w-[42%] items-end justify-center overflow-hidden ${lost ? 'opacity-55 grayscale' : ''}`}>
      {f.bodyImage && !failed
        ? <img src={proxy(f.bodyImage, 320)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)}
            className={`absolute left-1/2 top-8 h-[260%] w-auto max-w-none -translate-x-1/2 object-contain object-top [mask-image:linear-gradient(to_bottom,black_30%,transparent_42%)] ${right ? '-scale-x-100' : ''}`} />
        : <div className="pb-4"><Avatar src={f.headshot} name={f.name} size={84} ring={right ? 'var(--color-blue)' : 'var(--color-red)'} /></div>}
    </div>
  );
}

export function VsCard({ fight, eventId, i = 0 }: { fight: Fight; eventId: string; i?: number }) {
  const r = fight.result;
  const lost = (f: FighterRef) => !!r?.winnerId && r.winnerId !== f.espnId;
  return (
    <motion.li initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }} className="list-none">
      <Link to={fightHref(eventId, fight.id)} viewTransition
        className="cut group block overflow-hidden bg-surface shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
        <div className="inset-media relative flex h-[170px] items-end justify-between overflow-hidden bg-surface-2 px-2">
          <Flag code={fight.red.countryCode} src={fight.red.flag} title={fight.red.country} size={20} className="absolute left-3 top-3 z-10" />
          <Flag code={fight.blue.countryCode} src={fight.blue.flag} title={fight.blue.country} size={20} className="absolute right-3 top-3 z-10" />
          <span className="num absolute left-1/2 top-3 z-10 -translate-x-1/2 text-[12px] font-semibold text-fg-3">{fight.weightClass}</span>
          <Cut f={fight.red} lost={lost(fight.red)} />
          <span aria-hidden className="vs-fade relative z-0 self-center pt-6 font-display text-[64px] font-black italic leading-none tracking-tighter transition-transform duration-300 group-hover:scale-110">VS</span>
          <Cut f={fight.blue} right lost={lost(fight.blue)} />
        </div>
        <div className="px-4 pb-4 pt-3 text-center">
          {fight.title && <div className="mb-1 inline-flex items-center gap-1 text-[12px] font-bold text-gold-ink dark:text-gold"><BeltIcon className="h-3 w-5" /> Disputa de cinturão</div>}
          <div className="font-display text-[19px] font-bold uppercase leading-tight text-fg group-hover:text-brand">
            {lastName(fight.red.name)} <span className="text-red">vs</span> {lastName(fight.blue.name)}
          </div>
          <div className="mt-2 flex min-h-7 items-center justify-center gap-2 text-[13px] text-fg-2">
            {r ? <><MethodTag method={r.method} size="sm" /><span className="num">R{r.round} · {r.clock}</span></>
              : <span className="num">{fight.red.record ?? '—'} · {fight.blue.record ?? '—'}</span>}
          </div>
        </div>
      </Link>
    </motion.li>
  );
}
