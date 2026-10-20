import { useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, CircleNotch, Eye, EyeSlash, GoogleLogo, LockSimple, User, WarningCircle, X } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { authError, googleEnabled, MIN_PASSWORD, safeNext, useAuth, usernameAvailable, USERNAME_RE } from '@/lib/supabase';
import { POINTS } from '@/lib/picks';
import { Brush, OctagonMark, Segmented, usePageTitle } from '@/components/kit';

/* Entrar / criar conta com apelido e senha (sem e-mail). Visual de cartaz de luta: à esquerda, o apelido entra
   no card enquanto a pessoa digita; à direita, o formulário. A conta guarda os palpites e a pontuação no banco. */

type Mode = 'entrar' | 'criar';

/** Grade do octógono em linhas finas (a mesma assinatura do topo da página da luta). */
function Cage({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className} preserveAspectRatio="xMidYMid meet">
      {[46, 36, 26].map(r => {
        const k = r * 0.4142;
        const pts = [[-k, -r], [k, -r], [r, -k], [r, k], [k, r], [-k, r], [-r, k], [-r, -k]].map(([x, y]) => `${50 + x},${50 + y}`).join(' ');
        return <polygon key={r} points={pts} fill="none" stroke="currentColor" strokeWidth={r === 46 ? 0.6 : 0.35} strokeDasharray={r === 26 ? '1 1.4' : undefined} vectorEffect="non-scaling-stroke" />;
      })}
      {[0, 1, 2, 3, 4, 5, 6, 7].map(n => {
        const a = (n * Math.PI) / 4 + Math.PI / 8, r = 46 / Math.cos(Math.PI / 8);
        return <line key={n} x1="50" y1="50" x2={50 + Math.cos(a) * r} y2={50 + Math.sin(a) * r} stroke="currentColor" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
}

/** Cartaz: o apelido aparece letra a letra, como o nome de um lutador no card. */
function Poster({ mode, name }: { mode: Mode; name: string }) {
  const reduce = useReducedMotion();
  const shown = name.trim().toUpperCase();
  return (
    <div className="relative isolate flex min-h-[260px] flex-col justify-between overflow-hidden bg-band p-6 text-white sm:p-10 lg:min-h-[560px]">
      <Cage className="pointer-events-none absolute -bottom-[30%] -right-[25%] -z-10 h-[120%] text-white/[0.08] lg:-bottom-[12%] lg:-right-[30%] lg:h-[105%]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_15%_100%,color-mix(in_oklab,var(--color-brand)_28%,transparent),transparent)]" />

      <div className="flex items-center gap-2.5 font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-white/70">
        <OctagonMark className="h-5 w-5" /> Palpites OctagonIQ
      </div>

      <div className="py-8 lg:py-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
            className="font-display text-[14px] font-semibold uppercase tracking-[0.12em] text-white/70">
            {mode === 'criar' ? 'Estreia no card' : 'De volta ao octógono'}
          </motion.p>
        </AnimatePresence>
        <div aria-hidden className="relative mt-3 w-fit max-w-full">
          <div className="display break-all text-[44px] leading-[0.95] sm:text-[64px]">
            {shown
              ? [...shown].map((ch, i) => (
                  <motion.span key={`${i}${ch}`} className="inline-block" initial={reduce ? false : { y: '35%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>{ch}</motion.span>
                ))
              : <span className="text-white/25">Seu apelido</span>}
          </div>
          <Brush className="absolute -bottom-6 left-[4%] h-4 w-[92%] sm:-bottom-7 sm:h-5" />
        </div>
        <p className="mt-10 max-w-[380px] text-[16px] leading-relaxed text-white/70">
          {mode === 'criar'
            ? 'Escolha vencedor, método e round de cada luta. Os pontos somam evento a evento na sua conta.'
            : 'Seus palpites salvos e sua pontuação continuam onde você deixou.'}
        </p>
      </div>

      <ul className="flex flex-wrap gap-2 text-[13px]">
        {[[`+${POINTS.winner}`, 'vencedor'], [`+${POINTS.method}`, 'método'], [`+${POINTS.round}`, 'round'], [`+${POINTS.bigZebra}`, 'grande zebra']].map(([pts, l]) => (
          <li key={l} className="flex items-baseline gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-white/80">
            <b className="num font-display text-[14px] font-bold text-white">{pts}</b>{l}
          </li>
        ))}
      </ul>
    </div>
  );
}

const INPUT = 'h-12 w-full rounded-md bg-surface-2 pl-11 text-[16px] text-fg outline-none ring-1 ring-line transition-[box-shadow,background-color] placeholder:text-fg-3 focus:bg-surface focus:ring-2 focus:ring-fg/40';

function Field({ label, icon, aside, hint, right, ...input }: { label: string; icon: ReactNode; aside?: ReactNode; hint?: ReactNode; right?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label">{label}</label>
        {aside}
      </div>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fg-3">{icon}</span>
        <input id={id} className={clsx(INPUT, right ? 'pr-12' : 'pr-4')} {...input} />
        {right && <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{right}</span>}
      </div>
      {hint && <div className="mt-1.5 text-[13px] text-fg-3">{hint}</div>}
    </div>
  );
}

function ShowPassword({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label={show ? 'Esconder a senha' : 'Mostrar a senha'} aria-pressed={show}
      className="grid h-9 w-9 place-items-center rounded-md text-fg-3 transition-colors hover:bg-surface-3 hover:text-fg">
      {show ? <EyeSlash className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );
}

/** Força da senha em três degraus (tamanho e variedade de caracteres). */
function strength(p: string) {
  if (p.length < MIN_PASSWORD) return 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length;
  return p.length >= 12 && kinds >= 3 ? 3 : kinds >= 2 ? 2 : 1;
}
const STRENGTH = [['', ''], ['fraca', 'bg-loss'], ['boa', 'bg-draw'], ['forte', 'bg-win']] as const;

type Avail = 'idle' | 'checking' | 'free' | 'taken' | 'invalid';

/** Apelido livre? Confere no banco meio segundo depois de a pessoa parar de digitar. */
function useAvailability(name: string, on: boolean): Avail {
  const [state, setState] = useState<Avail>('idle');
  useEffect(() => {
    if (!on || !name) { setState('idle'); return; }
    if (!USERNAME_RE.test(name)) { setState('invalid'); return; }
    setState('checking');
    let live = true;
    const t = setTimeout(() => usernameAvailable(name).then(ok => live && setState(ok ? 'free' : 'taken')).catch(() => live && setState('idle')), 450);
    return () => { live = false; clearTimeout(t); };
  }, [name, on]);
  return state;
}

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [mode, setMode] = useState<Mode>(params.get('modo') === 'criar' ? 'criar' : 'entrar');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avail = useAvailability(username, mode === 'criar' && auth.enabled);
  const level = strength(password);
  usePageTitle(mode === 'criar' ? 'Criar conta' : 'Entrar');

  // com sessão, esta página não tem o que mostrar: volta para onde a pessoa estava
  useEffect(() => { if (auth.user) navigate(next, { replace: true }); }, [auth.user, next, navigate]);

  const go = (m: Mode) => { setMode(m); setError(null); setConfirm(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim();
    if (mode === 'criar') {
      if (!USERNAME_RE.test(name)) return setError('O apelido precisa ter de 3 a 20 letras, números ou _ (sem espaços nem acentos).');
      if (avail === 'taken') return setError('Esse apelido já está em uso. Escolha outro.');
      if (password.length < MIN_PASSWORD) return setError(`A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`);
      if (password !== confirm) return setError('As duas senhas não são iguais.');
    }
    setBusy(true); setError(null);
    try {
      if (mode === 'entrar') await auth.signIn(name, password);
      else if (await auth.signUp(name, password)) setError(authError('Email not confirmed'));
    } catch (err) { setError(authError(err)); }
    setBusy(false);
  };

  const availHint = mode === 'criar' && ({
    idle: <>Aparece no ranking e é o seu login. De 3 a 20 letras, números ou _.</>,
    checking: <span className="inline-flex items-center gap-1.5"><CircleNotch className="h-3.5 w-3.5 animate-spin" /> Conferindo…</span>,
    free: <span className="inline-flex items-center gap-1.5 font-semibold text-win"><Check weight="bold" className="h-3.5 w-3.5" /> Disponível</span>,
    taken: <span className="inline-flex items-center gap-1.5 font-semibold text-loss"><X weight="bold" className="h-3.5 w-3.5" /> Já está em uso</span>,
    invalid: <>Só letras, números ou _, de 3 a 20 caracteres.</>,
  } satisfies Record<Avail, ReactNode>)[avail];

  return (
    <div className="mx-auto max-w-[1100px] pb-10 pt-2 lg:pt-6">
      {/* uma peça só, como um ingresso: cartaz escuro + formulário (sem card dentro de card) */}
      <div className="cut grid overflow-hidden rounded-xl bg-surface ring-1 ring-line lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <Poster mode={mode} name={username} />

        <section className="p-6 sm:p-10 lg:py-12">
          {!auth.enabled ? (
            <p className="text-[16px] leading-relaxed text-fg-2">As contas ainda não estão ativas nesta instalação do site. Enquanto isso, os palpites ficam salvos neste navegador.
              {' '}<Link to="/palpites" className="link">Ir para os palpites</Link></p>
          ) : (
            <>
              <Segmented className="w-full [&>button]:flex-1" value={mode} onChange={go}
                options={[{ value: 'entrar', label: 'Entrar' }, { value: 'criar', label: 'Criar conta' }]} />

              <AnimatePresence mode="wait" initial={false}>
                <motion.h1 key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                  className="display mt-8 text-[32px] text-fg">
                  {mode === 'criar' ? 'Crie seu login' : 'Bem-vindo de volta'}
                </motion.h1>
              </AnimatePresence>
              <p className="mt-2 text-[14px] text-fg-3">{mode === 'criar' ? 'Só apelido e senha. Nada de e-mail.' : 'Entre com seu apelido e sua senha.'}</p>

              <AnimatePresence initial={false}>
                {error && (
                  <motion.p role="alert" initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: 'auto', marginTop: 24 }} exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="flex items-start gap-2 overflow-hidden rounded-md bg-loss-soft px-4 py-3 text-[14px] text-loss">
                    <WarningCircle weight="bold" className="mt-0.5 h-4 w-4 shrink-0" />{error}
                  </motion.p>
                )}
              </AnimatePresence>

              <form onSubmit={submit} className="mt-6 space-y-5">
                <Field label="Apelido" icon={<User weight="bold" className="h-5 w-5" />} value={username} required maxLength={20} autoFocus
                  onChange={e => setUsername(e.target.value.replace(/\s/g, ''))} autoComplete="username" autoCapitalize="none" spellCheck={false}
                  placeholder="ex.: lucas_ufc" hint={availHint} />
                <Field label="Senha" icon={<LockSimple weight="bold" className="h-5 w-5" />} type={show ? 'text' : 'password'} value={password} required
                  onChange={e => setPassword(e.target.value)} autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
                  right={<ShowPassword show={show} onToggle={() => setShow(v => !v)} />}
                  aside={mode === 'criar' && password && <span className="text-[13px] font-semibold text-fg-2">{level ? `Senha ${STRENGTH[level][0]}` : `mín. ${MIN_PASSWORD} caracteres`}</span>}
                  hint={mode === 'criar' && (
                    <span aria-hidden className="mt-1 grid grid-cols-3 gap-1.5">
                      {[1, 2, 3].map(n => <span key={n} className={clsx('h-1.5 rounded-full transition-colors duration-300', level >= n ? STRENGTH[level][1] : 'bg-surface-3')} />)}
                    </span>
                  )} />
                <AnimatePresence initial={false}>
                  {mode === 'criar' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="-m-1 overflow-hidden p-1">
                      <Field label="Repita a senha" icon={<LockSimple weight="bold" className="h-5 w-5" />} type={show ? 'text' : 'password'} value={confirm} required
                        onChange={e => setConfirm(e.target.value)} autoComplete="new-password"
                        right={confirm && (password === confirm
                          ? <span className="grid h-9 w-9 place-items-center text-win"><Check weight="bold" className="h-5 w-5" /></span>
                          : <span className="grid h-9 w-9 place-items-center text-fg-3"><X weight="bold" className="h-5 w-5" /></span>)} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button type="submit" disabled={busy} className="btn-primary !mt-8 w-full justify-center disabled:opacity-70">
                  {busy && <CircleNotch className="h-4 w-4 animate-spin" />}{mode === 'criar' ? 'Criar conta e entrar' : 'Entrar'}
                </button>
              </form>

              {googleEnabled && (
                <>
                  <div className="my-6 flex items-center gap-3 text-[13px] text-fg-3"><span className="h-px flex-1 bg-line" />ou<span className="h-px flex-1 bg-line" /></div>
                  <button type="button" disabled={busy} onClick={() => auth.signInGoogle(next).catch(e => setError(authError(e)))} className="btn h-12 w-full justify-center"><GoogleLogo weight="bold" className="h-4 w-4" /> Continuar com Google</button>
                </>
              )}

              <p className="mt-6 text-[13px] leading-relaxed text-fg-3">
                {mode === 'criar'
                  ? 'Guarde bem a senha: sem e-mail, não há como recuperá-la por aqui. Guardamos só o apelido e os palpites.'
                  : 'Esqueceu a senha? Fale com quem administra o site para redefinir.'}
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
