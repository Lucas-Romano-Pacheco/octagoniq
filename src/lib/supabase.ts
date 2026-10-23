import { useSyncExternalStore } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { draftStore, savedStore } from './picks';

/* Supabase: contas (Auth) e banco dos palpites (Postgres). Só liga se as duas variáveis existirem; sem elas o site
   funciona igual, guardando os palpites no navegador. A chave "anon" é pública por definição: quem protege os dados
   é o RLS (cada pessoa lê e grava só as próprias linhas), veja docs/supabase.sql. O pacote é carregado sob demanda. */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabaseEnabled = !!URL && !!KEY;
/** Botão "Entrar com Google": só aparece depois de o provedor ser ativado no painel do Supabase. */
export const googleEnabled = supabaseEnabled && import.meta.env.VITE_SUPABASE_GOOGLE === '1';

let client: Promise<SupabaseClient> | null = null;
export const getSupabase = () =>
  (client ??= import('@supabase/supabase-js').then(m => m.createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })));

/* ---------- Sessão (uma só para o site inteiro) ---------- */

interface AuthState { ready: boolean; session: Session | null }
let auth: AuthState = { ready: !supabaseEnabled, session: null };
const subs = new Set<() => void>();
const emit = (patch: Partial<AuthState>) => { auth = { ...auth, ...patch }; subs.forEach(f => f()); };

let started = false;
function start() {
  if (started || !supabaseEnabled) return;
  started = true;
  getSupabase().then(sb => {
    // o primeiro evento (INITIAL_SESSION) já traz a sessão guardada no navegador
    sb.auth.onAuthStateChange((_event, session) => emit({ ready: true, session }));
  }).catch(() => emit({ ready: true }));
}

/* Login por apelido e senha, sem e-mail. O Supabase identifica cada conta por um e-mail, então o apelido vira um
   endereço interno (lucas_ufc → lucas_ufc@octagoniq.vercel.app). Nenhuma mensagem é enviada para ele: no painel,
   "Confirm email" fica desligado e o site não tem recuperação de senha por e-mail. */
const LOGIN_DOMAIN = 'octagoniq.vercel.app';
const loginEmail = (username: string) => `${username.trim().toLowerCase()}@${LOGIN_DOMAIN}`;

/** Só caminhos internos: impede que `?next=` mande a pessoa para outro site depois de entrar. */
export const safeNext = (next: string | null | undefined) => (next?.startsWith('/') && !next.startsWith('//') ? next : '/palpites');

export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
export const MIN_PASSWORD = 8;

/** Apelido exibido: o do cadastro ou, sem ele (ex.: entrou pelo Google), o começo do e-mail. */
const displayName = (s: Session | null) =>
  (s?.user.user_metadata?.username as string | undefined) ?? s?.user.email?.split('@')[0] ?? '';

/** O apelido está livre? (consulta o banco; usada no cadastro enquanto a pessoa digita) */
export async function usernameAvailable(name: string): Promise<boolean> {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc('username_available', { name });
  if (error) throw error;
  return !!data;
}

export function useAuth() {
  const s = useSyncExternalStore(cb => { start(); subs.add(cb); return () => { subs.delete(cb); }; }, () => auth, () => auth);
  return {
    enabled: supabaseEnabled, ready: s.ready, session: s.session, user: s.session?.user ?? null,
    name: displayName(s.session),
    signIn: async (username: string, password: string) => {
      const sb = await getSupabase();
      const { error } = await sb.auth.signInWithPassword({ email: loginEmail(username), password });
      if (error) throw error;
    },
    /** Cria a conta e já entra. Devolve true se o Supabase ainda exigir confirmação (painel com "Confirm email" ligado). */
    signUp: async (username: string, password: string) => {
      const sb = await getSupabase();
      if (!(await usernameAvailable(username))) throw new Error('username taken');
      const { data, error } = await sb.auth.signUp({ email: loginEmail(username), password, options: { data: { username } } });
      if (error) throw error;
      if (data.user && !data.user.identities?.length) throw new Error('username taken');
      return !data.session;
    },
    signInGoogle: async (next: string) => {
      const sb = await getSupabase();
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}${safeNext(next)}` } });
      if (error) throw error;
    },
    updatePassword: async (password: string) => {
      const sb = await getSupabase();
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
    },
    /** Sai e limpa os palpites deste navegador: num aparelho compartilhado, a próxima pessoa não vê os seus. */
    signOut: async () => {
      const sb = await getSupabase();
      await sb.auth.signOut();
      draftStore.write({}); savedStore.write({});
    },
  };
}

/** Mensagem em português para os erros do Supabase (os originais vêm em inglês). */
export function authError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/invalid login credentials/i.test(m)) return 'Apelido ou senha incorretos.';
  if (/email not confirmed/i.test(m)) return 'Conta criada, mas ainda não ativada: no Supabase, desligue "Confirm email" (Authentication → Sign In / Providers → Email).';
  if (/username taken|already registered|already been registered|already exists/i.test(m)) return 'Esse apelido já está em uso. Escolha outro.';
  if (/password.*(at least|characters)|weak/i.test(m)) return `A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`;
  if (/same.*password|different from the old/i.test(m)) return 'A nova senha precisa ser diferente da atual.';
  if (/rate limit|security purposes|too many/i.test(m)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  // o login por apelido usa o provedor Email por baixo: desligado no painel, nem cadastro nem login funcionam
  if (/email (signups|logins) are disabled|email provider/i.test(m)) return 'Login indisponível: no Supabase, ligue o provedor Email (Authentication → Sign In / Providers → Email), com "Confirm email" desligado.';
  if (/signups not allowed|signup.*disabled/i.test(m)) return 'Novos cadastros estão fechados no momento.';
  if (/failed to fetch|network/i.test(m)) return 'Sem conexão com o servidor de contas. Verifique a internet.';
  if (/provider is not enabled/i.test(m)) return 'O login com Google ainda não foi ativado.';
  return 'Algo deu errado. Tente de novo em instantes.';
}
