import type { EventListItem } from '@shared/types';

/* Cor de cada tipo de evento, a mesma em todo o site (calendário, próximas datas, legendas):
   numerado = vermelho da marca, Fight Night = azul, Contender Series = dourado. */
export const SERIES_TONE: Record<EventListItem['series'], string> = {
  ppv: 'bg-brand text-white',
  'fight-night': 'bg-blue text-white',
  dwcs: 'bg-gold text-[#14183e]',
  other: 'bg-fg text-bg',
};

export const SERIES_LABEL: Record<EventListItem['series'], string> = { ppv: 'Numerado', 'fight-night': 'Fight Night', dwcs: 'Contender Series', other: 'Especial' };
