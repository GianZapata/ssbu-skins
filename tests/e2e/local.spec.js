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
  await expect(page.locator('[data-act]')).toHaveText('Guardar elección');
  await expect(page.getByText('Mario · Traje 3')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before);
});

test('buscar por autor no encuentra y el sync cabe a 320', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/#/luchador/01/1');
  await page.getByLabel('Buscar skin').fill('Happy190');
  await expect(page.getByText('Sin resultados')).toBeVisible();
  const title = await page.locator('#ttl').boundingBox();
  const menu = await page.getByRole('button', { name: 'Más opciones' }).boundingBox();
  expect(title.width).toBeGreaterThan(8);
  expect(menu.x + menu.width).toBeLessThanOrEqual(321);
});

test('el escritorio deja el escenario y el catálogo en dos columnas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/luchador/01/1');
  await page.waitForSelector('.fighter-grid');
  const columns = await page.locator('.fighter-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns);
  expect(columns.split(' ').length).toBe(2);
  await expect(page.locator('.picked')).toHaveCount(0);
});

test('el catálogo compacto filtra por personaje y limpia sin perder el tamaño', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await page.evaluate(() => localStorage.setItem('ssbu_grid', 'compacta'));
  await page.reload();
  await page.waitForSelector('.sgrid');
  const columns = await page.locator('.sgrid').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  expect(columns.split(' ').length).toBe(3);
  await page.getByRole('button', { name: 'Personaje: Todos los personajes' }).click();
  await page.getByRole('button', { name: /^Mario, / }).click();
  await expect(page.getByRole('button', { name: 'Dry Bones (v3.1 Update)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Breath of the Wild Princess Zelda' })).toHaveCount(0);
  await page.getByLabel('Buscar skin').fill('Dry');
  await expect(page.getByText('1 apariencia')).toBeVisible();
  const before = await page.evaluate(() => JSON.stringify(window.planEntries()));
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.getByRole('button', { name: 'Personaje: Todos los personajes' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.planEntries()))).toBe(before);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ssbu_grid'))).toBe('compacta');
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
  await expect(page.getByText('Aún no hay búsquedas pendientes')).toBeVisible();
});

test('al bajar, la cabecera deja ver el buscador', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/#/catalogo');
  await page.waitForSelector('.search-row');
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect(page.locator('.app-header')).toHaveClass(/app-header--hide/);
  const search = await page.locator('.search-row').boundingBox();
  expect(search.y).toBeGreaterThanOrEqual(-1);
  expect(search.y).toBeLessThan(40);
});

test('el indicador de sync no pierde su clase', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchadores');
  await expect(page.locator('#sync')).toHaveClass(/sync-word/);
});

test('un enlace directo no sale de la app con Volver', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await expect(page.getByRole('button', { name: 'Volver' })).toBeVisible();
  const depth = await page.evaluate(() => (history.state && history.state.depth));
  expect(depth).toBe(0);
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(page).toHaveURL(/#\/luchadores/);
  await expect(page.locator('.ft').first()).toBeVisible();
});

test('el plan conserva el luchador y su candidata', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/3');
  await page.waitForSelector('[data-skin]');
  await page.locator('[data-skin]').first().click();
  const vid = await page.locator('[data-skin][aria-pressed="true"]').getAttribute('data-skin');
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = '#/cambios';
    document.body.appendChild(link);
    link.click();
  });
  await expect(page.getByRole('dialog', { name: 'Elegidas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar' })).toHaveCount(0);
  await expect(page.locator('[data-skin="' + vid + '"][aria-pressed="true"]')).toHaveCount(1);
});

test('mirar el detalle no cambia la candidata', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/3');
  await page.waitForSelector('[data-skin]');
  await page.locator('[data-skin]').first().click();
  const vid = await page.locator('[data-skin][aria-pressed="true"]').getAttribute('data-skin');
  await page.locator('[aria-label^="Ver detalle"]').nth(1).click();
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.locator('[data-skin="' + vid + '"][aria-pressed="true"]')).toHaveCount(1);
});

