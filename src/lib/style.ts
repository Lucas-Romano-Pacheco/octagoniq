import type { HistoryFight, OfficialStats } from '@shared/types';

/* Estilo automático do lutador (N5) e o painel de trocação (N4), a partir das estatísticas oficiais do UFC.com.
   As réguas usam referências aproximadas da média do UFC (≈4 golpes sig./min, ≈1,5 queda/15 min, ≈0,5 finalização/15
   min, 55% de defesa em pé, 65% de defesa de quedas). Funções puras, testadas em style.test.ts. */

export interface StyleTag { key: string; label: string; why: string; strength: number }

const pct = (n: number) => `${Math.round(n)}%`;
const n2 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Até 3 etiquetas, da mais marcante para a menos. Se nenhuma passa da régua, a mais perto dela (todo perfil com
    estatísticas tem um estilo). Sem dados, nenhuma. */
export function fighterStyle(s?: OfficialStats): StyleTag[] {
  if (!s) return [];
  const out: StyleTag[] = [];
  const w = s.winsBy, wins = w ? w.ko + w.sub + w.dec : 0;
  if (s.slpm !== undefined && s.slpm >= 5) out.push({ key: 'volume', label: 'Trocador de volume', why: `${n2(s.slpm)} golpes significativos por minuto (a média do UFC fica perto de 4)`, strength: s.slpm / 5 });
  if (w && wins >= 5 && w.ko / wins >= 0.5) out.push({ key: 'ko', label: 'Nocauteador', why: `${pct((w.ko / wins) * 100)} das vitórias por nocaute`, strength: (w.ko / wins) / 0.5 });
  if (w && wins >= 5 && w.sub / wins >= 0.4) out.push({ key: 'sub', label: 'Finalizador', why: `${pct((w.sub / wins) * 100)} das vitórias por finalização`, strength: (w.sub / wins) / 0.4 });
  else if (s.subAvg !== undefined && s.subAvg >= 1.2) out.push({ key: 'sub', label: 'Finalizador', why: `${n2(s.subAvg)} finalizações tentadas a cada 15 min (média perto de 0,5)`, strength: s.subAvg / 1.2 });
  if (s.tdAvg !== undefined && s.tdAvg >= 2.5) out.push({ key: 'wrestler', label: 'Wrestler', why: `${n2(s.tdAvg)} quedas a cada 15 min (média perto de 1,5)`, strength: s.tdAvg / 2.5 });
  if (s.tdDef !== undefined && s.tdDef >= 85) out.push({ key: 'antitd', label: 'Anti-queda', why: `Defende ${pct(s.tdDef)} das tentativas de queda`, strength: s.tdDef / 85 });
  if (s.strDef !== undefined && s.strDef >= 62) out.push({ key: 'defense', label: 'Defesa em pé', why: `Evita ${pct(s.strDef)} dos golpes significativos (média perto de 55%)`, strength: s.strDef / 62 });
  if (w && wins >= 6 && w.dec / wins >= 0.6) out.push({ key: 'points', label: 'Vence nos pontos', why: `${pct((w.dec / wins) * 100)} das vitórias na decisão`, strength: (w.dec / wins) / 0.6 });
  if (out.length) return out.sort((a, b) => b.strength - a.strength).slice(0, 3);
  // nenhum traço passou da régua: mostra o mais perto dela, para todo perfil ter um estilo (padrão entre os atletas)
  const near: StyleTag[] = [];
  if (w && wins >= 5) {
    near.push({ key: 'ko', label: 'Nocauteador', why: `${pct((w.ko / wins) * 100)} das vitórias por nocaute`, strength: (w.ko / wins) / 0.5 });
    near.push({ key: 'sub', label: 'Finalizador', why: `${pct((w.sub / wins) * 100)} das vitórias por finalização`, strength: (w.sub / wins) / 0.4 });
    near.push({ key: 'points', label: 'Vence nos pontos', why: `${pct((w.dec / wins) * 100)} das vitórias na decisão`, strength: (w.dec / wins) / 0.6 });
  }
  if (s.slpm !== undefined) near.push({ key: 'volume', label: 'Trocador de volume', why: `${n2(s.slpm)} golpes significativos por minuto (a média do UFC fica perto de 4)`, strength: s.slpm / 5 });
  if (s.tdAvg !== undefined) near.push({ key: 'wrestler', label: 'Wrestler', why: `${n2(s.tdAvg)} quedas a cada 15 min (média perto de 1,5)`, strength: s.tdAvg / 2.5 });
  if (s.strDef !== undefined) near.push({ key: 'defense', label: 'Defesa em pé', why: `Evita ${pct(s.strDef)} dos golpes significativos (média perto de 55%)`, strength: s.strDef / 62 });
  const top = near.sort((a, b) => b.strength - a.strength)[0];
  return top && top.strength >= 0.5 ? [top] : [];
}

/** Diferencial de golpes: conectados menos absorvidos por minuto (positivo = acerta mais do que apanha). */
export const strikeDiff = (s?: OfficialStats) => (s?.slpm !== undefined && s.sapm !== undefined ? +(s.slpm - s.sapm).toFixed(2) : undefined);

/** Completa a divisão das vitórias (nocaute, finalização, decisão) pelo histórico quando as estatísticas não a trazem
    (aposentados e quem só tem dados da ESPN), para o estilo sair igual em todos os perfis. */
export function withHistoryWins(s: OfficialStats | undefined, history: HistoryFight[]): OfficialStats | undefined {
  if (!s || s.winsBy) return s;
  const wins = history.filter(h => h.outcome === 'W');
  if (!wins.length) return s;
  const winsBy = { ko: 0, sub: 0, dec: 0 };
  for (const h of wins) {
    if (h.method === 'KO/TKO') winsBy.ko++;
    else if (h.method === 'Finalização') winsBy.sub++;
    else if (/Decis/i.test(h.method ?? '')) winsBy.dec++;
  }
  return { ...s, winsBy };
}
