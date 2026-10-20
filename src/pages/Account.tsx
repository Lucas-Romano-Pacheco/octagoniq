import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Check, CircleNotch, SignOut, Target } from '@phosphor-icons/react';
import { authError, MIN_PASSWORD, useAuth } from '@/lib/supabase';
import { usePicks } from '@/lib/picks';
import { fullDate } from '@/lib/format';
import { PicksHistory } from '@/components/PicksHistory';
import { Empty, PageHeader, Panel, Skeleton, usePageTitle } from '@/components/kit';
import { loginHref } from '@/components/PicksAccount';

/* Conta: desempenho nos palpites (somando os eventos salvos no banco), troca de senha e sair. O apelido é o login,
   por isso não muda por aqui. */

const INPUT = 'h-11 min-w-0 flex-1 rounded-md bg-surface-2 px-4 text-[16px] text-fg outline-none ring-1 ring-line placeholder:text-fg-3 focus:bg-surface focus:ring-2 focus:ring-blue/60';

/** Formulário de uma linha (campo + salvar) com o retorno logo abaixo. */
function InlineForm({ label, hint, onSubmit, children }: { label: string; hint?: string; onSubmit: () => Promise<void>; children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form className="py-4" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setMsg(null);
      try { await onSubmit(); setMsg({ ok: true, text: 'Salvo.' }); } catch (err) { setMsg({ ok: false, text: err instanceof Error && err.message.startsWith('!') ? err.message.slice(1) : authError(err) }); }
      setBusy(false);
    }}>
      <div className="text-[14px] font-semibold text-fg">{label}</div>
      <div className="mt-1.5 flex gap-2">
        {children}
        <button type="submit" disabled={busy} className="btn h-11 shrink-0">{busy ? <CircleNotch className="h-4 w-4 animate-spin" /> : <Check weight="bold" className="h-4 w-4" />} Salvar</button>
      </div>
      {msg ? <p role="status" className={`mt-1.5 text-[13px] ${msg.ok ? 'text-win' : 'text-loss'}`}>{msg.text}</p> : hint && <p className="mt-1.5 text-[13px] text-fg-3">{hint}</p>}
    </form>
  );
}

export default function Account() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { saved } = usePicks();
  const [password, setPassword] = useState('');
  const [leaving, setLeaving] = useState(false); // saindo: vai para o início, não para a tela de entrar
  usePageTitle('Minha conta');

  if (!auth.enabled) return <Panel><Empty>As contas ainda não estão ativas nesta instalação do site.</Empty></Panel>;
  if (!auth.ready) return <div className="space-y-6"><Skeleton className="h-28" /><Skeleton className="h-[420px]" /></div>;
  if (!auth.user) return leaving ? null : <Navigate to={loginHref('/conta')} replace />;

  const played = Object.values(saved).filter(e => Object.keys(e.picks).length).length;

  return (
    <div className="space-y-8">
      <PageHeader title={auth.name} meta={<>Palpiteiro desde {fullDate(auth.user.created_at)}</>} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {played ? <PicksHistory /> : (
            <Panel plain title="Seu desempenho">
              <Empty>
                Você ainda não salvou palpites.
                <div className="mt-4"><Link to="/palpites" className="btn-primary"><Target weight="bold" className="h-4 w-4" /> Palpitar no próximo card</Link></div>
              </Empty>
            </Panel>
          )}
        </div>

        <aside className="min-w-0 space-y-8">
          <Panel plain title="Conta" bodyClass="divide-y divide-line/70">
            <div className="py-4">
              <div className="text-[14px] font-semibold text-fg">Apelido</div>
              <div className="mt-1.5 flex h-11 items-center rounded-md bg-surface-2 px-4 text-[16px] text-fg-2 ring-1 ring-line">{auth.name}</div>
              <p className="mt-1.5 text-[13px] text-fg-3">É o seu login e aparece no ranking; por isso não muda.</p>
            </div>
            <InlineForm label="Nova senha" hint={`Pelo menos ${MIN_PASSWORD} caracteres.`} onSubmit={async () => {
              if (password.length < MIN_PASSWORD) throw new Error(`!A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`);
              await auth.updatePassword(password); setPassword('');
            }}>
              <input aria-label="Nova senha" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" className={INPUT} />
            </InlineForm>
            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <p className="text-[14px] text-fg-3">Ao sair, os palpites deixam este navegador; continuam na sua conta.</p>
              <button type="button" onClick={async () => { setLeaving(true); await auth.signOut(); navigate('/'); }} className="btn"><SignOut className="h-4 w-4" /> Sair</button>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
