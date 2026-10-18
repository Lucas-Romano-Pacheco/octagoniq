import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { motion } from 'motion/react';
import { ArrowsLeftRight, CircleNotch, Crown, MagnifyingGlass, MapPin, Moon, Sun } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { fighterHref, prefetchFromHref, useRankings, useSearch, useUpcoming, type UpcomingEvent } from '@/lib/api';
import { countdown, dayMonth, splitEventName, time, weekday } from '@/lib/format';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar, LiveTag, OctagonMark } from './kit';
import { useTheme } from '@/lib/theme';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/* ---------- Marca ---------- */

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="OctagonIQ, início">
      <OctagonMark className="h-7 w-7" />
      <span className={clsx('font-display text-[23px] font-bold tracking-[-0.03em]', light ? 'text-white' : 'text-fg')}>
        Octagon<span className="text-brand">IQ</span>
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
      {e.main && <span className="text-white/45">{e.main.weightClass}</span>}
      <span className="text-white/25">•</span>
      <span className="num text-white/70">{weekday(e.date)}, {dayMonth(e.date)} · {time(e.date)}</span>
      {e.city && <span className="flex items-center gap-1 text-white/50"><MapPin className="h-3 w-3" />{e.city.split(',')[0]}</span>}
      {e.status === 'in' ? <LiveTag /> : <span className="num rounded-full bg-white/10 px-2 py-0.5 text-[13px] font-semibold text-white/80">{countdown(e.date, now)}</span>}
      <OctagonMark className="ml-3 h-3 w-3 opacity-60" />
    </Link>
  );
}

function EventTicker() {
  const { data, isLoading } = useUpcoming(10);
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

/* ---------- Busca global (⌘K) com cmdk ---------- */

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 220);
  const search = useSearch(dq);
  const rankings = useRankings();
  const navigate = useNavigate();
  useEffect(() => { if (open) setQ(''); }, [open]);

  const go = (href: string) => { navigate(href); onOpenChange(false); };
  const searching = dq.trim().length >= 2;
  const champions = (rankings.data?.divisions ?? []).filter(d => d.champion);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Buscar lutador" description="Digite o nome de um lutador do UFC"
      className="max-w-xl! rounded-3xl! border-0 shadow-[var(--shadow-pop)]">
      <Command shouldFilter={false} className="rounded-3xl bg-surface">
        <div className="relative">
          <CommandInput value={q} onValueChange={setQ} placeholder="Buscar lutador pelo nome…" className="text-[15px]" />
          {search.isFetching && <CircleNotch className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-fg-3" />}
        </div>
        <CommandList className="max-h-[52vh] p-1.5">
          {searching && !search.isFetching && <CommandEmpty>Nenhum lutador encontrado para “{dq}”.</CommandEmpty>}
          {searching ? (
            <CommandGroup heading="Lutadores">
              {(search.data ?? []).map(h => (
                <CommandItem key={h.espnId} value={h.espnId} onSelect={() => go(fighterHref(h))} className="gap-3 rounded-xl px-2.5 py-2">
                  <Avatar src={h.headshot} name={h.name} size={34} />
                  <span className="text-[14px] font-semibold text-fg">{h.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <CommandGroup heading="Campeões atuais">
              {champions.map(d => (
                <CommandItem key={d.id} value={d.id} onSelect={() => go(fighterHref({ slug: d.champion!.slug }))} className="gap-3 rounded-xl px-2.5 py-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-soft"><Crown className="h-4 w-4 text-gold-ink" /></span>
                  <span className="text-[14px] font-semibold text-fg">{d.champion!.name}</span>
                  <span className="ml-auto text-[13.5px] text-fg-3">{d.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[13px] text-fg-3">
          <span>ESPN · UFC.com</span>
          <span>↑↓ navegar · ↵ abrir · esc fechar</span>
        </div>
      </Command>
    </CommandDialog>
  );
}

/* ---------- Tema ---------- */

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={toggle} aria-label={dark ? 'Ativar modo claro' : 'Ativar modo noturno'}
          className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-surface text-fg-2 shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.06] transition-colors hover:text-fg">
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
                className={({ isActive }) => clsx('relative whitespace-nowrap rounded-full px-4 py-2 text-[14.5px] font-semibold transition-colors', isActive ? 'text-fg' : 'text-fg-2 hover:text-fg')}>
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
              className="flex h-10 items-center gap-2.5 rounded-full bg-surface px-4 text-[13.5px] text-fg-3 shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.06] transition-all hover:text-fg-2 hover:ring-fg/15 lg:w-64">
              <MagnifyingGlass className="h-4 w-4" />
              <span className="hidden flex-1 text-left lg:block">Buscar lutador…</span>
              <kbd className="hidden rounded-md bg-surface-2 px-1.5 py-0.5 text-[12px] font-semibold text-fg-3 lg:block">Ctrl K</kbd>
            </button>
            <ThemeToggle />
            <Link to="/comparar" className="hidden h-10 items-center gap-2 rounded-full border-[1.5px] border-fg px-4 text-[13.5px] font-semibold text-fg transition-colors hover:bg-fg hover:text-bg sm:inline-flex">
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
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed">Eventos, resultados, rankings oficiais e o histórico completo de cada lutador do UFC, atualizados em tempo real.</p>
          </div>
          <div>
            <div className="mb-3 text-[13px] font-bold uppercase tracking-[0.14em] text-gold">Navegar</div>
            <ul className="space-y-2 text-[14px]">
              {[...NAV, { to: '/comparar', label: 'Comparar' }].map(n => <li key={n.to}><Link to={n.to} className="hover:text-white">{n.label}</Link></li>)}
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
          <p className="mx-auto max-w-[1280px] px-5 py-5 text-[13.5px] text-white/45 sm:px-8">OctagonIQ · projeto de portfólio, sem vínculo com o UFC ou a ESPN.</p>
        </div>
      </footer>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
