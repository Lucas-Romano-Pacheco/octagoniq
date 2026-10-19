/* Plugin do Vite que serve o BFF em /api/* durante o `npm run dev`. */

import type { Plugin } from 'vite';
import { handle } from './routes.ts';
import { warmUp } from './warm.ts';
import { ogImage } from './og.ts';
import { IMG_CACHE, resizeImage } from './img.ts';

export function apiPlugin(): Plugin {
  return {
    name: 'octagoniq-api',
    configureServer(server) {
      warmUp();
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/img?')) {
          const q = new URL(req.url, 'http://localhost').searchParams;
          const png = await resizeImage(q.get('u') ?? '', Number(q.get('w'))).catch(() => null);
          if (!png) { res.statusCode = 404; return res.end(); }
          res.setHeader('Content-Type', 'image/webp'); res.setHeader('Cache-Control', IMG_CACHE);
          return res.end(png);
        }
        if (req.url?.startsWith('/og/')) {
          const png = await ogImage(new URL(req.url, 'http://localhost').pathname);
          res.setHeader('Content-Type', 'image/png');
          return res.end(png);
        }
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
