import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)), '@shared': fileURLToPath(new URL('./shared', import.meta.url)) } },
  test: {
    include: ['shared/**/*.test.ts', 'server/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    env: { OCTAGONIQ_CACHE_DIR: '.cache-test' },
    // cobertura das regras e dos adaptadores (a interface é coberta pelos testes de ponta a ponta, em e2e/)
    coverage: {
      provider: 'v8',
      include: ['shared/**/*.ts', 'server/**/*.ts', 'src/lib/**/*.ts'],
      exclude: ['**/*.test.ts', 'server/index.ts', 'server/vercel.ts', 'server/dev-plugin.ts', 'server/telemetry.ts', 'src/lib/supabase.ts', 'src/lib/observability.ts'],
      reporter: ['text-summary', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      // piso para não regredir (medido em out/2026); sobe conforme entram testes
      thresholds: { lines: 35, functions: 50, branches: 75, statements: 35 },
    },
  },
});
