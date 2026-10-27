import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { clsx } from 'clsx';

/* "Ver em tabela" ao lado de cada gráfico. A tabela é a alternativa principal para quem usa leitor de tela (e útil
   para quem quer o número exato): os mesmos dados do gráfico, numa tabela HTML de verdade, com cabeçalhos de linha e
   coluna e uma legenda que diz o que ela mostra. A escolha não vale para o site todo: cada gráfico tem a sua. */

export interface TableData {
  caption: string;
  /** cabeçalhos das colunas (o primeiro é o das linhas) */
  head: string[];
  rows: { label: ReactNode; cells: ReactNode[] }[];
}

export function ChartTable({ chart, table, className }: { chart: ReactNode; table: TableData; className?: string }) {
  const [view, setView] = useState<'grafico' | 'tabela'>('grafico');
  return (
    <div className={className}>
      <div role="group" aria-label="Formato de exibição" className="mb-2 flex justify-end">
        <div className="inline-flex rounded-md bg-surface-2/70 p-0.5 text-[13px] font-semibold">
          {(['grafico', 'tabela'] as const).map(v => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
              className={clsx('relative rounded px-3 py-1 transition-colors', view === v ? 'text-fg' : 'text-fg-3 hover:text-fg')}>
              {view === v && <motion.span className="absolute inset-0 rounded bg-surface shadow-[var(--shadow-soft)]" />}
              <span className="relative">{v === 'grafico' ? 'Gráfico' : 'Tabela'}</span>
            </button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
          {view === 'grafico' ? chart : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <caption className="pb-2 text-left text-[13px] text-fg-3">{table.caption}</caption>
                <thead><tr>{table.head.map((h, i) => <th key={h} scope="col" className={i ? 'text-right' : 'text-left'}>{h}</th>)}</tr></thead>
                <tbody>
                  {table.rows.map((r, i) => (
                    <tr key={i}>
                      <th scope="row" className="text-left text-[14px] font-semibold normal-case tracking-normal text-fg">{r.label}</th>
                      {r.cells.map((c, k) => <td key={k} className="num text-right text-fg-2">{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
