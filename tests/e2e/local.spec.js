const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ context, page }, testInfo) => {
  if (!testInfo.title.includes('gate perezoso')) await page.addInitScript(() => { try { localStorage.setItem('ssbu_person', 'Gian'); } catch (_) {} });
  await context.route(/googleapis|gstatic\.com\/firebasejs|identitytoolkit|securetoken/, route => route.abort());
});

test('el toque no escribe el plan y el botón nombra el traje', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/3');
  await page.waitForSelector('[data-skin]');
  const before = await page.evaluate(() => window.planEntries().length);
  await page.locator('[data-skin]').first().click();
  await expect(page.locator('[data-act]')).toHaveText('Guardar propuesta');
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
  await page.getByRole('button', { name: /^Mario, \d+ apariencias/ }).click();
  await expect(page.getByRole('button', { name: 'Tanooki Mario', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Breath of the Wild Princess Zelda', exact: true })).toHaveCount(0);
  await page.getByLabel('Buscar skin').fill('Tanooki');
  await expect(page.getByText('1 apariencia')).toBeVisible();
  const before = await page.evaluate(() => JSON.stringify(window.planEntries()));
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.getByRole('button', { name: 'Personaje: Todos los personajes' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.planEntries()))).toBe(before);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ssbu_grid'))).toBe('compacta');
});

test('catálogo y notas están aparte, no hay Historial y las rutas viejas redirigen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await expect(page.getByRole('button', { name: 'Tanooki Mario', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Instalar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Historial' })).toHaveCount(0);
  await page.goto('/#/instaladas');
  await expect(page).toHaveURL(/#\/luchadores\?filtro=perfil/);
  await expect(page.getByRole('link', { name: /: Ventus/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Tanooki/ })).toHaveCount(0);
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

test('un traje con mod sin retrato muestra Sin retrato y no una imagen ajena', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchadores');
  await page.getByLabel('Buscar luchador o skin').fill('Duck Hunt');
  await page.waitForSelector('[data-fighter="59"] .rcost');
  const tile = page.locator('[data-fighter="59"] .rcost').first();
  await expect(tile.locator('.app-img__missing')).toHaveText('Sin retrato');
  await expect(tile.locator('img')).toHaveCount(0);
  await expect(tile.locator('.q-img')).toHaveCount(0);
  await page.goto('/#/luchador/59/1');
  await expect(page.locator('.cmp__img--cur .app-img__missing')).toHaveText('Sin retrato');
  await expect(page.locator('.cmp__img--cur img')).toHaveCount(0);
  await expect(page.locator('.cmp__img--cur .q-img')).toHaveCount(0);
});

test('luchadores muestra los 8 trajes de cada uno y Cambios', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchadores');
  await page.waitForSelector('[data-fighter="01"] .rcost');
  await expect(page.locator('[data-fighter="01"] .rcost')).toHaveCount(8);
  await expect(page.locator('#ttl')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver cambios, 0' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver cambios, 0' })).toHaveText('Cambios · 0');
  await expect(page.getByText('Variantes: aún no disponibles')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Trajes grandes' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver cambios, 0' }).click();
  await expect(page.getByRole('dialog', { name: 'Cambios' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar' })).toHaveCount(0);
  await expect(page.locator('[data-undo]')).toHaveCount(0);
});

test('los trajes grandes muestran cada traje con su nombre y estado', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/#/luchadores');
  await page.getByRole('button', { name: 'Trajes grandes' }).click();
  await page.waitForSelector('[data-fighter="01"].rrow--large .rcost');
  const head = await page.locator('[data-fighter="01"] .rrow__head').boundingBox();
  expect(head.y).toBeLessThan(420);
  const tile = await page.locator('[data-fighter="01"] .rcost').first().boundingBox();
  expect(tile.width).toBeGreaterThan(70);
  await expect(page.locator('[data-fighter="01"] .rcost').first().locator('.rcost__txt')).toBeVisible();
  await expect(page.locator('.dest a[aria-current="page"]')).toHaveText('Luchadores');
  await page.setViewportSize({ width: 390, height: 844 });
  const head390 = await page.locator('[data-fighter="01"] .rrow__head').boundingBox();
  expect(head390.y).toBeLessThan(520);
});

