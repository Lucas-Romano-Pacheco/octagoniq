import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Lightning, ShareNetwork, Star, Target, Timer, Trophy, X } from '@/components/icons';
import type { EventDetail, FighterRef } from '@shared/types';
import { useBonuses } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { proxy } from '@/lib/img';
import { fotnAwarded } from '@/lib/fights';
import { lastName, longDate, mmss, splitEventName } from '@/lib/format';
import { summarize, usePicks } from '@/lib/picks';
import { buildStories, type Story } from '@/lib/stories';
import { useAuth } from '@/lib/supabase';
import { useEventBoard, useNames } from './PicksRanking';
import { Avatar, MethodTag, OctagonMark } from './kit';

/* Resumo da noite (D5): cartões em tela cheia, no estilo stories. Avança sozinho a cada 5 s, toque à direita
   avança e à esquerda volta, segurar pausa; no teclado, ← → e Esc. O conteúdo vem de src/lib/stories.ts. */

const DURATION = 5000;
const TONE: Record<Story['kind'], string> = {
  cover: 'var(--color-brand)', main: 'var(--color-brand)', upset: 'var(--color-orange-fill)', fastest: 'var(--color-ko-fill)',
  bonus: 'var(--color-gold-ink)', you: 'var(--color-dec-fill)', crowd: 'var(--color-sub-fill)', end: 'var(--color-brand)',
};

function Big({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`display text-[44px] leading-[0.95] text-white sm:text-[56px] ${className ?? ''}`}>{children}</div>;
}
const Kicker = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <div className="flex items-center gap-2 font-display text-[14px] font-bold text-white/80">{icon}{children}</div>
);
const Face = ({ f, size = 150, dim }: { f: FighterRef; size?: number; dim?: boolean }) => (
  <Avatar src={f.headshot} name={f.name} size={size} ring="#fff" className={dim ? 'opacity-60 grayscale' : undefined} />
);

/* ---------- Arte dos cartões: lutador em pé (corpo inteiro, UFC.com) e uma palavra gigante vazada ao fundo ---------- */

/** Foto de corpo inteiro: a que já veio com o lutador ou, sem ela, a do UFC.com pelo endereço do atleta. */
function useBody(f?: FighterRef) {
  const { data, isFetched } = useQuery({
    queryKey: ['photo', f?.slug],
    queryFn: () => fetch(`/api/photo/${f!.slug}`).then(r => (r.ok ? (r.json() as Promise<{ src?: string }>) : null)),
    enabled: !!f && !f.bodyImage, staleTime: Infinity,
  });
  return { src: f?.bodyImage ?? data?.src, settled: !!f?.bodyImage || isFetched };
}

/** Lutador em pé subindo do pé do cartão; depois aproxima devagar durante os 5 s do cartão. */
function Standing({ f, className, dim, soft, delay = 0.1 }: { f?: FighterRef; className: string; dim?: boolean; soft?: boolean; delay?: number }) {
  const { src, settled } = useBody(f);
  const target = dim ? 0.45 : soft ? 0.5 : 1;
  // sem foto de corpo inteiro (estreantes, nomes diferentes no UFC.com): o retrato grande, no mesmo canto
  if (!src) return settled && f?.headshot ? (
    <motion.div className="pointer-events-none absolute bottom-[14%] right-[-6%]" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: target }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      <Avatar src={f.headshot} name={f.name} size={250} ring="rgba(255,255,255,0.6)" className={dim ? 'grayscale' : undefined} />
    </motion.div>
  ) : null;
  return (
    <motion.img src={proxy(src, 700)} alt="" aria-hidden decoding="async"
      className={`pointer-events-none absolute bottom-0 w-auto max-w-none select-none [mask-image:linear-gradient(to_bottom,#000_70%,transparent)] ${dim ? 'grayscale' : 'drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]'} ${className}`}
      initial={{ y: 60, opacity: 0, scale: 1 }} animate={{ y: 0, opacity: target, scale: [1, 1.04] }}
      transition={{ y: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.5, delay }, scale: { duration: DURATION / 1000, ease: 'linear' } }} />
  );
}

/** Palavra gigante, só o contorno, atrás do lutador (como nos pôsteres de luta). */
const Word = ({ children }: { children: ReactNode }) => (
  <motion.div aria-hidden className="pointer-events-none absolute right-[-4%] top-[16%] whitespace-nowrap font-display text-[150px] font-black uppercase leading-none text-transparent sm:text-[180px]"
    style={{ WebkitTextStroke: '2px rgba(255,255,255,0.22)' }}
    initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
    {children}
  </motion.div>
);

