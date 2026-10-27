import { StrictMode, lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Link, RouterProvider, useRouteError } from 'react-router-dom';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider, removeOldestQuery } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

import '@fontsource/archivo-narrow/500.css';      // títulos e números grandes: grotesca estreita de jornal esportivo
import '@fontsource/archivo-narrow/600.css';
import '@fontsource/archivo-narrow/700.css';
import '@fontsource-variable/montserrat';         // texto (tudo que não é título), a fonte do template de referência
import '@fontsource/ibm-plex-mono/500.css';        // números (cartel, odds, estatísticas): cara de placar, mesma família do texto
import '@fontsource/ibm-plex-mono/600.css';     // texto e tabelas (Inter era a fonte padrão mais usada por interfaces geradas)
import './styles.css';

import { Layout } from '@/components/Layout';
import { ErrorState, OctagonMark, Panel, Skeleton } from '@/components/kit';
import { EventSkeleton, FightSkeleton, FighterSkeleton } from '@/components/Skeletons';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ApiError } from '@/lib/api';
import { initObservability, reportError } from '@/lib/observability';
import { hideSplash } from '@/lib/splash';
import { MotionConfig } from 'motion/react';
import Home from '@/pages/Home';

// Páginas secundárias em chunks separados
const Events = lazy(() => import('@/pages/Events'));
const Event = lazy(() => import('@/pages/Event'));
const Rankings = lazy(() => import('@/pages/Rankings'));
const Fighters = lazy(() => import('@/pages/Fighters'));
const Fighter = lazy(() => import('@/pages/Fighter'));
const Compare = lazy(() => import('@/pages/Compare'));
const FightPage = lazy(() => import('@/pages/Fight'));
const About = lazy(() => import('@/pages/About'));
const Picks = lazy(() => import('@/pages/Picks'));
const Login = lazy(() => import('@/pages/Login'));
const Account = lazy(() => import('@/pages/Account'));

/* Enquanto o código da página chega, já aparece o esqueleto com o contorno dela (o mesmo do carregamento dos dados),
   para a troca esqueleto → conteúdo não pular de formato. */
const GenericSkeleton = () => <div role="status" aria-busy="true" aria-label="Carregando a página"><Skeleton className="h-[1200px]" /></div>;
const page = (el: React.ReactNode, Fallback: React.ComponentType = GenericSkeleton) => <Suspense fallback={<Fallback />}>{el}</Suspense>;

/* 404 temática: o "placar" da página que não existe */
const NotFound = () => (
  <div className="mx-auto max-w-2xl py-16 text-center">
    <OctagonMark className="mx-auto h-16 w-16" />
    <div className="display mt-6 text-[96px] leading-none text-fg sm:text-[96px]">404</div>
    <h1 className="display mt-2 text-[32px] text-fg sm:text-[44px]">Nocaute no 1º round</h1>
    <p className="mt-4 text-[16px] text-fg-2">Essa página não resistiu à primeira troca: o endereço não existe ou mudou de lugar.</p>
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <Link to="/" className="btn-primary">Voltar ao início</Link>
      <Link to="/lutadores" className="btn">Buscar um lutador</Link>
    </div>
  </div>
);

/* Qualquer erro de renderização cai aqui, sem derrubar o layout inteiro. */
function RouteError() {
  const err = useRouteError();
  console.error(err);
  useEffect(() => { reportError(err, { where: 'rota' }); }, [err]);
  return (
    <Panel className="mx-auto mt-10 max-w-xl">
      <ErrorState title="Golpe ilegal na página" message="Algo deu errado ao montar esta tela. Recarregar costuma resolver." onRetry={() => location.reload()} />
      <div className="pb-8 text-center"><Link to="/" className="link text-[14px]">Voltar ao início</Link></div>
    </Panel>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { errorElement: <RouteError />, children: [
      { index: true, element: <Home /> },
      { path: 'eventos', element: page(<Events />) },
      { path: 'eventos/:id', element: page(<Event />, EventSkeleton) },
      { path: 'eventos/:id/lutas/:fight', element: page(<FightPage />, FightSkeleton) },
      { path: 'rankings/:div?', element: page(<Rankings />) },
      { path: 'lutadores', element: page(<Fighters />) },
      { path: 'lutadores/:slug', element: page(<Fighter />, FighterSkeleton) },
      { path: 'comparar', element: page(<Compare />) },
      { path: 'palpites/:id?', element: page(<Picks />) },
      { path: 'sobre', element: page(<About />) },
      { path: 'entrar', element: page(<Login />) },
      { path: 'conta', element: page(<Account />) },
      { path: '*', element: <NotFound /> },
      ] },
    ],
  },
]);

const queryClient = new QueryClient({
  // consulta que falhou de vez (depois do retry) vai para o Sentry; 404 é resposta normal (lutador inexistente etc.)
  queryCache: new QueryCache({ onError: (e, q) => { if (!(e instanceof ApiError && e.status === 404)) reportError(e, { queryKey: q.queryKey }); } }),
  // gcTime ≥ maxAge do persister, senão as consultas somem antes de serem salvas
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, gcTime: 24 * 3600_000 } },
});

/* Cache do navegador: reabrir o site mostra os dados da última visita na hora
   (e atualiza em segundo plano). Sem localStorage, o site funciona normalmente. */
const PERSISTED = new Set(['fighter', 'rankings', 'rankings-meta', 'upcoming', 'schedule', 'event']);
const persister = createSyncStoragePersister({
  storage: (() => { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return localStorage; } catch { return undefined; } })(),
  key: 'octagoniq-cache',
  throttleTime: 2000,
  retry: removeOldestQuery, // estourou a cota: descarta a consulta mais antiga e tenta de novo
});

initObservability();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{
      persister,
      maxAge: 24 * 3600_000,
      buster: 'v4', // trocar quando o formato dos dados mudar
      dehydrateOptions: { shouldDehydrateQuery: q => q.state.status === 'success' && PERSISTED.has(String(q.queryKey[0])) },
    }}>
      <TooltipProvider delayDuration={150}>
          {/* reducedMotion="user": com "reduzir movimento" ligado no sistema, todas as animações do Motion
              perdem o deslocamento e ficam só com a opacidade */}
          <MotionConfig reducedMotion="user">
            <RouterProvider router={router} />
          </MotionConfig>
      </TooltipProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);

hideSplash(queryClient);
