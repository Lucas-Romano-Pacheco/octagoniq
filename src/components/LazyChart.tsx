import { lazy, Suspense } from 'react';
import type { EChartsCoreOption } from 'echarts/core';

/* O ECharts (~500 KB) só é baixado quando um gráfico vai aparecer; até lá, um espaço da mesma altura (sem salto de layout). */
const Impl = lazy(() => import('./EChart').then(m => ({ default: m.EChart })));

export function EChart(props: { option: EChartsCoreOption; height?: number; ariaLabel: string }) {
  return (
    <Suspense fallback={<div className="skeleton w-full rounded-xl" style={{ height: props.height ?? 240 }} role="status" aria-label="Carregando o gráfico" />}>
      <Impl {...props} />
    </Suspense>
  );
}
