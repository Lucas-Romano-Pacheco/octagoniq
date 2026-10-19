import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import { ArrowsLeftRight, Crown, MagnifyingGlass, MapPin, Moon, Sun } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchFromHref, useUpcoming, type UpcomingEvent } from '@/lib/api';
import { countdown, dayMonth, splitEventName, time, weekday } from '@/lib/format';
import { LiveTag, OctagonMark } from './kit';
import { CloudSync } from './PicksAccount';
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

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="OctagonIQ, início">
      {/* assinatura: "Octagon" no texto e "IQ" num bloco vermelho com cantos chanfrados (os mesmos 45° do octógono) */}
      <OctagonMark className="h-7 w-7" />
      <span className={clsx('flex items-center font-display text-[23px] font-extrabold uppercase leading-none tracking-[0.01em]', light ? 'text-white' : 'text-fg')}>
        Octagon
        <span className="ml-1 bg-brand px-1.5 pb-[3px] pt-[5px] text-white [clip-path:polygon(5px_0,100%_0,100%_calc(100%-5px),calc(100%-5px)_100%,0_100%,0_5px)]">IQ</span>
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
      className="group/item flex h-8 shrink-0 items-center gap-2.5 rounded-full px-4 text-[13.5px] transition-colors hover:bg-white/10">
      <span className={clsx('font-bold', e.numbered ? 'text-gold' : 'text-white/60')}>{label}</span>
      {e.main?.title && <Crown className="h-3.5 w-3.5 text-gold" aria-label="Disputa de cinturão" />}
      <span className="font-semibold text-white group-hover/item:underline group-hover/item:underline-offset-4">{main}</span>
      {e.main && <span className="text-white/65">{e.main.weightClass}</span>}
      <span className="text-white/25">•</span>
      <span className="num text-white/70">{weekday(e.date)}, {dayMonth(e.date)} · {time(e.date)}</span>
      {e.city && <span className="flex items-center gap-1 text-white/50"><MapPin className="h-3 w-3" />{e.city.split(',')[0]}</span>}
      {e.status === 'in' ? <LiveTag /> : <span className="num rounded-full bg-white/10 px-2 py-0.5 text-[13px] font-semibold text-white/80">{countdown(e.date, now)}</span>}
      <OctagonMark className="ml-3 h-3 w-3 opacity-60" />
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
        <span className="hidden shrink-0 text-[12.5px] font-bold uppercase tracking-[0.14em] text-gold sm:block">Próximos eventos</span>
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
        <button onClick={toggle} aria-label={dark ? 'Ativar modo claro' : 'Ativar modo noturno'}
          className="lift relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-surface text-fg-2 shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.06] hover:bg-surface-2 hover:text-fg">
          <motion.span key={theme} initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}>
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
      <header className={clsx('sticky top-0 z-40 transition-all duration-300', scrolled ? 'bg-bg/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl' : 'bg-bg')}>
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 px-5 sm:h-[76px] sm:flex-nowrap sm:px-8">
          <div className="flex h-16 items-center sm:h-auto"><Logo /></div>
          <nav className="no-scrollbar order-last -mx-2 flex h-12 w-[calc(100%+1rem)] items-center gap-1 overflow-x-auto sm:order-none sm:mx-auto sm:h-auto sm:w-auto">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => clsx('relative whitespace-nowrap rounded-full px-4 py-2 font-display text-[13.5px] font-semibold uppercase tracking-[0.06em] transition-colors', isActive ? 'text-fg' : 'text-fg-2 hover:text-fg')}>
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-surface shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.05]" transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />}
                    <span className="relative">{n.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <button onClick={() => setSearchOpen(true)} aria-label="Buscar lutador"
              className="lift flex h-10 items-center gap-2.5 rounded-full bg-surface px-4 text-[13.5px] text-fg-3 shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.06] hover:text-fg-2 hover:ring-fg/15 lg:w-64">
              <MagnifyingGlass className="h-4 w-4" />
              <span className="hidden flex-1 text-left lg:block">Buscar lutador…</span>
              <kbd className="kbd hidden lg:inline-flex">Ctrl K</kbd>
            </button>
            <ThemeToggle />
            <Link to="/comparar" className="lift hidden h-10 items-center gap-2 rounded-full border-[1.5px] border-fg px-4 font-display text-[12.5px] font-bold uppercase tracking-[0.06em] text-fg hover:bg-fg hover:text-bg sm:inline-flex">
              <ArrowsLeftRight className="h-4 w-4" /> Comparar
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 pb-20 pt-6 sm:px-8">
        <Outlet />
      </main>

      <footer className="bg-band text-white/70">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed">Eventos, resultados, rankings oficiais e o histórico de cada lutador do UFC. Os dados são renovados a cada poucos minutos; durante um evento ao vivo, a cada 20 segundos.</p>
            <FreshnessNote />
          </div>
          <div>
            <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.14em] text-gold">Navegar</div>
            <ul className="space-y-2 text-[14px]">
              {[...NAV, { to: '/comparar', label: 'Comparar' }, { to: '/sobre', label: 'Sobre o projeto' }].map(n => <li key={n.to}><Link to={n.to} className="hover:text-white">{n.label}</Link></li>)}
            </ul>
          </div>
          <div>
            <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.14em] text-gold">Fontes</div>
            <ul className="space-y-2 text-[14px]">
              <li>UFC.com: rankings e estatísticas oficiais</li>
              <li>ESPN: eventos, resultados e histórico</li>
              <li>Horários de Brasília</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-2 px-5 py-5 text-[13.5px] text-white/65 sm:px-8">
            <span>OctagonIQ · projeto de portfólio, sem vínculo com o UFC ou a ESPN.</span>
            <span>Feito por <Link to="/sobre" className="font-semibold text-white/70 hover:text-white">Lucas Pacheco</Link> · <a href="https://github.com/Lucas-Romano-Pacheco/octagoniq" target="_blank" rel="noreferrer" className="font-semibold text-white/70 hover:text-white">GitHub</a></span>
          </p>
        </div>
      </footer>

      {supabaseEnabled && <CloudSync />}
      {searchMounted && <Suspense fallback={null}><SearchDialog open={searchOpen} onOpenChange={setSearchOpen} /></Suspense>}
    </div>
  );
}
