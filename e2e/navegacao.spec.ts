import { expect, test } from '@playwright/test';

/* Caminhos principais de quem usa o site. Os dados são os reais (ESPN/UFC.com), então as checagens olham a estrutura
   da página, não nomes de lutadores que mudam a cada semana. */

const semRolagemLateral = async (page: import('@playwright/test').Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

// a tela de entrada aparece uma vez por aba; nos testes de navegação ela já foi vista (o teste dela fica abaixo)
test.beforeEach(async ({ page }, info) => {
  if (!info.title.startsWith('tela de entrada')) await page.addInitScript(() => sessionStorage.setItem('octagoniq-splash', '1'));
});

test('tela de entrada: anima, espera a pessoa e leva ao início', async ({ page }) => {
  await page.goto('/');
  const abertura = page.getByRole('dialog', { name: 'Abertura do OctagonIQ' });
  await expect(abertura).toBeVisible();
  const entrar = abertura.getByRole('button', { name: 'Soar o gongo' });
  await expect(entrar).toBeVisible();
  await expect(entrar).toBeFocused();
  // continua lá enquanto ninguém interage
  await page.waitForTimeout(1500);
  await expect(abertura).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(abertura).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // na mesma aba, não aparece de novo
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(abertura).toHaveCount(0);
});

test('início mostra o próximo evento e leva ao card completo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('link', { name: /Ver as \d+ lutas/ }).click();
  await expect(page).toHaveURL(/\/eventos\/\d+/);
  await expect(page.getByRole('heading', { name: 'Card principal' })).toBeVisible();
  await semRolagemLateral(page);
});

test('menu chega a todas as seções', async ({ page, isMobile }) => {
  await page.goto('/');
  for (const [nome, url] of [['Eventos', /\/eventos$/], ['Rankings', /\/rankings/], ['Lutadores', /\/lutadores$/], ['Palpites', /\/palpites/]] as const) {
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: nome, exact: true }).click();
    await expect(page).toHaveURL(url);
    if (isMobile) await semRolagemLateral(page);
  }
});

test('evento → luta encerrada: estatísticas e odds', async ({ page }) => {
  // o último evento encerrado, pela API (estável), e dele a primeira luta
  const sched = await (await page.request.get('/api/schedule?year=' + new Date().getFullYear())).json();
  const last = [...sched].reverse().find((e: { date: string; series: string }) => Date.parse(e.date) < Date.now() - 86_400_000 && e.series !== 'dwcs');
  await page.goto(`/eventos/${last.id}`);
  await page.locator('a[aria-label^="Ver a luta"]').first().click();
  await expect(page).toHaveURL(/\/lutas\/\d+/);
  await expect(page.getByRole('heading', { name: /Estatísticas da luta|Prévia da luta/ })).toBeVisible();
  await semRolagemLateral(page);
});

test('perfil do lutador tem cartel, estatísticas e histórico', async ({ page }) => {
  await page.goto('/lutadores/islam-makhachev');
  await expect(page.getByRole('heading', { level: 1, name: /Makhachev/i })).toBeVisible();
  await expect(page.getByText('Cartel').first()).toBeVisible();
  await page.getByRole('tab', { name: /Histórico/ }).click();
  await expect(page.locator('table, ol').first()).toBeVisible();
  await semRolagemLateral(page);
});

test('comparador mostra o placar de vantagens', async ({ page }) => {
  await page.goto('/comparar?a=islam-makhachev&b=alexander-volkanovski');
  await expect(page.getByRole('heading', { name: 'Placar de vantagens' })).toBeVisible();
  await semRolagemLateral(page);
});

test('palpite: escolher o vencedor conta no placar do card', async ({ page }) => {
  await page.goto('/palpites');
  const escolha = page.locator('button[aria-label^="Vencedor:"]:enabled').first();
  await escolha.click();
  await expect(escolha).toHaveAttribute('aria-pressed', 'true');
});

test('tela de entrar tem apelido e senha', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByLabel('Apelido')).toBeVisible();
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
});

test('enquanto os dados chegam, a página mostra o esqueleto no lugar do conteúdo', async ({ page }) => {
  // segura a resposta do perfil por 1,5 s para o estado de carregamento aparecer
  await page.route('**/api/fighters/**', async route => { await new Promise(r => setTimeout(r, 1500)); await route.continue(); });
  await page.goto('/lutadores/charles-oliveira');
  await expect(page.getByRole('status', { name: 'Carregando o perfil do lutador' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: /Oliveira/i })).toBeVisible();
});

test('página que não existe mostra a 404 temática', async ({ page }) => {
  await page.goto('/nao-existe-esta-pagina');
  await expect(page.getByRole('heading', { name: /Nocaute no 1º round/ })).toBeVisible();
});
