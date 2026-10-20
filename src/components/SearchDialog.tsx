import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { CircleNotch, Crown, MagnifyingGlass } from '@phosphor-icons/react';
import { Command as CommandPrimitive } from 'cmdk';
import { fighterHref, useRankings, useSearch } from '@/lib/api';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Avatar } from './kit';

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// títulos de grupo no padrão do site (.label) e linhas sem o ícone de "check" do shadcn,
// que dividia o espaço com o texto da direita e o empurrava para o meio
const GROUP = '**:[[cmdk-group-heading]]:px-3 **:[[cmdk-group-heading]]:pb-2 **:[[cmdk-group-heading]]:pt-3 **:[[cmdk-group-heading]]:text-[12px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-[0.1em] **:[[cmdk-group-heading]]:text-fg-3';
const ITEM = 'group gap-3 rounded-xl! px-3 py-2.5 data-selected:bg-surface-2 [&>svg:last-child]:hidden [&_.hint]:opacity-0 data-selected:[&_.hint]:opacity-100';

export default function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 220);
  const search = useSearch(dq);
  const rankings = useRankings();
  const navigate = useNavigate();
  useEffect(() => { if (open) setQ(''); }, [open]);

  const go = (href: string) => { navigate(href, { viewTransition: true }); onOpenChange(false); };
  const searching = dq.trim().length >= 2;
  const champions = (rankings.data?.divisions ?? []).filter(d => d.champion);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Buscar lutador" description="Digite o nome de um lutador do UFC"
      className="max-w-xl! rounded-xl! border-0 shadow-[var(--shadow-pop)]">
      <Command shouldFilter={false} className="rounded-xl! bg-surface p-0">
        {/* campo próprio (o do shadcn é baixo demais para a busca principal do site) */}
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <MagnifyingGlass className="h-5 w-5 shrink-0 text-fg-3" />
          <CommandPrimitive.Input value={q} onValueChange={setQ} placeholder="Buscar lutador pelo nome…"
            className="h-full flex-1 bg-transparent text-[18px] font-medium text-fg outline-none placeholder:text-fg-3" />
          {search.isFetching && <CircleNotch className="h-4 w-4 animate-spin text-fg-3" />}
        </div>
        <CommandList className={clsx('max-h-[52vh] p-2', GROUP)}>
          {searching && !search.isFetching && <CommandEmpty className="py-10 text-[14px] text-fg-3">Nenhum lutador encontrado para “{dq}”.</CommandEmpty>}
          {searching ? (
            <CommandGroup heading="Lutadores">
              {(search.data ?? []).map(h => (
                <CommandItem key={h.espnId} value={h.espnId} onSelect={() => go(fighterHref(h))} className={ITEM}>
                  <Avatar src={h.headshot} name={h.name} size={36} />
                  <span className="flex-1 truncate text-[16px] font-semibold text-fg">{h.name}</span>
                  <span className="hint text-[13px] font-semibold text-fg-3">Abrir perfil ↵</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <CommandGroup heading="Campeões atuais">
              {champions.map(d => (
                <CommandItem key={d.id} value={d.id} onSelect={() => go(fighterHref({ slug: d.champion!.slug }))} className={ITEM}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-soft"><Crown weight="fill" className="h-4 w-4 text-gold-ink" /></span>
                  <span className="flex-1 truncate text-[16px] font-semibold text-fg">{d.champion!.name}</span>
                  <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-[13px] font-semibold text-fg-2">{d.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2/40 px-5 py-3 text-[13px] text-fg-3">
          <span>Fontes: ESPN · UFC.com</span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> Navegar</span>
            <span className="flex items-center gap-1.5"><kbd className="kbd">↵</kbd> Abrir</span>
            <span className="flex items-center gap-1.5"><kbd className="kbd">Esc</kbd> Fechar</span>
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}

