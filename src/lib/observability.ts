/* Observabilidade no navegador: erros de tela e de consulta, desempenho de navegação e Web Vitals (LCP, INP, CLS)
   no Sentry. Só liga com VITE_SENTRY_DSN. O pacote é carregado no tempo ocioso, depois da primeira pintura, para
   não pesar no carregamento; erros que acontecerem antes disso ficam numa fila e são enviados quando ele chegar.
   As chamadas a /api levam os cabeçalhos de rastreamento, então no Sentry a ação na tela e a rota do servidor
   aparecem no mesmo trace. */

type Sentry = typeof import('@sentry/react');

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
let sentry: Sentry | null = null;
const queue: [unknown, Record<string, unknown>][] = [];

export function initObservability() {
  if (!DSN || typeof window === 'undefined') return;
  const load = () =>
    import('@sentry/react').then(S => {
      S.init({
        dsn: DSN,
        environment: import.meta.env.MODE,
        release: import.meta.env.VITE_RELEASE as string | undefined,
        integrations: [S.browserTracingIntegration()],
        tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      });
      sentry = S;
      for (const [e, extra] of queue.splice(0)) S.captureException(e, { extra });
    }).catch(() => { /* bloqueador de anúncios ou rede: o site segue sem telemetria */ });
  if ('requestIdleCallback' in window) requestIdleCallback(() => void load(), { timeout: 4000 });
  else setTimeout(() => void load(), 2000);
}

/** Registra um erro (tela quebrada, consulta que falhou). Sem DSN, não faz nada. */
export function reportError(e: unknown, extra: Record<string, unknown> = {}) {
  if (!DSN) return;
  if (sentry) sentry.captureException(e, { extra });
  else if (queue.length < 20) queue.push([e, extra]);
}
