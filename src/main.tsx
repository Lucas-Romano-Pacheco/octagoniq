import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Link, RouterProvider, useRouteError } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider, removeOldestQuery } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

import '@fontsource-variable/saira/wdth.css'; // títulos, rótulos e botões: sans esportiva de cantos quadrados (eixos de peso e largura)
import '@fontsource-variable/ibm-plex-sans';     // texto e tabelas (Inter era a fonte padrão mais usada por interfaces geradas)
import './styles.css';

import { Layout } from '@/components/Layout';
import { ErrorState, OctagonMark, Panel, Skeleton } from '@/components/kit';
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
const About = lazy(() => import('@/pages/About'));
const Picks = lazy(() => import('@/pages/Picks'));
const Login = lazy(() => import('@/pages/Login'));
const Account = lazy(() => import('@/pages/Account'));

const page = (el: React.ReactNode) => <Suspense fallback={<Skeleton className="h-[1200px]" />}>{el}</Suspense>;

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
      { path: 'eventos/:id', element: page(<Event />) },
      { path: 'eventos/:id/lutas/:fight', element: page(<FightPage />) },
      { path: 'rankings/:div?', element: page(<Rankings />) },
      { path: 'lutadores', element: page(<Fighters />) },
      { path: 'lutadores/:slug', element: page(<Fighter />) },
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
