/* Bandeiras em SVG (nítidas em qualquer tamanho):
   - circle-flags: circulares, para marcar a nacionalidade ao lado de nomes
   - flag-icons (4x3): retangulares, para o fundo dos recortes dos atletas
   `no-inline`: cada bandeira vira um arquivo (senão o Vite embutiria ~700 SVGs no JS);
   o navegador só baixa as que aparecem. */

const circle = import.meta.glob('../../node_modules/circle-flags/flags/*.svg', { eager: true, query: '?url&no-inline', import: 'default' }) as Record<string, string>;
const rect = import.meta.glob('../../node_modules/flag-icons/flags/4x3/*.svg', { eager: true, query: '?url&no-inline', import: 'default' }) as Record<string, string>;

const index = (m: Record<string, string>) => new Map(Object.entries(m).map(([path, url]) => [path.split('/').pop()!.replace('.svg', ''), url]));
const CIRCLE = index(circle);
const RECT = index(rect);

export const circleFlag = (code?: string) => (code ? CIRCLE.get(code.toLowerCase()) : undefined);
export const rectFlag = (code?: string) => (code ? RECT.get(code.toLowerCase()) : undefined);
