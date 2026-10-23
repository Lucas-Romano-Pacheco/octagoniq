import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowsLeftRight, Crown, MagnifyingGlass, MapPin, Moon, Sun } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchFromHref, useUpcoming, type UpcomingEvent } from '@/lib/api';
import { countdown, dayMonth, splitEventName, time, weekday } from '@/lib/format';
import { LiveTag, OctagonMark } from './kit';
import { TopProgress } from './TopProgress';
import { AccountButton, CloudSync } from './PicksAccount';
import { supabaseEnabled } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/* ---------- Marca ---------- */

/** Hora real da última consulta da agenda (em vez de prometer "tempo real"). */
function FreshnessNote() {
  const { dataUpdatedAt } = useUpcoming(10);
  if (!dataUpdatedAt) return null;
  const min = Math.max(0, Math.round((Date.now() - dataUpdatedAt) / 60_000));
  return <p className="mt-2 text-[13px] text-white/65">Última atualização {min < 1 ? 'há menos de 1 min' : `há ${min} min`} ({new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})</p>;
}

/* Indicador do menu em forma de gota (inspirado no "Crest" do codeandchill): uma crista de líquido na borda de
   baixo marca a seção atual. Ao trocar, ela escorre até o novo item (mola, esticada enquanto viaja) e, ao chegar,
   uma gotinha sobe até o texto, que ganha a cor cheia. Ao abrir o site ela já aparece no lugar, sem viagem.
   Com "reduzir movimento", troca de lugar sem deslizar e sem a gota. */
function NavCrest() {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const [x, setX] = useState<number | null>(null);
  // o menu é achado pelo próprio elemento da gota: o ref do <nav> pai ainda não existe na primeira medição
  const anchor = useRef<HTMLSpanElement>(null);
  // só anima depois da primeira troca de seção: ao abrir o site a crista já está no lugar, parada
  const moved = useRef(false);
  const first = useRef(pathname);
  if (pathname !== first.current) moved.current = true;
  const still = reduce || !moved.current;
  // biome-ignore lint/correctness/useExhaustiveDependencies: mede de novo a cada troca de seção (pathname)
  useLayoutEffect(() => {
    const nav = anchor.current?.parentElement;
    const measure = () => {
      const a = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
      setX(a ? a.offsetLeft + a.offsetWidth / 2 : null);
    };
    measure();
    // no celular o menu rola de lado: traz o item ativo para o meio, senão "Palpites" fica cortado na borda
    const a = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (nav && a && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2, behavior: still ? 'auto' : 'smooth' });
    const ro = new ResizeObserver(measure);
    if (nav) ro.observe(nav);
    document.fonts?.ready.then(measure); // a largura dos itens muda quando a fonte do menu chega
    return () => ro.disconnect();
  }, [pathname, still]);
  const ease = [0.22, 1, 0.36, 1] as const;
  return (
    <span ref={anchor} aria-hidden className="pointer-events-none absolute bottom-0 left-0">
    {x !== null && (
    <motion.span className="absolute bottom-0 left-0 w-11 text-brand" initial={false} animate={{ x: x - 22 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}>
      <motion.svg key={pathname} viewBox="0 0 44 9" className="block h-[9px] w-11 origin-bottom"
        initial={still ? false : { scaleX: 1.9, scaleY: 0.45 }} animate={{ scaleX: 1, scaleY: 1 }} transition={{ duration: 0.5, ease }}>
        <path d="M0 9C11 9 14 1.5 22 1.5S33 9 44 9Z" fill="currentColor" />
      </motion.svg>
      {!still && (
        <motion.span key={`gota-${pathname}`} className="absolute left-[18px] top-[-2px] h-[10px] w-2 rounded-[50%_50%_50%_50%/62%_62%_38%_38%] bg-current"
          initial={{ y: 0, opacity: 0, scale: 0.5 }} animate={{ y: [0, -10, -18], opacity: [0, 1, 0], scale: [0.5, 1, 0.55] }}
          transition={{ duration: 0.6, delay: 0.25, ease, times: [0, 0.45, 1] }} />
      )}
    </motion.span>
    )}
    </span>
  );
}

function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="OctagonIQ, início">
      {/* assinatura: "Octagon" no texto e "IQ" num bloco vermelho com cantos chanfrados (os mesmos 45° do octógono) */}
      <OctagonMark className="h-7 w-7" />
      <span className={clsx('flex items-center font-display text-[24px] font-extrabold uppercase leading-none tracking-[0.01em]', light ? 'text-white' : 'text-fg')}>
        Octagon
        <span className="ml-1 bg-brand px-2 pb-[3px] pt-[5px] text-white [clip-path:polygon(5px_0,100%_0,100%_calc(100%-5px),calc(100%-5px)_100%,0_100%,0_5px)]">IQ</span>
      </span>
    </Link>
  );
}

