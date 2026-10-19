/* Copia as bandeiras SVG dos pacotes (circle-flags e flag-icons) para public/flags/ e gera src/lib/flag-codes.ts
   com os códigos disponíveis. Roda no `postinstall`: os arquivos são gerados (ficam fora do git) e servidos como
   estáticos, em vez de entrarem no JavaScript como um mapa de ~430 caminhos. */

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const SETS = { circle: 'node_modules/circle-flags/flags', rect: 'node_modules/flag-icons/flags/4x3' };
if (!Object.values(SETS).every(existsSync)) { console.log('copy-flags: pacotes de bandeiras ausentes, ignorando'); process.exit(0); }

// só países e nações do Reino Unido (br, us, gb-eng, gb-sct…); sai o resto (organizações, idiomas, estados)
const wanted = f => /^[a-z]{2}(-[a-z]{3})?\.svg$/.test(f);
const codes = {};
rmSync('public/flags', { recursive: true, force: true });
for (const [name, dir] of Object.entries(SETS)) {
  mkdirSync(`public/flags/${name}`, { recursive: true });
  codes[name] = readdirSync(dir).filter(wanted).map(f => f.replace('.svg', '')).sort();
  for (const c of codes[name]) cpSync(`${dir}/${c}.svg`, `public/flags/${name}/${c}.svg`);
}
writeFileSync('src/lib/flag-codes.ts', `/* GERADO por scripts/copy-flags.mjs (postinstall): não edite. */\nexport const CIRCLE_CODES = new Set(${JSON.stringify(codes.circle)});\nexport const RECT_CODES = new Set(${JSON.stringify(codes.rect)});\n`);
console.log(`copy-flags: ${codes.circle.length} circulares, ${codes.rect.length} retangulares`);
