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
  // binário nativo (SVG → PNG das prévias): fica fora do pacote e é copiado em node_modules da função
  external: ['@resvg/resvg-js', 'sharp'],
  logLevel: 'warn',
});
// prévias (Open Graph): HTML base, fontes e o resvg (com o binário Linux x64, o mesmo do runtime do Vercel)
cpSync('dist/index.html', `${FN}/index.html`);
mkdirSync(`${FN}/fonts`, { recursive: true });
for (const f of ['archivo-narrow/files/archivo-narrow-latin-700-normal.woff', 'archivo-narrow/files/archivo-narrow-latin-600-normal.woff', 'ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff', 'ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff'])
  cpSync(`node_modules/@fontsource/${f}`, `${FN}/fonts/${f.split('/').pop()}`);
for (const p of ['@resvg/resvg-js', '@resvg/resvg-js-linux-x64-gnu', 'sharp', '@img/sharp-linux-x64', '@img/sharp-libvips-linux-x64', '@img/colour', 'detect-libc', 'semver'])
  cpSync(`node_modules/${p}`, `${FN}/node_modules/${p}`, { recursive: true, dereference: true });

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
    { src: '^/og/(.*)$', dest: '/api?__og=$1' },
    { src: '^/img$', dest: '/api?__img=1' },
    { handle: 'filesystem' },
    // robôs de redes sociais recebem o HTML com as meta tags da página; os visitantes, o index.html estático
    { src: '^/(.*)$', has: [{ type: 'header', key: 'user-agent', value: '.*(facebookexternalhit|Facebot|LinkedInBot|WhatsApp|Twitterbot|Slackbot|TelegramBot|Discordbot|Pinterest|SkypeUriPreview|Googlebot|bingbot|redditbot|Embedly|Applebot).*' }], dest: '/api?__html=$1' },
    { src: '/(.*)', dest: '/index.html' },
  ],
}, null, 2));

console.log('Vercel: .vercel/output pronto');
