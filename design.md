# OctagonIQ: regras de design

Leia antes de criar ou mudar uma tela. O objetivo é uma identidade própria de **página esportiva editorial**
(placar, jornal de luta), e não o visual padrão de template.

## Tipografia
- **Barlow Condensed** (`font-display`, classe `.display`): títulos, nomes de lutadores e números de destaque.
  `.display` é maiúscula, peso 800, entrelinha apertada. Para um número grande, use `.display` com tamanho explícito.
- **Inter** (`font-sans`): texto corrido, rótulos, tabelas. Números em tabela levam `.num` (algarismos tabulares).
- Rótulos pequenos: `.label` (cinza, caixa alta) e `.eyebrow` (vermelho da marca, caixa alta). Use no máximo um eyebrow por seção.

## Cores
- Fundo creme (claro) ou azul-marinho (escuro); tinta `fg` azul-marinho.
- **Dourado** (`gold`): ação principal (botões), cinturão, destaque da página inicial.
- **Vermelho e azul** (`red`/`blue`): **somente** os cantos de uma luta. Não use como cor decorativa.
- Vitória, derrota e empate: `win`/`loss`/`draw`, sempre com ícone (nunca só a cor).
- Proibido: gradiente roxo ou índigo, texto com gradiente, vidro fosco (glassmorphism) como padrão.

## Superfícies: quando usar card
- **Card (`Panel`)**: o que é clicável (linhas de luta, mosaico da página inicial, próxima luta), tabelas e duelos.
- **Seção editorial (`Panel plain` ou `.rule`)**: estatísticas, bio, distribuição, gráficos, notícias, linha do tempo.
  Uma régua grossa no topo e o conteúdo direto no fundo.
- Faixas de números (cartel, resumo do evento): `.rule` com colunas separadas por `divide-x`, sem caixas.
- Não aninhe card dentro de card.

## Layout
- Títulos alinhados à esquerda. Centralizar só no confronto (vermelho × azul).
- Prefira grades assimétricas (2/3 + 1/3, item principal maior) a fileiras de cards iguais.
- Evite a "grade de 3 cards com ícone em cima". Destaque o item mais importante e liste o resto.

## Movimento e efeitos (orçamento)
- **Spotlight** (brilho que segue o cursor): só nos duelos (`FightRow`, VS do comparador, topo da luta,
  atalho "Frente a frente") e no fundo do destaque da página inicial (`.hero-glow`, em dourado).
- **Contadores (`CountUp`)**: só no número principal de uma seção (cartel, método dominante, placar de vantagens).
- Entradas ao rolar (`Reveal`): suaves e curtas. Respeite `prefers-reduced-motion`.
- Um efeito marcante por tela vale mais que vários sutis.

## Texto
- Específico e factual: nomes, números, datas ("Disputa de cinturão do peso-pena"). Nada de "eleve", "descubra",
  "experiência única".
- Fonte dos dados sempre visível (UFC.com, ESPN, BestFightOdds).
- pt-BR, horários de Brasília.

## Imagens
- Somente fotos reais dos atletas (UFC.com/ESPN) e bandeiras. Sem banco de imagens nem ilustrações genéricas.
