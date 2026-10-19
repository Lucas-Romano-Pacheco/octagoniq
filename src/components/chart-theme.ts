import { useTheme } from '@/lib/theme';

/* Tema dos gráficos (sem importar o ECharts, que é pesado e carrega sob demanda). */
/* Tinta e linhas de gráfico por tema (mesmos valores dos tokens CSS). */
const LIGHT = {
  fg: '#14183e', fg2: '#4b5072', fg3: '#8a8ea6', grid: '#efebe3', axis: '#ddd6c9', surface: '#ffffff', border: '#ebe6dc', shadow: 'rgba(20,24,62,.3)',
  red: '#e34948', blue: '#2a78d6', blueWash: 'rgba(42,120,214,0.16)', orange: '#eb6834', aqua: '#1baf7a', hover: 'rgba(20,24,62,0.04)',
};
const DARK: typeof LIGHT = {
  fg: '#f2f0ea', fg2: '#b9bbd2', fg3: '#8287a6', grid: '#232745', axis: '#343a60', surface: '#1f2340', border: '#343a60', shadow: 'rgba(0,0,0,.6)',
  red: '#e66767', blue: '#3987e5', blueWash: 'rgba(57,135,229,0.22)', orange: '#d95926', aqua: '#199e70', hover: 'rgba(255,255,255,0.04)',
};
export type Ink = typeof LIGHT;

/** Paleta do gráfico para o tema atual. */
export function useInk(): Ink {
  return useTheme().theme === 'dark' ? DARK : LIGHT;
}

/** Cores de série para elementos HTML (seguem o tema via CSS). */
export const SERIES = { red: 'var(--color-red)', blue: 'var(--color-blue)', orange: 'var(--color-orange)', aqua: 'var(--color-aqua)' };

export const tooltipBase = (ink: Ink) => ({
  backgroundColor: ink.surface,
  borderColor: ink.border,
  borderWidth: 1,
  padding: [8, 10],
  textStyle: { color: ink.fg, fontFamily: 'Inter Variable, system-ui, sans-serif', fontSize: 12.5 },
  extraCssText: `border-radius:14px;box-shadow:0 18px 40px -16px ${ink.shadow};`,
});

export const axisBase = (ink: Ink) => ({
  axisLine: { lineStyle: { color: ink.axis } },
  axisTick: { show: false },
  axisLabel: { color: ink.fg3, fontFamily: 'Inter Variable, system-ui', fontSize: 11 },
  splitLine: { lineStyle: { color: ink.grid, type: 'solid' as const } },
});

