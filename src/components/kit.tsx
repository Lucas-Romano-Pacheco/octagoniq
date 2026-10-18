import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { animate, motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowClockwise, CaretDown, CaretUp, CaretUpDown, Check, Equals, Minus, WarningCircle, X } from '@phosphor-icons/react';
import { circleFlag, rectFlag } from '@/lib/flags';
import type { HistoryFight } from '@shared/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

const BLOB_PATH = 'M421 28c84 33 162 112 171 205 9 94-50 202-138 263-88 60-205 74-298 39C63 500-5 420 1 327 7 233 87 128 172 70 257 12 337-5 421 28Z';
const BLOB_MASK = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 560' preserveAspectRatio='none'><path d='${BLOB_PATH}'/></svg>`)}")`;

/** Forma orgânica atrás dos recortes dos atletas (como o "blob" do layout de referência). */
export function Blob({ className, color = 'var(--color-cream)' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 600 560" className={className} aria-hidden>
      <path fill={color} d={BLOB_PATH} />
    </svg>
  );
}

/** Recorta o conteúdo na forma orgânica (para compor bandeiras dentro do blob). */
export function BlobClip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div aria-hidden className={clsx('pointer-events-none absolute overflow-hidden', className)}
      style={{ maskImage: BLOB_MASK, WebkitMaskImage: BLOB_MASK, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' }}>
      {children}
    </div>
  );
}

/** Bandeira do país como fundo: recortada na forma orgânica (blob) ou esmaecida de cima para baixo (rect).
    Substitui a textura de pontos atrás dos atletas. */
const FADES = {
  blob: BLOB_MASK,
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
            {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
            {typeof title === 'string' ? <h2 className="panel-title">{title}</h2> : title}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function PageHeader({ eyebrow, title, children, meta }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode; meta?: ReactNode }) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-6 pb-8 pt-2">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
        <h1 className="display text-[44px] text-fg sm:text-[60px]">{title}</h1>
        {meta && <div className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-2">{meta}</div>}
      </div>
      {children}
    </Reveal>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h2 className="display text-[32px] text-fg sm:text-[40px]">{title}</h2>
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
    <div className={clsx('relative shrink-0 overflow-hidden rounded-full bg-surface-2', ring ? 'ring-2 ring-offset-2 ring-offset-surface' : 'ring-1 ring-fg/[0.06]', !flag && className)}
      style={{ width: size, height: size, ...(ring ? { '--tw-ring-color': ring } : {}) } as CSSProperties}>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)}
          className="absolute left-1/2 top-[6%] h-[135%] w-auto max-w-none -translate-x-1/2 object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center font-semibold text-fg-3" style={{ fontSize: size * 0.32 }}>{initials(name)}</span>
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
      {record && <span className="num w-[62px] text-right text-[13.5px] font-semibold text-fg-2">{record}</span>}
    </span>
  );
}

/* ---------- Tooltip ---------- */

/** Tooltip do site (substitui o `title` nativo): cartão escuro com título opcional e texto. */
export function Tip({ content, title, children, side = 'top' }: { content: ReactNode; title?: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={6} className="max-w-72 rounded-xl px-3 py-2 text-left text-[13px] leading-snug shadow-[var(--shadow-lift)]">
        <div>
          {title && <div className="mb-0.5 text-[13.5px] font-semibold">{title}</div>}
          <div className={title ? 'opacity-80' : undefined}>{content}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

const MaybeTip = ({ content, children }: { content?: ReactNode; children: ReactNode }) => (content ? <Tip content={content}>{children}</Tip> : <>{children}</>);

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
  W: { Icon: Check, color: 'var(--color-win)', fill: 'var(--color-win-soft)', title: 'Vitória' },
  L: { Icon: X, color: 'var(--color-loss)', fill: 'var(--color-loss-soft)', title: 'Derrota' },
  D: { Icon: Equals, color: 'var(--color-draw)', fill: 'var(--color-draw-soft)', title: 'Empate' },
  NC: { Icon: Minus, color: 'var(--color-fg-2)', fill: 'var(--color-surface-3)', title: 'Sem resultado' },
  pending: { Icon: Minus, color: 'var(--color-fg-3)', fill: 'var(--color-surface-2)', title: 'Agendada' },
} as const;
const OCTAGON = 'M10.6 1.5h10.8l9.1 9.1v10.8l-9.1 9.1H10.6l-9.1-9.1V10.6z';

export function OutcomeBadge({ outcome, className, size = 'md', tip }: { outcome: keyof typeof OUTCOME; className?: string; size?: 'sm' | 'md'; tip?: ReactNode }) {
  const o = OUTCOME[outcome];
  const px = size === 'sm' ? 24 : 30;
  const badge = (
    <span role="img" aria-label={o.title} tabIndex={tip ? 0 : undefined}
      className={clsx('relative inline-grid shrink-0 place-items-center transition-transform duration-200', tip && 'cursor-help hover:-rotate-6 hover:scale-110', className)}
      style={{ width: px, height: px, color: o.color }}>
      <svg viewBox="0 0 32 32" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={OCTAGON} fill={o.fill} stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" strokeLinejoin="round" />
      </svg>
      {/* ícone em vez de letra: fica centrado em qualquer fonte */}
      <o.Icon weight="bold" className="relative" style={{ width: px * 0.5, height: px * 0.5 }} />
    </span>
  );
  if (!tip) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent className="max-w-64 rounded-xl px-3 py-2 text-left">{tip}</TooltipContent>
    </Tooltip>
  );
}