const methodWord = (m?: string) => (/KO/i.test(m ?? '') ? 'KO' : /Finaliza/i.test(m ?? '') ? 'SUB' : /Decis/i.test(m ?? '') ? 'Decisão' : '');

/** Fundo de cada cartão. O texto fica por cima, à esquerda; um véu escuro à esquerda garante a leitura. */
function Backdrop({ s, ev }: { s: Story; ev: EventDetail }) {
  const main = ev.fights.find(f => f.order === 1) ?? ev.fights[0];
  const art = (() => {
    switch (s.kind) {
      case 'cover': return main && <><Word>{splitEventName(ev.name).series.replace(/^UFC /, '') || 'UFC'}</Word>
        <Standing f={main.red} className="bottom-[20%]! left-[-4%] h-[40%]" delay={0.15} /><Standing f={main.blue} className="bottom-[20%]! right-[-4%] h-[40%]" delay={0.25} /></>;
      case 'main': return <><Word>{methodWord(s.fight.result?.method)}</Word><Standing f={s.loser} dim className="right-[22%] h-[52%]" /><Standing f={s.winner} className="right-[-14%] h-[72%]" delay={0.2} /></>;
      case 'upset': return <><Word>Zebra</Word><Standing f={s.winner} className="right-[-14%] h-[72%]" /></>;
      case 'fastest': return <><Word>{methodWord(s.fight.result?.method)}</Word><Standing f={s.winner} className="right-[-14%] h-[66%]" /></>;
      case 'bonus': {
        const f = s.fotn[0], p = s.potn[0];
        return <><Word>Bônus</Word>{p ? <Standing f={p} soft className="right-[-14%] h-[62%]" /> : f && <><Standing f={f.red} soft className="right-[18%] h-[52%]" /><Standing f={f.blue} soft className="right-[-14%] h-[58%]" delay={0.2} /></>}</>;
      }
      default: return null;
    }
  })();
  if (!art) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {art}
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-transparent" />
    </div>
  );
}

