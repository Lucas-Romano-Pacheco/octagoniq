import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, Lightning, Play } from '@phosphor-icons/react';
import type { EventDetail, Fight } from '@shared/types';
import { fightHref } from '@/lib/api';
import { lastName } from '@/lib/format';
import { LiveTag } from './kit';

/* Faixa "ao vivo" do evento: luta em andamento (round e relógio), progresso do card e um feed com
   "começou" e "terminou", montado comparando cada atualização (a cada 20 s) com a anterior. */

type Notice = { id: number; kind: 'start' | 'end'; fight: Fight; at: number };

const names = (f: Fight) => `${lastName(f.red.name)} × ${lastName(f.blue.name)}`;
const how = (f: Fight) => {
  const r = f.result;
  if (!r) return '';
  const w = r.winnerId === f.red.espnId ? f.red : r.winnerId === f.blue.espnId ? f.blue : null;
  return `${w ? `${lastName(w.name)} venceu` : 'Sem vencedor'} · ${r.method}${r.round ? `, R${r.round} ${r.clock ?? ''}` : ''}`;
};

/** Compara a atualização atual com a anterior e devolve os avisos (começou / terminou). A primeira leitura não gera aviso. */
export function useFightNotices(e: EventDetail | undefined) {
  const prev = useRef<Map<string, Fight['status']> | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  useEffect(() => {
    if (!e) return;
    const now = new Map(e.fights.map(f => [f.id, f.status]));
    if (prev.current) {
      const fresh: Notice[] = [];
      for (const f of e.fights) {
        const before = prev.current.get(f.id);
        if (before && before !== f.status && (f.status === 'in' || f.status === 'post'))
          fresh.push({ id: Date.now() + fresh.length, kind: f.status === 'in' ? 'start' : 'end', fight: f, at: Date.now() });
      }
      if (fresh.length) setNotices(n => [...fresh, ...n].slice(0, 6));
    }
    prev.current = now;
  }, [e]);
  return notices;
}

/** Título da aba com a luta em andamento ("● R2 3:12 · Makhachev × Garry"), para acompanhar de outra aba. */
export function useLiveTitle(e: EventDetail | undefined) {
  const cur = e?.fights.find(f => f.status === 'in');
  useEffect(() => {
    if (!cur) return;
    const t = document.title;
    document.title = `● ${cur.live?.round ? `R${cur.live.round} ${cur.live.clock ?? ''} · ` : ''}${names(cur)} | OctagonIQ`;
    return () => { document.title = t; };
  }, [cur?.id, cur?.live?.round, cur?.live?.clock]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function LiveBar({ e, notices }: { e: EventDetail; notices: Notice[] }) {
  const done = e.fights.filter(f => f.status === 'post').length;
  const total = e.fights.length;
  const current = e.fights.filter(f => f.status === 'in');
  // próxima luta a começar: a de menor ordem entre as que faltam (a ordem 1 é a principal, a última a acontecer)
  const next = e.fights.filter(f => f.status === 'pre').sort((a, b) => b.order - a.order)[0];
  return (
    <section aria-live="polite" className="cut rounded-xl bg-fg p-5 text-bg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><LiveTag /><span className="font-display text-[13px] font-semibold uppercase tracking-[0.1em] text-bg/70">{done} de {total} lutas encerradas</span></div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg/15 sm:w-56"><div className="h-full rounded-full bg-gold transition-[width] duration-700" style={{ width: `${(done / total) * 100}%` }} /></div>
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div>
          {current.length ? current.map(f => (
            <Link key={f.id} to={fightHref(e.id, f.id)} className="group block">
              <div className="label text-bg/70">Em andamento</div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4">
                <span className="display text-[32px] group-hover:text-gold">{names(f)}</span>
                <span className="num font-display text-[24px] font-bold text-gold">{f.live?.round ? `R${f.live.round}` : ''} {f.live?.clock ?? ''}</span>
              </div>
            </Link>
          )) : next ? (
            <Link to={fightHref(e.id, next.id)} className="group block">
              <div className="label text-bg/70">A seguir</div>
              <div className="display mt-1 text-[32px] group-hover:text-gold">{names(next)}</div>
            </Link>
          ) : <div className="label text-bg/70">Card encerrado</div>}
        </div>
        <ul className="space-y-1.5 text-[14px]" aria-label="Últimos acontecimentos">
          <AnimatePresence initial={false}>
            {notices.length === 0 && <li className="text-bg/70">Os avisos de "começou" e "terminou" aparecem aqui, em tempo real.</li>}
            {notices.map(n => (
              <motion.li key={n.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-2">
                {n.kind === 'start' ? <Play weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> : <CheckCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-win" />}
                <Link to={fightHref(e.id, n.fight.id)} className="hover:underline">
                  <b className="font-semibold">{n.kind === 'start' ? 'Começou' : 'Terminou'}: {names(n.fight)}</b>
                  {n.kind === 'end' && <span className="text-bg/70"> · {how(n.fight)}</span>}
                </Link>
                <span className="num ml-auto shrink-0 text-[13px] text-bg/65">{new Date(n.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[13px] text-bg/65"><Lightning weight="fill" className="h-3.5 w-3.5" />Atualiza sozinho a cada 20 s. Os dados da ESPN podem ter alguns segundos de atraso.</p>
    </section>
  );
}
