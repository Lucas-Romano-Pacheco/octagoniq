/* Plugin do Vite que serve o BFF em /api/* durante o `npm run dev`. */

import type { Plugin } from 'vite';
import { handle } from './routes.ts';
import { warmUp } from './warm.ts';

export function apiPlugin(): Plugin {
  return {
    name: 'octagoniq-api',
    configureServer(server) {
      warmUp();
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const r = await handle(new URL(req.url, 'http://localhost'));
        res.statusCode = r.status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', r.maxAge ? `public, max-age=${r.maxAge}` : 'no-store');
        res.end(JSON.stringify(r.body));
      });
    },
  };
}
