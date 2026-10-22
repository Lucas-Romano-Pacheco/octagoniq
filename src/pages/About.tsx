import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowSquareOut, Browser, Database, GithubLogo, HardDrives, Lightning } from '@phosphor-icons/react';
import { PageHeader, usePageTitle } from '@/components/kit';

/* Sobre o projeto: o raciocínio por trás do site (arquitetura, fontes, cache e decisões), para quem avalia o portfólio. */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rule">
      <h2 className="panel-title pb-4">{title}</h2>
      {children}
    </section>
  );
}

const Box = ({ icon, title, lines, tone }: { icon: ReactNode; title: string; lines: string[]; tone: string }) => (
  <div className="cut flex-1 rounded-xl bg-surface p-4 ring-1 ring-fg/[0.06]">
    <div className="flex items-center gap-2 font-display text-[14px] font-bold uppercase tracking-[0.05em] text-fg">
      <span className={`grid h-8 w-8 place-items-center rounded-full ${tone}`}>{icon}</span>{title}
    </div>
    <ul className="mt-3 space-y-1 text-[14px] text-fg-2">{lines.map(l => <li key={l}>{l}</li>)}</ul>
  </div>
);

const Arrow = () => <div className="grid place-items-center py-1 text-fg-3 lg:px-1 lg:py-0"><ArrowRight weight="bold" className="h-5 w-5 rotate-90 lg:rotate-0" /></div>;

const NUMBERS: [string, string, string][] = [
  ['3,3 s → 1 ms', 'perfil de um lutador', 'montado a frio (≈60 chamadas às fontes) contra servido do cache'],
  ['4', 'fontes de dados', 'ESPN, UFC.com, UFC Fight Tracker e BestFightOdds, unificadas em tipos próprios'],
  ['93 KB', 'modelo 3D', 'boneco CC0 só com o corpo, geometria quantizada e comprimida (meshopt)'],
  ['0', 'chaves de API', 'tudo vem de endpoints e páginas públicos; nada a esconder no repositório'],
];

const DECISIONS: [string, string][] = [
  ['Um BFF em vez de chamar as fontes do navegador', 'As fontes têm formatos, limites e CORS diferentes. O servidor junta tudo, traduz para português e devolve um JSON pronto para a tela, com o mesmo código no desenvolvimento, no Node e numa função serverless do Vercel.'],
  ['Cache stale-while-revalidate em memória e em disco', 'Um dado vencido é entregue na hora e atualizado em segundo plano. Perfis, eventos e rankings sobrevivem a reinícios, e um aquecimento carrega de antemão os próximos cards e os campeões.'],
  ['Rankings só do UFC.com', 'A ESPN tinha rankings desatualizados (um ex-campeão ainda em 1º). Os rankings oficiais vêm do HTML do UFC.com; a ESPN completa com histórico, fotos e odds.'],
  ['Identidade do lutador conferida', 'Nomes iguais ou digitados errado existem nas fontes. O servidor só aceita nome equivalente e desempata por cartel, divisão e número de lutas, e descarta cadastros duplicados sem foto.'],
  ['Odds históricas do BestFightOdds', 'A ESPN apaga as linhas semanas depois da luta. Para lutas encerradas, o histórico do BestFightOdds dá abertura e fechamento, com crédito na tela.'],
  ['Respeito aos termos de cada site', 'Tapology e Sherdog não têm API e os termos não permitem reaproveitar o conteúdo: aparecem só como link. Imagens de banco ou modelos sem licença não foram usados.'],
  ['Prévias para compartilhar', 'Robôs de WhatsApp e LinkedIn não executam JavaScript. O servidor reconhece esses robôs e escreve as meta tags da página, com uma imagem gerada na hora (satori + resvg).'],
  ['Peso só onde é usado', 'Cada página é um pedaço separado do código; o 3D (three.js) só é baixado na aba "Por alvo". Sem WebGL ou com "reduzir movimento", o site cai para versões mais simples.'],
];

