import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { CircleNotch, MagnifyingGlass, X } from '@phosphor-icons/react';
import type { SearchHit } from '@shared/types';
import { useSearch } from '@/lib/api';
import { Avatar } from './kit';

/** Campo de busca com lista suspensa (combobox) para escolher um lutador. */
export function FighterPicker({ placeholder = 'Buscar lutador…', onPick, autoFocus, className, value, onClear, size = 'md' }: {
  placeholder?: string; onPick: (h: SearchHit) => void; autoFocus?: boolean; className?: string;
  value?: string; onClear?: () => void; size?: 'md' | 'lg';
}) {
  const lg = size === 'lg';
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const { data, isFetching } = useSearch(dq);
  const hits = dq.trim().length >= 2 ? data ?? [] : [];

  useEffect(() => { const t = setTimeout(() => setDq(q), 220); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (h?: SearchHit) => { if (!h) return; onPick(h); setQ(''); setOpen(false); };

  return (
    <div ref={box} className={clsx('relative', className)}>
      <div className={clsx('flex items-center gap-3 rounded-full bg-surface shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.06] transition-shadow focus-within:ring-2 focus-within:ring-blue/50', lg ? 'h-16 px-6' : 'h-12 px-5')}>
        <MagnifyingGlass className={clsx('shrink-0 text-fg-3', lg ? 'h-5 w-5' : 'h-4 w-4')} />
        {value && !q ? (
          <span className="flex-1 truncate text-[16px] font-semibold text-fg">{value}</span>
        ) : null}
        <input value={q} autoFocus={autoFocus} placeholder={value ? '' : placeholder} aria-label={placeholder} role="combobox" aria-expanded={open && hits.length > 0}
          onChange={e => { setQ(e.target.value); setOpen(true); setSel(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, hits.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
            if (e.key === 'Enter') pick(hits[sel]);
            if (e.key === 'Escape') setOpen(false);
          }}
          className={clsx('h-full min-w-0 bg-transparent text-fg outline-none placeholder:text-fg-3', lg ? 'text-[18px] font-medium' : 'text-[16px]', value && !q ? 'w-4' : 'flex-1')} />
        {isFetching && <CircleNotch className="h-3.5 w-3.5 animate-spin text-fg-3" />}
        {value && onClear && !q && <button type="button" onClick={onClear} aria-label="Limpar" className="text-fg-3 hover:text-fg"><X className="h-3.5 w-3.5" /></button>}
      </div>
      {open && hits.length > 0 && (
        <ul role="listbox" className={clsx('absolute inset-x-0 z-30', lg ? 'top-[72px]' : 'top-14', 'max-h-80 overflow-y-auto rounded-xl bg-surface p-2 shadow-[var(--shadow-pop)]')}>
          {hits.map((h, i) => (
            <li key={h.espnId} role="option" aria-selected={i === sel}>
              <button type="button" onMouseEnter={() => setSel(i)} onClick={() => pick(h)}
                className={clsx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left', i === sel && 'bg-surface-2')}>
                <Avatar src={h.headshot} name={h.name} size={34} />
                <span className="truncate text-[14px] font-semibold text-fg">{h.name}</span>
                {h.active === false && <span className="ml-auto text-[13px] text-fg-3">inativo</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
