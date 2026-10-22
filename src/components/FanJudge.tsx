import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import { Gavel, SignIn } from '@phosphor-icons/react';
import type { FightDetail } from '@shared/types';
import { NOTES, scorableRounds, useFanSummary, useMyNotes, useSaveNote, type RoundNote } from '@/lib/fanscore';
import { lastName } from '@/lib/format';
import { useAuth } from '@/lib/supabase';
import { CORNER, CORNER_INK, CORNER_FILL } from './Duel';
import { Panel } from './kit';
import { loginHref } from './PicksAccount';

/* "Seja o 4º juiz" (N2): cada pessoa dá a nota de cada round (como os juízes: 10 para quem venceu o round, 9 ou 8
   para quem perdeu) e o painel compara o seu cartão com o da galera e o dos juízes oficiais. */

const same = (a?: RoundNote, b?: RoundNote) => !!a && !!b && a.red === b.red && a.blue === b.blue;

export function FanJudge({ d }: { d: FightDetail }) {
  const auth = useAuth();
  const f = d.fight;
  const rounds = scorableRounds(f);
  const mine = useMyNotes(d.eventId, f.id);
  const fans = useFanSummary(d.eventId, f.id, rounds.length);
  const save = useSaveNote(d.eventId, f.id);
  if (!auth.enabled || (f.status !== 'in' && f.status !== 'post') || !rounds.length) return null;

  const a = lastName(d.red.name), b = lastName(d.blue.name);
  // maioria dos juízes em cada round (cartões oficiais, quando há)
  const judges = (n: number) => {
    const js = d.scorecards?.judges ?? [];
    const red = js.filter(j => { const r = j.rounds.find(x => x.n === n); return r && r.red > r.blue; }).length;
    const blue = js.filter(j => { const r = j.rounds.find(x => x.n === n); return r && r.blue > r.red; }).length;
    return js.length ? { red, blue } : null;
  };
  const my = mine.data ?? new Map<number, RoundNote>();
  const myTotal = rounds.reduce((t, n) => { const x = my.get(n); return x ? { red: t.red + x.red, blue: t.blue + x.blue, n: t.n + 1 } : t; }, { red: 0, blue: 0, n: 0 });
  const agree = rounds.filter(n => { const x = my.get(n), j = judges(n); return x && j && (x.red > x.blue ? j.red > j.blue : j.blue > j.red); }).length;
  const judged = rounds.filter(n => my.get(n) && judges(n)).length;
  const cards = fans.data?.cards;
  const fanWinner = cards && cards.total ? (cards.red > cards.blue ? 'a' : cards.blue > cards.red ? 'b' : null) : null;
  const officialRed = f.result?.winnerId === d.red.espnId;

  return (
    <Panel title="Seja o 4º juiz" eyebrow={f.status === 'in' ? 'Dê a sua nota a cada round que termina' : 'Dê a sua nota e compare com os juízes'} bodyClass="px-6 pb-6">
      {!auth.user && (
        <Link to={loginHref(`/eventos/${d.eventId}/lutas/${f.id}`)} className="btn mt-2"><SignIn weight="bold" className="h-4 w-4" /> Entre para dar suas notas</Link>
      )}
      <div className="mt-3 flex justify-between text-[13px] font-semibold text-fg-2">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CORNER.a }} />{a}</span>
        <span className="flex items-center gap-1.5">{b}<span className="h-2 w-2 rounded-full" style={{ background: CORNER.b }} /></span>
      </div>
      <ol className="mt-2 divide-y divide-line/70">
        {rounds.map(n => {
          const pick = my.get(n), fr = fans.data?.rounds.get(n), j = judges(n);
          const share = fr && fr.votes ? fr.red / fr.votes : null;
          return (
            <li key={n} className="py-3">
              <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3">
                <span className="display text-[18px] text-fg-3">R{n}</span>
                <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={`Nota do round ${n}`}>
                  {NOTES.map(note => {
                    const side = note.red > note.blue ? 'a' : 'b', on = same(pick, note);
                    return (
                      <motion.button key={`${note.red}-${note.blue}`} type="button" role="radio" aria-checked={on} disabled={!auth.user || save.isPending}
                        aria-label={`${note.red}-${note.blue} para ${side === 'a' ? a : b}`}
                        whileTap={auth.user ? { scale: 0.92 } : undefined}
                        onClick={() => save.mutate({ round: n, note: on ? null : note })}
                        className={clsx('num h-9 rounded-md font-display text-[14px] font-bold transition-colors disabled:cursor-not-allowed', on ? 'text-white' : 'bg-surface-2 text-fg-2 enabled:hover:text-fg')}
                        style={on ? { background: CORNER_FILL[side] } : { boxShadow: `inset 0 -3px 0 ${CORNER[side]}` }}>
                        {note.red}-{note.blue}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              {(share !== null || j) && (
                <div className="ml-[44px] mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-fg-3">
                  {share !== null && (
                    <span className="flex items-center gap-2">Galera
                      <span className="flex h-1.5 w-20 overflow-hidden rounded-full bg-surface-2"><span style={{ width: `${share * 100}%`, background: CORNER.a }} /><span className="flex-1" style={{ background: CORNER.b }} /></span>
                      <span className="num">{share >= 0.5 ? `${Math.round(share * 100)}% ${a}` : `${Math.round((1 - share) * 100)}% ${b}`} · {fr!.votes} {fr!.votes === 1 ? 'nota' : 'notas'}</span>
                    </span>
                  )}
                  {j && <span>Juízes: <b className="font-semibold text-fg-2">{j.red > j.blue ? a : j.blue > j.red ? b : 'divididos'}</b> ({Math.max(j.red, j.blue)}×{Math.min(j.red, j.blue)})</span>}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-[14px] text-fg-2">
        {myTotal.n > 0 && (
          <p><Gavel weight="fill" className="mr-1 inline h-4 w-4 text-fg-3" />Seu cartão: <b className="num text-fg">{myTotal.red}-{myTotal.blue}</b>{myTotal.n === rounds.length && myTotal.red !== myTotal.blue && <> para <b className="text-fg">{myTotal.red > myTotal.blue ? a : b}</b></>}
            {judged > 0 && <> · concordou com os juízes em {agree} de {judged} {judged === 1 ? 'round' : 'rounds'}</>}</p>
        )}
        {cards && cards.total > 0 && (
          <p>A galera deu a luta a <b className="text-fg" style={{ color: fanWinner ? CORNER_INK[fanWinner] : undefined }}>{fanWinner === 'a' ? a : fanWinner === 'b' ? b : 'ninguém (empate)'}</b> {cards.total === 1 ? 'no único cartão completo até agora' : `em ${Math.round((Math.max(cards.red, cards.blue) / cards.total) * 100)}% dos ${cards.total} cartões completos`}
            {f.status === 'post' && /decis/i.test(f.result?.method ?? '') && fanWinner && <>{(fanWinner === 'a') === officialRed ? ' e concordou com os juízes.' : ', mas os juízes deram a vitória ao outro lado.'}</>}</p>
        )}
        {!myTotal.n && !(cards && cards.total) && <p className="text-fg-3">Ninguém deu notas ainda. Seja o primeiro.</p>}
      </div>
    </Panel>
  );
}
