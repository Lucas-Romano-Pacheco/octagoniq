import { useEffect, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

/* Supabase (conta e banco dos palpites). Só liga se as duas variáveis existirem; sem elas o site funciona igual,
   guardando os palpites no navegador. A chave "anon" é pública por definição: quem protege os dados é o RLS
   (cada pessoa lê e grava só as próprias linhas), veja docs/supabase.sql. O pacote é carregado sob demanda. */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabaseEnabled = !!URL && !!KEY;

let client: Promise<SupabaseClient> | null = null;
export const getSupabase = () =>
  (client ??= import('@supabase/supabase-js').then(m => m.createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })));

/** Sessão atual (null = deslogado). `ready` fica true depois da primeira leitura da sessão. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabaseEnabled);
  useEffect(() => {
    if (!supabaseEnabled) return;
    let off: (() => void) | undefined, dead = false;
    getSupabase().then(async sb => {
      const { data } = await sb.auth.getSession();
      if (dead) return;
      setSession(data.session); setReady(true);
      const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
      off = () => sub.subscription.unsubscribe();
    }).catch(() => setReady(true));
    return () => { dead = true; off?.(); };
  }, []);
  const back = () => `${location.origin}${location.pathname}`;
  return {
    enabled: supabaseEnabled, ready, session, user: session?.user ?? null,
    /** Envia o link de acesso por e-mail (sem senha). */
    signInEmail: async (email: string) => { const sb = await getSupabase(); const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: back() } }); if (error) throw error; },
    signInGoogle: async () => { const sb = await getSupabase(); const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back() } }); if (error) throw error; },
    signOut: async () => { const sb = await getSupabase(); await sb.auth.signOut(); },
  };
}
