import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, CloudCheck, CloudSlash, EnvelopeSimple, GoogleLogo, SignOut } from '@phosphor-icons/react';
import { useAuth } from '@/lib/supabase';
import { startCloudSync, useCloudStatus } from '@/lib/picks-cloud';
import { useEffect } from 'react';

/** Mantém a sincronização dos palpites ligada enquanto houver conta conectada (montado no layout, em todas as páginas). */
export function CloudSync() {
  const { session } = useAuth();
  const uid = session?.user.id;
  useEffect(() => (session ? startCloudSync(session) : undefined), [uid]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Conta na página de palpites: entrar (link por e-mail ou Google) ou ver o estado da sincronização. */
export function PicksAccount() {
  const auth = useAuth();
  const cloud = useCloudStatus();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!auth.enabled || !auth.ready) return null;

  if (auth.user) {
    const at = cloud.at && new Date(cloud.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2/60 px-4 py-3 text-[14px]">
        <span className="flex min-w-0 items-center gap-2 text-fg-2">
          {cloud.state === 'error' ? <CloudSlash weight="bold" className="h-5 w-5 shrink-0 text-loss" /> : cloud.state === 'ok' ? <CloudCheck weight="bold" className="h-5 w-5 shrink-0 text-win" /> : <Cloud weight="bold" className="h-5 w-5 shrink-0 animate-pulse text-fg-3" />}
          <span className="truncate">
            <b className="font-semibold text-fg">{auth.user.email}</b>
            {' · '}{cloud.state === 'error' ? `não foi possível sincronizar${cloud.error ? ` (${cloud.error})` : ''}` : cloud.state === 'ok' ? `salvo na sua conta às ${at}` : 'sincronizando…'}
          </span>
        </span>
        <button className="btn-ghost" onClick={() => auth.signOut()}><SignOut className="h-4 w-4" /> Sair</button>
      </div>
    );
  }

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg({ ok: true, text: ok }); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.' }); }
    setBusy(false);
  };
  return (
    <div className="cut rounded-2xl bg-surface p-5 ring-1 ring-fg/[0.08]">
      <div className="font-display text-[18px] font-bold uppercase tracking-[0.03em] text-fg">Guarde seus palpites na conta</div>
      <p className="mt-1 text-[14px] text-fg-3">Sem entrar, os palpites ficam só neste navegador. Com a conta, eles vão com você para qualquer aparelho. É grátis e sem senha.</p>
      <form className="mt-4 flex flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); if (email.trim()) void run(() => auth.signInEmail(email.trim()), `Link enviado para ${email.trim()}. Abra o e-mail neste aparelho e clique nele.`); }}>
        <label className="sr-only" htmlFor="picks-email">E-mail</label>
        <input id="picks-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
          className="h-11 min-w-[220px] flex-1 rounded-full bg-surface-2 px-5 text-[15px] text-fg outline-none ring-1 ring-fg/[0.08] placeholder:text-fg-3 focus:ring-2 focus:ring-blue/50" />
        <button type="submit" disabled={busy} className="btn-primary h-11 px-6"><EnvelopeSimple weight="bold" className="h-4 w-4" /> Enviar link</button>
        <button type="button" disabled={busy} onClick={() => run(auth.signInGoogle)} className="btn h-11"><GoogleLogo weight="bold" className="h-4 w-4" /> Google</button>
      </form>
      {msg && <p role="status" className={`mt-3 text-[14px] ${msg.ok ? 'text-win' : 'text-loss'}`}>{msg.text}</p>}
      <p className="mt-3 text-[12.5px] text-fg-3">Ao entrar você concorda em guardarmos apenas seu e-mail e seus palpites. <Link to="/sobre" className="underline underline-offset-4">Saiba mais</Link></p>
    </div>
  );
}
