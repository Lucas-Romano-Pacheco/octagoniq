import { rmSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/* Integração: as rotas /api de verdade (roteador + cache + adaptadores), com a internet trocada por respostas fixas.
   Não depende de ESPN nem da Wikipédia estarem no ar. */

const board = (year: number) => ({
  events: year !== 2024 ? [] : [
    { name: 'UFC 300', date: '2024-04-13T22:00Z', competitions: [
      { date: '2024-04-14T03:00Z', status: { type: { name: 'STATUS_FINAL' } }, type: { abbreviation: 'Lightweight' },
        competitors: [{ id: '1', winner: true, athlete: { displayName: 'Ana Rubro' } }, { id: '2', winner: false, athlete: { displayName: 'Bia Azul' } }] },
    ] },
    { name: 'UFC 301', date: '2024-05-04T22:00Z', competitions: [
      { date: '2024-05-05T03:00Z', status: { type: { name: 'STATUS_FINAL' } }, type: { abbreviation: 'Lightweight' },
        competitors: [{ id: '1', winner: true, athlete: { displayName: 'Ana Rubro' } }, { id: '3', winner: false, athlete: { displayName: 'Caio Verde' } }] },
    ] },
  ],
});

const WIKI = `==Men's championship history==
===Lightweight Championship===
{| class="wikitable"
|-
! 1
| {{flagicon|USA}} [[Jens Pulver]]
| [[UFC 30]]
| align=center| Feb 23, 2001
| align=center| 393 days
|
{{small| 1. def. [[Dennis Hallman]] at [[UFC 33]] on Sep 28, 2001}}
|}
===Featherweight Championship===
{| class="wikitable"
|}`;

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

beforeAll(() => {
  rmSync('.cache-test', { recursive: true, force: true });
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
    const url = String(input);
    const year = url.match(/scoreboard\?dates=(\d{4})/)?.[1];
    if (year) return json(board(Number(year)));
    if (url.includes('wikipedia.org') && url.includes('prop=wikitext')) return json({ parse: { wikitext: WIKI } });
    return new Response('não encontrado', { status: 404 });
  }));
});
afterAll(() => vi.unstubAllGlobals());

const api = async (path: string) => {
  const { handle } = await import('./routes.ts');
  return handle(new URL(`http://localhost${path}`));
};

describe('rotas /api (integração)', () => {
  it('nota Elo: o par dá a nota de cada lutador; quem venceu duas vezes fica na frente', async () => {
    const r = await api('/api/elo/pair?a=1&b=2');
    expect(r.status).toBe(200);
    const body = r.body as { a: { rating: number; fights: number }; b: { rating: number } };
    expect(body.a.fights).toBe(2);
    expect(body.a.rating).toBeGreaterThan(body.b.rating);
    expect(r.maxAge).toBeGreaterThan(0);
  });

  it('nota Elo de um lutador traz a posição na divisão; lutador desconhecido é 404', async () => {
    const ok = await api('/api/elo/fighter/1');
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ name: 'Ana Rubro', division: 'Leve', wins: 2 });
    expect((await api('/api/elo/fighter/999')).status).toBe(404);
  });

  it('linha do tempo do cinturão vem da Wikipédia já interpretada', async () => {
    const r = await api('/api/divisions/belts?name=Leve');
    expect(r.status).toBe(200);
    expect(r.body).toEqual([expect.objectContaining({ n: 1, name: 'Jens Pulver', defenses: 1, days: 393 })]);
    expect((await api('/api/divisions/belts?name=Inexistente')).status).toBe(404);
  });

  it('rota que não existe responde 404 sem cache', async () => {
    const r = await api('/api/nao-existe');
    expect(r.status).toBe(404);
    expect(r.maxAge).toBe(0);
  });
});
