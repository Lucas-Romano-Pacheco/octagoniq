# OctagonIQ: produto

O que o site faz, para quem e qual é o trabalho de cada tela. As regras visuais estão em [`design.md`](design.md).

## Para quem

- **Fã de UFC que fala português** e quer, num lugar só, o que hoje está espalhado entre UFC.com, ESPN, Tapology e sites
  de odds: quando é o próximo evento, quem ganhou, quem está ranqueado e como dois lutadores se comparam.
- **Quem acompanha ao vivo** e abre o site no celular durante o evento para ver a luta em andamento e os resultados.
- **Quem dá palpites** com os amigos e quer anotar vencedor, método e round antes do card.

## Objetivos

1. Responder em segundos às perguntas do fã: "quando é?", "quem ganhou?", "quem é melhor?".
2. Mostrar dados oficiais, com a fonte visível, em pt-BR e no horário de Brasília.
3. Funcionar bem no celular, inclusive durante o evento ao vivo.
4. Ser um projeto de portfólio legível: código organizado, testado e com decisões documentadas.

Não é objetivo: notícias próprias, apostas, contas obrigatórias, cobrir outras organizações além do UFC.

## Telas e o trabalho de cada uma

| Rota | Tela | Trabalho principal | Protagonista |
|---|---|---|---|
| `/` | Início | dizer qual é o próximo evento e o que aconteceu no último | contagem regressiva e luta principal |
| `/eventos` | Eventos | achar um evento no calendário do mês | o próximo evento e a grade do mês |
| `/eventos/:id` | Evento | ver o card completo, os resultados e o que está ao vivo | a luta principal e a faixa ao vivo |
| `/eventos/:id/lutas/:luta` | Luta | entender uma luta: estatísticas, odds, cartões dos juízes ou, se futura, a prévia | o confronto vermelho × azul |
| `/rankings/:divisão?` | Rankings | ver quem é o campeão e o top 15 de cada divisão | o campeão |
| `/lutadores` | Lutadores | encontrar um lutador (busca e filtros) | a busca |
| `/lutadores/:slug` | Lutador | conhecer a carreira: cartel, estatísticas comparadas à divisão, histórico | cartel e foto |
| `/comparar` | Comparar | decidir quem leva vantagem entre dois lutadores | o placar de vantagens |
| `/palpites/:id?` | Palpites | palpitar no card e ver a pontuação depois do evento | os pontos |
| `/palpites/:id?aba=ranking` | Ranking | ver quem está na frente e o que cada um palpitou nas lutas que já começaram | o 1º lugar |
| `/entrar` | Entrar | entrar ou criar conta com apelido e senha, e voltar para onde estava | o apelido no cartaz |
| `/conta` | Minha conta | ver a pontuação somada e trocar a senha | os pontos |
| `/sobre` | Sobre | explicar fontes, stack e autoria | o texto |

## Princípios

- **Dado antes de enfeite.** Se um elemento não ajuda a responder a pergunta da tela, sai.
- **Nunca o dado errado.** Sem correspondência segura entre fontes, a informação some; não aparece a de outra pessoa
  (ex.: perfil sem histórico em vez de histórico de um homônimo).
- **Rápido a quente.** Tudo vem do cache (servidor e navegador); só o primeiro acesso a um lutador espera as fontes.
- **Conta só para o que precisa dela.** Navegar e montar o rascunho dos palpites não pede login; salvar e pontuar, sim
  (cada pessoa com a sua conta, no banco).