test('los contadores separan perfil, pack base y originales y no dicen instalada', async ({ page }) => {
  await page.goto('/#/luchadores');
  await page.waitForSelector('.rrow');
  await expect(page.locator('[data-fighter="01"] .meter')).toHaveAttribute('aria-label', '8 de 8 trajes con mod de tu perfil');
  const summary = await page.locator('.roster-counts summary').textContent();
  const [, profile, total] = /^(\d+) de (\d+) trajes con mod de tu perfil$/.exec((summary || '').trim()) || [];
  expect(Number(profile)).toBeGreaterThan(0);
  await page.locator('.roster-counts summary').click();
  const detail = await page.locator('.roster-counts p').textContent();
  const [, base, original] = /^(\d+) del pack base(?: \(\d+ sin identificar\))? · (\d+) originales$/.exec((detail || '').trim()) || [];
  expect(Number(profile) + Number(base) + Number(original)).toBe(Number(total));
  expect(await page.locator('.rcost--profile').count()).toBe(Number(profile));
  const text = (await page.locator('main').textContent()) || '';
  expect(text).not.toMatch(/instalad|en la SD|propios/i);
});

test('un enlace directo no sale de la app con Volver', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await expect(page.getByRole('button', { name: 'Volver' })).toBeVisible();
  const depth = await page.evaluate(() => (history.state && history.state.depth));
  expect(depth).toBe(0);
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(page).toHaveURL(/#\/luchadores/);
  await expect(page.locator('.rrow').first()).toBeVisible();
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
  await expect(page.getByRole('dialog', { name: 'Cambios' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar' })).toHaveCount(0);
  await expect(page.locator('[data-skin="' + vid + '"][aria-pressed="true"]')).toHaveCount(1);
});

test('ampliar una imagen no cambia la candidata', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/3');
  await page.waitForSelector('[data-skin]');
  await page.locator('[data-skin]').first().click();
  const vid = await page.locator('[data-skin][aria-pressed="true"]').getAttribute('data-skin');
  await page.locator('.card__more').nth(1).click();
  await expect(page.locator('.pswp')).toBeVisible();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Cerrar' }).last().click();
  await expect(page.locator('.pswp')).toHaveCount(0);
  await expect(page.locator('[data-skin="' + vid + '"][aria-pressed="true"]')).toHaveCount(1);
});

test('el catálogo lleva al luchador con la skin y pide elegir traje sin escribir el plan', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await page.getByRole('button', { name: 'Tanooki Mario', exact: true }).click();
  const before = await page.evaluate(() => JSON.stringify(window.planEntries()));
  await expect(page).toHaveURL(/#\/luchador\/01\?skin=/);
  await expect(page.getByText('Elegir traje para')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar propuesta' })).toHaveCount(0);
  const vid = await page.locator('[aria-pressed="true"][data-skin]').getAttribute('data-skin');
  await page.locator('[data-slot="1"]').click();
  await expect(page).toHaveURL(/#\/luchador\/01\/2\?skin=/);
  await expect(page.locator('[aria-pressed="true"][data-skin="' + vid + '"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Guardar propuesta' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.planEntries()))).toBe(before);
});

test('Volver y Adelante recorren Catálogo y Luchadores', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await page.getByRole('link', { name: 'Luchadores', exact: true }).click();
  await expect(page).toHaveURL(/#\/luchadores/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/catalogo/);
  await page.goForward();
  await expect(page).toHaveURL(/#\/luchadores/);
});

test('filtrar un personaje no suma profundidad', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/#/catalogo');
  await page.waitForSelector('.sgrid');
  const before = await page.evaluate(() => history.state && history.state.depth);
  await page.getByRole('button', { name: 'Personaje: Todos los personajes' }).click();
  await page.getByRole('button', { name: /^Mario, \d+ apariencias/ }).click();
  await expect(page.getByRole('dialog', { name: 'Personaje' })).toBeHidden();
  const after = await page.evaluate(() => history.state && history.state.depth);
  expect(after).toBe(before);
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
  await page.getByRole('button', { name: /^Mario, \d+ apariencias/ }).click();
  await expect(page.getByRole('dialog', { name: 'Personaje' })).toBeHidden();
  const before = await page.locator('.search-row').boundingBox();
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect(page.getByRole('button', { name: 'Personaje: Catálogo · Mario' })).toBeVisible();
  const after = await page.locator('.search-row').boundingBox();
  expect(after.height).toBeLessThanOrEqual(before.height + 1);
});

test('volver del luchador conserva la búsqueda del catálogo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await page.getByLabel('Buscar skin').fill('Tanooki');
  await page.getByRole('button', { name: /Tanooki Mario/ }).first().click();
  const before = await page.evaluate(() => window.planEntries().length);
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(page.getByLabel('Buscar skin')).toHaveValue('Tanooki');
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
  await page.getByRole('button', { name: 'Ampliar', exact: true }).click();
  await expect.poll(() => page.evaluate(({ key, top }) => {
    const card = document.querySelector('[data-keep="' + key + '"]');
    if (!card) return 999;
    return Math.abs(card.getBoundingClientRect().top - top);
  }, before)).toBeLessThan(8);
});

test('recorrido: del luchador al traje, comparar, guardar y deshacer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchadores');
  await page.locator('[data-fighter="01"] .rrow__head').click();
  await expect(page).toHaveURL(/#\/luchador\/01$/);
  await page.locator('[data-slot="2"]').click();
  await expect(page).toHaveURL(/#\/luchador\/01\/3$/);
  const before = await page.evaluate(() => window.planEntries().length);
  await page.locator('[data-skin]').first().click();
  await expect(page.getByText('Actual', { exact: true })).toBeVisible();
  await expect(page.getByText('Nueva', { exact: true })).toBeVisible();
  await expect(page.locator('[data-act]')).toHaveText('Guardar propuesta');
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before);
  await page.locator('[data-act]').click();
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before + 1);
  await expect(page.getByText('Propuesta guardada').first()).toBeVisible();
  await page.locator('#toast').getByRole('button', { name: 'Deshacer' }).click();
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before);
});

