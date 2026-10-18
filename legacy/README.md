# OctagonIQ

Dashboard de análise do UFC: painel com cinturões e próximos eventos, rankings oficiais, perfis de lutadores, análise round a round, comparação direta (H2H) com motor de estilo e arquivo de eventos.

## Stack
- **Tailwind CSS 3.4** compilado no build (CLI, minificado). Sem o CDN de desenvolvimento.
- **ECharts 5.5** com tema próprio (`octagon`): radar em formato de octógono, mapa de títulos, momento minuto a minuto, matriz de estilo.
- **GSAP 3.12**: entrada dos painéis e contadores.
- **Lucide**: ícones.
- Tipografia: Anybody (eixo de largura), Hanken Grotesk e Martian Mono.

## Estrutura
```
src/
  data.js     base: perfis, rankings, eventos, agenda, mudanças de título, fontes
  engine.js   normalização, simulação determinística de estatísticas, motor de estilo e modelo
  app.js      interface (6 seções) e navegação em memória
  styles.css  design system (tokens + componentes) sobre o Tailwind
  index.html  template
scripts/build.mjs   compila o CSS e gera dist/index.html (documento) e dist/octagoniq.html (corpo para artifact)
```

## Uso
```bash
npm install
npm run build        # gera dist/index.html
```
Abra `dist/index.html` no navegador.

## Dados
- Rankings: release oficial de 25/08/2026, com ajustes por eventos posteriores (Aspinall vagou o cinturão dos pesados; Natália Silva campeã dos moscas no UFC 332).
- Resultados: destaques dos cards de 2024 até o UFC 332 (03/10/2026). Itens marcados com `est` tiveram round/tempo/método não confirmados.
- Agenda: cards anunciados até 17/10/2026 (Edmonton, UFC 333, Bonfim × Brady, UFC 334, UFC 335).
- Estatísticas de carreira e cartéis são aproximados. As estatísticas round a round são **simuladas** a partir do resultado oficial e do perfil de cada lutador.

## Conectando dados reais
Substitua `data.js` por um adaptador que preencha os mesmos arrays (`PROFILES`, `RANKINGS`, `EVENTS`, `UPCOMING`) a partir de uma API (UFC Stats, ESPN, Sherdog/Tapology via scraper próprio). A função `fightDetail(id)` em `engine.js` é o ponto para trocar a simulação pelas estatísticas oficiais por round.