function Card({ s, ev }: { s: Story; ev: EventDetail }) {
  const { series, title } = splitEventName(ev.name);
  const how = (fight: { result?: { method: string; round?: number; clock?: string } }) => fight.result && (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-[16px] text-white/80"><MethodTag method={fight.result.method} size="md" />{fight.result.round && <span className="num">R{fight.result.round} · {fight.result.clock}</span>}</div>
  );
  switch (s.kind) {
    case 'cover': return (
      <>
        <Kicker icon={<OctagonMark className="h-5 w-5" stroke="#fff" />}>Resumo da noite</Kicker>
        <Big className="mt-6">{title || series}</Big>
        <p className="mt-3 text-[16px] text-white/75">{series} · {longDate(ev.date)}{ev.city ? ` · ${ev.city}` : ''}</p>
        <div className="mt-auto grid grid-cols-3 gap-3">
          {([['ko', s.ko, 'nocautes'], ['sub', s.sub, 'finalizações'], ['dec', s.dec, 'decisões']] as const).map(([k, v, l]) => (
            <div key={k} className="rounded-xl bg-black/35 p-3 backdrop-blur-sm"><div className="display text-[44px] text-white">{v}</div><div className="text-[13px] text-white/75">{l}</div></div>
          ))}
        </div>
        <p className="mt-3 text-[14px] text-white/70">{s.fights} lutas no card</p>
      </>
    );
    case 'main': return (
      <>
        <Kicker icon={<Trophy weight="fill" className="h-5 w-5" />}>Luta principal</Kicker>
        <Big className="mt-auto max-w-[70%]">{lastName(s.winner.name)} venceu</Big>
        <p className="mt-2 text-[20px] text-white/80">sobre {s.loser.name}</p>
        {how(s.fight)}
      </>
    );
    case 'upset': return (
      <>
        <Kicker icon={<Lightning weight="fill" className="h-5 w-5" />}>Zebra da noite</Kicker>
        <Big className="mt-auto max-w-[70%]">{lastName(s.winner.name)} derrubou a lógica</Big>
        <p className="mt-3 max-w-[65%] text-[18px] text-white/85">Tinha só <b className="text-white">{Math.round(s.chance * 100)}%</b> de chance pelas odds contra {lastName(s.loser.name)}.</p>
        {how(s.fight)}
      </>
    );
    case 'fastest': return (
      <>
        <Kicker icon={<Timer weight="bold" className="h-5 w-5" />}>A mais rápida</Kicker>
        <div className="display mt-8 text-[96px] leading-none text-white">{mmss(s.seconds)}</div>
        <p className="mt-1 text-[16px] text-white/75">de luta, somando os rounds</p>
        <div className="mt-auto flex items-center gap-4"><div><div className="display text-[32px] text-white">{lastName(s.winner.name)}</div><div className="text-[16px] text-white/75">sobre {lastName(s.loser.name)}</div></div></div>
        {how(s.fight)}
      </>
    );
    case 'bonus': return (
      <>
        <Kicker icon={<Star weight="fill" className="h-5 w-5" />}>Bônus do UFC</Kicker>
        {s.fotn.map(f => (
          <div key={f.id} className="mt-8">
            <div className="label text-white/70">Luta da noite</div>
            <div className="mt-2 flex -space-x-4"><Face f={f.red} size={88} /><Face f={f.blue} size={88} /></div>
            <div className="display mt-3 text-[32px] text-white">{lastName(f.red.name)} × {lastName(f.blue.name)}</div>
          </div>
        ))}
        {s.potn.length > 0 && (
          <div className="mt-8">
            <div className="label text-white/70">Performance da noite</div>
            <ul className="mt-3 space-y-2">{s.potn.map(p => <li key={p.espnId} className="flex items-center gap-3"><Avatar src={p.headshot} name={p.name} size={48} ring="#fff" /><span className="display text-[24px] text-white">{p.name}</span></li>)}</ul>
          </div>
        )}
      </>
    );
    case 'you': return (
      <>
        <Kicker icon={<Target weight="bold" className="h-5 w-5" />}>Seus palpites</Kicker>
        <div className="display mt-10 text-[96px] leading-none text-white">{s.points}</div>
        <p className="text-[20px] text-white/80">pontos</p>
        <p className="mt-6 text-[18px] text-white/85"><b className="text-white">{s.hits}</b> de {s.scored} vencedores certos{s.pos ? <> · <b className="text-white">{s.pos}º</b> de {s.of} no ranking</> : ''}.</p>
      </>
    );
    case 'crowd': return (
      <>
        <Kicker icon={<Trophy weight="fill" className="h-5 w-5" />}>Pódio da galera</Kicker>
        <ol className="mt-10 space-y-4">
          {s.top.map((u, i) => (
            <li key={u.name} className="flex items-center gap-4">
              <span className="display w-12 text-[44px] text-white/80">{i + 1}º</span>
              <span className="display min-w-0 flex-1 truncate text-[32px] text-white">{u.name}</span>
              <span className="num display text-[32px] text-white">{u.points}</span>
            </li>
          ))}
        </ol>
      </>
    );
    case 'end': return (
      <>
        <Kicker icon={<OctagonMark className="h-5 w-5" stroke="#fff" />}>OctagonIQ</Kicker>
        <Big className="mt-8">E o próximo card?</Big>
        <p className="mt-3 text-[18px] text-white/80">Palpite em vencedor, método e round, e dispute o ranking com a galera.</p>
        <Link to="/palpites" className="relative z-20 mt-8 inline-flex h-12 w-fit items-center gap-2 rounded-full bg-white px-6 font-display text-[14px] font-bold text-[#14183e]" onClick={e => e.stopPropagation()}>
          <Target weight="bold" className="h-5 w-5" /> Fazer meus palpites
        </Link>
      </>
    );
  }
}

