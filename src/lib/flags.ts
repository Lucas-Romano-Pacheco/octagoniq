/* Bandeiras em SVG (nítidas em qualquer tamanho), servidas como arquivos estáticos de /flags
   (copiados dos pacotes por scripts/copy-flags.mjs):
   - circle-flags: circulares, para marcar a nacionalidade ao lado de nomes
   - flag-icons (4x3): retangulares, para o fundo dos recortes dos atletas
   O navegador só baixa as que aparecem. */

import { CIRCLE_CODES, RECT_CODES } from './flag-codes';

export const circleFlag = (code?: string) => (code && CIRCLE_CODES.has(code.toLowerCase()) ? `/flags/circle/${code.toLowerCase()}.svg` : undefined);
export const rectFlag = (code?: string) => (code && RECT_CODES.has(code.toLowerCase()) ? `/flags/rect/${code.toLowerCase()}.svg` : undefined);
