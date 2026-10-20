import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, RadarChart } from 'echarts/charts';
import { GridComponent, RadarComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';

echarts.use([BarChart, RadarChart, GridComponent, RadarComponent, TooltipComponent, SVGRenderer]);

export function EChart({ option, height = 240, ariaLabel }: { option: EChartsCoreOption; height?: number; ariaLabel: string }) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!el.current) return;
    chart.current = echarts.init(el.current, undefined, { renderer: 'svg' });
    const ro = new ResizeObserver(() => chart.current?.resize());
    ro.observe(el.current);
    return () => { ro.disconnect(); chart.current?.dispose(); chart.current = null; };
  }, []);

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    chart.current?.setOption({ animation: !reduce, animationDuration: 500, textStyle: { fontFamily: 'IBM Plex Sans Variable, system-ui' }, ...option }, true);
  }, [option]);

  return <div ref={el} role="img" aria-label={ariaLabel} style={{ height }} className="w-full" />;
}
