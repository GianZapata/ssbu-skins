const { test, expect } = require('@playwright/test');

test.skip(process.platform !== 'linux', 'La línea base es Chromium en ubuntu-latest.');

const mask = ['#sync'];

async function shot(page, name) {
  await expect(page).toHaveScreenshot(name + '.png', { mask: page.locator(mask.join(',')) });
}

test('luchadores', async ({ page }) => {
  await page.goto('/index.html#/luchadores');
  await page.waitForSelector('.ft');
  await shot(page, 'luchadores');
});

test('selector', async ({ page }) => {
  await page.goto('/index.html#/luchador/01');
  await page.waitForSelector('.tgrid');
  await shot(page, 'selector');
});

test('galeria', async ({ page }) => {
  await page.goto('/index.html#/luchador/01/1');
  await page.waitForSelector('[data-skin]');
  await page.locator('[data-skin]').first().click();
  await page.waitForSelector('.hero');
  await shot(page, 'galeria');
});

test('comparar', async ({ page }) => {
  await page.goto('/index.html#/luchador/01/1');
  await page.waitForSelector('[data-mode="comparar"]');
  await page.click('[data-mode="comparar"]');
  await shot(page, 'comparar');
});

test('catalogo', async ({ page }) => {
  await page.goto('/index.html#/catalogo');
  await page.waitForSelector('.cd');
  await shot(page, 'catalogo');
});

test('ficha', async ({ page }) => {
  await page.goto('/index.html#/apariencia/01%3A174057');
  await page.waitForSelector('.hero, .note');
  await shot(page, 'ficha');
});

test('cambios', async ({ page }) => {
  await page.goto('/index.html#/cambios');
  await page.waitForSelector('[data-export]');
  await shot(page, 'cambios');
});

test('vacio', async ({ page }) => {
  await page.goto('/index.html#/catalogo');
  await page.waitForSelector('#cq');
  await page.fill('#cq', 'xyznoexiste');
  await page.waitForSelector('#ce:not([hidden])');
  await shot(page, 'vacio');
});

test('menu', async ({ page }) => {
  await page.goto('/index.html#/luchadores');
  await page.waitForSelector('#menuBtn');
  await page.click('#menuBtn');
  await page.waitForSelector('#dlg.open');
  await shot(page, 'menu');
});

test('offline', async ({ page, context }) => {
  await page.goto('/index.html#/luchadores');
  await page.waitForSelector('#sync');
  await context.setOffline(true);
  await page.evaluate(() => { syncKind = 'offline'; paintSync(); });
  await shot(page, 'offline');
});
