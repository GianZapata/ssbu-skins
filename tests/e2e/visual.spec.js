const { test, expect } = require('@playwright/test');

test.skip(process.platform !== 'linux', 'La línea base es Chromium en ubuntu-latest.');

const mask = ['#sync'];
const skin = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#2a2418"/><text x="24" y="48" fill="#f2b632" font-size="28">apariencia</text></svg>';

test.beforeEach(async ({ context }) => {
  await context.route('**/images.gamebanana.com/**', r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: skin }));
});

async function shot(page, name) {
  await expect(page).toHaveScreenshot(name + '.png', { mask: mask.map(sel => page.locator(sel)) });
}

test('luchadores', async ({ page }) => {
  await page.goto('/index.html#/luchadores');
  await page.waitForSelector('.ft');
  await shot(page, 'luchadores');
});

test('selector', async ({ page }) => {
  await page.goto('/index.html#/luchador/01');
  await page.waitForSelector('.strip');
  await shot(page, 'selector');
});

test('galeria', async ({ page }) => {
  await page.goto('/index.html#/luchador/01/1');
  await page.waitForSelector('[data-skin]');
  await page.locator('[aria-label^="Ver detalle"]').first().click();
  await page.waitForSelector('.sheet-carousel img, .sheet img');
  await page.waitForFunction(() => { const i = document.querySelector('.sheet img'); return !!(i && i.complete && i.naturalWidth > 0); });
  await shot(page, 'galeria');
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

test('ficha', async ({ page }) => {
  await page.goto('/index.html#/apariencia/01%3A174057');
  await page.waitForSelector('.sheet');
  await page.waitForFunction(() => { const i = document.querySelector('.sheet img'); return !i || (i.complete && i.naturalWidth > 0); });
  await shot(page, 'ficha');
});

test('cambios', async ({ page }) => {
  await page.goto('/index.html#/cambios');
  await page.waitForSelector('[aria-label="Elegidas"]');
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
  await page.waitForSelector('.ft');
  await context.setOffline(true);
  await page.evaluate(() => { syncKind = 'offline'; paintSync(); });
  await page.waitForSelector('.sync-fail');
  await shot(page, 'offline');
});