export default function About() {
  usePageTitle('Sobre o projeto');
  return (
    <div className="space-y-12">
      <PageHeader title="Como o OctagonIQ foi feito"
        meta="Um hub de dados do UFC em português: eventos, resultados, rankings, odds e estatísticas de cada lutador. Projeto de portfólio, sem vínculo com o UFC ou a ESPN." />

      <Section title="Em números">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-line">
          {NUMBERS.map(([v, l, d], i) => (
            <div key={l} className={i ? 'lg:pl-6' : 'lg:pr-6'}>
              <div className="display whitespace-nowrap text-[44px] normal-case text-fg">{v}</div>
              <div className="label mt-1">{l}</div>
              <p className="mt-2 text-[14px] leading-relaxed text-fg-3">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Arquitetura">
        <div className="flex flex-col items-stretch lg:flex-row">
          <Box icon={<Browser weight="bold" className="h-4 w-4" />} tone="bg-blue/15 text-blue" title="Navegador" lines={['React 19 + TypeScript + Vite', 'TanStack Query (cache no navegador)', 'Tailwind 4, Motion, ECharts, three.js']} />
          <Arrow />
          <Box icon={<HardDrives weight="bold" className="h-4 w-4" />} tone="bg-brand-soft text-brand" title="BFF em Node (/api)" lines={['Rotas próprias e tipos compartilhados', 'Cache SWR em memória + disco', 'Prévias Open Graph (/og)']} />
          <Arrow />
          <Box icon={<Database weight="bold" className="h-4 w-4" />} tone="bg-gold-soft text-gold-ink" title="Fontes" lines={['ESPN: eventos, histórico, odds', 'UFC.com: rankings e estatísticas', 'Fight Tracker: juízes e bônus', 'BestFightOdds: odds antigas']} />
        </div>
        <p className="mt-4 flex max-w-[68ch] items-start gap-2 text-[14px] text-fg-3">
          <Lightning weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          Publicado no Vercel: o site estático vai pela CDN e a API roda como função serverless, com as respostas também guardadas na CDN.
        </p>
      </Section>

      <Section title="Decisões">
        <dl className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {DECISIONS.map(([t, d]) => (
            <div key={t}>
              <dt className="text-[16px] font-semibold text-fg">{t}</dt>
              <dd className="mt-1.5 max-w-[62ch] text-pretty text-[14px] leading-relaxed text-fg-2">{d}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Créditos">
        <ul className="space-y-2 text-[14px] text-fg-2">
          <li>Dados: ESPN, UFC.com, UFC Fight Tracker e BestFightOdds. Fotos dos atletas servidas pelas próprias fontes.</li>
          <li>Modelo 3D: <a className="link" href="https://quaternius.itch.io/universal-base-characters" target="_blank" rel="noreferrer">Universal Base Characters, de Quaternius</a> (CC0).</li>
          <li>Bandeiras: circle-flags e flag-icons. Ícones: Phosphor. Fontes: Saira e Inter.</li>
        </ul>
      </Section>

      <section className="cut flex flex-wrap items-center justify-between gap-6 rounded-xl bg-fg p-8 text-bg">
        <div>
          <div className="label text-bg/70">Feito por</div>
          <div className="display mt-1 text-[32px]">Lucas Pacheco</div>
          <p className="mt-1 text-[14px] text-bg/70">Estudante de Ciência da Computação.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href="https://github.com/Lucas-Romano-Pacheco/octagoniq" target="_blank" rel="noreferrer" className="btn-primary"><GithubLogo weight="bold" className="h-4 w-4" /> Código no GitHub <ArrowSquareOut className="h-3.5 w-3.5" /></a>
          <Link to="/" className="btn border-bg/20 bg-transparent text-bg hover:bg-bg/10">Voltar ao site</Link>
        </div>
      </section>
    </div>
  );
}
