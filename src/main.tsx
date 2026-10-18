import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Link, RouterProvider, useRouteError } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider, removeOldestQuery } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

import '@fontsource/barlow-condensed/600.css'; // títulos e números de destaque: condensada de placar esportivo
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource-variable/inter';            // texto e números
import './styles.css';

import { Layout } from '@/components/Layout';
import { Empty, ErrorState, Panel, Skeleton } from '@/components/kit';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IconContext } from '@phosphor-icons/react';
import Home from '@/pages/Home';

// Páginas secundárias em chunks separados
const Events = lazy(() => import('@/pages/Events'));
const Event = lazy(() => import('@/pages/Event'));
const Rankings = lazy(() => import('@/pages/Rankings'));
const Fighters = lazy(() => import('@/pages/Fighters'));
const Fighter = lazy(() => import('@/pages/Fighter'));
const Compare = lazy(() => import('@/pages/Compare'));
const FightPage = lazy(() => import('@/pages/Fight'));

const page = (el: React.ReactNode) => <Suspense fallback={<Skeleton className="h-96" />}>{el}</Suspense>;

const NotFound = () => (
  <Panel><Empty>Página não encontrada. <Link to="/" className="link">Voltar ao início</Link></Empty></Panel>
);

/* Qualquer erro de renderização cai aqui, sem derrubar o layout inteiro. */
function RouteError() {
  const err = useRouteError();
  console.error(err);
  return (
    <Panel className="mx-auto mt-10 max-w-xl">
      <ErrorState message="Algo deu errado ao montar esta página." onRetry={() => location.reload()} />
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
      { path: 'eventos/:id', element: page(<Event />) },
      { path: 'eventos/:id/lutas/:fight', element: page(<FightPage />) },
      { path: 'rankings/:div?', element: page(<Rankings />) },
      { path: 'lutadores', element: page(<Fighters />) },
      { path: 'lutadores/:slug', element: page(<Fighter />) },
      { path: 'comparar', element: page(<Compare />) },
      { path: '*', element: <NotFound /> },
      ] },
    ],
  },
]);

const queryClient = new QueryClient({
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={{
      persister,
      maxAge: 24 * 3600_000,
      buster: 'v4', // trocar quando o formato dos dados mudar
      dehydrateOptions: { shouldDehydrateQuery: q => q.state.status === 'success' && PERSISTED.has(String(q.queryKey[0])) },
    }}>
      <TooltipProvider delayDuration={150}>
        {/* Phosphor em duotone por padrão: traço com preenchimento suave, mais autoral que ícones de linha */}
        <IconContext.Provider value={{ weight: 'duotone', mirrored: false }}>
          <RouterProvider router={router} />
        </IconContext.Provider>
      </TooltipProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);
