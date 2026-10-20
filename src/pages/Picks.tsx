import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowCounterClockwise, CaretLeft, CaretRight, Check, Crown, FloppyDisk, HandGrabbing, Lightning, LockSimple, Scales, SignIn, Star, Trophy, X } from '@phosphor-icons/react';
import type { CardSegment, Fight, FighterRef } from '@shared/types';
import { fightHref, useBonuses, useEvent, useSchedule, useUpcoming } from '@/lib/api';
import { fotnAwarded } from '@/lib/fights';
import { dayMonth, lastName, SEGMENT_LABEL, splitEventName, time } from '@/lib/format';
import { cardStart, FOTN, fightCount, fotnLocked, isLocked, MAX_POINTS, METHODS, POINTS, isDirty, scoreFight, summarize, usePicks, type MethodKey, type Pick, type Summary } from '@/lib/picks';
import { CORNER, CORNER_FILL, OddsChip, oddsView } from '@/components/Duel';
import { PicksAccount, loginHref } from '@/components/PicksAccount';
import { PicksHistory } from '@/components/PicksHistory';
import { PicksRanking } from '@/components/PicksRanking';
import { supabaseEnabled, useAuth } from '@/lib/supabase';
import { Avatar, Empty, ErrorState, Flag, PageHeader, Panel, Segmented, Skeleton, Tag, usePageTitle } from '@/components/kit';

/* Palpites: o usuário escolhe vencedor, método e round de cada luta do card; quando os resultados saem, a página
   calcula os acertos e os pontos (regras em src/lib/picks.ts). O rascunho fica no navegador; o que é salvo vai para a
   conta (Supabase), e salvar exige entrar. Sem Supabase configurado, tudo fica no navegador. */

const ORDER: CardSegment[] = ['main', 'prelims', 'early'];
const METHOD_ICON = { ko: Lightning, sub: HandGrabbing, dec: Scales } as const;
/** Uma cor por método (fora do vermelho/azul dos cantos e do dourado do cinturão): KO laranja, finalização verde, decisão ardósia. */
const METHOD_COLOR: Record<MethodKey, { c: string; ink: string }> = {
  ko: { c: 'var(--color-orange-fill)', ink: '#fff' }, sub: { c: 'var(--color-aqua-fill)', ink: '#fff' }, dec: { c: 'var(--color-slate-fill)', ink: '#fff' },
};
/** Cada ícone tem o seu movimento ao ser escolhido: raio chacoalha, mão aperta, balança pende. */
const ICON_MOVE: Record<MethodKey, { animate: Record<string, number[]>; transition: { duration: number } }> = {
  ko: { animate: { x: [0, -4, 4, -3, 3, 0], scale: [1, 1.35, 1.1, 1.3, 1] }, transition: { duration: 0.55 } },
  sub: { animate: { scale: [1, 0.7, 1.3, 0.85, 1], rotate: [0, -14, 14, -6, 0] }, transition: { duration: 0.6 } },
  dec: { animate: { rotate: [0, -22, 18, -10, 5, 0], scale: [1, 1.2, 1] }, transition: { duration: 0.7 } },
};
const CONFETTI = ['#e34948', '#2a78d6', '#f2a900', '#1baf7a', '#eb6834', '#ffffff'];

/* ---------- Efeitos de "mini game" ---------- */

/** Estouro de partículas a partir do centro do elemento; remonte com `key` para repetir. */
function Burst({ color, n = 10, reach = 46 }: { color: string; n?: number; reach?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-20">
      <motion.span className="absolute -left-6 -top-6 h-12 w-12 rounded-full border-2" style={{ borderColor: color }} initial={{ scale: 0.3, opacity: 0.9 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ duration: 0.55, ease: 'easeOut' }} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + 0.3;
        return <motion.span key={i} className="absolute h-1.5 w-1.5 rounded-full" style={{ background: color }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }} animate={{ x: Math.cos(a) * reach, y: Math.sin(a) * reach, scale: 0, opacity: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} />;
      })}
    </span>
  );
}

/** "+10" que sobe e some, como pontos num jogo. */
function Float({ text, color }: { text: string; color: string }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <motion.span aria-hidden className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 font-display text-[20px] font-extrabold drop-shadow"
      style={{ color }} initial={{ y: 0, opacity: 0, scale: 0.5 }} animate={{ y: -46, opacity: [0, 1, 1, 0], scale: [0.5, 1.25, 1] }} transition={{ duration: 0.95, ease: 'easeOut' }}>{text}</motion.span>
  );
}

/** Confete que sobe e cai; dispara quando o palpite fica perfeito. */
function Confetti() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center">
      {Array.from({ length: 26 }, (_, i) => {
        const dx = ((i * 53) % 261) - 130, up = 60 + ((i * 37) % 90), rot = ((i * 71) % 720) - 360;
        return <motion.span key={i} className="absolute top-8 h-2.5 w-1.5 rounded-[1px]" style={{ background: CONFETTI[i % CONFETTI.length] }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }} animate={{ x: dx, y: [0, -up, 70], opacity: [1, 1, 0], rotate: rot }} transition={{ duration: 1.5, ease: 'easeOut', delay: (i % 5) * 0.03 }} />;
      })}
    </span>
  );
}

/** Contador simples para disparar efeitos a cada clique. */
const useFx = () => { const [n, setN] = useState(0); return [n, () => setN(x => x + 1)] as const; };


/* ---------- Uma luta ---------- */

