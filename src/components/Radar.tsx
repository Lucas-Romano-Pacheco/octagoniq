import { useMemo } from 'react';
import type { OfficialStats } from '@shared/types';
import { nf } from '@/lib/format';
import { EChart, tooltipBase, useInk } from './EChart';

/* Radar de atributos a partir das estatísticas oficiais do UFC.com.
   Cada eixo vai de 0 a 100: percentuais entram direto; taxas são divididas por um teto
   de referência (valor de elite na divisão) e limitadas a 100. */

const AXES: { name: string; get: (s: OfficialStats) => number | undefined; max: number; fmt: (v: number) => string }[] = [
  { name: 'Volume', get: s => s.slpm, max: 7, fmt: v => `${nf(v, 2)} golpes sig./min` },
  { name: 'Precisão', get: s => s.strAcc, max: 100, fmt: v => `${nf(v, 0)}% dos golpes` },
  { name: 'Defesa', get: s => s.strDef, max: 100, fmt: v => `${nf(v, 0)}% de golpes evitados` },
  { name: 'Quedas', get: s => s.tdAvg, max: 5, fmt: v => `${nf(v, 2)} quedas / 15 min` },
  { name: 'Def. quedas', get: s => s.tdDef, max: 100, fmt: v => `${nf(v, 0)}% de quedas defendidas` },
  { name: 'Finalização', get: s => s.subAvg, max: 2, fmt: v => `${nf(v, 2)} tentativas / 15 min` },
  { name: 'Poder', get: s => s.kdAvg, max: 1.2, fmt: v => `${nf(v, 2)} knockdowns / 15 min` },
];

export const hasRadar = (s?: OfficialStats) => !!s && AXES.filter(a => a.get(s) !== undefined).length >= 5;

export function AttrRadar({ series, height = 300 }: { series: { name: string; color: string; stats: OfficialStats }[]; height?: number }) {
  const ink = useInk();
  const option = useMemo(() => ({
    tooltip: {
      ...tooltipBase(ink), trigger: 'item',
      formatter: (p: { seriesIndex?: number; dataIndex: number; name: string }) => {
        const s = series[p.dataIndex]?.stats;
        if (!s) return '';
        const rows = AXES.map(a => { const v = a.get(s); return `<div style="display:flex;justify-content:space-between;gap:16px"><span style="color:${ink.fg3}">${a.name}</span><b>${v === undefined ? '—' : a.fmt(v)}</b></div>`; }).join('');
        return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>${rows}`;
      },
    },
    radar: {
      indicator: AXES.map(a => ({ name: a.name, max: 100 })),
      radius: '62%', center: ['50%', '52%'], splitNumber: 4, shape: 'polygon',
      axisName: { color: ink.fg2, fontSize: 12, fontWeight: 600 },
      splitLine: { lineStyle: { color: ink.axis } },
      splitArea: { areaStyle: { color: ['transparent'] } },
      axisLine: { lineStyle: { color: ink.grid } },
    },
    series: [{
      type: 'radar', symbol: 'circle', symbolSize: 6,
      data: series.map(x => {
        const c = x.color === 'red' ? ink.red : ink.blue;
        return {
          name: x.name,
          value: AXES.map(a => Math.min(100, Math.round(((a.get(x.stats) ?? 0) / a.max) * 100))),
          lineStyle: { color: c, width: 2 },
          itemStyle: { color: c, borderColor: ink.surface, borderWidth: 2 },
          areaStyle: { color: c, opacity: series.length > 1 ? 0.14 : 0.2 },
        };
      }),
    }],
  }), [series, ink]);
  return <EChart option={option} height={height} ariaLabel={`Radar de atributos: ${series.map(s => s.name).join(' e ')}`} />;
}

export const RADAR_NOTE = 'Escala 0–100. Percentuais entram direto; taxas por minuto e por 15 min são comparadas a um teto de elite (7 golpes/min, 5 quedas, 2 finalizações, 1,2 knockdown).';
