# OctagonIQ

Hub de dados do UFC em tempo real: calendário, cards e resultados, rankings oficiais, perfil completo de cada lutador (bio, estatísticas oficiais, histórico luta a luta) e comparação frente a frente. Interface em português, horários de Brasília.

## Stack

- **React 19 + TypeScript + Vite 8**, rotas com React Router 7 e páginas em chunks separados
- **TanStack Query 5**: cache no cliente; o card ao vivo se atualiza a cada 20 s
- **Tailwind CSS 4 + shadcn/ui (Radix)**: design system em `src/styles.css`; componentes acessíveis (diálogo, comando ⌘K, carrossel, tooltip) em `src/components/ui`
- **Motion**: entradas ao rolar, contadores e transições da navegação
- **Embla Carousel**: carrossel de campeões
- **ECharts 6** (importação modular, renderer SVG) para os gráficos
- **three.js**: boneco 3D dos golpes por região na página da luta (carregado só nessa aba). Modelo "Universal Base Characters", de [Quaternius](https://quaternius.itch.io/universal-base-characters), licença CC0 (créditos em `public/models/CREDITS.txt`)
- **BFF em Node** (`server/`): consolida as fontes, normaliza para tipos próprios e guarda cache
- Tipografia: Saira (títulos, rótulos e botões) e Inter (texto e tabelas), via `@fontsource`. Regras de design em [`design.md`](design.md)
- **Phosphor Icons** (duotone) nos ícones; **circle-flags** e **flag-icons** (SVG) nas bandeiras; **i18n-iso-countries** no servidor para converter o país da ESPN em código ISO e nome em pt-BR

## Identidade visual

Editorial, com modo claro e noturno (botão no cabeçalho; por padrão segue o sistema). Inspirada em landing pages de viagem: papel quente (`#faf8f4`), tinta azul-marinho (`#14183e`), vermelho UFC como acento e dourado nos CTAs e no cinturão. Os destaques usam os recortes de corpo inteiro do UFC.com sobre formas orgânicas, com cartões flutuantes. Resultados em selos octogonais (o símbolo da marca): verde (vitória), vermelho (derrota) e amarelo (empate); o tooltip mostra adversário, método e evento. O fundo de cada atleta usa a bandeira do seu país recortada na forma orgânica. As cores dos gráficos foram validadas para daltonismo na superfície branca.

## Desempenho

Nenhuma das fontes oferece uma API rápida para tudo; o atraso vem de montar um perfil a frio (cerca de 60 chamadas, ~3 s). O OctagonIQ evita que alguém espere por isso:

- **Cache persistente** (`.cache/aggregates.json`): perfis, eventos e rankings sobrevivem a reinícios do servidor.
- **Stale-while-revalidate**: um dado vencido é entregue na hora e atualizado em segundo plano (até 3 dias de idade).
- **Aquecimento**: ao subir, o servidor carrega rankings, agenda e os perfis dos lutadores dos dois próximos cards e dos campeões; renova a cada 30 min.
- **No navegador**: perfis e eventos são pré-carregados quando o ponteiro para sobre um link, e as consultas ficam salvas no `localStorage` por 24 h.

Medido: perfil a frio 3,3 s → servido do cache em ~1 ms, mesmo após reiniciar.

## Rodar

```bash
npm install
npm run dev          # http://localhost:5173 (front + /api no mesmo servidor)
npm run build        # checagem de tipos + build em dist/
npm start            # servidor de produção: dist/ + /api em http://localhost:4173
```

Requer Node 22.18 ou mais recente: o servidor roda TypeScript direto, sem etapa de compilação.

## Fontes de dados

Nenhuma exige chave de API.

| Fonte | Uso | Como |
|---|---|---|
| ESPN (API pública, não documentada) | calendário anual, cards, resultados com método, round e tempo; bio; histórico completo; estatísticas por luta; notícias; busca; fotos | JSON (`site.api`, `sports.core.api`, `site.web.api`) |
| UFC.com (ufc.com.br) | rankings oficiais; estatísticas oficiais de carreira (golpes/min, defesa, quedas/15 min, alvo, posição); bio oficial | leitura do HTML no servidor |
| UFC Fight Tracker (`d29dxerjsp82wz.cloudfront.net`) | placar dos juízes e estatísticas ao vivo | mapeado, ainda não integrado (próxima etapa) |

**Tapology e Sherdog** não têm API. O Tapology bloqueia acesso automatizado (desafio do Cloudflare) e os termos do Sherdog proíbem copiar ou redistribuir o conteúdo, então eles entram só como links no perfil de cada lutador.

As APIs da ESPN não são oficiais e podem mudar sem aviso; o HTML do UFC.com também. Todos os adaptadores ficam isolados em `server/espn.ts` e `server/ufc.ts`.

**Identidade do lutador:** a URL usa o slug do UFC.com (`/lutadores/islam-makhachev`). O id da ESPN é resolvido pela busca v2, só com nome equivalente; em caso de homônimos, vence o cartel mais próximo do oficial. Sem correspondência segura, o perfil aparece sem histórico, nunca com o de outra pessoa.

## Estrutura

```
shared/      tipos do domínio e traduções pt-BR (usados pelo servidor e pela interface)
server/
  http.ts        fetch com cache TTL, deduplicação, limite por host e fallback para o valor antigo
  espn.ts        adaptador ESPN
  ufc.ts         adaptador UFC.com
  routes.ts      rotas /api/* (independentes de framework)
  dev-plugin.ts  monta as rotas no servidor do Vite
  index.ts       servidor de produção
src/
  lib/           cliente da API (hooks) e formatação
  components/    layout (faixa de próximos eventos, busca ⌘K), linha de luta, gráficos, primitivos de UI
  pages/         Início, Eventos, Evento, Rankings, Lutadores, Lutador, Comparar
legacy/      versão anterior (HTML/JS puro com dados estáticos), mantida como referência
```

## API interna

| Rota | Retorno |
|---|---|
| `GET /api/upcoming?limit=8` | próximos eventos com a luta principal |
| `GET /api/schedule?year=2026` | calendário do ano |
| `GET /api/events/:id` | card completo, resultados e horário de cada segmento |
| `GET /api/rankings` | rankings oficiais (13 divisões) |
| `GET /api/rankings/meta` | bandeira, cartel e id ESPN de cada ranqueado |
| `GET /api/fighters/:slug?espn=` | perfil completo |
| `GET /api/search?q=` | busca de lutadores |

## Publicar no Vercel

O build `npm run vercel-build` gera `.vercel/output` no formato da [Build Output API](https://vercel.com/docs/build-output-api/v3):
o site estático (`dist/`) e a API empacotada numa função serverless (`server/vercel.ts`, mesmas rotas de `server/routes.ts`).
O `vercel.json` já aponta para esse comando.

1. Envie o repositório para o GitHub.
2. Em [vercel.com](https://vercel.com), **Add New → Project**, importe o repositório e clique em **Deploy** (nenhuma configuração extra).

No Vercel o cache fica em `/tmp`, que só dura enquanto a instância da função estiver ativa; as respostas da API também
ficam na CDN do Vercel (`s-maxage`). Um perfil montado a frio leva alguns segundos (limite da função: 60 s).
