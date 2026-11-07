const { test, expect } = require('@playwright/test');

test.skip(process.platform !== 'linux', 'La línea base es Chromium en ubuntu-latest.');

const mask = ['#sync'];
const skin = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#2a2418"/><text x="24" y="48" fill="#f2b632" font-size="28">apariencia</text></svg>';

test.beforeEach(async ({ context }) => {
  await context.route('**/images.gamebanana.com/**', r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: skin }));
});

async function shot(page, name) {
  await expect(page).toHaveScreenshot(name + '.png', { mask: [...mask.map(sel => page.locator(sel)), page.getByText(/^Plan actualizado el /)] });
}

test('luchadores', async ({ page }) => {
  await page.goto('/index.html#/luchadores');
  await page.waitForSelector('.rrow');
  await page.waitForFunction(() => [...document.querySelectorAll('.rrow:nth-child(-n+4) img')].every(i => i.complete));
  await shot(page, 'luchadores');
});

test('luchadores-grandes', async ({ page }) => {
  await page.goto('/index.html#/luchadores');
  await page.getByRole('button', { name: 'Trajes grandes' }).click();
  await page.waitForSelector('[data-fighter="01"].rrow--large .rcost');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-fighter="01"] img')].every(i => i.complete));
  await shot(page, 'luchadores-grandes');
});

test('selector', async ({ page }) => {
  await page.goto('/index.html#/luchador/01');
  await page.waitForSelector('.cgrid');
  await page.waitForFunction(() => [...document.querySelectorAll('.cgrid img')].every(i => i.complete));
  await shot(page, 'selector');
});

test('galeria', async ({ page }) => {
  await page.goto('/index.html#/luchador/01/1');
  await page.waitForSelector('[data-skin]');
  await page.locator('.card__more').first().click();
  await page.waitForSelector('.pswp--open');
  await page.waitForFunction(() => { const i = document.querySelector('.pswp img.pswp__img'); return !!(i && i.complete && i.naturalWidth > 0); });
  await shot(page, 'galeria');
});

test('comparar-abajo', async ({ page }) => {
  await page.goto('/index.html#/luchador/01/3');
  await page.waitForSelector('[data-skin]');
  await page.locator('[data-skin]').first().click();
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForSelector('.cbar');
  await page.waitForFunction(() => [...document.querySelectorAll('.cbar img')].every(i => i.complete));
  await shot(page, 'comparar-abajo');
});

test('comparar', async ({ page }) => {
  await page.goto('/index.html#/luchador/01/1');
  await page.waitForSelector('.cmp');
  await shot(page, 'comparar');
});

test('catalogo', async ({ page }) => {
  await page.goto('/index.html#/catalogo');
  await page.waitForSelector('.cgroup');
  await shot(page, 'catalogo');
});

test('candidata', async ({ page }) => {
  await page.goto('/index.html#/luchador/01?skin=01%3A174057');
  await page.waitForSelector('.placing');
  await page.waitForFunction(() => [...document.querySelectorAll('.cgrid img, .placing img')].every(i => i.complete));
  await shot(page, 'candidata');
});

test('cambios', async ({ page }) => {
  await page.goto('/index.html#/cambios');
  await page.waitForSelector('[aria-label="Cambios"]');
  await shot(page, 'cambios');
});

test('vacio', async ({ page }) => {
  await page.goto('/index.html#/catalogo');
  await page.getByLabel('Buscar skin').fill('xyznoexiste');
  await page.waitForSelector('.empty');
  await shot(page, 'vacio');
});

test('filtros', async ({ page }) => {
  await page.goto('/index.html#/catalogo');
  await page.waitForSelector('.cgroup');
  await page.getByRole('button', { name: 'Personaje: Todos los personajes' }).click();
  await shot(page, 'menu');
});

test('offline', async ({ page, context }) => {
  await page.goto('/index.html#/luchadores');
  await page.waitForSelector('.rrow');
  await context.setOffline(true);
  await page.evaluate(() => { syncKind = 'offline'; paintSync(); });
  await page.waitForSelector('.sync-fail');
  await shot(page, 'offline');
});