const VERB = { W: 'Vitória sobre', L: 'Derrota para', D: 'Empate com', NC: 'Sem resultado contra', pending: 'Luta marcada contra' } as const;

/** Selo de uma luta do histórico: o tooltip mostra o adversário, o método e o evento. */
export function HistoryBadge({ h, size = 'md' }: { h: HistoryFight; size?: 'sm' | 'md' }) {
  const how = [h.method, h.detail].filter(Boolean).join(' · ');
  const when = [h.round ? `R${h.round} ${h.clock ?? ''}`.trim() : '', new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ')].filter(Boolean).join(' · ');
  return (
    <OutcomeBadge outcome={h.outcome} size={size} tip={
      <div className="space-y-0.5">
        <div className="text-[13.5px] font-semibold">{VERB[h.outcome]} {h.opponent.name}</div>
        {how && <div className="text-[13px] opacity-80">{how}</div>}
        <div className="text-[13px] opacity-60">{when}</div>
        <div className="text-[13px] opacity-60">{h.eventName}</div>
      </div>
    } />
  );
}

export function Tag({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'gold' | 'brand' | 'blue' | 'dark'; className?: string }) {
  const tones = {
    neutral: 'bg-surface-2 text-fg-2',
    gold: 'bg-gold-soft text-gold-ink',
    brand: 'bg-brand-soft text-brand',
    blue: 'bg-blue/10 text-blue',
    dark: 'bg-fg text-bg',
  };
  return <span className={clsx('inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold', tones[tone], className)}>{children}</span>;
}

export function LiveTag() {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-brand px-2.5 text-[12.5px] font-bold uppercase tracking-wider text-white">
      <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" /> Ao vivo
    </span>
  );
}

/* ---------- Números ---------- */

export function Stat({ label, value, sub, className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={clsx('min-w-0', className)}>
      <div className="label truncate">{label}</div>
      <div className="display mt-2 text-[34px] text-fg">{value}</div>
      {sub && <div className="mt-1 text-[14px] text-fg-3">{sub}</div>}
    </div>
  );
}

export function Meter({ label, value, display, color = 'var(--color-blue)', hint }: { label: string; value?: number; display: ReactNode; color?: string; hint?: string }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <MaybeTip content={hint}><div>
      <div className="mb-2 flex items-baseline justify-between gap-2 text-[14px]">
        <span className="text-fg-2">{label}</span>
        <span className="num font-semibold text-fg">{display}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-2">
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </div>
    </div></MaybeTip>
  );
}

/* ---------- Estados ---------- */

export const Skeleton = ({ className }: { className?: string }) => <div className={clsx('skeleton', className)} />;

export function ErrorState({ message, onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft"><WarningCircle className="h-6 w-6 text-brand" /></span>
      <div>
        <p className="font-display text-[19px] font-semibold text-fg">Não foi possível carregar os dados</p>
        <p className="mt-1 text-[13.5px] text-fg-3">{message ?? 'A fonte pode estar indisponível no momento.'}</p>
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
          className={clsx('relative h-8 rounded-full px-4 text-[14px] font-semibold transition-colors', o.value === value ? 'text-bg' : 'text-fg-2 hover:text-fg')}>
          {o.value === value && <motion.span layoutId={`seg-${options.map(x => x.value).join()}`} className="absolute inset-0 rounded-full bg-fg" transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