function Player({ stories, ev, onClose }: { stories: Story[]; ev: EventDetail; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = useCallback((d: 1 | -1) => setI(k => { const n = k + d; if (n >= stories.length) { onClose(); return k; } return Math.max(0, n); }), [stories.length, onClose]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', key);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  }, [go, onClose]);

  const s = stories[i];
  const share = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${location.origin}/eventos/${ev.id}?resumo=1`;
    if (navigator.share) { try { await navigator.share({ title: `Resumo do ${ev.name}`, url }); } catch { /* cancelado */ } }
    else { await navigator.clipboard?.writeText(url); }
  };
  return (
    <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-black/85 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      role="dialog" aria-modal="true" aria-label={`Resumo da noite: ${ev.name}`} onClick={onClose}>
      <motion.div className="relative flex h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden sm:h-[min(800px,92dvh)] sm:rounded-xl"
        style={{ background: `linear-gradient(165deg, color-mix(in oklab, ${TONE[s.kind]} 78%, #0d0f22), #0d0f22 92%)`, transition: 'background 0.5s' }}
        initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
        {/* progresso de cada cartão */}
        <div className="flex gap-1 px-3 pt-3">
          {stories.map((_, k) => (
            <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              {/* a própria barra conta o tempo: pausa junto quando o dedo segura e, ao encher, passa para o próximo */}
              <div key={`${k}-${i}`} className="h-full origin-left rounded-full bg-white"
                style={k === i && !reduce
                  ? { animation: `story-progress ${DURATION}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }
                  : { transform: `scaleX(${k < i || (k === i && reduce) ? 1 : 0})` }}
                onAnimationEnd={k === i ? () => go(1) : undefined} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 pt-3 text-[13px] text-white/80">
          <span className="truncate font-semibold">{ev.name}</span>
          <span className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={share} aria-label="Compartilhar o resumo" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15"><ShareNetwork weight="bold" className="h-5 w-5" /></button>
            <button type="button" onClick={onClose} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15"><X weight="bold" className="h-5 w-5" /></button>
          </span>
        </div>
        {/* toque: esquerda volta, direita avança */}
        <button type="button" aria-label="Cartão anterior" className="absolute bottom-0 left-0 top-24 z-10 w-[30%] cursor-w-resize" onClick={() => go(-1)} />
        <button type="button" aria-label="Próximo cartão" className="absolute bottom-24 right-0 top-24 z-10 w-[70%] cursor-e-resize" onClick={() => go(1)} />
        <AnimatePresence mode="wait">
          <motion.div key={i} className="relative flex flex-1 flex-col"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <Backdrop s={s} ev={ev} />
            <div className="relative flex flex-1 flex-col px-7 pb-10 pt-8"><Card s={s} ev={ev} /></div>
          </motion.div>
        </AnimatePresence>
        <div className="pb-4 text-center text-[12px] text-white/55">{i + 1} / {stories.length} · toque para avançar</div>
      </motion.div>
    </motion.div>
  );
}

/** Botão "Resumo da noite" + o player. Só aparece em evento encerrado. */
export function NightStories({ ev, autoOpen }: { ev: EventDetail; autoOpen?: boolean }) {
  const [open, setOpen] = useState(!!autoOpen);
  const auth = useAuth();
  const { saved } = usePicks();
  const { data: bonus } = useBonuses(ev.status === 'post' ? ev.id : undefined);
  const board = useEventBoard(ev.status === 'post' ? ev : undefined);
  const { data: names } = useNames(board.slice(0, 3).map(b => b.userId));
  const stories = useMemo(() => {
    const mine = saved[ev.id]?.picks;
    const sum = mine ? summarize(mine, ev.fights, fotnAwarded(ev, bonus)) : undefined;
    const me = board.find(b => b.userId === auth.user?.id);
    return buildStories(ev, {
      bonus: bonus ?? undefined,
      you: sum ? { points: sum.points, hits: sum.hits, scored: sum.scored, pos: me?.pos, of: me ? board.length : undefined } : undefined,
      crowd: board.length >= 2 ? board.slice(0, 3).map(b => ({ name: names?.get(b.userId) ?? (b.userId === auth.user?.id ? auth.name : 'Palpiteiro'), points: b.points })) : undefined,
    });
  }, [ev, bonus, saved, board, auth.user?.id, auth.name, names]);
  if (ev.status !== 'post' || stories.length < 3) return null;
  return (
    <>
      <motion.button type="button" onClick={() => setOpen(true)} whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
        className="group flex w-full items-center gap-4 rounded-xl bg-band p-4 text-left text-white ring-1 ring-white/10 sm:w-fit sm:pr-6">
        <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full p-[3px]" style={{ background: 'conic-gradient(var(--color-brand), var(--color-gold), var(--color-ko-fill), var(--color-brand))' }}>
          <span className="grid h-full w-full place-items-center rounded-full bg-band"><OctagonMark className="h-6 w-6" stroke="#fff" /></span>
        </span>
        <span>
          <span className="block font-display text-[16px] font-bold">Resumo da noite</span>
          <span className="block text-[13px] text-white/70">{stories.length} cartões: zebra, a mais rápida, bônus{stories.some(s => s.kind === 'you') ? ' e seus pontos' : ''}</span>
        </span>
      </motion.button>
      {createPortal(<AnimatePresence>{open && <Player stories={stories} ev={ev} onClose={() => setOpen(false)} />}</AnimatePresence>, document.body)}
    </>
  );
}
