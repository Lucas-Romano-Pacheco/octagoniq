# OctagonIQ: regras de design

Leia antes de criar ou mudar uma tela. Os valores abaixo são os tokens de `src/styles.css`; use o token, nunca o hexadecimal solto.
O que o produto faz e para quem está em [`PRODUCT.md`](PRODUCT.md).

## 1. Clima visual

Página esportiva **editorial**: jornal de luta, placar, cartaz de evento. Fundo branco levemente azulado (ou azul-marinho no modo noturno), creme só nos destaques,
tinta azul-marinho, fotos reais dos atletas e números grandes. A cor existe para dizer algo (canto, resultado, cinturão),
não para enfeitar. Uma tela tem **um** protagonista: o número, a foto ou o confronto principal.

## 2. Cores e papéis

| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `bg` | `#f8f9fc` | `#0d0f22` | fundo da página: branco levemente azulado, do mesmo matiz da tinta (creme não: virou o fundo padrão de sites gerados) |
| `surface` / `surface-2` / `surface-3` | `#fff` / `#f2f3f8` / `#e6e8ef` | `#171a33` / `#1f2340` / `#2a2f52` | cards, linhas em hover, trilhos |
| `cream` / `cream-2` | `#fff1da` / `#ffe7c0` | `#2a2546` / `#332a48` | **só** destaque editorial (card de luta, líder do ranking, moldura do início); nunca fundo de página |
| `line` / `line-2` | `#e4e6ed` / `#d4d7e1` | `#262a49` / `#343a60` | bordas (anel de 1px) e divisórias |
| `fg` / `fg-2` / `fg-3` | `#14183e` / `#4b5072` / `#646882` | `#f2f0ea` / `#b9bbd2` / `#9296b4` | texto principal, secundário, apoio |
| `brand` | `#d62839` | `#ff4d5e` | marca, links em hover, foco |
| `gold` / `gold-ink` | `#f1a501` / `#8a5d00` | `#f5b020` / `#f5c55a` | **só** cinturão, campeão e disputa de título |
| `red-fill` / `blue-fill` | `#d63b3b` / `#2468c0` | `#c93838` / `#2468c0` | **só** os cantos de uma luta (vermelho × azul) |
| `blue-ink` | `#1f5fae` | `#7fb0f0` | texto azul sobre fundo claro (rótulos do canto azul, "luta marcada") |
| `orange-fill` / `orange-ink` | `#c4501d` / `#9a3d16` | `#c4501d` / `#f39a6e` | zebra (azarão venceu) |
| `ko-fill` | `#d03a7c` | `#d03a7c` | método: nocaute (KO/TKO), fúcsia |
| `sub-fill` | `#0c7a55` | `#0c7a55` | método: finalização, esmeralda |
| `dec-fill` | `#7445d6` | `#7445d6` | método: decisão, violeta |
| `slate-fill` | `#5b6178` | `#4a5070` | Dana White's Contender Series |
| `win` / `loss` / `draw` | `#13834a` / `#c8323a` / `#9a6700` | `#45d08a` / `#ff6b72` / `#f5c542` | resultado, sempre com ícone |

No CSS os tokens estão em **OKLCH** (`oklch(L% C H)`); a tabela mostra o hexadecimal equivalente. Para clarear ou escurecer
uma cor, mude só o L. Quem precisa de hexadecimal (o boneco 3D) converte na hora.

Regras:
- **`*-fill`** é fundo com texto branco (contraste AA garantido). **`*-ink`** é texto colorido sobre fundo claro. As versões
  sem sufixo (`red`, `blue`, `orange`, `aqua`) servem para traços, gráficos e fundos com `/15` de opacidade.
- Tipos de evento: numerado em `brand`, Fight Night em `blue-fill`, DWCS em `slate-fill`.
- Método: nocaute `ko-fill`, finalização `sub-fill`, decisão `dec-fill`, sempre pelo componente `MethodTag` (cor + ícone + texto),
  em todo lugar onde o método aparece. A paleta passou no validador de daltonismo; o ícone e o texto garantem a leitura
  mesmo sem a cor.
- Proibido: dourado em botão comum, gradiente roxo ou índigo, texto com gradiente, vidro fosco como padrão,
  texto com `opacity` (use `fg-2`/`fg-3`).

## 3. Tipografia

- **Archivo Narrow** (`font-display`): títulos (`.display`, caixa alta, 700, entrelinha 0,95), títulos de seção
  (`.panel-title`), rótulos (`.label`), botões e menu.
- **IBM Plex Sans** (`font-sans`, variável): texto corrido, gráficos e as imagens de prévia (`server/og.ts`).
- **Números**: `.num` usa a própria IBM Plex Sans com algarismos tabulares. A **IBM Plex Mono** (`.odds`) fica só nas odds,
  que são um código de aposta (monoespaçada em todo número virou marca de site gerado).
  Os números grandes de título continuam na Archivo Narrow (`.display`).
