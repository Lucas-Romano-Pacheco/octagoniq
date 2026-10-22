import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { glossaryFor } from '@/lib/glossary';
import { Link } from 'react-router-dom';
import { animate, motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowClockwise, ArrowDown, ArrowUp, CalendarCheck, CaretDown, CaretUp, CaretUpDown, HandGrabbing, Lightning, Scales, WarningCircle } from '@phosphor-icons/react';
import { circleFlag, rectFlag } from '@/lib/flags';
import type { BookedFight, HistoryFight } from '@shared/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { proxy } from '@/lib/img';

/* ---------- Movimento ---------- */

/** Entrada suave ao rolar (fade + subida). */
export function Reveal({ children, delay = 0, className, y = 18 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

/** Número que conta até o valor quando entra na tela. */
export function CountUp({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  useEffect(() => {
    if (!inView || !ref.current) return;
    if (reduce) { ref.current.textContent = fmt(value); return; }
    const c = animate(0, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: v => { if (ref.current) ref.current.textContent = fmt(v); } });
    return () => c.stop();
  }, [inView, value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className="num">{fmt(reduce ? value : 0)}</span>;
}

/* ---------- Renderização adiada ---------- */

/** Só monta o conteúdo quando o bloco chega perto da tela (`margin` antes). Seções abaixo da dobra deixam de pesar na
    primeira carga: menos JavaScript executado e menos buscas disparadas. O espaço (`minHeight`) fica reservado
    para a página não "pular"; sem IntersectionObserver, monta na hora. */
export function Defer({ children, minHeight = 400, margin = '900px', className }: { children: ReactNode; minHeight?: number; margin?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (on || !ref.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [on, margin]);
  return <div ref={ref} className={className} style={on ? undefined : { minHeight }}>{on ? children : null}</div>;
}

/* ---------- Título da aba ---------- */

/** Título da aba do navegador ("Charles Oliveira | OctagonIQ"); volta ao padrão ao sair da página. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | OctagonIQ` : 'OctagonIQ · O UFC em números';
    return () => { document.title = 'OctagonIQ · O UFC em números'; };
  }, [title]);
}

/* ---------- Transição entre páginas ---------- */

/** No clique de um link para um perfil: a foto daquela linha ganha o nome da transição, e o navegador
    a anima até a foto do topo do perfil (que tem o mesmo nome). Use com `viewTransition` no <Link>. */
export function morphPhoto(e: { currentTarget: Element }) {
  const row = e.currentTarget.closest('li, tr, a, [data-row]') ?? e.currentTarget;
  const img = row.querySelector<HTMLElement>('[data-photo]');
  if (img) img.style.viewTransitionName = 'fighter-photo';
}

/* ---------- Spotlight ---------- */

/** Atualiza a posição do brilho; com `data-duel`, a cor segue o canto (vermelho à esquerda, azul à direita). */
export function trackSpotlight(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget, r = el.getBoundingClientRect(), x = e.clientX - r.left;
  el.style.setProperty('--mx', `${x}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
  if (el.dataset.duel !== undefined) el.style.setProperty('--spot', x < r.width / 2 ? 'var(--color-red)' : 'var(--color-blue)');
}

/** Card com brilho que acompanha o cursor (inspirado no "Spotlight Card" do 21st.dev). */
export function Spotlight({ color, duel, className, style, children, ...rest }: HTMLAttributes<HTMLDivElement> & { color?: string; duel?: boolean }) {
  return (
    <div {...rest} data-duel={duel ? '' : undefined} onPointerMove={trackSpotlight}
      className={clsx('spotlight', className)} style={{ ...style, ...(color ? { '--spot': color } : {}) } as CSSProperties}>
      {children}
    </div>
  );
}

/** Cartel "27-1-0" com cada parte contando ao entrar na tela. */
export function RecordCount({ record }: { record?: { w: number; l: number; d: number; nc?: number } }) {
  if (!record) return <span className="num">—</span>;
  return (
    <span className="num">
      <CountUp value={record.w} />-<CountUp value={record.l} />-<CountUp value={record.d} />
      {record.nc ? <> (<CountUp value={record.nc} /> NC)</> : null}
    </span>
  );
}

/* ---------- Decoração ---------- */

// octógono regular (lados iguais): cantos a 29,3% de cada borda
const OCTAGON_POLY = 'polygon(29.3% 0, 70.7% 0, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0 70.7%, 0 29.3%)';
const OCTAGON_PTS = '29.3,0 70.7,0 100,29.3 100,70.7 70.7,100 29.3,100 0,70.7 0,29.3';

/** Moldura em octógono atrás dos recortes dos atletas: o conteúdo (fundo + bandeira) recortado no octógono
    e um contorno fino por fora, como a grade do octógono. Sempre quadrada, para o octógono não deformar. */
export function OctagonFrame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div aria-hidden className={clsx('pointer-events-none absolute aspect-square', className)}>
      <div className="absolute inset-[4%] overflow-hidden" style={{ clipPath: OCTAGON_POLY }}>{children}</div>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible text-fg/15" preserveAspectRatio="none">
        <polygon points={OCTAGON_PTS} fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/** Bandeira do país como fundo, esmaecida de cima para baixo (rect) ou para um dos lados.
    Substitui a textura de pontos atrás dos atletas. */
const FADES = {
  rect: 'linear-gradient(to bottom, black 20%, transparent 95%)',
  'fade-right': 'linear-gradient(to right, black 35%, transparent 100%)',
  'fade-left': 'linear-gradient(to left, black 35%, transparent 100%)',
};

export function FlagBackdrop({ code, className, shape = 'rect' }: { code?: string; className?: string; shape?: keyof typeof FADES }) {
  const url = rectFlag(code);
  if (!url) return null;
  const mask = FADES[shape];
  return (
    <div aria-hidden className={clsx('pointer-events-none absolute saturate-[0.9]', className)}
      // aspas obrigatórias: o Vite embute SVGs pequenos como data: URI, inválido sem aspas dentro de url()
      style={{ backgroundImage: `url(${JSON.stringify(url)})`, backgroundSize: 'cover', backgroundPosition: 'center', maskImage: mask, WebkitMaskImage: mask, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' }} />
  );
}

/** Traço de pincel para sublinhar uma palavra do título. */
export function Brush({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 18" preserveAspectRatio="none" className={className} aria-hidden>
      <path d="M3 13C60 6 140 3 297 6c-70 2-150 5-200 10 50-2 120-3 160-2" fill="none" stroke="var(--color-brand)" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

/** Octógono vazado (elemento gráfico recorrente da marca). */
export function OctagonMark({ className, stroke = 'var(--color-brand)' }: { className?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M11.5 4h9l7.5 7.5v9L20.5 28h-9L4 20.5v-9z" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Superfícies ---------- */

/** Card (padrão) ou seção editorial sem card (`plain`): régua no topo e conteúdo direto no fundo. */
export function Panel({ title, action, children, className, bodyClass, eyebrow, plain }: {
  title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string; eyebrow?: ReactNode; plain?: boolean;
}) {
  return (
    <section className={clsx(plain ? 'rule' : 'panel', className)}>
      {(title || action) && (
        <header className={plain ? 'rule-header' : 'panel-header'}>
          <div className="min-w-0">
            {typeof title === 'string' ? <h2 className="panel-title">{title}</h2> : title}
            {/* fonte ou contexto do painel: abaixo do título, em texto comum (rótulo em caixa alta acima do título é sinal de template) */}
            {eyebrow && <div className="mt-0.5 text-[13px] text-fg-3">{eyebrow}</div>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, children, meta }: { title: ReactNode; children?: ReactNode; meta?: ReactNode }) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-6 pb-8 pt-2">
      <div className="min-w-0 max-w-3xl">
        <h1 className="display text-[44px] text-fg sm:text-[64px]">{title}</h1>
        {meta && <div className="mt-3 max-w-2xl text-[16px] leading-relaxed text-fg-2">{meta}</div>}
      </div>
      {children}
    </Reveal>
  );
}

export function SectionTitle({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="display text-[32px] text-fg sm:text-[44px]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ---------- Identidade do lutador ---------- */

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

/** Foto da ESPN (PNG recortado) com fallback para iniciais. */
/** Foto redonda; `flag` põe a bandeira no canto, `ring` contorna na cor do canto (vermelho/azul). */
export function Avatar({ src, name, size = 40, className, flag, ring }: { src?: string; name: string; size?: number; className?: string; flag?: string; ring?: string }) {
  const [failed, setFailed] = useState(false);
  const photo = (
    <div data-photo className={clsx('relative shrink-0 overflow-hidden rounded-full bg-surface-2', ring ? 'ring-2 ring-offset-2 ring-offset-surface' : 'ring-1 ring-fg/[0.06]', !flag && className)}
      style={{ width: size, height: size, ...(ring ? { '--tw-ring-color': ring } : {}) } as CSSProperties}>
      {src && !failed ? (
        <img src={proxy(src, Math.min(size * 5, 720))} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)}
          className="absolute left-1/2 top-[6%] h-[135%] w-auto max-w-none -translate-x-1/2 object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center font-semibold text-fg-3" style={{ fontSize: Math.max(11, size * 0.32) }}>{initials(name)}</span>
      )}
    </div>
  );
  if (!flag || !circleFlag(flag)) return flag ? <div className={clsx('shrink-0', className)}>{photo}</div> : photo;
  const fs = Math.max(14, Math.round(size * 0.36));
  return (
    <div className={clsx('relative shrink-0', className)} style={{ width: size, height: size }}>
      {photo}
      <img src={circleFlag(flag)} alt="" className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-surface" style={{ width: fs, height: fs }} />
    </div>
  );
}

/** Bandeira circular em SVG (circle-flags); cai para o PNG da ESPN se o código não existir. */
export function Flag({ code, src, title, size = 18, className }: { code?: string; src?: string; title?: string; size?: number; className?: string }) {
  const svg = circleFlag(code);
  const img = svg
    ? <img src={svg} alt={title ?? ''} width={size} height={size} loading="lazy" className={clsx('inline-block shrink-0 rounded-full ring-1 ring-fg/10', className)} style={{ width: size, height: size }} />
    : src ? <img src={src} alt={title ?? ''} loading="lazy" className={clsx('inline-block shrink-0 rounded-[3px] object-cover ring-1 ring-fg/15', className)} style={{ width: size * 1.4, height: size * 0.95 }} /> : null;
  return img && title ? <Tip content={title}>{img}</Tip> : img;
}

/** Nacionalidade + cartel alinhados à direita de uma linha (rankings, listas). */
export function NationRecord({ code, country, record, className }: { code?: string; country?: string; record?: string; className?: string }) {
  if (!code && !record) return <span className={clsx('h-5 w-24', className)} />;
  return (
    <span className={clsx('flex shrink-0 items-center justify-end gap-2.5', className)}>
      {country && <span className="hidden text-[14px] text-fg-3 xl:inline">{country}</span>}
      <Flag code={code} title={country} size={20} />
      {record && <span className="num w-[62px] text-right text-[13px] font-semibold text-fg-2">{record}</span>}
    </span>
  );
}

/* ---------- Tooltip ---------- */

/** Tooltip do site (substitui o `title` nativo): cartão escuro com título opcional e texto. */
/** Termo do glossário (modo iniciante): sublinhado pontilhado e a explicação ao passar o mouse ou focar. Rótulo que não
    está no glossário volta como texto comum. */
export function Term({ label, children }: { label: string; children?: ReactNode }) {
  const g = glossaryFor(label);
  if (!g) return <>{children ?? label}</>;
  return (
    <Tip title={g.term} content={g.text}>
      <span tabIndex={0} className="cursor-help underline decoration-fg-3/50 decoration-dotted underline-offset-[3px] outline-none hover:decoration-fg-2 focus-visible:decoration-fg-2">{children ?? label}</span>
    </Tip>
  );
}

export function Tip({ content, title, children, side = 'top' }: { content: ReactNode; title?: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={6} className="max-w-72 rounded-xl px-3 py-2 text-left text-[13px] leading-snug shadow-[var(--shadow-lift)]">
        <div>
          {title && <div className="mb-0.5 text-[13px] font-semibold">{title}</div>}
          <div className={title ? 'opacity-80' : undefined}>{content}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

const MaybeTip = ({ content, children }: { content?: ReactNode; children: ReactNode }) => (content ? <Tip content={content}>{children}</Tip> : <>{children}</>);

/** Etiqueta "luta marcada": data curta; o tooltip mostra adversário e evento, e o clique abre a luta. */
export function BookedTag({ b, className }: { b?: BookedFight; className?: string }) {
  if (!b) return null;
  const d = new Date(b.date);
  const day = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').replace(' de ', ' ');
  return (
    <Tip title={b.title ? 'Disputa de cinturão marcada' : 'Luta marcada'} content={<>vs {b.opponent}<br />{b.eventName} · {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</>}>
      <Link to={`/eventos/${b.eventId}/lutas/${b.fightId}`} onClick={e => e.stopPropagation()}
        className={clsx('inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[12px] font-semibold transition-colors',
          b.title ? 'bg-gold-soft text-gold-ink hover:bg-gold/30' : 'bg-blue/10 text-blue-ink hover:bg-blue/20', className)}>
        <CalendarCheck weight="bold" className="h-3.5 w-3.5" />{day}
      </Link>
    </Tip>
  );
}

/* ---------- Tabelas ordenáveis ---------- */

export type SortDir = 'asc' | 'desc';

/** Ordena linhas por uma coluna; clicar de novo inverte. Valores ausentes vão para o fim. */
export function useSort<T, K extends string>(rows: T[], get: Record<K, (r: T) => number | string | undefined>, initial: NoInfer<K>, dir: SortDir = 'desc') {
  const [sort, setSort] = useState<{ key: K; dir: SortDir }>({ key: initial, dir });
  const sorted = [...rows].sort((a, b) => {
    const x = get[sort.key](a), y = get[sort.key](b);
    if (x === undefined || x === '') return 1;
    if (y === undefined || y === '') return -1;
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR');
    return sort.dir === 'asc' ? c : -c;
  });
  const toggle = (key: K, first: SortDir = 'desc') => setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: first }));
  return { sorted, sort, toggle };
}

/** Cabeçalho clicável com seta de direção. */
export function SortTh<K extends string>({ k, sort, toggle, children, className, first }: {
  k: K; sort: { key: K; dir: SortDir }; toggle: (k: K, first?: SortDir) => void; children: ReactNode; className?: string; first?: SortDir;
}) {
  const on = sort.key === k;
  const Icon = !on ? CaretUpDown : sort.dir === 'asc' ? CaretUp : CaretDown;
  return (
    <th className={className} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => toggle(k, first)} className={clsx('inline-flex items-center gap-1 uppercase transition-colors hover:text-fg', on && 'text-fg')}>
        {children}<Icon weight="bold" className={clsx('h-3 w-3', !on && 'opacity-40')} />
      </button>
    </th>
  );
}

/* ---------- Selos ---------- */

/* Selo de resultado em forma de octógono (o mesmo símbolo da marca), com a letra na serifada dos títulos. */
const OUTCOME = {
  W: { glyph: 'M10 16.9 14.3 21.2 22.4 11', color: 'var(--color-win)', fill: 'var(--color-win-soft)', title: 'Vitória' },
  L: { glyph: 'M11.5 11.5 20.5 20.5M20.5 11.5 11.5 20.5', color: 'var(--color-loss)', fill: 'var(--color-loss-soft)', title: 'Derrota' },
  D: { glyph: 'M10.5 13.4H21.5M10.5 18.6H21.5', color: 'var(--color-draw)', fill: 'var(--color-draw-soft)', title: 'Empate' },
  NC: { glyph: 'M10.5 16H21.5', color: 'var(--color-fg-2)', fill: 'var(--color-surface-3)', title: 'Sem resultado' },
  pending: { glyph: 'M10.5 16H21.5', color: 'var(--color-fg-3)', fill: 'var(--color-surface-2)', title: 'Agendada' },
} as const;
const OCTAGON = 'M10.6 1.5h10.8l9.1 9.1v10.8l-9.1 9.1H10.6l-9.1-9.1V10.6z';

export function OutcomeBadge({ outcome, className, size = 'md', tip, card, href }: { outcome: keyof typeof OUTCOME; className?: string; size?: 'sm' | 'md'; tip?: ReactNode; card?: boolean; href?: string }) {
  const o = OUTCOME[outcome];
  const px = size === 'sm' ? 24 : 30;
  // com href, o selo é um link para a página da luta (um clique para ver como foi)
  const Tag_ = href ? Link : 'span';
  const badge = (
    <Tag_ to={href!} role={href ? undefined : 'img'} aria-label={href ? `${o.title}: ver a luta` : o.title} tabIndex={tip || href ? 0 : undefined}
      className={clsx('relative inline-grid shrink-0 place-items-center transition-transform duration-200', (tip || href) && 'hover:-rotate-6 hover:scale-110', href ? 'cursor-pointer' : tip && 'cursor-help', className)}
      style={{ width: px, height: px, color: o.color }}>
      <svg viewBox="0 0 32 32" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={OCTAGON} fill={o.fill} stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" strokeLinejoin="round" />
        {/* glifo desenhado na mesma grade do octógono (o ✓ do Phosphor é assimétrico e parecia torto): centrado em 16,16 */}
        <path d={o.glyph} fill="none" stroke="currentColor" strokeWidth="2.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Tag_>
  );
  if (!tip) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      {card
        // cartão da luta: mesmo visual do carrossel "Últimas 5" do perfil (fundo de superfície, não o tooltip escuro)
        ? <TooltipContent sideOffset={8} className="cut block w-[280px] max-w-none rounded-xl bg-surface p-3 text-left text-fg shadow-[var(--shadow-pop)] ring-1 ring-fg/10" arrowClassName="bg-surface fill-surface">{tip}</TooltipContent>
        : <TooltipContent className="max-w-64 rounded-xl px-3 py-2 text-left">{tip}</TooltipContent>}
    </Tooltip>
  );
}

type Face = { name: string; headshot?: string };
const RESULT = { W: 'Vitória', L: 'Derrota', D: 'Empate', NC: 'Sem resultado', pending: 'Agendada' } as const;
const lastOf = (n: string) => n.split(' ').slice(-1)[0];

/** Cartão de uma luta (fotos dos dois, faixa "Vitória" sob o vencedor, data, round, tempo e método).
    `outcome` é do ponto de vista de `me`. */
export function FightCard({ me, opp, outcome, method, detail, round, clock, date, eventName, clickHint }: {
  clickHint?: boolean; me: Face; opp: Face; outcome: keyof typeof RESULT; method?: string; detail?: string; round?: number; clock?: string; date?: string; eventName?: string;
}) {
  const Photo = ({ f, won }: { f: Face; won: boolean }) => (
    <div className="relative flex h-full flex-1 items-end justify-center">
      {f.headshot ? <img src={proxy(f.headshot, 320)} alt={f.name} loading="lazy" decoding="async" className="h-full w-auto object-contain object-bottom" /> : <Avatar name={f.name} size={64} className="mb-3" />}
      {won && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap bg-brand px-2 py-0.5 font-display text-[12px] font-bold uppercase tracking-wide text-white">Vitória</span>}
    </div>
  );
  const d = date ? new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : undefined;
  return (
    <div>
      <div className="flex h-[100px] gap-1 overflow-hidden rounded-xl bg-cream">
        <Photo f={me} won={outcome === 'W'} />
        <Photo f={opp} won={outcome === 'L'} />
      </div>
      <div className="mt-2.5 text-center font-display text-[16px] font-bold uppercase leading-tight tracking-[0.02em] text-fg">{lastOf(me.name)} vs {lastOf(opp.name)}</div>
      <div className="num text-center text-[13px] text-fg-3">{[d, RESULT[outcome]].filter(Boolean).join(' · ')}</div>
      {method && (
        <dl className="mt-2 grid grid-cols-[1fr_1fr_2fr] gap-x-2 border-t border-line pt-2 text-center">
          {([['Round', round ?? '—'], ['Tempo', clock ?? '—'], ['Método', method]] as const).map(([k, v]) => (
            <div key={k} className="min-w-0"><dt className="text-[12px] text-fg-3">{k}</dt><dd className="num text-[13px] font-bold text-fg">{k === 'Método' ? <MethodTag method={method} className="mt-0.5 max-w-full" /> : v}</dd></div>
          ))}
        </dl>
      )}
      {(detail || eventName) && <div className="mt-1.5 truncate text-center text-[12px] text-fg-3">{[detail, eventName].filter(Boolean).join(' · ')}</div>}
      {clickHint && <div className="mt-2 text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-brand">Clique para ver a luta</div>}
    </div>
  );
}

const VERB = { W: 'Vitória sobre', L: 'Derrota para', D: 'Empate com', NC: 'Sem resultado contra', pending: 'Luta marcada contra' } as const;

/** Selo de uma luta do histórico. Com `me` (o dono do histórico), o tooltip é o cartão com as fotos dos dois;
    sem ele, uma descrição em texto. */
export function HistoryBadge({ h, size = 'md', me }: { h: HistoryFight; size?: 'sm' | 'md'; me?: Face }) {
  if (me) return (
    <OutcomeBadge outcome={h.outcome} size={size} card href={h.outcome !== 'pending' ? `/eventos/${h.eventId}/lutas/${h.fightId}` : undefined} tip={
      <FightCard me={me} opp={h.opponent} outcome={h.outcome} method={h.method} detail={h.detail} round={h.round} clock={h.clock} date={h.date} eventName={h.eventName} clickHint={h.outcome !== 'pending'} />
    } />
  );
  const how = [h.method, h.detail].filter(Boolean).join(' · ');
  const when = [h.round ? `R${h.round} ${h.clock ?? ''}`.trim() : '', new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ')].filter(Boolean).join(' · ');
  return (
    <OutcomeBadge outcome={h.outcome} size={size} href={h.outcome !== 'pending' ? `/eventos/${h.eventId}/lutas/${h.fightId}` : undefined} tip={
      <div className="space-y-0.5">
        <div className="text-[13px] font-semibold">{VERB[h.outcome]} {h.opponent.name}</div>
        {how && <div className="text-[13px] opacity-80">{how}</div>}
        <div className="text-[13px] opacity-60">{when}</div>
        <div className="text-[13px] opacity-60">{h.eventName}</div>
      </div>
    } />
  );
}

/* ---------- Selos de posição ---------- */

/** Cinturão em SVG (placa octogonal sobre a faixa), desenhado na grade de 24×16 para ficar nítido em tamanho pequeno. */
export function BeltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden shapeRendering="geometricPrecision">
      {/* faixa com dois rebites, placa octogonal sólida e uma pedra pequena no centro */}
      <rect x="0" y="4" width="24" height="8" rx="2" fill="currentColor" opacity="0.5" />
      <circle cx="3" cy="8" r="1" fill="currentColor" />
      <circle cx="21" cy="8" r="1" fill="currentColor" />
      <path d="M9.1 0.5h5.8L19 4.6v6.8L14.9 15.5H9.1L5 11.4V4.6z" fill="currentColor" />
      <path d="M11 6h2l1 1v2l-1 1h-2l-1-1V7z" fill="var(--color-gold)" />
    </svg>
  );
}

/** Selo de posição: "CAMPEÃO" com cinturão (dourado sólido) ou "Nº 3" numa placa escura; a divisão vem ao lado. */
export function RankBadge({ rankLabel, division, women, className }: { rankLabel?: string; division?: string; women?: boolean; className?: string }) {
  if (!rankLabel) return division ? <Tag className={className}>{division}</Tag> : null;
  const champ = rankLabel === 'Campeão';
  return (
    <span className={clsx('inline-flex h-7 max-w-full items-stretch overflow-hidden rounded-md text-[13px] font-semibold ring-1', champ ? 'ring-gold' : 'ring-fg/15', className)}>
      {champ ? (
        <span className="flex items-center gap-1.5 bg-gold px-2 font-display text-[16px] font-bold uppercase tracking-[0.02em] text-[#14183e]">
          <BeltIcon className="h-3.5 w-5 text-[#14183e]" />{women ? 'Campeã' : 'Campeão'}
        </span>
      ) : (
        <span className="flex items-baseline gap-0.5 bg-fg px-2 pt-[3px] font-display text-bg">
          <span className="text-[12px] font-semibold">Nº</span><span className="text-[18px] font-bold leading-none">{rankLabel.replace('#', '')}</span>
        </span>
      )}
      {division && <span className="rb-div min-w-0 truncate bg-surface px-2 leading-7 text-fg-2">{division}</span>}
    </span>
  );
}

/** Método da vitória: cor e ícone próprios, os mesmos em todo o site (palpites, resultados, histórico). */
export const METHOD_META = {
  ko: { label: 'KO/TKO', Icon: Lightning, color: 'var(--color-ko-fill)' },
  sub: { label: 'Finalização', Icon: HandGrabbing, color: 'var(--color-sub-fill)' },
  dec: { label: 'Decisão', Icon: Scales, color: 'var(--color-dec-fill)' },
} as const;
export const methodOf = (m?: string): keyof typeof METHOD_META | undefined =>
  /KO/i.test(m ?? '') ? 'ko' : /Finaliza/i.test(m ?? '') ? 'sub' : /Decis/i.test(m ?? '') ? 'dec' : undefined;

/** Etiqueta do método ("KO/TKO", "Decisão dividida"…) na cor dele; métodos raros (DQ, sem resultado) ficam neutros. */
export function MethodTag({ method, size = 'sm', className }: { method?: string; size?: 'sm' | 'md'; className?: string }) {
  if (!method) return null;
  const k = methodOf(method);
  const meta = k && METHOD_META[k];
  return (
    <span title={glossaryFor(method)?.text} className={clsx('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md font-display font-bold uppercase tracking-[0.04em]',
      size === 'md' ? 'h-7 px-2.5 text-[13px]' : 'h-6 px-2 text-[12px]', meta ? 'text-white' : 'bg-surface-2 text-fg-2', className)}
      style={meta ? { background: meta.color } : undefined}>
      {meta && <meta.Icon weight="fill" className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />}{method}
    </span>
  );
}

export function Tag({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'gold' | 'orange' | 'brand' | 'blue' | 'dark'; className?: string }) {
  const tones = {
    neutral: 'bg-surface-2 text-fg-2',
    gold: 'bg-gold-soft text-gold-ink',   // só cinturão e títulos
    orange: 'bg-orange/15 text-orange-ink', // zebras
    brand: 'bg-brand-soft text-brand',
    blue: 'bg-blue/10 text-blue-ink',
    dark: 'bg-fg text-bg',
  };
  return <span className={clsx('inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 font-display text-[13px] font-semibold uppercase tracking-[0.04em]', tones[tone], className)}>{children}</span>;
}

export function LiveTag() {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-brand px-2.5 text-[13px] font-bold uppercase tracking-wider text-white">
      <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" /> Ao vivo
    </span>
  );
}

/* ---------- Números ---------- */

export function Stat({ label, value, sub, className, footer }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string; footer?: ReactNode }) {
  return (
    <div className={clsx('min-w-0', className)}>
      <div className="label truncate">{typeof label === 'string' ? <Term label={label} /> : label}</div>
      <div className="display mt-2 text-[32px] text-fg">{value}</div>
      {sub && <div className="mt-1 text-[14px] text-fg-3">{sub}</div>}
      {footer && <div className="mt-1.5">{footer}</div>}
    </div>
  );
}

/** Barra de percentual. `avg` desenha uma marca vertical com a média de referência (ex.: ranqueados da divisão). */
export function Meter({ label, value, display, color = 'var(--color-blue)', hint, avg: mark, detail, footer }: {
  label: string; value?: number; display: ReactNode; color?: string; hint?: ReactNode; avg?: { value: number; label: string };
  /** texto sob a barra (ex.: "13 quedas em 88 tentativas") */ detail?: ReactNode;
  /** destaque sob o texto (ex.: posição na divisão) */ footer?: ReactNode;
}) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <MaybeTip content={hint}><div>
      <div className="mb-2 flex items-baseline justify-between gap-2 text-[14px]">
        <span className="text-fg-2">{hint ? label : <Term label={label} />}</span>
        <span className="num font-semibold text-fg">{display}{mark && <span className="ml-2 text-[13px] font-medium text-fg-3">média {Math.round(mark.value)}%</span>}</span>
      </div>
      <div className="relative h-2 rounded-full bg-surface-2">
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
        {mark && <span aria-hidden className="absolute -top-1 h-4 w-[3px] -translate-x-1/2 rounded-full bg-fg ring-2 ring-bg" style={{ left: `${Math.min(100, mark.value)}%` }} />}
      </div>
      {detail && <div className="num mt-1.5 text-[13px] text-fg-3">{detail}</div>}
      {footer && <div className="mt-1.5">{footer}</div>}
    </div></MaybeTip>
  );
}

/** Comparação de um número com a média de referência: seta + "x% acima/abaixo da média (valor)". */
export function VsAvg({ value, avg, lowerIsBetter, fmt }: { value?: number; avg?: number; lowerIsBetter?: boolean; fmt: (v: number) => string }) {
  if (value === undefined || avg === undefined || avg === 0) return null;
  const diff = (value - avg) / avg;
  if (Math.abs(diff) < 0.15) return <span className="block text-[13px] text-fg-3">perto da média ({fmt(avg)})</span>;
  const above = diff > 0, good = above !== !!lowerIsBetter;
  const Icon = above ? ArrowUp : ArrowDown;
  return (
    <span className="block leading-snug">
      <span className={clsx('inline-flex items-center gap-0.5 whitespace-nowrap font-semibold', good ? 'text-win' : 'text-loss')}>
        <Icon weight="bold" className="h-3 w-3" />{Math.round(Math.abs(diff) * 100)}% {above ? 'acima' : 'abaixo'}
      </span>
      <span className="block whitespace-nowrap text-[13px] text-fg-3">média {fmt(avg)}</span>
    </span>
  );
}

/* ---------- Estados ---------- */

export const Skeleton = ({ className }: { className?: string }) => <div className={clsx('skeleton', className)} />;

export function ErrorState({ message, onRetry, className, title = 'Nocaute técnico na fonte de dados' }: { message?: string; onRetry?: () => void; className?: string; title?: string }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft"><WarningCircle className="h-6 w-6 text-brand" /></span>
      <div>
        <p className="font-display text-[20px] font-bold text-fg">{title}</p>
        <p className="mt-1 text-[13px] text-fg-3">{message ?? 'O UFC.com ou a ESPN não responderam agora. Tente de novo em instantes.'}</p>
      </div>
      {onRetry && <button className="btn" onClick={onRetry}><ArrowClockwise className="h-4 w-4" /> Tentar de novo</button>}
    </div>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => (
  <div className="px-6 py-12 text-center text-[14px] text-fg-3">{children}</div>
);

/* ---------- Controles ---------- */

export function Segmented<T extends string>({ value, onChange, options, className }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string;
}) {
  return (
    <div role="tablist" className={clsx('relative inline-flex rounded-full bg-surface p-1 shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.05]', className)}>
      {options.map(o => (
        <button key={o.value} role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}
          className={clsx('relative h-8 whitespace-nowrap rounded-full px-3 text-[14px] font-semibold transition-colors sm:px-4', o.value === value ? 'text-bg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg')}>
          {o.value === value && <motion.span layoutId={`seg-${options.map(x => x.value).join()}`} className="absolute inset-0 rounded-full bg-fg" transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
