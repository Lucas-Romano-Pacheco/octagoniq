/* Observabilidade do servidor: erros no Sentry e rastreamento (traces) via OpenTelemetry.
   Tudo é opcional e só liga com as variáveis de ambiente; sem elas, nenhum pacote extra é carregado.

   - SENTRY_DSN: erros das rotas /api (e o rastreamento do próprio Sentry, amostrado por SENTRY_TRACES_SAMPLE_RATE).
   - OTEL_EXPORTER_OTLP_ENDPOINT (+ OTEL_EXPORTER_OTLP_HEADERS): manda os traces por OTLP/HTTP para qualquer
     backend compatível. O mesmo código atende Datadog, New Relic, Grafana, Honeycomb etc.; só mudam endpoint e
     cabeçalho (exemplos no README, seção "Observabilidade").

   Cada chamada a /api vira um span de servidor, e cada fetch para ESPN, UFC.com, Wikipedia etc. vira um span filho
   (instrumentação do undici, que usa diagnostics_channel e por isso funciona também empacotada no Vercel). */

import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';

type Sentry = typeof import('@sentry/node');
let sentry: Sentry | null = null;
let started: Promise<void> | null = null;

const env = process.env;

export function initTelemetry(): Promise<void> {
  return (started ??= (async () => {
    if (env.SENTRY_DSN) {
      sentry = await import('@sentry/node');
      sentry.init({
        dsn: env.SENTRY_DSN,
        environment: env.VERCEL_ENV ?? env.NODE_ENV ?? 'development',
        release: env.VERCEL_GIT_COMMIT_SHA,
        tracesSampleRate: Number(env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      });
    }
    if (env.OTEL_EXPORTER_OTLP_ENDPOINT || env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
      const [{ NodeSDK }, { OTLPTraceExporter }, { UndiciInstrumentation }] = await Promise.all([
        import('@opentelemetry/sdk-node'),
        import('@opentelemetry/exporter-trace-otlp-http'),
        import('@opentelemetry/instrumentation-undici'),
      ]);
      new NodeSDK({
        serviceName: env.OTEL_SERVICE_NAME ?? 'octagoniq-api',
        // endpoint e cabeçalhos (chave da API) vêm de OTEL_EXPORTER_OTLP_*
        traceExporter: new OTLPTraceExporter(),
        instrumentations: [new UndiciInstrumentation()],
      }).start();
    }
  })().catch(e => console.error('[telemetria] não iniciou:', e)));
}

/** Registra um erro inesperado (no Sentry, se ligado) sem interromper a resposta. */
export function captureError(e: unknown, context: Record<string, unknown> = {}) {
  sentry?.captureException(e, { extra: context });
}

/** Envia o que estiver pendente. Na função do Vercel, roda depois da resposta, antes de a instância congelar. */
export async function flushTelemetry() {
  const provider = trace.getTracerProvider() as { getDelegate?: () => { forceFlush?: () => Promise<void> } };
  await Promise.allSettled([provider.getDelegate?.().forceFlush?.(), sentry?.flush(2000)]);
}

const tracer = trace.getTracer('octagoniq');
const SLOW_MS = 3000;

/** Span de servidor em volta de uma rota /api. `route` é o padrão (baixa cardinalidade), não a URL. */
export function traced<T extends { status: number }>(route: string, path: string, fn: () => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(`GET ${route}`, { kind: SpanKind.SERVER, attributes: { 'http.request.method': 'GET', 'http.route': route, 'url.path': path } }, async span => {
    const t0 = performance.now();
    try {
      const r = await fn();
      span.setAttribute('http.response.status_code', r.status);
      if (r.status >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
      return r;
    } catch (e) {
      span.recordException(e as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw e;
    } finally {
      const ms = Math.round(performance.now() - t0);
      // log estruturado só do que merece atenção (o Vercel já registra toda requisição)
      if (ms > SLOW_MS) console.warn(JSON.stringify({ evt: 'api_lenta', route, path, ms }));
      span.end();
    }
  });
}