/** Lado do confronto: painel na cor do canto. O escolhido cresce, se preenche, "quica" e solta pontos. */
function FighterButton({ f, side, picked, locked, result, onPick, odds }: {
  f: FighterRef; side: 'a' | 'b'; picked: boolean; locked: boolean; result?: 'won' | 'lost'; onPick: () => void; odds?: React.ReactNode;
}) {
  const color = CORNER[side];
  const [fx, hit] = useFx();
  return (
    <motion.button type="button" disabled={locked} aria-pressed={picked} aria-label={`Vencedor: ${f.name}`}
      onClick={() => { if (!picked) hit(); onPick(); }}
      whileHover={locked ? undefined : { y: -4 }} whileTap={locked ? undefined : { scale: 0.96 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className={clsx('cut group relative flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl px-3 py-5 text-center transition-[flex-grow,background-color] duration-300',
        picked ? 'flex-[1.55] text-white shadow-[var(--shadow-lift)]' : 'flex-1 bg-surface-2/60 text-fg enabled:hover:bg-surface-2', locked && 'cursor-default',
        result === 'lost' && !picked && 'opacity-55')}
      style={picked ? { background: `linear-gradient(${side === 'a' ? '135deg' : '225deg'}, ${CORNER_FILL[side]}, color-mix(in oklab, ${CORNER_FILL[side]} 55%, #0d0f22))` } : undefined}>
      {fx > 0 && <><Burst key={`b${fx}`} color={color} n={14} reach={70} /><Float key={`f${fx}`} text={`+${POINTS.winner}`} color={color} /></>}
      {!picked && <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />}
      {picked && <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />}
      <motion.span className="relative" animate={picked ? { scale: [1, 1.22, 0.96, 1], rotate: [0, -7, 5, 0] } : { scale: 1, rotate: 0 }} transition={{ duration: 0.55 }} key={picked ? 'on' : 'off'}>
        <Avatar src={f.headshot} name={f.name} size={picked ? 88 : 68} ring={picked ? '#fff' : color} className={clsx('transition-all duration-300', result === 'lost' && 'grayscale')} />
        {result === 'won' && <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-gold text-[#14183e] ring-2 ring-surface"><Trophy weight="fill" className="h-4 w-4" /></span>}
      </motion.span>
      <span className="relative min-w-0 max-w-full">
        <span className="line-clamp-2 block break-words font-display text-[16px] font-bold uppercase leading-tight tracking-[0.02em] sm:text-[18px]">{f.name}</span>
        <span className={clsx('mt-0.5 flex items-center justify-center gap-1.5 text-[13px]', picked ? 'text-white/85' : 'text-fg-2')}><Flag code={f.countryCode} src={f.flag} title={f.country} size={16} /><span className="num font-semibold">{f.record ?? '—'}</span></span>
      </span>
      <span className="relative flex flex-col items-center gap-1.5">
        {odds}
        <AnimatePresence mode="wait" initial={false}>
          {picked
            ? <motion.span key="on" initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className="inline-flex h-6 items-center gap-1 rounded-md bg-white px-2 font-display text-[12px] font-bold uppercase tracking-[0.08em] text-[#14183e]"><Check weight="bold" className="h-3.5 w-3.5" /> Seu palpite</motion.span>
            : <span key="off" className="inline-flex h-6" />}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}

/** Bloco de método: cor própria, ícone animado e estouro ao escolher. */
function MethodTile({ m, on, disabled, onClick }: { m: { key: MethodKey; label: string }; on: boolean; disabled: boolean; onClick: () => void }) {
  const { c, ink } = METHOD_COLOR[m.key], Icon = METHOD_ICON[m.key], move = ICON_MOVE[m.key];
  const [fx, hit] = useFx();
  return (
    <motion.button type="button" disabled={disabled} aria-pressed={on} onClick={() => { if (!on) hit(); onClick(); }}
      whileHover={disabled ? undefined : { y: -4, scale: 1.04 }} whileTap={disabled ? undefined : { scale: 0.9, rotate: -2 }} transition={{ type: 'spring', stiffness: 460, damping: 20 }}
      className={clsx('cut relative flex flex-col items-center gap-1 rounded-xl px-2 py-3 font-display text-[13px] font-bold uppercase tracking-[0.05em] transition-[background-color,box-shadow,color] duration-200', !on && 'bg-surface-2/60')}
      style={on ? { background: `linear-gradient(160deg, ${c}, color-mix(in oklab, ${c} 70%, #0d0f22))`, color: ink, boxShadow: `0 10px 22px -10px ${c}, 0 0 0 3px color-mix(in oklab, ${c} 28%, transparent)` } : { color: 'var(--color-fg-2)' }}>
      {fx > 0 && <><Burst key={`b${fx}`} color={c} /><Float key={`f${fx}`} text={`+${POINTS.method}`} color={c} /></>}
      {/* a cor do método aparece mesmo sem escolher: ícone colorido e uma barra embaixo */}
      <motion.span key={on ? 'on' : 'off'} animate={on ? move.animate : { scale: 1, rotate: 0, x: 0 }} transition={move.transition} style={{ color: on ? ink : c }}>
        <Icon weight={on ? 'fill' : 'bold'} className="h-6 w-6" />
      </motion.span>
      {m.label}
      {!on && <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full opacity-70" style={{ background: c }} />}
    </motion.button>
  );
}

/** Marcador de round na linha do tempo. */
function RoundDot({ n, on, past, color, disabled, onClick }: { n: number; on: boolean; past: boolean; color: string; disabled: boolean; onClick: () => void }) {
  const [fx, hit] = useFx();
  return (
    <motion.button type="button" disabled={disabled} aria-pressed={on} aria-label={`Round ${n}`} onClick={() => { if (!on) hit(); onClick(); }}
      whileHover={disabled ? undefined : { scale: 1.18 }} whileTap={disabled ? undefined : { scale: 0.85 }} transition={{ type: 'spring', stiffness: 500, damping: 16 }}
      className="relative flex flex-col items-center">
      {fx > 0 && <><Burst key={`b${fx}`} color={color} n={8} reach={34} /><Float key={`f${fx}`} text={`+${POINTS.round}`} color={color} /></>}
      <motion.span layout animate={{ scale: on ? 1.25 : 1 }} transition={{ type: 'spring', stiffness: 420, damping: 15 }}
        className="num grid h-9 w-9 place-items-center rounded-full border-2 font-display text-[14px] font-bold"
        style={on ? { background: color, borderColor: color, color: '#fff', boxShadow: `0 6px 16px -6px ${color}` } : past ? { borderColor: color, color, background: 'var(--color-surface)' } : { borderColor: 'var(--color-line-2)', color: 'var(--color-fg-2)', background: 'var(--color-surface)' }}>{n}</motion.span>
    </motion.button>
  );
}

/** Barra de combo: vencedor → método → round. Quando fecha, vira "Combo perfeito" com brilho. */
function ComboBar({ pick, accent }: { pick?: Pick; accent: string }) {
  const mc = pick?.method ? METHOD_COLOR[pick.method].c : accent;
  // decisão não tem round: o combo vira de dois passos
  const steps = [
    { label: 'Vencedor', pts: POINTS.winner, ok: !!pick, color: accent },
    { label: 'Método', pts: POINTS.method, ok: !!pick?.method, color: mc },
    ...(pick?.method === 'dec' ? [] : [{ label: 'Round', pts: POINTS.round, ok: !!pick?.round, color: mc }]),
  ];
  const done = steps.filter(x => x.ok).length;
  const perfect = done === steps.length;
  const pts = steps.reduce((n, x) => n + (x.ok ? x.pts : 0), 0) + (perfect ? POINTS.perfect : 0);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex min-w-[190px] flex-1 items-center gap-1.5" role="img" aria-label={`Combo: ${done} de ${steps.length}`}>
        {steps.map((x, i) => (
          <div key={x.label} className="flex-1">
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <motion.div className="h-full rounded-full" style={{ background: x.color }} initial={false} animate={{ width: x.ok ? '100%' : '0%' }} transition={{ type: 'spring', stiffness: 220, damping: 22, delay: x.ok ? i * 0.08 : 0 }} />
            </div>
            <div className={clsx('mt-1 text-center font-display text-[12px] font-bold uppercase tracking-[0.06em] transition-colors', x.ok ? 'text-fg' : 'text-fg-2')}>{x.label}</div>
          </div>
        ))}
      </div>
      <div className="relative flex items-center gap-2">
        <AnimatePresence mode="wait" initial={false}>
          {perfect
            ? <motion.span key="perfect" initial={{ scale: 0.4, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 14 }}
                className="rounded-md bg-gold px-2.5 py-1 font-display text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#14183e]">★ Combo perfeito</motion.span>
            : <motion.span key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[13px] text-fg-3">{pick ? `${done}/${steps.length} do combo` : 'sem palpite'}</motion.span>}
        </AnimatePresence>
        <motion.span key={pts} initial={{ scale: 1.5, y: -3 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }} className="num font-display text-[24px] font-extrabold leading-none text-fg">{pts}<span className="ml-1 text-[12px] font-bold text-fg-3">PTS EM JOGO</span></motion.span>
      </div>
    </div>
  );
}

/* ---------- Luta da noite ---------- */

type FotnProps = { on: boolean; locked: boolean; awarded?: boolean; onToggle: () => void };

/** Estrela no topo de cada luta: atalho para o voto de luta da noite (o bloco grande fica acima do card). */
function FotnToggle({ on, locked, awarded, onToggle }: FotnProps) {
  const [fx, hit] = useFx();
  if (awarded) return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-gold px-3 font-display text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#14183e]">
      <Trophy weight="fill" className="h-3.5 w-3.5" /> Luta da noite
    </span>
  );
  if (locked && !on) return null;
  return (
    <motion.button type="button" disabled={locked} aria-pressed={on} onClick={() => { if (!on) hit(); onToggle(); }}
      title={on ? 'Tirar o voto de luta da noite' : `Votar como luta da noite (+${POINTS.fotn} se levar o bônus)`}
      whileHover={locked ? undefined : { scale: 1.06 }} whileTap={locked ? undefined : { scale: 0.92 }} transition={{ type: 'spring', stiffness: 460, damping: 18 }}
      className={clsx('relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-display text-[12px] font-bold uppercase tracking-[0.08em] transition-colors',
        on ? 'bg-gold text-[#14183e]' : 'text-fg-2 ring-1 ring-line enabled:hover:text-fg enabled:hover:ring-gold/60')}>
      {fx > 0 && <><Burst key={`b${fx}`} color="var(--color-gold)" n={12} reach={40} /><Float key={`f${fx}`} text={`+${POINTS.fotn}`} color="var(--color-gold)" /></>}
      <Star weight={on ? 'fill' : 'bold'} className="h-3.5 w-3.5" />{on ? 'Sua luta da noite' : 'Luta da noite?'}
    </motion.button>
  );
}

/** Bloco em destaque acima das lutas: a pergunta da luta da noite, com todas as lutas do card para escolher. */
function FotnPicker({ fights, vote, locked, awarded, onVote }: { fights: Fight[]; vote?: string; locked: boolean; awarded?: string[]; onVote: (id: string | null) => void }) {
  const reduce = useReducedMotion();
  const [fx, setFx] = useState<{ id: string; n: number } | null>(null);
  const row = useRef<HTMLDivElement>(null);
  const slide = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * 260, behavior: reduce ? 'auto' : 'smooth' });
  const start = cardStart(fights);
  const chosen = fights.find(f => f.id === vote);
  const result = awarded && vote ? (awarded.length ? (awarded.includes(vote) ? 'hit' : 'miss') : 'void') : undefined;
  const ordered = [...fights].sort((a, b) => a.order - b.order);
  return (
    <section aria-labelledby="fotn-title" className="relative isolate overflow-hidden rounded-xl p-5 ring-1 ring-gold/40 sm:p-6"
      style={{ background: 'linear-gradient(115deg, color-mix(in oklab, var(--color-gold) 26%, var(--color-surface)), color-mix(in oklab, var(--color-gold) 6%, var(--color-surface)) 60%)' }}>
      <Trophy aria-hidden weight="fill" className="absolute -right-6 -top-6 -z-10 h-40 w-40 text-gold opacity-[0.14]" />
      <div className="flex flex-wrap items-start gap-4">
        <motion.span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold text-[#14183e] shadow-[var(--shadow-cta)]"
          animate={!vote && !locked && !reduce ? { rotate: [0, -14, 12, -6, 0], scale: [1, 1.12, 1] } : undefined} transition={{ duration: 0.9, delay: 0.6 }}>
          <Star weight="fill" className="h-6 w-6" />
        </motion.span>
        <div className="min-w-0 flex-1 basis-[220px]">
          <h2 id="fotn-title" className="display text-[24px] text-fg sm:text-[32px]">Qual vai ser a luta da noite?</h2>
          <p className="mt-1 text-[14px] text-fg-2">
            Vale <b className="font-display text-[16px] text-fg">+{POINTS.fotn} pontos</b> se a luta escolhida levar o bônus do UFC.
            {' '}{locked ? 'A votação fechou quando o card começou.' : `Um voto por evento; fecha quando o card começar${start ? `, às ${time(start)}` : ''}.`}
          </p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={(vote ?? '') + (result ?? '')} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className={clsx('w-full rounded-xl px-4 py-2.5 text-[14px] ring-1 sm:w-auto', result === 'hit' ? 'bg-win-soft text-win ring-win/30' : result === 'miss' ? 'bg-loss-soft text-loss ring-loss/20' : 'bg-surface text-fg-2 ring-line')}>
            {result === 'hit' ? <b>Acertou! +{POINTS.fotn} pts</b>
              : result === 'miss' ? <b>Não foi dessa vez</b>
              : result === 'void' ? 'Evento sem bônus de luta da noite'
              : chosen ? <>Seu voto: <b className="text-fg">{lastName(chosen.red.name)} × {lastName(chosen.blue.name)}</b></>
              : locked ? 'Você não votou' : <b className="text-fg">Escolha abaixo ↓</b>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* no computador, todas as lutas à vista (quebram em linhas); no celular, desliza para o lado, com setas */}
      <div className="relative mt-5">
      <div className="mb-2 flex justify-end gap-1.5 sm:hidden">
        <button type="button" onClick={() => slide(-1)} aria-label="Lutas anteriores" className="grid h-8 w-8 place-items-center rounded-full bg-surface text-fg-2 ring-1 ring-line"><CaretLeft weight="bold" className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => slide(1)} aria-label="Próximas lutas" className="grid h-8 w-8 place-items-center rounded-full bg-fg text-bg"><CaretRight weight="bold" className="h-3.5 w-3.5" /></button>
      </div>
      <div ref={row} role="radiogroup" aria-label="Luta da noite"
        className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [mask-image:linear-gradient(90deg,#000_85%,transparent)] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]">
        {ordered.map(f => {
          const on = vote === f.id, won = awarded?.includes(f.id);
          return (
            <motion.button key={f.id} type="button" role="radio" aria-checked={on} disabled={locked}
              onClick={() => { if (!on) setFx({ id: f.id, n: (fx?.n ?? 0) + 1 }); onVote(on ? null : f.id); }}
              whileHover={locked ? undefined : { y: -3 }} whileTap={locked ? undefined : { scale: 0.95 }} transition={{ type: 'spring', stiffness: 460, damping: 20 }}
              className={clsx('relative flex shrink-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-left ring-1 transition-colors',
                on ? 'bg-gold text-[#14183e] ring-gold shadow-[var(--shadow-cta)]' : won ? 'bg-surface text-fg ring-2 ring-gold' : 'bg-surface text-fg ring-line enabled:hover:ring-gold/60',
                locked && !on && !won && 'opacity-60')}>
              {fx?.id === f.id && <><Burst key={`b${fx.n}`} color="var(--color-gold)" n={12} reach={50} /><Float key={`f${fx.n}`} text={`+${POINTS.fotn}`} color="var(--color-gold)" /></>}
              <span className="flex -space-x-2.5">
                <Avatar src={f.red.headshot} name={f.red.name} size={30} />
                <Avatar src={f.blue.headshot} name={f.blue.name} size={30} />
              </span>
              <span className="font-display text-[13px] font-bold uppercase tracking-[0.03em]">{lastName(f.red.name)} × {lastName(f.blue.name)}</span>
              {(on || won) && <span>{won ? <Trophy weight="fill" className="h-4 w-4 text-gold" /> : <Star weight="fill" className="h-4 w-4" />}</span>}
            </motion.button>
          );
        })}
      </div>
      </div>
    </section>
  );
}

function FightPick({ eventId, f, draft, saved, onChange, fotn }: { eventId: string; f: Fight; draft?: Pick; saved?: Pick; onChange: (p: Pick | null) => void; fotn: FotnProps }) {
  const locked = isLocked(f);
  // luta aberta: edita o rascunho; luta travada: mostra só o que foi salvo (é o que conta pontos)
  const pick = locked ? saved : draft;
  const sc = scoreFight(saved, f);
  const ov = oddsView(f.odds);
  const r = f.result;
  const winnerSide = !r?.winnerId ? undefined : r.winnerId === f.red.espnId ? 'a' : 'b';
  const set = (patch: Partial<Pick>) => pick && onChange({ ...pick, ...patch, at: Date.now() });
  const pickWinner = (id: string) => onChange({ winner: id, method: pick?.method, round: pick?.round, at: Date.now() });
  const finish = pick?.method === 'ko' || pick?.method === 'sub';
  // cor do lado escolhido (vermelho/azul); sem palpite, a cor neutra
  const perfectNow = !!pick?.method && (pick.method === 'dec' || !!pick.round);
  const wasPerfect = useRef(perfectNow);
  const [party, setParty] = useState(0);
  useEffect(() => { if (perfectNow && !wasPerfect.current) setParty(n => n + 1); wasPerfect.current = perfectNow; }, [perfectNow]);
  const accent = pick ? CORNER[pick.winner === f.red.espnId ? 'a' : 'b'] : 'var(--color-fg)';
  const fighter = (x: FighterRef, side: 'a' | 'b') => (
    <FighterButton f={x} side={side} picked={pick?.winner === x.espnId} locked={locked}
      result={winnerSide ? (winnerSide === side ? 'won' : 'lost') : undefined} onPick={() => pickWinner(x.espnId)}
      odds={ov && <OddsChip {...(side === 'a' ? ov.red : ov.blue)} compact />} />
  );
  return (
    <div className="relative overflow-x-clip py-5">
      {party > 0 && <Confetti key={party} />}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-display text-[13px] font-semibold uppercase tracking-[0.1em] text-fg-3">{f.weightClass} · {f.rounds} rounds</span>
        {f.title && <Tag tone="gold"><Crown weight="fill" className="h-3 w-3" /> Título</Tag>}
        {locked && !r && <Tag><LockSimple weight="bold" className="h-3 w-3" /> {f.status === 'in' ? 'Ao vivo' : 'Palpites encerrados'}</Tag>}
        <span className="ml-auto flex items-center gap-3">
          <FotnToggle {...fotn} />
          <Link to={fightHref(eventId, f.id)} className="text-[13px] font-semibold text-fg-2 underline-offset-4 hover:text-brand hover:underline">Ver luta</Link>
        </span>
      </div>

      <div className="flex items-stretch">
        {fighter(f.red, 'a')}
        <span className="z-10 -mx-4 grid h-10 w-10 shrink-0 place-items-center self-center rounded-full bg-fg font-display text-[13px] font-bold text-bg ring-4 ring-bg">VS</span>
        {fighter(f.blue, 'b')}
      </div>

      {/* método e round: só depois de escolher o vencedor. Cada método tem a sua cor e o round usa a cor do método */}
      <div className={clsx('mt-4 grid gap-4', finish ? 'sm:grid-cols-[1.1fr_1fr]' : '')}>
        <div role="group" aria-label="Método da vitória">
          <div className="label mb-2">Como vence</div>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map(m => {
              const on = pick?.method === m.key;
              return <MethodTile key={m.key} m={m} on={on} disabled={!pick || locked}
                onClick={() => set({ method: on ? undefined : (m.key as MethodKey), round: m.key === 'dec' || on ? undefined : pick?.round })} />;
            })}
          </div>
        </div>
        <AnimatePresence initial={false}>
          {finish && (
            <motion.div key="round" role="group" aria-label="Round" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}>
              <div className="label mb-2">Em que round</div>
              <div className="relative px-4 pb-1 pt-1.5">
                <span aria-hidden className="absolute left-4 right-4 top-[22px] h-1.5 rounded-full bg-surface-2" />
                <motion.span aria-hidden className="absolute left-4 top-[22px] h-1.5 rounded-full" style={{ background: METHOD_COLOR[pick!.method!].c }} initial={false}
                  animate={{ width: pick?.round ? `calc((100% - 2rem) * ${(pick.round - 1) / Math.max(f.rounds - 1, 1)})` : 0 }} transition={{ type: 'spring', stiffness: 160, damping: 20 }} />
                <div className="relative flex justify-between">
                  {Array.from({ length: f.rounds }, (_, i) => i + 1).map(n => (
                    <RoundDot key={n} n={n} on={pick?.round === n} past={!!pick?.round && n < pick.round} color={METHOD_COLOR[pick!.method!].c} disabled={locked}
                      onClick={() => set({ round: pick?.round === n ? undefined : n })} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {!locked && <ComboBar pick={pick} accent={accent} />}
      {pick && !locked && (
        <div className="mt-1.5 flex items-center justify-between">
          <span />
          <button type="button" onClick={() => onChange(null)} className="text-[13px] font-semibold text-fg-3 hover:text-fg">Limpar</button>
        </div>
      )}

      {sc.state === 'done' && <Result f={f} pick={pick!} sc={sc} />}
      {sc.state === 'void' && <p className="mt-3 text-[14px] text-fg-3">Luta sem vencedor (empate ou sem resultado): não conta pontos.</p>}
      {locked && r && !saved && <p className="mt-3 text-[13px] text-fg-3">{draft ? 'Você montou este palpite mas não salvou a tempo: ele não conta pontos.' : 'Você não palpitou nesta luta.'}</p>}
    </div>
  );
}

/** Quadro de resultado de uma luta palpitada: o que acertou e os pontos. */
function Result({ f, pick, sc }: { f: Fight; pick: Pick; sc: ReturnType<typeof scoreFight> }) {
  const r = f.result!;
  const real = r.winnerId === f.red.espnId ? f.red : f.blue;
  return (
    <div className={clsx('mt-4 rounded-xl p-3.5', sc.winner ? 'bg-win-soft' : 'bg-loss-soft')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-display text-[16px] font-bold uppercase tracking-[0.03em] text-fg">
          {sc.winner ? <Check weight="bold" className="h-4 w-4 text-win" /> : <X weight="bold" className="h-4 w-4 text-loss" />}
          {sc.winner ? 'Você acertou' : 'Você errou'} · {lastName(real.name)} venceu por {r.method}{r.round ? `, R${r.round}` : ''}
        </div>
        <div className="num font-display text-[20px] font-bold text-fg">+{sc.points} pts</div>
      </div>
      {sc.parts.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {sc.parts.map(p => <li key={p.label} className="rounded-md bg-surface px-2 py-0.5 text-[13px] font-semibold text-fg-2">{p.label} <span className="num text-fg">+{p.pts}</span></li>)}
        </ul>
      )}
      {sc.winner && <p className="mt-2 text-[13px] text-fg-3">Seu palpite: {METHODS.find(m => m.key === pick.method)?.label ?? 'sem método'}{pick.round ? `, round ${pick.round}` : ''}.</p>}
    </div>
  );
}

/* ---------- Salvar ---------- */

/** Fim do card: resume o rascunho e salva. Ao salvar, mostra o que foi computado. Fica grudado no pé da tela
    enquanto houver alterações não salvas. */
function SavePanel({ eventId, fights, draft, savedAt, dirty, justSaved, onSave, onDiscard, login }: {
  eventId: string; fights: Fight[]; draft: Record<string, Pick>; savedAt?: number; dirty: boolean; justSaved: number | null; onSave: () => void; onDiscard: () => void;
  /** sem sessão: o botão leva para a tela de entrar (o rascunho continua guardado) */
  login?: string;
}) {
  const open = fights.filter(f => !isLocked(f));
  const made = open.filter(f => draft[f.id]).length;
  const fotnMissing = !draft[FOTN] && !fotnLocked(fights);
  const perfect = open.filter(f => { const p = draft[f.id]; return !!p?.method && (p.method === 'dec' || !!p.round); }).length;
  const pts = open.reduce((n, f) => { const p = draft[f.id]; if (!p) return n; const fin = p.method === 'ko' || p.method === 'sub'; return n + POINTS.winner + (p.method ? POINTS.method : 0) + (fin && p.round ? POINTS.round : 0) + (!!p.method && (p.method === 'dec' || !!p.round) ? POINTS.perfect : 0); }, 0);
  const hhmm = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const done = !dirty && !!savedAt;
  // depois de salvar, continua grudado no pé da tela por alguns segundos para a confirmação ser vista
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (!justSaved) return;
    setFresh(true);
    const t = setTimeout(() => setFresh(false), 6000);
    return () => clearTimeout(t);
  }, [justSaved]);
  return (
    <div className={clsx('z-30 -mx-2 px-2 sm:mx-0 sm:px-0', (dirty || fresh) && 'sticky bottom-3')} data-event={eventId}>
      <div className={clsx('cut rounded-xl p-5 shadow-[var(--shadow-lift)] ring-1 transition-colors', done ? 'ring-win/40' : 'bg-fg text-bg ring-fg')}
        // fundo opaco: o painel fica por cima do conteúdo quando está grudado no pé da tela
        style={done ? { background: 'color-mix(in oklab, var(--color-win) 16%, var(--color-surface))' } : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-3 text-fg">
                  <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 14 }} className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-win text-white"><Check weight="bold" className="h-5 w-5" /></motion.span>
                  <div>
                    <div className="font-display text-[20px] font-bold uppercase leading-tight tracking-[0.02em]">{justSaved ? 'Palpites salvos e computados!' : 'Tudo salvo'}</div>
                    <p className="mt-1 text-[14px] text-fg-2">{made} {made === 1 ? 'palpite contabilizado' : 'palpites contabilizados'} · salvo às {hhmm(savedAt!)}. Os pontos saem quando as lutas terminarem.</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="todo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="font-display text-[20px] font-bold uppercase leading-tight tracking-[0.02em]">{savedAt ? 'Alterações não salvas' : 'Salve para valer'}</div>
                  <p className="mt-1 text-[14px] text-bg/70"><b className="num text-bg">{made}</b> de {open.length} lutas palpitadas · <b className="num text-bg">{perfect}</b> {perfect === 1 ? 'combo perfeito' : 'combos perfeitos'} · <b className="num text-bg">{pts}</b> pts em jogo. {fotnMissing && <>Falta a <b className="inline-flex items-center gap-1 text-bg"><Star weight="fill" className="h-3.5 w-3.5 text-gold" />luta da noite</b>. </>}{login ? 'Entre na sua conta para salvar e pontuar.' : 'Só o que for salvo conta pontos.'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {dirty && savedAt && <button type="button" onClick={onDiscard} className="btn-ghost text-bg/80 hover:bg-bg/10 hover:text-bg">Descartar</button>}
            {login ? (
              <Link to={login} className="inline-flex h-12 items-center gap-2 rounded-full bg-gold px-7 font-display text-[14px] font-bold uppercase tracking-[0.06em] text-[#14183e] shadow-[var(--shadow-cta)] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.96]">
                <SignIn weight="bold" className="h-5 w-5" /> Entrar para salvar
              </Link>
            ) : (
            <motion.button type="button" onClick={onSave} disabled={!dirty || (made === 0 && !savedAt)} whileHover={dirty ? { y: -2, scale: 1.03 } : undefined} whileTap={dirty ? { scale: 0.94 } : undefined}
              transition={{ type: 'spring', stiffness: 460, damping: 20 }}
              className={clsx('inline-flex h-12 items-center gap-2 rounded-full px-7 font-display text-[14px] font-bold uppercase tracking-[0.06em] disabled:cursor-default',
                dirty ? 'bg-gold text-[#14183e] shadow-[var(--shadow-cta)]' : 'bg-win/15 text-win')}>
              {dirty ? <><FloppyDisk weight="bold" className="h-5 w-5" /> Salvar palpites</> : <><Check weight="bold" className="h-5 w-5" /> Salvo</>}
            </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Resumos ---------- */

function Strip({ s, total, made, dirty }: { s: Summary; total: number; made: number; dirty: boolean }) {
  const done = s.scored > 0 || s.fotn === 'done';
  const items = done
    ? [['Pontos', String(s.points), `de até ${total * MAX_POINTS + POINTS.fotn}`], ['Vencedores certos', `${s.hits}/${s.scored}`, s.scored ? `${Math.round((s.hits / s.scored) * 100)}% de acerto` : ''], ['Métodos certos', String(s.methods), 'entre os vencedores certos'], ['Palpites perfeitos', String(s.perfects), 'vencedor + método (+ round)']]
    : [['Palpites feitos', `${made}/${total}`, dirty ? 'ainda não salvos' : made === total ? 'card completo e salvo!' : made ? 'salvos' : 'faltam ' + (total - made)], ['Pontos possíveis', String(total * MAX_POINTS + POINTS.fotn), `até ${MAX_POINTS} por luta + ${POINTS.fotn} da luta da noite`], ['Aguardando', String(s.pending), 'lutas ainda sem resultado'], ['Vencedor vale', `${POINTS.winner} pts`, 'método e round somam mais']];
  return (
    <div className="rule grid grid-cols-2 gap-y-6 lg:grid-cols-4 lg:divide-x lg:divide-line">
      {items.map(([l, v, sub], i) => (
        <div key={l} className={i ? 'lg:pl-6' : 'lg:pr-6'}>
          <div className="label">{l}</div>
          <div className={clsx('display mt-1 text-fg', i ? 'text-[32px]' : 'text-[64px] leading-[0.9]')}>{v}</div>
          <div className="mt-1 text-[13px] text-fg-3">{sub}</div>
        </div>
      ))}
    </div>
  );
}

function Rules() {
  const rows: [string, string, string][] = [
    ['Vencedor', `+${POINTS.winner}`, 'acertar quem ganha'],
    ['Método', `+${POINTS.method}`, 'KO/TKO, finalização ou decisão (só se acertou o vencedor)'],
    ['Round', `+${POINTS.round}`, 'em lutas que acabam antes da decisão (só se acertou vencedor e método)'],
    ['Palpite perfeito', `+${POINTS.perfect}`, 'vencedor + método (+ round, quando não for decisão)'],
    ['Zebra', `+${POINTS.zebra}`, 'vencedor com menos de 35% de chance pelas odds'],
    ['Grande zebra', `+${POINTS.bigZebra}`, 'vencedor com menos de 20% de chance pelas odds'],
    ['Luta da noite', `+${POINTS.fotn}`, 'um voto por evento: a luta que você acha que leva o bônus do UFC'],
  ];
  return (
    <Panel plain title="Como funciona a pontuação" action={<span className="text-[13px] text-fg-3">até {MAX_POINTS} pontos por luta</span>}>
      <dl className="divide-y divide-line/70">
        {rows.map(([k, v, d]) => (
          <div key={k} className="grid grid-cols-[120px_44px_1fr] items-baseline gap-3 py-2.5 sm:grid-cols-[150px_52px_1fr]">
            <dt className="font-semibold text-fg">{k}</dt><dd className="num font-display text-[18px] font-bold text-brand">{v}</dd><dd className="text-[14px] text-fg-3">{d}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[13px] leading-relaxed text-fg-3">Os palpites fecham luta a luta, quando o horário dela chega; a luta da noite fecha quando o card começa. Empate e luta sem resultado não contam. {supabaseEnabled ? 'Os palpites salvos ficam na sua conta.' : 'Seus palpites ficam salvos neste navegador.'}</p>
    </Panel>
  );
}

/* ---------- Página ---------- */

export default function Picks() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const upcoming = useUpcoming(8);
  const choices = useMemo(() => (upcoming.data ?? []).filter(e => e.series !== 'dwcs'), [upcoming.data]);
  const [params] = useSearchParams();
  const tab: 'meus' | 'ranking' = supabaseEnabled && params.get('aba') === 'ranking' ? 'ranking' : 'meus';
  // no ranking entram também os últimos eventos encerrados (é neles que há pontos)
  const schedule = useSchedule(new Date().getFullYear());
  const past = useMemo(() => (schedule.data ?? []).filter(e => e.series !== 'dwcs' && Date.parse(e.date) < Date.now() - 8 * 3600_000).slice(-3).reverse(), [schedule.data]);
  const list = tab === 'ranking' ? [...choices.filter(c => Date.parse(c.date) <= Date.now()), ...past, ...choices.filter(c => Date.parse(c.date) > Date.now())] : choices;
  const id = routeId ?? (tab === 'ranking' ? list[0]?.id : choices.find(e => e.status !== 'post')?.id ?? choices[0]?.id);
  const qs = tab === 'ranking' ? '?aba=ranking' : '';
  const { data: e, isPending, isError, error, refetch } = useEvent(id);
  const { saved, draftOf, setPick, save, discard, clearEvent } = usePicks();
  const auth = useAuth();
  const here = id ? `/palpites/${id}` : '/palpites';
  const login = auth.enabled && auth.ready && !auth.user ? loginHref(here) : undefined;
  const mine = id ? draftOf(id) : {};                 // rascunho (o que está na tela)
  const savedPicks = (id && saved[id]?.picks) || {};  // o que foi salvo e conta pontos
  const [confirm, setConfirm] = useState(false);
  const [justSaved, setJustSaved] = useState<number | null>(null);
  usePageTitle(e ? `${tab === 'ranking' ? 'Ranking' : 'Palpites'} · ${e.name}` : 'Palpites');

  const fights = e?.fights ?? [];
  const { data: bonus } = useBonuses(e?.status === 'post' ? e.id : undefined);
  const awarded = fotnAwarded(e, bonus);
  const summary = useMemo(() => summarize(savedPicks, fights, awarded), [savedPicks, fights, awarded?.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const fotnClosed = fotnLocked(fights);
  const fotnVote = (fotnClosed ? savedPicks : mine)[FOTN]?.winner;
  const voteFotn = (fightId: string | null) => id && setPick(id, FOTN, fightId ? { winner: fightId, at: Date.now() } : null);
  const dirty = isDirty(mine, savedPicks);
  // avisa antes de sair da página com alterações não salvas
  useEffect(() => {
    if (!dirty) return;
    const warn = (ev: BeforeUnloadEvent) => { ev.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => { setJustSaved(null); }, [id]);
  const open = fights.filter(f => !isLocked(f)).length; // define se ainda dá para palpitar (mostra o "Recomeçar")

  return (
    <div className="space-y-8">
      <PageHeader title="Quem leva o card?"
        meta="Escolha o vencedor, o método e o round de cada luta. Quando os resultados saem, calculamos seus acertos e seus pontos." />

      {supabaseEnabled && (
        <Segmented value={tab} onChange={v => navigate(`/palpites${routeId ? `/${routeId}` : ''}${v === 'ranking' ? '?aba=ranking' : ''}`)}
          options={[{ value: 'meus', label: 'Meus palpites' }, { value: 'ranking', label: 'Ranking' }]} />
      )}

      {tab === 'meus' && <PicksAccount next={here} />}

      {/* eventos */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Escolher o evento">
        {/* evento aberto pelo link que não está na lista dos próximos (ex.: já encerrado): ganha a sua aba, selecionada */}
        {[...(e && !list.some(c => c.id === e.id) ? [{ id: e.id, name: e.name, date: e.date }] : []), ...list].map(c => {
          const { series, title } = splitEventName(c.name);
          const on = c.id === id;
          return (
            <button key={c.id} role="tab" aria-selected={on} onClick={() => navigate(`/palpites/${c.id}${qs}`)}
              className={clsx('lift flex shrink-0 flex-col items-start rounded-xl px-4 py-2.5 text-left ring-1', on ? 'bg-fg text-bg ring-fg' : 'bg-surface text-fg ring-fg/[0.08]')}>
              <span className="font-display text-[13px] font-bold uppercase tracking-[0.06em]">{title || series}</span>
              <span className={clsx('num text-[13px]', on ? 'text-bg/70' : 'text-fg-3')}>{series} · {dayMonth(c.date)}{fightCount(saved[c.id]?.picks) ? ` · ${fightCount(saved[c.id]?.picks)} salvos` : ''}</span>
            </button>
          );
        })}
      </div>

      {(isPending && !!id || upcoming.isPending) && <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-[640px]" /></div>}
      {isError && <Panel><ErrorState message={error?.message} onRetry={() => refetch()} /></Panel>}
      {!upcoming.isPending && !id && <Panel><Empty>Nenhum evento disponível para palpites por enquanto.</Empty></Panel>}

      {e && tab === 'ranking' && <PicksRanking event={e} />}

      {e && tab === 'meus' && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="display text-[32px] text-fg">{splitEventName(e.name).title || splitEventName(e.name).series}</h2>
              <p className="mt-1 text-[14px] text-fg-3">{splitEventName(e.name).series} · {dayMonth(e.date)}, card principal às {time(e.date)} (Brasília)</p>
            </div>
            {(fightCount(mine) > 0 || summary.made > 0) && open > 0 && (
              confirm
                ? <span className="flex items-center gap-2 text-[13px]">Apagar os palpites das lutas que ainda não começaram?
                    <button className="btn-ghost text-loss" onClick={() => { clearEvent(e.id, fights); setConfirm(false); }}>Apagar</button>
                    <button className="btn-ghost" onClick={() => setConfirm(false)}>Cancelar</button></span>
                : <button className="btn-ghost" onClick={() => setConfirm(true)}><ArrowCounterClockwise className="h-4 w-4" /> Recomeçar</button>
            )}
          </div>

          <Strip s={summary} total={fights.length} made={fightCount(mine)} dirty={dirty} />

          <FotnPicker fights={fights} vote={fotnVote} locked={fotnClosed} awarded={awarded} onVote={voteFotn} />

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-8">
              {ORDER.map(seg => {
                const list = fights.filter(f => f.segment === seg);
                if (!list.length) return null;
                return (
                  <Panel key={seg} plain
                    title={<h2 className="panel-title">{SEGMENT_LABEL[seg]} <span className="ml-1.5 align-middle font-sans text-[14px] font-semibold text-fg-3">{list.length} lutas</span></h2>}
                    action={e.segmentStart[seg] && <span className="num text-[13px] text-fg-3">{time(e.segmentStart[seg]!)}</span>}
                    bodyClass="divide-y divide-line/70">
                    {list.map(f => (
                      <FightPick key={f.id} eventId={e.id} f={f} draft={mine[f.id]} saved={savedPicks[f.id]} onChange={p => setPick(e.id, f.id, p)}
                        fotn={{ on: fotnVote === f.id, locked: fotnClosed, awarded: awarded?.includes(f.id), onToggle: () => voteFotn(fotnVote === f.id ? null : f.id) }} />
                    ))}
                  </Panel>
                );
              })}
              {open > 0 && (
                <SavePanel eventId={e.id} fights={fights} draft={mine} savedAt={saved[e.id]?.savedAt} dirty={dirty} justSaved={justSaved} login={login}
                  onSave={() => { const r = save(e.id, fights); setJustSaved(r.savedAt); }} onDiscard={() => { discard(e.id); setJustSaved(null); }} />
              )}
            </div>
            <aside className="min-w-0 space-y-8 lg:sticky lg:top-24 lg:self-start">
              <Rules />
              <PicksHistory currentId={e.id} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
