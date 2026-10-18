// Build de produção: compila o Tailwind (CLI, minificado) e gera um HTML único.
//  dist/octagoniq.html  → corpo para publicação como Artifact (sem doctype)
//  dist/index.html      → documento completo para abrir no navegador ou hospedar
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = p => readFileSync(resolve(root, 'src', p), 'utf8');
mkdirSync(resolve(root, 'dist'), { recursive: true });

execFileSync(resolve(root, 'node_modules/.bin/tailwindcss'),
  ['-c', 'tailwind.config.js', '-i', 'src/styles.css', '-o', 'dist/styles.css', '--minify'],
  { cwd: root, stdio: 'inherit' });

const css = readFileSync(resolve(root, 'dist/styles.css'), 'utf8');
const js = [src('data.js'), src('engine.js'), src('app.js')].join('\n\n');
const body = src('index.html').replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);

writeFileSync(resolve(root, 'dist/octagoniq.html'), body);
writeFileSync(resolve(root, 'dist/index.html'),
  `<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
console.log(`OK · ${(body.length / 1024).toFixed(0)} KB · css ${(css.length / 1024).toFixed(0)} KB`);
