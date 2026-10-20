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
| `orange-fill` / `orange-ink` | `#c4501d` / `#9a3d16` | `#c4501d` / `#f39a6e` | zebra (azarão venceu) e nocaute |
| `aqua-fill` | `#13865c` | `#13865c` | finalização |
| `slate-fill` | `#5b6178` | `#4a5070` | decisão, Dana White's Contender Series |
| `win` / `loss` / `draw` | `#13834a` / `#c8323a` / `#9a6700` | `#45d08a` / `#ff6b72` / `#f5c542` | resultado, sempre com ícone |

No CSS os tokens estão em **OKLCH** (`oklch(L% C H)`); a tabela mostra o hexadecimal equivalente. Para clarear ou escurecer
uma cor, mude só o L. Quem precisa de hexadecimal (o boneco 3D) converte na hora.

Regras:
- **`*-fill`** é fundo com texto branco (contraste AA garantido). **`*-ink`** é texto colorido sobre fundo claro. As versões
  sem sufixo (`red`, `blue`, `orange`, `aqua`) servem para traços, gráficos e fundos com `/15` de opacidade.
- Tipos de evento: numerado em `brand`, Fight Night em `blue-fill`, DWCS em `slate-fill`.
- Método: nocaute `orange-fill`, finalização `aqua-fill`, decisão `slate-fill`.
- Proibido: dourado em botão comum, gradiente roxo ou índigo, texto com gradiente, vidro fosco como padrão,
  texto com `opacity` (use `fg-2`/`fg-3`).

## 3. Tipografia

- **Saira** (`font-display`, largura variável): títulos (`.display`, caixa alta, 700, entrelinha 0,95), títulos de seção
  (`.panel-title`), rótulos (`.label`), botões e menu.
- **IBM Plex Sans** (`font-sans`, variável): texto corrido, tabelas, gráficos e as imagens de prévia (`server/og.ts`).
  Números em tabela levam `.num` (algarismos tabulares).
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
- **Ícones**: Phosphor. Os glifos de resultado (vitória, derrota, empate) são SVG próprios em `kit.tsx`, traço 2,9.
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

## 8. Texto

- Específico e factual: nomes, números, datas ("Disputa de cinturão do peso-pena"). Nada de "eleve", "descubra",
  "experiência única".
- Fonte dos dados sempre visível (UFC.com, ESPN, BestFightOdds).
- pt-BR, horários de Brasília.

## 9. Imagens

- Somente fotos reais dos atletas (UFC.com/ESPN, via `/img` em WebP) e bandeiras. Sem banco de imagens nem ilustrações
  genéricas. O único desenho é o octógono em linhas finas no topo da luta.

## 10. Checklist antes de publicar

1. As cores saíram dos tokens e cada uma tem um papel da tabela?
2. Os tamanhos de fonte estão na escala?
3. Existe um protagonista claro na tela?
4. Nenhuma rolagem horizontal em 390px?
5. `npx impeccable detect --json --no-design-system <url>` sem achados novos (o único restante conhecido é o letreiro rolante
   de próximos eventos no topo, escolha deliberada).
