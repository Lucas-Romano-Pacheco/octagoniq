import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Cloud, CloudCheck, CloudSlash, SignIn, UserCircle } from '@phosphor-icons/react';
import { useAuth } from '@/lib/supabase';
import { startCloudSync, useCloudStatus } from '@/lib/picks-cloud';

/** Mantém a sincronização dos palpites ligada enquanto houver conta conectada (montado no layout, em todas as páginas). */
export function CloudSync() {
  const { session } = useAuth();
  const uid = session?.user.id;
  useEffect(() => (session ? startCloudSync(session) : undefined), [uid]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Link de entrar com volta para a página atual. */
export const loginHref = (next: string) => `/entrar?next=${encodeURIComponent(next)}`;

/** Cabeçalho: "Entrar" para quem não tem sessão; a inicial do apelido (atalho para a conta) para quem tem. */
export function AccountButton() {
  const auth = useAuth();
  const { pathname } = useLocation();
  if (!auth.enabled) return null;
  if (!auth.ready) return <span aria-hidden className="h-10 w-10 rounded-full bg-surface-2" />;
  if (auth.user) return (
    <Link to="/conta" aria-label={`Sua conta (${auth.name})`} title={auth.name}
      className={clsx('lift grid h-10 w-10 place-items-center rounded-full font-display text-[16px] font-bold', pathname === '/conta' ? 'bg-brand text-white' : 'bg-fg text-bg')}>
      {auth.name.slice(0, 1).toUpperCase() || <UserCircle className="h-5 w-5" />}
    </Link>
  );
  if (pathname === '/entrar') return null;
  return (
    <Link to={loginHref(pathname)} className="btn h-10 px-4" aria-label="Entrar">
      <SignIn weight="bold" className="h-4 w-4" /><span className="hidden sm:inline">Entrar</span>
    </Link>
  );
}

/** Faixa no topo da página de palpites: quem está palpitando e o estado do banco, ou o convite para entrar. */
export function PicksAccount({ next }: { next: string }) {
  const auth = useAuth();
  const cloud = useCloudStatus();
  if (!auth.enabled || !auth.ready) return null;

  if (auth.user) {
    const at = cloud.at && new Date(cloud.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2/60 px-4 py-3 text-[14px]">
        <span className="flex min-w-0 items-center gap-2 text-fg-2">
          {cloud.state === 'error' ? <CloudSlash weight="bold" className="h-5 w-5 shrink-0 text-loss" /> : cloud.state === 'ok' ? <CloudCheck weight="bold" className="h-5 w-5 shrink-0 text-win" /> : <Cloud weight="bold" className="h-5 w-5 shrink-0 text-fg-3" />}
          <span className="truncate">
            Palpitando como <b className="font-semibold text-fg">{auth.name}</b>
            {' · '}{cloud.state === 'error' ? 'não foi possível falar com o banco agora' : cloud.state === 'ok' ? `sincronizado às ${at}` : 'sincronizando…'}
          </span>
        </span>
        <Link to="/conta" className="btn-ghost"><UserCircle className="h-4 w-4" /> Minha conta</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-cream px-5 py-4 ring-1 ring-line">
      <div className="min-w-0">
        <div className="font-display text-[18px] font-bold uppercase tracking-[0.03em] text-fg">Entre para valer pontos</div>
        <p className="mt-1 max-w-[560px] text-[14px] text-fg-2">Pode ir escolhendo: o rascunho fica guardado aqui. Para salvar e pontuar, os palpites vão para a sua conta, em qualquer aparelho.</p>
      </div>
      <Link to={loginHref(next)} className="btn-primary h-11 px-6"><SignIn weight="bold" className="h-4 w-4" /> Entrar ou criar conta</Link>
    </div>
  );
}
