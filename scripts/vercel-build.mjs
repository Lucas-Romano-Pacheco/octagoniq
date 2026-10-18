/* Build para o Vercel (Build Output API v3): gera .vercel/output com
   - static/: o site (dist/)
   - functions/api.func: a API empacotada num único arquivo
   - config.json: rotas (/api/* → função; demais rotas → index.html, pois é uma SPA). */

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { build } from 'rolldown';

const OUT = '.vercel/output';
rmSync(OUT, { recursive: true, force: true });

execSync('npm run build', { stdio: 'inherit' });
cpSync('dist', `${OUT}/static`, { recursive: true });

const FN = `${OUT}/functions/api.func`;
mkdirSync(FN, { recursive: true });
await build({
  input: 'server/vercel.ts',
  platform: 'node',
  output: { file: `${FN}/index.mjs`, format: 'esm', codeSplitting: false },
  logLevel: 'warn',
});
writeFileSync(`${FN}/.vc-config.json`, JSON.stringify({
  runtime: 'nodejs22.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  maxDuration: 60,           // o perfil de um lutador a frio consulta várias fontes
  shouldAddHelpers: false,
}, null, 2));

writeFileSync(`${OUT}/config.json`, JSON.stringify({
  version: 3,
  routes: [
    { src: '^/assets/(.*)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
    { src: '^/api/(.*)$', dest: '/api?__path=$1' },
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/index.html' },
  ],
}, null, 2));

console.log('Vercel: .vercel/output pronto');
