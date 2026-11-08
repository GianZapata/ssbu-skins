const { test, expect } = require('@playwright/test');

test.skip(process.platform !== 'linux', 'La línea base es Chromium en ubuntu-latest.');

const mask = ['#sync'];
const skin = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="#2a2418"/><text x="24" y="48" fill="#f2b632" font-size="28">apariencia</text></svg>';

test.beforeEach(async ({ context, page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('ssbu_person', 'Gian'); } catch (_) {}
  });
  await context.route('**/images.gamebanana.com/**', r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: skin }));
});

async function shot(page, name) {
  await expect(page).toHaveScreenshot(name + '.png', { mask: mask.map(sel => page.locator(sel)) });
}

test('luchador', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html#/luchador/01/1');
  await page.waitForSelector('.costume-strip');
  await page.waitForFunction(() => [...document.querySelectorAll('.costume-strip img, .active-bar img')].every(i => i.complete));
  await shot(page, 'luchador');
});

test('luchador-escritorio', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/index.html#/luchador/01/1');
  await page.waitForSelector('.fighter-workspace--split');
  await page.waitForFunction(() => [...document.querySelectorAll('.costume-strip img, .active-bar img')].every(i => i.complete));
  await shot(page, 'luchador-escritorio');
});

test('skin-sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html#/luchador/01/1?skin=01%3A174057');
  await page.waitForSelector('.skin-sheet-body');
  await page.waitForFunction(() => [...document.querySelectorAll('.skin-sheet-body img')].every(i => i.complete));
  await shot(page, 'skin-sheet');
});

test('selector-luchador', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html#/luchador/01/1');
  await page.locator('[data-fighter-pick]').click();
  await page.waitForSelector('[data-fighter-tile]');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-fighter-tile]:nth-child(-n+12) img')].every(i => i.complete));
  await shot(page, 'selector-luchador');
});

test('galeria', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html#/luchador/01/1');
  await page.waitForSelector('[data-skin]');
  await page.locator('.card__more').first().click();
  await page.waitForSelector('.pswp--open');
  await page.waitForFunction(() => { const i = document.querySelector('.pswp img.pswp__img'); return !!(i && i.complete && i.naturalWidth > 0); });
  await shot(page, 'galeria');
});

test('cambios', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html#/cambios');
  await page.waitForSelector('[aria-label="Cambios"]');
  await shot(page, 'cambios');
});

test('vacio', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html#/luchador/01/1');
  await page.getByLabel('Buscar skin').fill('xyznoexiste');
  await page.waitForSelector('.empty');
  await shot(page, 'vacio');
});

test('offline', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html#/luchador/01/1');
  await page.waitForSelector('.costume-strip');
  await context.setOffline(true);
  await page.evaluate(() => { syncKind = 'offline'; paintSync(); });
  await page.waitForSelector('.sync-fail');
  await shot(page, 'offline');
});
