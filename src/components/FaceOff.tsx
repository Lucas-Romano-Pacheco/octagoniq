import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import type { FighterRef } from '@shared/types';
import { fighterHref } from '@/lib/api';
import { proxy } from '@/lib/img';
import { FlagBackdrop, OctagonFrame } from './kit';

/* Confronto em pôster (padrão do site): cada lutador no seu próprio octógono com a bandeira inteira atrás, os dois
   afastados e se encarando. Usado no destaque da página inicial, no topo do evento e no topo da luta. */

/** O octógono com a bandeira de um lutador (fica atrás da foto). */
export function FlagOctagon({ code, className = 'top-[8%] left-1/2 w-[104%] -translate-x-1/2' }: { code?: string; className?: string }) {
  return (
    <OctagonFrame className={`aspect-square h-auto ${className}`}>
      <div className="absolute inset-0 bg-cream" />
      <FlagBackdrop code={code} shape="rect" className="inset-0 opacity-60 dark:opacity-45" />
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 -80px 60px -40px var(--color-bg)' }} />
    </OctagonFrame>
  );
}

function Side({ f, right, i }: { f: FighterRef; right?: boolean; i: number }) {
  const [failed, setFailed] = useState(false);
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { opacity: 0, x: right ? 30 : -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute bottom-0 h-full w-[50%] ${right ? 'right-0' : 'left-0'}`}>
      <FlagOctagon code={f.countryCode} />
      <span aria-hidden className={`absolute bottom-0 left-1/2 h-1 w-[40%] -translate-x-1/2 rounded-full ${right ? 'bg-blue' : 'bg-red'}`} />
      {f.bodyImage && !failed && (
        <Link to={fighterHref(f)} aria-label={f.name} className="absolute inset-x-0 bottom-0 flex h-[96%] justify-center">
          <img src={proxy(f.bodyImage, 640)} alt={f.name} fetchPriority="high" decoding="async" onError={() => setFailed(true)}
            className={`h-full w-auto max-w-none object-contain drop-shadow-[0_30px_40px_var(--cutout-shadow)] [mask-image:linear-gradient(to_bottom,black_82%,transparent)] ${right ? '-scale-x-100' : ''}`} />
        </Link>
      )}
    </motion.div>
  );
}

export function FaceOff({ red, blue, className = 'h-[320px] sm:h-[440px]', children }: { red: FighterRef; blue: FighterRef; className?: string; children?: ReactNode }) {
  return (
    <div className={`relative mx-auto w-full max-w-[680px] max-sm:overflow-x-clip ${className}`}>
      <Side f={red} i={0} />
      <Side f={blue} right i={1} />
      {children}
    </div>
  );
}
