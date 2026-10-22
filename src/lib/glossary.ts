/* Glossário do modo iniciante (N3): explicação curta dos termos que aparecem nas estatísticas, nos resultados e nas
   odds. `glossaryFor` acha o termo pelo rótulo exibido (ex.: "Golpes sig. / min" → golpes significativos). */

const TERMS: [RegExp, string, string][] = [
  [/^diferencial/i, 'Diferencial de golpes', 'Golpes significativos conectados menos os absorvidos, por minuto. Positivo: acerta mais do que apanha.'],
  [/golpes? sig|significativ/i, 'Golpe significativo', 'Golpe com força contado pelo UFC: à distância, todos os golpes; no clinche e no solo, só os mais fortes. Jabs de leve e toques no clinche não contam.'],
  [/golpes totais/i, 'Golpes totais', 'Todos os golpes conectados, inclusive os leves (no clinche e no solo).'],
  [/absorvid/i, 'Golpes absorvidos', 'Golpes significativos que o lutador levou, por minuto de luta. Quanto menor, melhor.'],
  [/^precis[aã]o de quedas/i, 'Precisão de quedas', 'Parte das tentativas de queda que deram certo.'],
  [/^precis[aã]o/i, 'Precisão', 'Parte dos golpes significativos tentados que acertaram o alvo.'],
  [/defesa de golpes|^defesa$/i, 'Defesa de golpes', 'Parte dos golpes significativos do adversário que não acertaram.'],
  [/defesa de quedas/i, 'Defesa de quedas', 'Parte das tentativas de queda do adversário que foram evitadas.'],
  [/^quedas/i, 'Queda (takedown)', 'Levar o adversário ao chão e ficar por cima ou em posição de controle.'],
  [/knockdown/i, 'Knockdown', 'Quando um golpe derruba o adversário (ele toca o chão com algo além dos pés), mesmo que a luta continue.'],
  [/finaliza[cç][oõ]es? (tentad|\/)/i, 'Finalização tentada', 'Tentativa de fazer o adversário desistir com uma chave ou um estrangulamento.'],
  [/avan[cç]os? de posi/i, 'Avanço de posição', 'Melhorar a posição no solo: sair da guarda para a meia-guarda, montada ou costas.'],
  [/revers/i, 'Reversão', 'Sair de baixo e ficar por cima no solo.'],
  [/controle/i, 'Tempo de controle', 'Tempo segurando o adversário em posição dominante: no clinche contra a grade ou por cima no solo.'],
  [/^ko|nocaute/i, 'KO/TKO', 'KO: o lutador apaga com o golpe. TKO (nocaute técnico): o árbitro interrompe porque ele não se defende mais.'],
  [/^finaliza[cç][aã]o$/i, 'Finalização', 'Vitória quando o adversário desiste (bate três vezes) ou apaga numa chave ou estrangulamento.'],
  [/decis[aã]o un[aâ]nime/i, 'Decisão unânime', 'Os três juízes deram a vitória ao mesmo lutador.'],
  [/decis[aã]o dividida/i, 'Decisão dividida', 'Dois juízes deram a vitória a um lutador e o terceiro, ao outro.'],
  [/decis[aã]o majorit[aá]ria/i, 'Decisão majoritária', 'Dois juízes deram a vitória ao mesmo lutador e o terceiro marcou empate.'],
  [/^decis[aã]o/i, 'Decisão', 'Quando a luta chega ao fim do último round, os três juízes decidem pelos cartões de pontos.'],
  [/cart[oõ]es dos ju/i, 'Cartões dos juízes', 'Cada juiz dá 10 pontos ao vencedor do round e 9 ao perdedor (8 ou menos se o domínio foi grande).'],
  [/chance impl[ií]cita|probabilidade/i, 'Chance implícita', 'A chance de vitória que as odds indicam, já sem a margem de lucro da casa de aposta.'],
  [/^odds|moneyline/i, 'Odds (moneyline)', 'Número negativo: o favorito; -200 quer dizer apostar 200 para ganhar 100. Positivo: o azarão; +200 paga 200 a cada 100 apostados.'],
  [/peso por peso/i, 'Peso por peso', 'Ranking que compara lutadores de todas as categorias, como se tivessem o mesmo peso.'],
  [/interino/i, 'Cinturão interino', 'Título provisório, criado quando o campeão não pode lutar por um tempo.'],
  [/zebra/i, 'Zebra', 'Vitória do azarão. No site, quando o vencedor tinha menos de 35% de chance pelas odds.'],
];

export function glossaryFor(label: string): { term: string; text: string } | undefined {
  const hit = TERMS.find(([re]) => re.test(label.trim()));
  return hit && { term: hit[1], text: hit[2] };
}
