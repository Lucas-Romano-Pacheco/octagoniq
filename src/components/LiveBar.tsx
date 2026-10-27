import { LiveScoreboard } from './LiveScoreboard';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { EventDetail, Fight } from '@shared/types';
import { fightHref } from '@/lib/api';
import { lastName } from '@/lib/format';

/* Faixa "ao vivo" do evento: luta em andamento (round e relógio), progresso do card e um feed com
   "começou" e "terminou", montado comparando cada atualização (a cada 10 s) com a anterior. */

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

export function LiveBar({ e, notices, updatedAt }: { e: EventDetail; notices: Notice[]; updatedAt?: number }) {
  const done = e.fights.filter(f => f.status === 'post').length;
  const total = e.fights.length;
  const current = e.fights.filter(f => f.status === 'in');
  // próxima luta a começar: a de menor ordem entre as que faltam (a ordem 1 é a principal, a última a acontecer)
  const next = e.fights.filter(f => f.status === 'pre').sort((a, b) => b.order - a.order)[0];
  const time = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: updatedAt === ms ? '2-digit' : undefined });
  return (
    <section aria-live="polite" className="rounded-xl bg-surface p-5 ring-1 ring-fg/[0.08] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-2 text-[14px] font-semibold text-fg">
          <span aria-hidden className="live-dot h-2 w-2 rounded-full bg-brand" />Ao vivo
          <span className="font-normal text-fg-3">· {done} de {total} lutas encerradas</span>
        </div>
        <div role="progressbar" aria-label="Progresso do card" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}
          className="h-1 w-full overflow-hidden rounded-full bg-surface-3 sm:w-48">
          <div className="h-full origin-left rounded-full bg-fg transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: '100%', transform: `scaleX(${done / total})` }} />
        </div>
      </div>

      {current[0] && <div className="mt-5"><LiveScoreboard eventId={e.id} fight={current[0]} /></div>}

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
        <div>
          {current.length ? current.map(f => (
            <Link key={f.id} to={fightHref(e.id, f.id)} className="group block">
              <div className="text-[13px] text-fg-3">Lutando agora</div>
              <div className="display mt-1 text-[32px] leading-none text-fg group-hover:text-brand">{names(f)}</div>
              <div className="num mt-2 text-[16px] font-semibold text-fg-2">{f.live?.round ? `Round ${f.live.round}` : 'Subindo ao octógono'}{f.live?.clock && f.live.clock !== '-' ? ` · ${f.live.clock}` : ''}</div>
            </Link>
          )) : next ? (
            <Link to={fightHref(e.id, next.id)} className="group block">
              <div className="text-[13px] text-fg-3">A seguir</div>
              <div className="display mt-1 text-[32px] leading-none text-fg group-hover:text-brand">{names(next)}</div>
            </Link>
          ) : <div className="text-[16px] font-semibold text-fg">Card encerrado</div>}
        </div>

        <ul className="divide-y divide-line text-[14px]" aria-label="Últimos acontecimentos">
          <AnimatePresence initial={false}>
            {notices.length === 0 && <li className="py-2 text-fg-3">Quando uma luta começar ou terminar, o aviso aparece aqui.</li>}
            {notices.slice(0, 4).map(n => (
              <motion.li key={n.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-baseline gap-3 py-2">
                <span className="num w-11 shrink-0 text-[13px] text-fg-3">{time(n.at)}</span>
                <Link to={fightHref(e.id, n.fight.id)} className="min-w-0 hover:underline">
                  <b className="font-semibold text-fg">{names(n.fight)}</b>
                  <span className="text-fg-2"> · {n.kind === 'start' ? 'começou' : how(n.fight)}</span>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <p className="mt-5 text-[13px] text-fg-3">
        Atualiza sozinho{updatedAt ? <> · última leitura às <span className="num">{new Date(updatedAt).toLocaleTimeString('pt-BR')}</span></> : null}. Os dados vêm da ESPN e podem atrasar alguns segundos.
      </p>
    </section>
  );
}
