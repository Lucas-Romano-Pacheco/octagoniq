import { useEffect, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';

/* Barra fina no topo enquanto chegam dados que a pessoa pediu (abrir uma página, trocar o mês, buscar).
   - Só conta consultas ainda sem dados: a atualização automática em segundo plano (placar ao vivo, odds)
     não acende a barra, senão ela piscaria a cada 20 s.
   - Espera 250 ms antes de aparecer: carregamento rápido (cache) não mostra nada.
   - Anima só transform/opacity, por estado (transição CSS, interrompível). Detalhes em styles.css (.top-progress). */
export function TopProgress() {
  const loading = useIsFetching({ predicate: q => q.state.data === undefined }) > 0;
  const [state, setState] = useState<'idle' | 'run' | 'done'>('idle');

  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setState('run'), 250);
      return () => clearTimeout(t);
    }
    setState(s => (s === 'run' ? 'done' : 'idle'));
  }, [loading]);

  useEffect(() => {
    if (state !== 'done') return;
    const t = setTimeout(() => setState('idle'), 450);
    return () => clearTimeout(t);
  }, [state]);

  return <div aria-hidden className="top-progress" data-state={state} />;
}