test('cancelar la candidata quita la skin de la ruta sin escribir el plan', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await page.getByRole('button', { name: 'Tanooki Mario', exact: true }).click();
  const before = await page.evaluate(() => JSON.stringify(window.planEntries()));
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page).toHaveURL(/#\/luchador\/01$/);
  await expect(page.getByText('Elegir traje para')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify(window.planEntries()))).toBe(before);
});

test('recargar conserva el traje y la candidata de la ruta', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/3');
  await page.waitForSelector('[data-skin]');
  await page.locator('[data-skin]').first().click();
  const vid = await page.locator('[data-skin][aria-pressed="true"]').getAttribute('data-skin');
  await expect(page).toHaveURL(/#\/luchador\/01\/3\?skin=/);
  await page.reload();
  await expect(page.locator('[data-skin="' + vid + '"][aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator('[data-slot="2"]')).toHaveAttribute('aria-pressed', 'true');
});

test('las rutas viejas redirigen sin añadir entradas al historial', async ({ page }) => {
  await page.goto('/#/luchadores');
  const start = await page.evaluate(() => history.length);
  const cases = [
    ['/#/tarjeta', /#\/luchadores$/],
    ['/#/instaladas', /#\/luchadores\?filtro=perfil$/],
    ['/#/instaladas?pj=04', /#\/luchador\/04$/],
    ['/#/apariencia/01:374147?para=01_2', /#\/luchador\/01\/3\?skin=/],
    ['/#/apariencia/01:374147?para=01_2&de=catalogo', /#\/luchador\/01\?skin=/],
  ];
  for (const [url, expected] of cases) {
    await page.goto(url);
    await expect(page).toHaveURL(expected);
  }
  const grown = (await page.evaluate(() => history.length)) - start;
  expect(grown).toBeLessThanOrEqual(cases.length);
});

test('Atrás vuelve de la comparación al luchador y de ahí a la lista en el mismo punto', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchadores');
  await page.waitForSelector('.rrow');
  await page.evaluate(() => window.scrollTo(0, 900));
  const before = await page.evaluate(() => window.scrollY);
  const row = page.locator('.rrow').filter({ has: page.locator('.rrow__head') }).nth(7);
  await row.scrollIntoViewIfNeeded();
  const marked = await page.evaluate(() => window.scrollY);
  await row.locator('.rrow__head').click();
  await expect(page).toHaveURL(/#\/luchador\/[^/]+$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.locator('[data-slot="1"]').click();
  await expect(page).toHaveURL(/#\/luchador\/[^/]+\/2$/);
  await expect(page.locator('.cgrid--compact')).toHaveCount(1);
  await page.goBack();
  await expect(page).toHaveURL(/#\/luchador\/[^/]+$/);
  await expect(page.locator('.cgrid--compact')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/#\/luchadores/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(Math.min(before, marked) - 200);
});

for (const width of [320, 360, 390, 430]) {
  test('a ' + width + ' px los ocho trajes van en 2 columnas por 4 filas, sin desborde ni controles tapados', async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/#/luchador/04');
    await page.waitForSelector('.cgrid .cell');
    const grid = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('.cgrid .cell')];
      const tops = new Set(cells.map((cell) => Math.round(cell.getBoundingClientRect().top)));
      const lefts = new Set(cells.map((cell) => Math.round(cell.getBoundingClientRect().left)));
      return { cells: cells.length, rows: tops.size, columns: lefts.size, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(grid).toEqual({ cells: 8, rows: 4, columns: 2, overflow: expect.any(Number) });
    expect(grid.overflow).toBeLessThanOrEqual(1);
    const bad = await page.evaluate(() => [...document.querySelectorAll('.cell__btn, .cell__zoom, .chip, .card__btn, .card__more')]
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map((el) => {
        const box = el.getBoundingClientRect();
        const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        const reachable = box.top + box.height / 2 > innerHeight || (top && (el === top || el.contains(top)));
        return { label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 30), w: Math.round(box.width), h: Math.round(box.height), reachable: !!reachable };
      })
      .filter((item) => item.w < 44 || item.h < 44 || !item.reachable));
    expect(bad).toEqual([]);
  });
}

test('la lupa abre el visor sin cambiar de página y tocar la imagen elige', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01');
  await page.waitForSelector('.cgrid .cell');
  await page.locator('[data-zoom-cell="2"]').click();
  await expect(page.locator('.pswp')).toBeVisible();
  await expect(page).toHaveURL(/#\/luchador\/01$/);
  await page.waitForTimeout(800);
  await page.goBack();
  await expect(page.locator('.pswp')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/luchador\/01$/);
  await page.locator('[data-slot="2"]').click();
  await expect(page).toHaveURL(/#\/luchador\/01\/3$/);
  await expect(page.locator('.pswp')).toHaveCount(0);
});

test('la lupa de una skin no la elige', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/3');
  await page.waitForSelector('[data-skin]');
  await page.locator('.card__more').nth(2).click();
  await expect(page.locator('.pswp')).toBeVisible();
  await expect(page.locator('[data-skin][aria-pressed="true"]')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/luchador\/01\/3$/);
});

test('el catálogo también amplía la imagen sin salir de la lista', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/catalogo');
  await page.getByRole('button', { name: 'Ampliar imagen de Tanooki Mario' }).click();
  await expect(page.locator('.pswp')).toBeVisible();
  await expect(page).toHaveURL(/#\/catalogo$/);
});

test('el selector de traje avanza sin añadir historial y lleva la candidata', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/1');
  await page.waitForSelector('[data-skin]');
  await expect(page.getByRole('button', { name: 'Traje anterior' })).toBeDisabled();
  await page.locator('[data-skin]').first().click();
  const vid = await page.locator('[data-skin][aria-pressed="true"]').getAttribute('data-skin');
  const depth = await page.evaluate(() => history.length);
  await page.getByRole('button', { name: 'Traje siguiente' }).click();
  await expect(page).toHaveURL(/#\/luchador\/01\/2\?skin=/);
  await expect(page.getByText('Traje 2 de 8')).toBeVisible();
  expect(await page.evaluate(() => history.length)).toBe(depth);
  await expect(page.locator('[data-skin="' + vid + '"][aria-pressed="true"]')).toHaveCount(1);
});

test('al bajar queda fijo el resumen con el botón de guardar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/3');
  await page.waitForSelector('[data-skin]');
  await expect(page.locator('.cbar')).toHaveCount(0);
  await page.locator('[data-skin]').first().click();
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect(page.locator('.cbar')).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop)).toBe('88px');
  const before = await page.evaluate(() => window.planEntries().length);
  await page.locator('[data-bar-act]').click();
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before + 1);
});

test('una imagen que no carga lo dice y se puede reintentar; sin retrato es otra cosa', async ({ page, context }) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  let block = true;
  await context.route(/res\.cloudinary\.com/, (route) => (block ? route.abort() : route.fulfill({ status: 200, contentType: 'image/png', body: png })));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/3');
  await expect(page.locator('.cmp__img--cur .app-img__ph--failed')).toContainText('No cargó la imagen');
  block = false;
  await page.locator('.cmp__img--cur').getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.locator('.cmp__img--cur .app-img__ph--failed')).toHaveCount(0);
  await page.goto('/#/luchador/59/1');
  await expect(page.locator('.cmp__img--cur .app-img__ph--missing .app-img__missing')).toHaveText('Sin retrato');
  await expect(page.locator('.cmp__img--cur .app-img__ph--failed')).toHaveCount(0);
});

test('las flechas recorren los trajes por columnas, Inicio y Fin saltan y Enter elige', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01');
  await page.waitForSelector('.cgrid .cell__btn');
  const slot = () => page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-slot'));
  await page.locator('[data-slot="0"]').focus();
  await page.keyboard.press('ArrowDown');
  expect(await slot()).toBe('2');
  await page.keyboard.press('ArrowRight');
  expect(await slot()).toBe('3');
  await page.keyboard.press('End');
  expect(await slot()).toBe('7');
  await page.keyboard.press('Home');
  expect(await slot()).toBe('0');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('[data-slot="0"]').focus();
  await page.keyboard.press('ArrowDown');
  expect(await slot()).toBe('4');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/luchador\/01\/6$/);
});