test('el catálogo pide elegir traje y no escribe el plan', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await page.getByRole('button', { name: 'Dry Bones (v3.1 Update)' }).click();
  const before = await page.evaluate(() => JSON.stringify(window.planEntries()));
  await expect(page.getByRole('button', { name: 'Elegir traje' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar elección' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Elegir traje' }).click();
  await expect(page).toHaveURL(/#\/luchador\/01\/1/);
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.planEntries()))).toBe(before);
  const vid = await page.locator('[aria-pressed="true"][data-skin]').getAttribute('data-skin');
  await page.locator('[data-slot="1"]').click();
  await expect(page.locator('[aria-pressed="true"][data-skin="' + vid + '"]')).toHaveCount(1);
  await expect(page.getByText('Toca un traje para compararla ahí')).toBeVisible();
});

test('Volver y Adelante recorren Catálogo e Instaladas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await page.getByRole('link', { name: 'Instaladas' }).click();
  await expect(page).toHaveURL(/#\/instaladas/);
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(page).toHaveURL(/#\/catalogo/);
  await page.goForward();
  await expect(page).toHaveURL(/#\/instaladas/);
});

test('filtrar un personaje no suma profundidad', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/#/catalogo');
  await page.waitForSelector('.sgrid');
  const before = await page.evaluate(() => history.state && history.state.depth);
  await page.getByRole('button', { name: 'Personaje: Todos los personajes' }).click();
  await page.getByRole('button', { name: /^Mario, / }).click();
  await expect(page.getByRole('dialog', { name: 'Personaje' })).toBeHidden();
  const after = await page.evaluate(() => history.state && history.state.depth);
  expect(after).toBe(before);
});

test('la ficha del catálogo deja el catálogo debajo', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/#/catalogo');
  await page.getByRole('button', { name: 'Dry Bones (v3.1 Update)' }).click();
  await expect(page.getByRole('dialog', { name: /Detalle de/ })).toBeVisible();
  await expect(page.locator('.list-page--catalog [data-vid]').first()).toBeAttached();
});

test('Atrás cierra el selector de personaje', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/#/catalogo');
  await page.getByRole('button', { name: 'Personaje: Todos los personajes' }).click();
  await expect(page.getByRole('dialog', { name: 'Personaje' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Personaje' })).toBeHidden();
  await expect(page).toHaveURL(/#\/catalogo$/);
});

test('al bajar, la lista y el personaje caben en la barra que ya estaba', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await page.waitForSelector('.sgrid');
  await page.getByRole('button', { name: 'Personaje: Todos los personajes' }).click();
  await page.getByRole('button', { name: /^Mario, / }).click();
  await expect(page.getByRole('dialog', { name: 'Personaje' })).toBeHidden();
  const before = await page.locator('.search-row').boundingBox();
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect(page.getByRole('button', { name: 'Personaje: Catálogo · Mario' })).toBeVisible();
  const after = await page.locator('.search-row').boundingBox();
  expect(after.height).toBeLessThanOrEqual(before.height + 1);
});

test('volver del detalle conserva la búsqueda', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await page.getByLabel('Buscar skin').fill('Dry');
  await page.getByRole('button', { name: /Dry Bones/ }).first().click();
  const before = await page.evaluate(() => window.planEntries().length);
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByLabel('Buscar skin')).toHaveValue('Dry');
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before);
});

test('cambiar el tamaño conserva la tarjeta visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await page.evaluate(() => localStorage.setItem('ssbu_grid', 'compacta'));
  await page.reload();
  await page.waitForSelector('[data-keep]');
  await page.evaluate(() => window.scrollTo(0, 700));
  const before = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-keep]')];
    const card = cards.find((el) => el.getBoundingClientRect().bottom > 80);
    if (!card) return { key: '', top: 0 };
    return { key: card.getAttribute('data-keep') || '', top: card.getBoundingClientRect().top };
  });
  expect(before.key).not.toBe('');
  await page.getByRole('button', { name: 'Ampliar' }).click();
  await expect.poll(() => page.evaluate(({ key, top }) => {
    const card = document.querySelector('[data-keep="' + key + '"]');
    if (!card) return 999;
    return Math.abs(card.getBoundingClientRect().top - top);
  }, before)).toBeLessThan(8);
});
