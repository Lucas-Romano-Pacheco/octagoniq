import { defineConfig, devices } from '@playwright/test';

/* Testes de ponta a ponta: o site de verdade num navegador (Chromium), no computador e no celular.
   Local: usa o servidor de desenvolvimento que já estiver rodando na 5174; no CI, sobe um. */
const PORT = Number(process.env.E2E_PORT ?? 5174);

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 30_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
