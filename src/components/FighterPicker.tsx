import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { CircleNotch, MagnifyingGlass, X } from '@phosphor-icons/react';
import type { SearchHit } from '@shared/types';
import { useSearch } from '@/lib/api';
import { Avatar } from './kit';

/** Campo de busca com lista suspensa (combobox) para escolher um lutador. */
export function FighterPicker({ placeholder = 'Buscar lutador…', onPick, autoFocus, className, value, onClear }: {
  placeholder?: string; onPick: (h: SearchHit) => void; autoFocus?: boolean; className?: string;
  value?: string; onClear?: () => void;
}) {
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
      <div className="flex h-12 items-center gap-3 rounded-full bg-surface px-5 shadow-[var(--shadow-soft)] ring-1 ring-fg/[0.06] transition-shadow focus-within:ring-2 focus-within:ring-blue/50">
        <MagnifyingGlass className="h-4 w-4 shrink-0 text-fg-3" />
        {value && !q ? (
          <span className="flex-1 truncate text-[15px] font-semibold text-fg">{value}</span>
        ) : null}
        <input value={q} autoFocus={autoFocus} placeholder={value ? '' : placeholder} role="combobox" aria-expanded={open && hits.length > 0}
          onChange={e => { setQ(e.target.value); setOpen(true); setSel(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, hits.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
            if (e.key === 'Enter') pick(hits[sel]);
            if (e.key === 'Escape') setOpen(false);
          }}
          className={clsx('h-full min-w-0 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-3', value && !q ? 'w-4' : 'flex-1')} />
        {isFetching && <CircleNotch className="h-3.5 w-3.5 animate-spin text-fg-3" />}
        {value && onClear && !q && <button onClick={onClear} aria-label="Limpar" className="text-fg-3 hover:text-fg"><X className="h-3.5 w-3.5" /></button>}
      </div>
      {open && hits.length > 0 && (
        <ul role="listbox" className="absolute inset-x-0 top-14 z-30 max-h-80 overflow-y-auto rounded-2xl bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          {hits.map((h, i) => (
            <li key={h.espnId} role="option" aria-selected={i === sel}>
              <button onMouseEnter={() => setSel(i)} onClick={() => pick(h)}
                className={clsx('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left', i === sel && 'bg-surface-2')}>
                <Avatar src={h.headshot} name={h.name} size={34} />
                <span className="truncate text-[14px] font-semibold text-fg">{h.name}</span>
                {h.active === false && <span className="ml-auto text-[12.5px] text-fg-3">inativo</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