- **Escala única (px):** 12 · 13 · 14 · 16 · 18 · 20 · 24 · 32 · 44 · 64 · 72 · 96. Nada fora dela.
  12–13 rótulos e apoio, 14–16 texto, 18–24 títulos de card, 32–44 títulos de página, 64–96 o número protagonista.
- Faixa de números (resumo do evento, palpites, calendário): o primeiro item em 64, os demais em 32. Não deixe todos iguais.
- Parágrafos com `text-wrap: pretty`. Sem "eyebrow" (texto pequeno acima do título): o contexto vai na linha de meta,
  abaixo do título.

## 4. Componentes

- **`Panel`**: `surface`, anel de 1px em `line`, raio `--radius-card` (12px), **sem sombra**. Subtítulo, quando houver,
  fica abaixo do título em 13px `fg-3`.
- **`Panel plain` / `.rule`**: seção editorial (estatísticas, bio, gráficos, notícias, linha do tempo): régua no topo e
  conteúdo direto no fundo.
- **Botões**: `.btn-primary` é `fg` sobre `bg` (sem dourado, sem sombra); secundários com anel em `line`.
  Hover sobe 1px e clareia (`.lift`), clique encolhe para 0,96. Transição de 150 ms.
- **Listas** (`.item-fx`, `.row-fx`): hover desloca 2px e tinge o fundo. Sem barra lateral colorida.
- **`DuelRow`** (vermelho × azul): barras espelhadas ou tabela, conforme a escolha do visitante (`DuelHead`, no topo de
  cada lista, traz os nomes e a troca; a escolha fica guardada no navegador). A tabela põe os dois números lado a lado.
- **`Tag`**: tons `neutral`, `gold`, `red`, `blue` (texto em `blue-ink`), `orange` (texto em `orange-ink`), `win`/`loss`.
- **`RankBadge`**: a divisão trunca (`min-w-0 truncate`); no celular, o comparador esconde a divisão.
- **Ícones**: Hugeicons (gratuito, traço arredondado), todos pelo módulo `src/components/icons.tsx`; trocar de pack é mexer só nele. Os glifos de resultado (vitória, derrota, empate) são SVG próprios em `kit.tsx`, traço 2,9.
- **CTAs dizem o que acontece**: "Ver as 13 lutas", "Comparar Makhachev e Volkanovski". Nada de "Saiba mais" ou "Ver detalhes".

## 5. Layout

- Títulos alinhados à esquerda. Centralizar só o confronto (vermelho × azul).
- Prefira grades assimétricas (2/3 + 1/3, item principal maior) a fileiras de cards iguais.
- Evite a "grade de 3 cards com ícone em cima". Destaque o item mais importante e liste o resto.
- Não aninhe card dentro de card.
- Celular primeiro: margem de 16px, nenhuma rolagem horizontal em 390px (nomes longos quebram ou diminuem; não estouram).

## 6. Profundidade e raios

- Três raios: `rounded-md` (~11px, controles, chips, fotos pequenas), `--radius-card` (12px, cards), `rounded-xl`
  (~20px, destaques grandes e o topo da luta). Pílulas usam `rounded-full`.
- Separação por anel de 1px e diferença de superfície, não por sombra. Sombra só em camadas flutuantes
  (busca, dicas, menus).

## 7. Movimento (orçamento)

- **Spotlight** (brilho que segue o cursor): só no topo da página da luta. O `.hero-glow` dourado da página inicial
  aparece só quando a luta principal vale cinturão (dourado = título).
- **Pulso**: só o indicador "ao vivo". Nada pisca por decoração (nem o "hoje" do calendário).
- **Contadores (`CountUp`)**: só no número principal de uma seção.
- Entradas ao rolar (`Reveal`): curtas. Transições com easing, sem mola (spring) em controles.
- Respeite `prefers-reduced-motion`. Um efeito marcante por tela vale mais que vários sutis.

### 7b. Regras de movimento (Motion Principles, out/2026)

