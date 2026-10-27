import { motion } from 'motion/react';
import type { FightSideStats, FighterRef } from '@shared/types';
import { lastName } from '@/lib/format';
import { proxy } from '@/lib/img';
import { CountUp, Tip } from './kit';

/* Mapa de golpes no estilo da ESPN: a foto de corpo inteiro do lutador (UFC.com) pintada por região (cabeça, tronco,
   pernas) conforme onde ele FOI ATINGIDO. A pintura usa a própria foto como máscara, então a cor fica só no corpo; a
   região que levou mais golpes ganha a cor mais forte. As faixas seguem o enquadramento padrão dos recortes do UFC.com
   (cabeça no topo ~15%, tronco até ~50%, pernas no resto). */

const ZONES = [
  { k: 'head', label: 'Cabeça', from: 0, to: 15, y: 8 },
  { k: 'body', label: 'Corpo', from: 15, to: 50, y: 32 },
  { k: 'leg', label: 'Pernas', from: 50, to: 100, y: 72 },
] as const;

/** `hits`: estatísticas do ADVERSÁRIO (o que ele acertou neste lutador). */
export function StrikeMap({ f, hits, by, color }: { f: FighterRef; hits: FightSideStats; by: FighterRef; color: string }) {
  const total = hits.head[0] + hits.body[0] + hits.leg[0];
  const top = Math.max(hits.head[0], hits.body[0], hits.leg[0]) || 1;
  // força da cor: a região mais atingida fica cheia, as outras proporcionais (curva para diferenças médias aparecerem)
  const alpha = (n: number) => (n ? 0.18 + 0.67 * (n / top) ** 1.2 : 0.06);
  const band = (z: (typeof ZONES)[number]) => `color-mix(in oklab, ${color} ${Math.round(alpha(hits[z.k][0]) * 100)}%, transparent)`;
  // degradê vertical com transições curtas entre as regiões (o pescoço e a cintura não ficam com corte seco)
  const paint = `linear-gradient(to bottom, ${band(ZONES[0])} 0%, ${band(ZONES[0])} 13%, ${band(ZONES[1])} 18%, ${band(ZONES[1])} 47%, ${band(ZONES[2])} 53%, ${band(ZONES[2])} 100%)`;
  const src = f.bodyImage ? proxy(f.bodyImage, 520) : undefined;

  return (
    <figure>
      <div className="relative mx-auto h-[340px] w-full max-w-[380px]">
        {/* linhas de referência atravessando cada região */}
        {ZONES.map(z => <div key={z.k} className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: `${z.y}%` }} />)}
        {src && (
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2">
            <img src={src} alt={f.name} loading="lazy" decoding="async" className="h-full w-auto max-w-none opacity-90 grayscale-[0.4]" />
            <motion.div aria-hidden className="absolute inset-0"
              style={{ background: paint, WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }}
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        )}
        {ZONES.map(z => {
          const v = hits[z.k];
          return (
            <div key={z.k} className="pointer-events-none absolute inset-x-0 flex items-center justify-between" style={{ top: `${z.y}%`, transform: 'translateY(-50%)' }}>
              <span className="rounded-md bg-surface/85 px-2 py-0.5 text-[13px] font-semibold text-fg backdrop-blur-sm">{z.label}</span>
              <span className="pointer-events-auto flex items-baseline gap-2 rounded-md bg-surface/85 px-2 py-0.5 backdrop-blur-sm">
                <Tip content={`${lastName(by.name)} acertou ${v[0]} de ${v[1]} na ${z.label.toLowerCase()}`}>
                  <span tabIndex={0} className="num cursor-help text-[18px] font-bold text-fg"><CountUp value={v[0]} /></span>
                </Tip>
                <span className="num text-[14px] font-bold" style={{ color }}>{total ? Math.round((v[0] / total) * 100) : 0}%</span>
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 text-center text-[13px] text-fg-3">
        Golpes de <b className="font-semibold text-fg-2">{lastName(by.name)}</b> em {lastName(f.name)} · <span className="num">{total}</span> no total
      </figcaption>
    </figure>
  );
}
