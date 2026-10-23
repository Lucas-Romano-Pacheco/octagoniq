# Guia de UI/UX portátil

Tudo que funcionou (e o que foi cortado) no OctagonIQ, em forma de regras que valem para qualquer projeto web.
Cada item diz o quê, por quê e como verificar. Os exemplos de código usam React, Tailwind e Motion, mas as regras não dependem deles.

---

## 1. Referências

| Referência | Para que serve |
|---|---|
| [kylezantos/design-motion-principles](https://github.com/kylezantos/design-motion-principles) | Skill de movimento: portão de frequência, curvas, regras de entrada e saída, acessibilidade. Peso usado: principal Jakub Krehel (acabamento sutil), secundário Emil Kowalski (contenção). |
| codeandchill.store (componentes: Atlas, Ripcord, Surge, Crest) | Ideias de componentes. Atlas: carrossel com o item central em cor. Ripcord: progresso dentro do botão. Surge: sublinhado animado no menu. Crest: crista de líquido que escorre entre abas. Use como inspiração, não copie igual. |
| anti-ai-slop (repositório de regras), robotsonpayroll, uxplanet | Listas do que denuncia uma interface "feita por IA". Procure pelos nomes; as regras úteis estão na seção 3. |
| Impeccable (detector de design) | Aponta padrões de template. Ele pode reclamar de escolhas deliberadas, e tudo bem: decida você, mas decida. |
| Validador de paleta (skill dataviz) | Calcula se as cores se distinguem para daltônicos. Não confie no olho. |
| Biome, dependency-cruiser, Knip, commitlint, Stryker, Playwright, Vitest | Ferramentas de qualidade da seção 8. |

---

## 2. Direção visual

1. **Escolha um clima e dê um protagonista por tela.** Ex.: "página esportiva editorial: jornal, placar, cartaz". Cada tela tem um número, uma foto ou um confronto que domina; o resto apoia.
2. **Cor diz algo.** Cada cor tem um papel (marca, resultado, destaque, estado). Se uma cor decora, corte.
3. **Fotos reais, nunca banco de imagens nem ilustração genérica.** Se não há foto, use um avatar com iniciais.
4. **Texto específico e factual.** Nomes, números, datas. Banidos: "eleve", "descubra", "experiência única", "saiba mais", "ver detalhes".
5. **Botões dizem o que acontece**: "Ver as 13 lutas", "Comparar A e B".
6. **Mostre a fonte dos dados** onde o dado aparece.

---

## 3. Contra a "cara de IA"

O que mais entrega uma interface gerada, e o que fazer no lugar:

| Sinal | No lugar |
|---|---|
| Tags em pílula, caixa alta e espaçamento largo em tudo | Texto em caixa normal; use cor ou peso para distinguir. Caixa alta só em título curto de display. |
| Fonte padrão (Inter) | Uma fonte de display com caráter (grotesca estreita de jornal, serifada editorial) + uma de texto + uma monoespaçada para números. |
| "Eyebrow" (texto miúdo em caixa alta acima do título) | Contexto numa linha de meta abaixo do título. |
| Fundo creme/bege em tudo | Branco levemente tingido do mesmo matiz da tinta. Creme só em destaques. |
| Gradiente roxo/índigo, texto com gradiente | Cor sólida. |
| Vidro fosco (blur) como padrão | Superfície opaca com anel de 1px. |
| Grade de 3 cards iguais com ícone em cima | Grade assimétrica (2/3 + 1/3), item principal maior. |
| Card dentro de card | Seção com régua no topo e conteúdo direto no fundo. |
| Sombra em tudo | Anel de 1px + diferença de superfície. Sombra só em camadas flutuantes. |
| Barra lateral colorida em itens de lista | Hover que desloca 2px e tinge o fundo. |
| Fade-in em toda seção ao rolar | Anime só o que tem motivo (seção 6). |
| Texto com `opacity` | Tokens `fg-2` e `fg-3`. |
| Todos os números do mesmo tamanho | Primeiro item em 64, os demais em 32. |

**Teste de apertar os olhos (squint test):** desfoque a tela. Se não dá para dizer qual é o protagonista nem onde o olho começa, a hierarquia falhou.

---

## 4. Tokens

- **Cores em OKLCH** (`oklch(L% C H)`): para clarear ou escurecer, mude só o L. Guarde o hexadecimal equivalente numa tabela.
- **Papéis de cor**, com variantes claro e escuro para cada um: fundo, superfície (3 níveis), linha (2), texto (3 níveis), marca, destaque (ex.: dourado só para campeão), cantos de um confronto (vermelho e azul), resultado (ganhou, perdeu, empate), tipos (uma cor por categoria).
- **Sufixos que evitam erro de contraste:** `*-fill` é fundo com texto branco (AA garantido); `*-ink` é texto colorido sobre fundo claro.
- **Todo estado leva ícone e texto**, nunca só cor (acessibilidade e daltonismo). Valide a paleta categórica com o script, não no olho.
- **Escala de tipo única, em px:** 12 · 13 · 14 · 16 · 18 · 20 · 24 · 32 · 44 · 64 · 72 · 96. Nada fora dela.
- **Grade de espaçamento de 4px.** Sem meios-passos (`p-1.5`, `gap-2.5`): arredonde para a unidade inteira.
- **Três raios:** controles (~11px), cards (12px), destaques grandes (~20px); pílulas só para o que é pílula de verdade.
- **Números de dados em fonte monoespaçada** (cartel, odds, placares) com `font-variant-numeric: tabular-nums`; o número gigante de título continua na fonte de display.
- **Parágrafos com `text-wrap: pretty`**; títulos com `text-wrap: balance`.

---

## 5. Layout e responsivo

- Títulos alinhados à esquerda; centralize só o confronto ou o herói.
- Celular primeiro: margem de 16px e **nenhuma rolagem horizontal em 390px**. Nomes longos quebram ou diminuem, nunca estouram.
- Grades que precisam encolher usam `minmax(0, 1fr)`, não `1fr` (senão o conteúdo empurra a coluna).
- Etiquetas com `whitespace-nowrap` dentro de colunas estreitas são suspeitas: prefira `flex-wrap` e `min-w-0`.
- Reserve a altura do conteúdo no esqueleto (`min-h`) para a página não saltar quando os dados chegam.
- Listas longas no celular: trilho horizontal com `scroll-snap`, em vez de empilhar 11 cartões.
- **Armadilha do deslize lateral:** elemento que entra de lado (`x: ±30`) cria rolagem horizontal durante a animação. Coloque `overflow-x: clip` no contêiner.

---

## 6. Movimento

Base: skill design-motion-principles. Regras que valem sempre:

1. **Portão de frequência primeiro.** O que a pessoa faz dezenas de vezes (atalho de teclado, hover em linha, filtro) é instantâneo ou quase. Nada de zoom em hover em tudo.
2. **Todo movimento tem motivo:** orientação (página nova, troca de aba), continuidade (foto que voa da lista ao perfil), retorno (dado chegou, palpite marcado) ou progresso. Sem motivo, remova.
3. **Entrada** = opacidade + `translateY` curto (6–8px) + desfoque leve opcional. **Saída mais discreta e mais rápida** que a entrada (diálogo: entra em 200ms, sai em 120ms).
4. **Uma curva só:** `cubic-bezier(0.22, 1, 0.36, 1)`. Nunca `ease` puro nem `ease-in-out`.
5. **Só `transform`, `opacity` e `filter`.** Nunca largura, altura, `top`, `left`.
6. **Nunca comece de `scale(0)`**; comece de 0.6 ou mais, com opacidade.
7. **Origem do transform:** tooltips e menus crescem a partir do gatilho, não do centro.
8. **Transições por estado (CSS) para o que pode ser interrompido**; keyframes só para o que roda sozinho.
9. **Nada em laço chamando atenção** (pulsar, respirar, flutuar). Exceção justificada: o ponto "ao vivo", que só existe enquanto algo está ao vivo.
10. **Reduzir movimento é obrigatório, no mesmo código.** `MotionConfig reducedMotion="user"` cobre o Motion; no CSS, `@media (prefers-reduced-motion: reduce)` zera animações e transições.
11. **Sem rolagem automática** em carrosséis: quem escolhe o ritmo é a pessoa.

### Carregamento e progresso
- **Toda tela tem esqueleto com o contorno real** da página (não blocos genéricos), com `role="status"` e `aria-label="Carregando …"`.
- O esqueleto da rota (enquanto o código da página carrega) é o **mesmo** do carregamento dos dados: sem tela vazia entre os dois.
- **Barra de progresso no topo**: só para dados que a pessoa pediu (consulta ainda sem dados), nunca na atualização automática em segundo plano; só aparece depois de 250ms; avança rápido e desacelera até 85%; ao terminar, completa e some.
- **Imagens abaixo da dobra com `loading="lazy"`**; a imagem principal com `fetchPriority="high"`.
- **Página e troca esqueleto → conteúdo entram com fade curto** (280ms, sobe 6px).

### Peças que funcionaram
- **Tela de entrada:** só na primeira visita da aba e só pela página inicial (link direto vai ao conteúdo). O logo se desenha, a barra mostra o carregamento real; pronto o site, aparece "Entrar" e a tela **espera** clique, toque, rolagem ou tecla. O site atrás fica inerte (`inert`, sem rolagem, a tecla não dispara atalhos). Fica no próprio HTML para cobrir o tempo em branco, e sai sozinha se o JavaScript falhar. `?abertura` força a exibição.
- **Menu com gota (Crest):** uma crista na linha de base marca a seção; ao trocar, escorre esticada (mola) até o novo item e uma gotinha sobe até o texto. Ao abrir o site já está parada no lugar; no celular, o menu rola até o item ativo.
- **Carrossel com item central (Atlas):** central em cor e maior, laterais cinza e menores, `scroll-snap`, abre no item do meio, tocar num lateral o traz ao centro.
- **Segmented control** (Masculino / Feminino) em vez de dois botões soltos.

---

## 7. Acessibilidade

- Contraste AA em todo texto; cor nunca sozinha.
- Botões com `type="button"`; navegações com `aria-label` quando houver mais de uma.
- Carrossel: `role="region"` + `aria-roledescription="carrossel"` + `aria-label`; cartão ativo com `aria-current`.
- Diálogos e tela de entrada: `role="dialog"`, `aria-modal`, foco no botão principal.
- Esqueletos anunciados uma vez por grupo (`role="status"` no contêiner).
- Alvos de toque de pelo menos 40px.
- Teste com "reduzir movimento" ligado e com tema escuro.

---

## 8. Qualidade e testes

| O quê | Ferramenta | Regra |
|---|---|---|
| Lint | **Biome** (formatador desligado para não reescrever o projeto) | Avisos intencionais levam `biome-ignore` com justificativa. |
| Arquitetura | **dependency-cruiser** | `shared` não importa o app; interface e servidor não se importam; páginas não importam outras páginas; sem ciclos. |
| Código morto | **Knip** | Rode antes de cada entrega; apague sobras de gerador (componentes não usados). |
| Commits | **commitlint** (Conventional Commits, assunto em português permitido) | `feat:`, `fix:`, `docs:`… |
| Unitário e integração | **Vitest + v8** | Piso de cobertura no CI; teste de integração chama a camada de rotas com a rede simulada. |
| Mutação | **Stryker** | Só em regras de negócio; piso do CI começa no que você tem e sobe. |
| Ponta a ponta | **Playwright** em desktop e celular (Pixel 7) | Toda página: **nenhuma rolagem lateral no celular**. Um teste de esqueleto atrasando a API. |
| Cobertura histórica | **Codecov** | O CI envia `lcov.info`. |

Dicas que valem ouro:
- Teste de ponta a ponta que mede `scrollWidth - clientWidth <= 1` em cada página pega o bug de layout mais comum no celular.
- Amostre o overflow **a cada quadro** (`requestAnimationFrame`) durante a animação; o bug aparece só em instantes.
- Teste intermitente nunca é "flaky": é um bug de temporização. Reproduza com `--repeat-each`.
- Capture quadros da animação em screenshots para ver o movimento de verdade, não só o estado final.

---

## 9. Observabilidade (opcional, por variável de ambiente)

- **Sentry**: erros de tela, consultas que falharam (ignorando 404) e Web Vitals. No navegador, carregue o pacote no tempo ocioso, depois da primeira pintura.
- **OpenTelemetry com exportação OTLP/HTTP**: o mesmo código serve para New Relic, Datadog, Grafana etc.; só mudam endpoint e cabeçalho.
- Em função serverless, instrumente chamadas externas pela instrumentação do `undici` e envie os dados **depois** da resposta.
- Tudo desligado quando a variável não existe (nenhum pacote extra é baixado).

---

## 10. Checklist antes de publicar

- [ ] Existe um protagonista por tela? (teste de apertar os olhos)
- [ ] Nenhum sinal da tabela da seção 3?
- [ ] Toda cor tem papel; todo estado tem ícone e texto?
- [ ] Tamanhos de fonte só da escala; espaçamentos só da grade de 4px?
- [ ] Todo movimento tem motivo, usa a curva única e só `transform`/`opacity`/`filter`?
- [ ] Toda tela tem esqueleto com o contorno real?
- [ ] "Reduzir movimento" testado?
- [ ] Sem rolagem lateral em 390px?
- [ ] Lint, arquitetura, código morto e testes passam?