test('cambios atrapa el foco, Esc lo cierra y la ruta vuelve', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchadores');
  await page.getByRole('button', { name: /Ver cambios/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Cambios' });
  await expect(dialog).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!(document.activeElement && document.activeElement.closest('.q-dialog__inner')))).toBe(true);
  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!(document.activeElement && document.activeElement.closest('.sheet')))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#\/luchadores$/);
});

test('en la cuadrícula pequeña el estado de cada traje va por forma o texto, no solo por color', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/3');
  await page.waitForSelector('.cgrid--compact .cell');
  await page.evaluate(() => proposeAt('01', 4, byCode['01'].picks[0].vid));
  const glyphs = await page.evaluate(() => [...document.querySelectorAll('.cgrid .cell')].map((cell) => ({
    layer: cell.className.match(/cell--(profile|base|original)/)[1],
    glyph: getComputedStyle(cell.querySelector('.cell__txt b'), '::before').content,
  })));
  for (const item of glyphs) expect(item.glyph).toBe({ profile: '"●"', base: '"◐"', original: '"○"' }[item.layer]);
  await expect(page.locator('.cell--prop .cell__tag')).toHaveText(/Sin enviar|Propuesta/);
  await expect(page.locator('.cell--prop .cell__btn')).toHaveAttribute('aria-label', /, (Sin enviar|Propuesta)$/);
});

test('gate perezoso: navegar no abre la hoja; guardar sin persona pide elegir y completa la propuesta', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const sheet = page.getByRole('dialog', { name: '¿Quién propone?' });
  await page.goto('/#/luchadores');
  await page.waitForSelector('.rrow');
  await page.goto('/#/luchador/01/3');
  await page.waitForSelector('[data-skin]');
  await expect(sheet).toHaveCount(0);
  await page.locator('[data-skin]').first().click();
  await expect(sheet).toHaveCount(0);
  const before = await page.evaluate(() => window.planEntries().length);
  await page.locator('[data-act]').click();
  await expect(sheet).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before);
  await page.locator('[data-person="Samu"]').click();
  await expect(sheet).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before + 1);
  await expect(page.getByText('Propuesta guardada').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ssbu_person'))).toBe('Samu');
  await page.getByRole('button', { name: 'Más opciones' }).click();
  await page.getByText('Cambiar persona (Samu)').click();
  await expect(sheet).toBeVisible();
  await expect(page.locator('[data-person="Samu"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-person="Alan"]').click();
  await expect(sheet).toBeHidden();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ssbu_person'))).toBe('Alan');
});
