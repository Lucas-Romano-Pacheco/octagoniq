import { HandGrabbing, Lightning, Scales } from '@/components/icons';
import type { MethodKey } from '@/lib/picks';

/* Identidade visual dos métodos nos palpites (a tela principal e o detalhe compacto da aba Ranking usam a mesma). */

export const METHOD_ICON = { ko: Lightning, sub: HandGrabbing, dec: Scales } as const;
/** Uma cor por método (fora do vermelho/azul dos cantos e do dourado do cinturão): KO fúcsia, finalização esmeralda, decisão violeta. */
export const METHOD_COLOR: Record<MethodKey, { c: string; ink: string }> = {
  ko: { c: 'var(--color-ko-fill)', ink: '#fff' }, sub: { c: 'var(--color-sub-fill)', ink: '#fff' }, dec: { c: 'var(--color-dec-fill)', ink: '#fff' },
};
/** Cada ícone tem o seu movimento ao ser escolhido: raio chacoalha, mão aperta, balança pende. */
export const ICON_MOVE: Record<MethodKey, { animate: Record<string, number[]>; transition: { duration: number } }> = {
  ko: { animate: { x: [0, -4, 4, -3, 3, 0], scale: [1, 1.35, 1.1, 1.3, 1] }, transition: { duration: 0.55 } },
  sub: { animate: { scale: [1, 0.7, 1.3, 0.85, 1], rotate: [0, -14, 14, -6, 0] }, transition: { duration: 0.6 } },
  dec: { animate: { rotate: [0, -22, 18, -10, 5, 0], scale: [1, 1.2, 1] }, transition: { duration: 0.7 } },
};