/* ---------- Faixa de próximos eventos ---------- */

function TickerItem({ e, now, hidden }: { e: UpcomingEvent; now: number; hidden?: boolean }) {
  const { series, title } = splitEventName(e.name);
  const label = e.numbered ? series : e.series === 'dwcs' ? 'DWCS' : 'UFC Fight Night';
  const main = e.main ? `${e.main.red.name} × ${e.main.blue.name}` : title || 'Card a definir';
  return (
    <Link to={`/eventos/${e.id}`} tabIndex={hidden ? -1 : undefined}
      className="group/item flex h-8 shrink-0 items-center gap-3 rounded-full px-4 text-[13px] transition-colors hover:bg-white/10">
      <span className={clsx('font-bold', e.numbered ? 'text-gold' : 'text-white/60')}>{label}</span>
      {e.main?.title && <Crown className="h-3.5 w-3.5 text-gold" aria-label="Disputa de cinturão" />}
      <span className="font-semibold text-white group-hover/item:underline group-hover/item:underline-offset-4">{main}</span>
      {e.main && <span className="text-white/65">{e.main.weightClass}</span>}
      <span className="text-white/25">•</span>
      <span className="num text-white/70">{weekday(e.date)}, {dayMonth(e.date)} · {time(e.date)}</span>
      {e.city && <span className="flex items-center gap-1 text-white/50"><MapPin className="h-3 w-3" />{e.city.split(',')[0]}</span>}
      {e.status === 'in' ? <LiveTag /> : <span className="num rounded-full bg-white/10 px-2 py-1 text-[13px] font-semibold text-white/80">{countdown(e.date, now)}</span>}
      {/* separador entre eventos: losango discreto (o octógono vazado em 12px parecia um ícone quebrado) */}
      <span aria-hidden className="ml-3 h-1.5 w-1.5 rotate-45 bg-white/30" />
    </Link>
  );
}

function EventTicker() {
  const { data, isPending: isLoading } = useUpcoming(10);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const items = data ?? [];

  return (
    <div className="bg-band text-white">
      <div className="mx-auto flex h-11 max-w-[1440px] items-center gap-4 pl-5 sm:pl-8">
        <span className="hidden shrink-0 text-[13px] font-bold text-gold sm:block">Próximos eventos</span>
        {/* Faixa contínua: a lista aparece duas vezes e desliza -50%, então o laço não tem emenda.
            Pausa no hover/foco; com "reduzir movimento" vira uma faixa rolável comum. */}
        <div className="ticker relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_3%,black_97%,transparent)]">
          {isLoading && <div className="flex gap-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-3 w-64 shrink-0 rounded-full bg-white/10" />)}</div>}
          {items.length > 0 && (
            <div className="ticker-track flex w-max" style={{ ['--ticker-duration' as string]: `${items.length * 9}s` }}>
              {items.map(e => <TickerItem key={e.id} e={e} now={now} />)}
              <div aria-hidden className="ticker-copy flex">{items.map(e => <TickerItem key={`${e.id}-b`} e={e} now={now} hidden />)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Busca global (⌘K) ---------- */

// cmdk e o diálogo só são baixados na primeira vez que a busca abre
const SearchDialog = lazy(() => import('./SearchDialog'));

/* ---------- Tema ---------- */

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" onClick={toggle} aria-label={dark ? 'Ativar modo claro' : 'Ativar modo noturno'}
          className="lift relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-surface text-fg-2 shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.06] hover:bg-surface-2 hover:text-fg">
          <motion.span key={theme} initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
            {dark ? <Sun className="h-[18px] w-[18px] text-gold" /> : <Moon className="h-[18px] w-[18px]" />}
          </motion.span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{dark ? 'Modo claro' : 'Modo noturno'}</TooltipContent>
    </Tooltip>
  );
}

/* ---------- Cabeçalho ---------- */

const NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/eventos', label: 'Eventos' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/lutadores', label: 'Lutadores' },
  { to: '/palpites', label: 'Palpites' },
];