Base: skill [design-motion-principles](https://github.com/kylezantos/design-motion-principles), peso principal
Jakub Krehel (acabamento sutil de produto) e secundário Emil Kowalski (contenção, frequência).

- **Anima com motivo**: orientação (página nova, troca de aba), continuidade (foto que voa da lista ao perfil),
  retorno (dado chegou, palpite marcado) ou progresso (barra do topo). Sem motivo, não anima.
- **Frequência**: o que a pessoa faz dezenas de vezes (atalhos de teclado, hover em linhas, filtros) é instantâneo ou
  quase. Nada de zoom em hover em tudo.
- **Entrada** = opacidade + translateY curto (6 a 8px) + desfoque leve opcional. **Saída** mais discreta e mais
  rápida que a entrada (diálogo: entra em 200ms, sai em 120ms).
- **Curva**: `cubic-bezier(0.22, 1, 0.36, 1)` (`--ease-out-soft`) em tudo. Nunca `ease` puro.
- **Só `transform`, `opacity` e `filter`**. Nunca largura, altura, `top` ou `left`.
- **Origem**: tooltips e menus crescem a partir do gatilho (`--radix-*-transform-origin`), não do centro.
- **Carregamento**: toda tela tem esqueleto com o contorno real (e `role="status"` com nome); a troca esqueleto →
  conteúdo faz o fade de entrada da página (`.page-stage`); a barra do topo (`TopProgress`) só acende depois de
  250ms e só para dados que a pessoa pediu, nunca na atualização automática.
- **Deslize lateral** (cantos que entram de lado) exige `overflow-x-clip` no contêiner, senão cria rolagem lateral
  no celular durante a animação. O teste de ponta a ponta pega isso.
- **Laço**: só o ponto "ao vivo". Nada de pulsar, respirar ou flutuar para chamar atenção.
- **Reduzir movimento**: `MotionConfig reducedMotion="user"` cobre todo o Motion; o CSS zera transições, a entrada
  de página e as animações de tooltip e diálogo.
- **Tela de entrada** (index.html + `src/lib/splash.ts`): só ao abrir pela página inicial, uma vez por aba
  (`?abertura` mostra de novo). O octógono se desenha, o nome sobe, a barra mostra o carregamento real; pronto o site,
  aparece "Soar o gongo" e a tela espera (fundo à deriva, anel do octógono respirando). Clique, toque, rolagem ou tecla
  levam ao início, que entra em sequência (faixa, cabeçalho, conteúdo). Animações de entrada próprias esperam a tela
  sair (`useSplashGone`). Link direto para lutador ou luta não passa por ela.
- **Menu (gota)**: uma crista de líquido na linha de base marca a seção; ao trocar ela escorre esticada até o item
  e uma gotinha sobe até o texto. Nada anima ao abrir o site, só depois de uma troca.
- **Carrossel dos campeões**: o do centro em cor, os lados em cinza e menores; sem rolagem automática.

## 8. Texto

- **Manchete, não categoria**: título com verbo montado dos dados ("Volkanovski vence Evloev e fica com o cinturão"),
  nunca "Últimos resultados". Sem rótulo pequeno acima do título (eyebrow).
- **Frase, não cadeia de "·"**: "Sábado, 24 de outubro, na Etihad Arena." e "Daqui a 7 dias, com 13 lutas."
- **Lide em vez de fichas de contagem**: uma frase que conta a noite, com as palavras-chave sublinhadas na cor do método.
- **Títulos de seção em caixa normal**; caixa alta condensada só nos nomes dos lutadores no banner.
- **Links com verbo do contexto**: "Todos os resultados", "Ver o card inteiro", "Abrir o calendário".

- Específico e factual: nomes, números, datas ("Disputa de cinturão do peso-pena"). Nada de "eleve", "descubra",
  "experiência única".
- Fonte dos dados sempre visível (UFC.com, ESPN, BestFightOdds).
- pt-BR, horários de Brasília.

## 9. Imagens

- Somente fotos reais dos atletas (UFC.com/ESPN, via `/img` em WebP) e bandeiras. Sem banco de imagens nem ilustrações
  genéricas. O único desenho é o octógono em linhas finas no topo da luta.

## 9b. Regras contra a cara de "feito por IA" (revisão de out/2026)

- **Caixa-alta só em títulos grandes** (`.display`). Rótulos, botões, menu e etiquetas em caixa normal.
- **Etiqueta é texto**, não caixinha: `Tag` sem fundo. Selo com fundo só para alerta (zebra, vitória, ao vivo).
- **Sombras nítidas**: contorno de 1px e uma linha na borda de baixo. Nada de sombra cinza difusa nem brilho colorido.
- **Movimento com motivo**: nada de fade em toda seção ao rolar; anima número que conta, barra que cresce e resposta a clique.
  Transições só das propriedades que mudam (nunca `transition-all`).
- **Cantos em hierarquia**: controles ~6px < cartões internos ~11px; pílula só em avatar e alternador.
- **Espaçamento na grade de 4px** (8px nos espaços maiores): nada de meio passo (2, 6, 10, 14px).
- **Ícones de um conjunto só** (Hugeicons + os desenhados do site, como o cinturão); nunca símbolo digitado (★ ✓) nem emoji.
- **O início muda com o momento**: ao vivo ou resumo da noite (até 3 dias depois).

## 10. Checklist antes de publicar

1. As cores saíram dos tokens e cada uma tem um papel da tabela?
2. Os tamanhos de fonte estão na escala?
3. Existe um protagonista claro na tela?
4. Nenhuma rolagem horizontal em 390px?
5. **Teste do olhar de fora:** olhar a captura da tela como quem nunca viu o site e perguntar "qual ferramenta de IA fez
   isso?". Se a resposta vier fácil (caixinhas em caixa-alta, sombra difusa, tudo arredondado igual), revisar pela seção 9b.
6. `npx impeccable detect --json --no-design-system <url>` sem achados novos (o único restante conhecido é o letreiro rolante
   de próximos eventos no topo, escolha deliberada).
