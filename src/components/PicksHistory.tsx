import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useQueries } from '@tanstack/react-query';
import type { EventDetail } from '@shared/types';
import { bonusQuery, eventQuery } from '@/lib/api';
import { fotnAwarded } from '@/lib/fights';
import { dayMonth } from '@/lib/format';
import { summarize, usePicks } from '@/lib/picks';
import { Panel } from './kit';

/** Desempenho somando todos os eventos em que o usuário palpitou. */
export function PicksHistory({ currentId }: { currentId?: string }) {
  const { saved } = usePicks();
  const ids = Object.keys(saved).filter(i => Object.keys(saved[i].picks).length);
  const queries = useQueries({ queries: ids.map(id => eventQuery(id)) });
  // bônus só dos eventos encerrados (definem a luta da noite)
  const bonuses = useQueries({ queries: ids.map((id, i) => bonusQuery((queries[i].data as EventDetail | undefined)?.status === 'post' ? id : undefined)) });
  const rows = ids.map((id, i) => {
    const ev = queries[i].data as EventDetail | undefined;
    return { id, ev, s: ev ? summarize(saved[id].picks, ev.fights, fotnAwarded(ev, bonuses[i].data)) : undefined };
  });
  const total = rows.reduce((n, r) => ({ pts: n.pts + (r.s?.points ?? 0), hits: n.hits + (r.s?.hits ?? 0), scored: n.scored + (r.s?.scored ?? 0), perf: n.perf + (r.s?.perfects ?? 0) }), { pts: 0, hits: 0, scored: 0, perf: 0 });
  if (!ids.length) return null;
  return (
    <Panel plain title="Seu desempenho" action={<span className="num text-[13px] text-fg-3">{ids.length} {ids.length === 1 ? 'evento' : 'eventos'}</span>}>
      <div className="grid grid-cols-3 gap-4 pb-4">
        {[['Pontos', total.pts], ['Acertos', total.scored ? `${total.hits}/${total.scored}` : '—'], ['Perfeitos', total.perf]].map(([l, v]) => (
          <div key={l as string}><div className="label">{l}</div><div className="display text-[32px] text-fg">{v}</div></div>
        ))}
      </div>
      <ul className="divide-y divide-line/70">
        {rows.map(r => (
          <li key={r.id}>
            <Link to={`/palpites/${r.id}`} className={clsx('flex items-center justify-between gap-3 py-3 hover:text-brand', r.id === currentId && 'font-semibold')}>
              <span className="min-w-0">
                <span className="block truncate text-[16px] text-fg">{r.ev ? r.ev.name : 'Carregando…'}</span>
                <span className="text-[13px] text-fg-3">{r.ev && dayMonth(r.ev.date)} · {r.s ? `${r.s.made} palpites` : ''}</span>
              </span>
              <span className="num shrink-0 text-right text-[14px] text-fg-2">{r.s && r.s.scored > 0 ? <><b className="font-display text-[18px] text-fg">{r.s.points} pts</b><br />{r.s.hits}/{r.s.scored} certos</> : <span className="text-fg-3">aguardando</span>}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