/** Pré-carrega perfis e eventos quando o ponteiro fica ~90 ms sobre um link. */
function usePrefetchOnHover() {
  const client = useQueryClient();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const over = (e: PointerEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      clearTimeout(timer);
      if (a) timer = setTimeout(() => { prefetchFromHref(client, a.href)?.catch(() => {}); }, 90);
    };
    document.addEventListener('pointerover', over);
    return () => { document.removeEventListener('pointerover', over); clearTimeout(timer); };
  }, [client]);
}

export function Layout() {
  usePrefetchOnHover();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false); // vira true na primeira abertura
  useEffect(() => { if (searchOpen) setSearchMounted(true); }, [searchOpen]);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(o => !o); }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setSearchOpen(true); }
    };
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll); };
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <EventTicker />
      <header className={clsx('sticky top-0 z-40 transition duration-300', scrolled ? 'bg-bg/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl' : 'bg-bg')}>
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 px-5 sm:px-8 xl:h-[76px] xl:flex-nowrap">
          <div className="flex h-16 items-center xl:h-auto"><Logo /></div>
          <nav aria-label="Principal" className="no-scrollbar relative order-last -mx-2 flex h-12 w-[calc(100%+1rem)] items-end gap-1 overflow-x-auto xl:order-none xl:mx-auto xl:h-[52px] xl:w-auto">
            {/* linha de base onde a gota escorre (no celular o menu rola de lado e a linha do cabeçalho já faz esse papel) */}
            <span aria-hidden className="absolute inset-x-2 bottom-0 hidden h-px bg-line xl:block" />
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => clsx('relative whitespace-nowrap px-4 pb-4 pt-2 font-display text-[15px] font-semibold transition-colors duration-300',
                  isActive ? 'text-fg delay-200' : 'text-fg-3 hover:text-fg')}>
                {n.label}
              </NavLink>
            ))}
            <NavCrest />
          </nav>
          <div className="ml-auto flex items-center gap-2 xl:ml-0">
            {/* só o ícone: com o botão de conta, o campo inteiro não cabe na largura do cabeçalho (o atalho Ctrl K continua) */}
            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Buscar lutador" title="Buscar lutador (Ctrl K)"
              className="lift grid h-10 w-10 place-items-center rounded-full bg-surface text-fg-2 shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.06] hover:text-fg hover:ring-fg/15">
              <MagnifyingGlass className="h-4 w-4" />
            </button>
            <ThemeToggle />
            <Link to="/comparar" className="lift hidden h-10 items-center gap-2 rounded-full border-[1.5px] border-fg px-4 font-display text-[13px] font-bold text-fg hover:bg-fg hover:text-bg sm:inline-flex">
              <ArrowsLeftRight className="h-4 w-4" /> Comparar
            </Link>
            <AccountButton />
          </div>
        </div>
      </header>

      <TopProgress />
      {/* page-stage: cada página (e a troca esqueleto → conteúdo) entra com um fade curto, veja styles.css */}
      <main className="page-stage mx-auto w-full max-w-[1280px] flex-1 px-5 pb-20 pt-6 sm:px-8">
        <Outlet />
      </main>

      {/* rodapé compacto: marca e menu numa linha; as fontes dos dados (todas as quatro) e o crédito na outra */}
      <footer className="bg-band text-white/70">
        <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5">
            <Logo light />
            <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2 font-display text-[13px] font-semibold">
              {[...NAV, { to: '/comparar', label: 'Comparar' }, { to: '/sobre', label: 'Sobre o projeto' }].map(n => <Link key={n.to} to={n.to} className="hover:text-white">{n.label}</Link>)}
            </nav>
          </div>
          <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 text-[13px] md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="max-w-[60ch]">
                <span className="font-semibold text-white">Dados:</span> UFC.com (rankings e estatísticas oficiais), ESPN (eventos, resultados e histórico),
                UFC Fight Tracker (juízes e bônus) e BestFightOdds (odds antigas). Horários de Brasília; ao vivo, atualiza a cada 20 segundos.
              </p>
              <FreshnessNote />
            </div>
            <p className="text-white/65 md:text-right">
              Projeto de portfólio, sem vínculo com o UFC ou a ESPN.<br />
              Feito por <Link to="/sobre" className="font-semibold text-white/80 hover:text-white">Lucas Pacheco</Link> · <a href="https://github.com/Lucas-Romano-Pacheco/octagoniq" target="_blank" rel="noreferrer" className="font-semibold text-white/80 hover:text-white">GitHub</a>
            </p>
          </div>
        </div>
      </footer>

      {supabaseEnabled && <CloudSync />}
      {searchMounted && <Suspense fallback={null}><SearchDialog open={searchOpen} onOpenChange={setSearchOpen} /></Suspense>}
    </div>
  );
}
