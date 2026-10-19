import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)), '@shared': fileURLToPath(new URL('./shared', import.meta.url)) } },
  test: { include: ['shared/**/*.test.ts', 'server/**/*.test.ts', 'src/**/*.test.ts'], environment: 'node', env: { OCTAGONIQ_CACHE_DIR: '.cache-test' } },
});
