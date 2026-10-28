const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ context }) => {
  await context.route(/googleapis|gstatic\.com\/firebasejs|identitytoolkit|securetoken/, route => route.abort());
});

test('el toque no escribe el plan y el botón nombra el traje', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/3');
  await page.waitForSelector('[data-skin]');
  const before = await page.evaluate(() => window.planEntries().length);
  await page.locator('[data-skin]').first().click();
  await expect(page.locator('[data-act]')).toHaveText(/Usar en Traje 3|Reemplazar en Traje 3/);
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before);
});

test('buscar por autor no encuentra y el sync cabe a 320', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/#/luchador/01/1');
  await page.getByLabel('Buscar skin').fill('Happy190');
  await expect(page.getByText('Sin resultados')).toBeVisible();
  const sync = await page.locator('#sync').boundingBox();
  const title = await page.locator('#ttl').boundingBox();
  expect(sync.x + sync.width).toBeLessThanOrEqual(321);
  expect(title.width).toBeGreaterThan(8);
});

test('el escritorio deja el escenario y el catálogo en dos columnas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/luchador/01/1');
  await page.waitForSelector('.fighter-grid');
  const columns = await page.locator('.fighter-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns);
  expect(columns.split(' ').length).toBe(2);
  await expect(page.locator('.picked')).toHaveCount(0);
});

test('catálogo e instaladas están aparte y no hay Historial', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await expect(page.getByRole('button', { name: 'Dry Bones (v3.1 Update)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Instalar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Historial' })).toHaveCount(0);
  await page.goto('/#/instaladas');
  await expect(page.getByRole('link', { name: /Ventus/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Dry Bones/ })).toHaveCount(0);
  await page.goto('/#/notas');
  await expect(page.getByText('Ninguna búsqueda anotada')).toBeVisible();
});
