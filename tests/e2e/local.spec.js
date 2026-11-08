const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ context, page }, testInfo) => {
  if (!testInfo.title.includes('gate perezoso')) {
    await page.addInitScript(() => {
      try { localStorage.setItem('ssbu_person', 'Gian'); } catch (_) {}
    });
  }
  await context.route(/googleapis|gstatic\.com\/firebasejs|identitytoolkit|securetoken/, route => route.abort());
});

test('el toque abre SkinSheet sin escribir el plan, Reemplazar guarda y Deshacer revierte', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/3');
  await page.waitForSelector('[data-skin]');
  const before = await page.evaluate(() => window.planEntries().length);

  await page.evaluate(async () => {
    const alts = await fetch('/drive-alts.json').then(r => (r.ok ? r.json() : []), () => []);
    const btn = [...document.querySelectorAll('[data-skin]')].find(x => {
      const vid = x.dataset.skin;
      const skin = window.idx[vid] && window.idx[vid].p;
      const alt = alts.find(a => a.code === '01' && (a.vid === vid || a.mod_id === String(skin && skin.id))) || null;
      const matchVar = alt && Array.isArray(alt.variants) && alt.variants.length
        ? (alt.variants.find(v => v.slot === 3) || alt.variants[0])
        : null;
      const source = window.SSBU.sourceSlotsOf({ variant: matchVar ? matchVar.id : null, alt, skin });
      return window.SSBU.compatibleSlots('01', source).includes(2);
    });
    btn.click();
  });

  await expect(page.locator('[data-act="replace"]')).toHaveText('Reemplazar');
  await expect(page.locator('[data-dest-slot="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before);

  await page.locator('[data-act="replace"]').click();
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before + 1);
  await expect(page.locator('#toast')).toContainText('Propuesta guardada · Traje 3');

  await page.locator('#toast').getByRole('button', { name: 'Deshacer' }).click();
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before);
});

test('las rutas antiguas redirigen recordando ssbu_last_fighter y dejando Traje 1 activo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchadores');
  await expect(page).toHaveURL(/#\/luchador\/01$/);
  await expect(page.locator('[data-costume="0"]')).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/#/instaladas?pj=04');
  await expect(page).toHaveURL(/#\/luchador\/04$/);
  await expect(page.locator('[data-costume="0"]')).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/#/catalogo');
  await expect(page).toHaveURL(/#\/luchador\/04$/);

  await page.goto('/#/tarjeta');
  await expect(page).toHaveURL(/#\/luchador\/04$/);

  await page.goto('/#/apariencia/01:374147?para=01_2');
  await expect(page).toHaveURL(/#\/luchador\/01\/3\?skin=/);
  await expect(page.locator('[data-costume="2"]')).toHaveAttribute('aria-pressed', 'true');
});

test('en 375x812 la tira de 8 trajes mantiene celdas >= 44px en una fila sin scroll horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/#/luchador/05');
  await page.waitForSelector('.costume-cell');

  const metrics = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.costume-cell')];
    const rects = cells.map(el => el.getBoundingClientRect());
    const tops = new Set(rects.map(r => Math.round(r.top)));
    return {
      count: cells.length,
      rows: tops.size,
      minWidth: Math.min(...rects.map(r => r.width)),
      minHeight: Math.min(...rects.map(r => r.height)),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

  expect(metrics.count).toBe(8);
  expect(metrics.rows).toBe(1);
  expect(metrics.minWidth).toBeGreaterThanOrEqual(44);
  expect(metrics.minHeight).toBeGreaterThanOrEqual(44);
  expect(metrics.overflow).toBeLessThanOrEqual(0);
});

test('en 320x568 y con zoom de fuente al 170% la tira refluye a 4x2 sin truncar Original ni desbordar', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/#/luchador/05');
  await page.waitForSelector('.costume-cell');

  const smallMetrics = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.costume-cell')];
    const rects = cells.map(el => el.getBoundingClientRect());
    const tops = new Set(rects.map(r => Math.round(r.top)));
    const lefts = new Set(rects.map(r => Math.round(r.left)));
    const originals = [...document.querySelectorAll('.costume-cell__badge')]
      .filter(el => el.textContent.trim() === 'Original');
    const truncated = originals.some(el => el.scrollWidth > el.clientWidth + 1);
    return {
      rows: tops.size,
      cols: lefts.size,
      originals: originals.length,
      truncated,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

  expect(smallMetrics.rows).toBe(2);
  expect(smallMetrics.cols).toBe(4);
  expect(smallMetrics.originals).toBeGreaterThan(0);
  expect(smallMetrics.truncated).toBe(false);
  expect(smallMetrics.overflow).toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '27.2px'; });
  await page.waitForTimeout(100);

  const zoomMetrics = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.costume-cell')];
    const rects = cells.map(el => el.getBoundingClientRect());
    const tops = new Set(rects.map(r => Math.round(r.top)));
    const lefts = new Set(rects.map(r => Math.round(r.left)));
    const originals = [...document.querySelectorAll('.costume-cell__badge')]
      .filter(el => el.textContent.trim() === 'Original');
    const truncated = originals.some(el => el.scrollWidth > el.clientWidth + 1);
    return {
      rows: tops.size,
      cols: lefts.size,
      truncated,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

  expect(zoomMetrics.rows).toBe(2);
  expect(zoomMetrics.cols).toBe(4);
  expect(zoomMetrics.truncated).toBe(false);
  expect(zoomMetrics.overflow).toBeLessThanOrEqual(0);
});

test('Cloud bloquea familias incompatibles con aria-disabled y no permite elegir impares para un mod par', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/61/1?skin=' + encodeURIComponent('61:327088'));
  await page.waitForSelector('.skin-sheet-body');

  for (const evenSlot of [0, 2, 4, 6]) {
    await expect(page.locator(`[data-dest-slot="${evenSlot}"]`)).not.toHaveAttribute('aria-disabled', 'true');
  }
  for (const oddSlot of [1, 3, 5, 7]) {
    await expect(page.locator(`[data-dest-slot="${oddSlot}"]`)).toHaveAttribute('aria-disabled', 'true');
  }

  await expect(page.locator('[data-dest-slot="0"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-dest-slot="1"]').click({ force: true });
  await expect(page.locator('[data-dest-slot="0"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-dest-slot="1"]')).toHaveAttribute('aria-pressed', 'false');

  await page.locator('[data-dest-slot="2"]').click();
  await expect(page.locator('[data-dest-slot="2"]')).toHaveAttribute('aria-pressed', 'true');
});

test('la acción Otro color abre SkinSheet con el mod instalado precargado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/1');
  await page.waitForSelector('.costume-strip');

  const target = await page.evaluate(async () => {
    const alts = await fetch('/drive-alts.json').then(r => (r.ok ? r.json() : []), () => []);
    for (const fighter of window.F) {
      if (fighter.mii) continue;
      for (let n = 0; n < 8; n += 1) {
        const cur = window.curOf(fighter.code, n);
        if (!cur || cur.kind === 'original') continue;
        if (cur.vid && window.idx[cur.vid]) return { code: fighter.code, slot: n, vid: cur.vid };
        const normName = (cur.name || '').toLowerCase().trim();
        const alt = alts.find(a => a.code === fighter.code && a.vid && (a.name || '').toLowerCase().trim() === normName);
        if (alt && alt.vid && window.idx[alt.vid]) return { code: fighter.code, slot: n, vid: alt.vid };
      }
    }
    return null;
  });

  expect(target).not.toBeNull();
  await page.goto(`/#/luchador/${target.code}/${target.slot + 1}`);
  await expect(page.locator('[data-move-color]')).toBeVisible();
  await page.locator('[data-move-color]').click();
  await expect(page.locator('.skin-sheet-body')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`skin=${encodeURIComponent(target.vid).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

test('FighterPickSheet abre con / o botón, busca skins y navega a #/luchador/<code>?skin=<vid>', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/1');
  await page.waitForSelector('.costume-strip');

  await page.keyboard.press('/');
  await expect(page.locator('[data-fighter-tile]').first()).toBeVisible();
  await page.fill('#fighter-pick-input-m', 'Tanooki Mario');
  await expect(page.locator('[data-pick-skin]').first()).toBeVisible();
  const pickedVid = await page.locator('[data-pick-skin]').first().getAttribute('data-pick-skin');
  await page.locator('[data-pick-skin]').first().click();

  await expect(page).toHaveURL(new RegExp(`#\\/luchador\\/01\\?skin=${encodeURIComponent(pickedVid)}`));
  await expect(page.locator('.skin-sheet-body')).toBeVisible();
});

test('en escritorio 1440x900 el panel lateral .skin-panel permanece visible a la derecha', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/luchador/01/1');
  await page.waitForSelector('.fighter-workspace--split');

  const columns = await page.locator('.fighter-workspace--split').evaluate(el => getComputedStyle(el).gridTemplateColumns);
  expect(columns.split(' ').length).toBe(2);
  await expect(page.locator('aside.skin-panel')).toBeVisible();

  const gridBox = await page.locator('.skins').boundingBox();
  const panelBox = await page.locator('aside.skin-panel').boundingBox();
  expect(panelBox.x).toBeGreaterThan(gridBox.x + gridBox.width - 4);
});

test('una imagen que no carga permite Reintentar y un mod sin retrato muestra Sin retrato', async ({ page, context }) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  let block = true;
  await context.route(/res\.cloudinary\.com/, (route) => (block ? route.abort() : route.fulfill({ status: 200, contentType: 'image/png', body: png })));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/luchador/01/3?skin=' + encodeURIComponent('01:374147'));
  await expect(page.locator('.skin-compare__cur .app-img__ph--failed')).toContainText('No cargó la imagen');
  block = false;
  await page.locator('.skin-compare__cur').getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.locator('.skin-compare__cur .app-img__ph--failed')).toHaveCount(0);

  await page.goto('/#/luchador/59/1');
  await expect(page.locator('.active-bar .app-img__ph--missing')).toHaveCount(1);
  await expect(page.locator('.active-bar .app-img__ph--failed')).toHaveCount(0);
});

test('la tira navega con flechas e Inicio/Fin y las flechas globales cambian de luchador', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/luchador/01/1');
  await page.waitForSelector('.costume-cell');

  await page.locator('[data-costume="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-costume="1"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('End');
  await expect(page.locator('[data-costume="7"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Home');
  await expect(page.locator('[data-costume="0"]')).toHaveAttribute('aria-pressed', 'true');

  await page.evaluate(() => (document.activeElement instanceof HTMLElement) && document.activeElement.blur());
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#\/luchador\/02$/);
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/#\/luchador\/01$/);
});

test('gate perezoso: guardar sin persona abre ¿Quién propone? sobre SkinSheet y completa la propuesta', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const sheet = page.getByRole('dialog', { name: '¿Quién propone?' });
  await page.goto('/#/luchador/01/3');
  await page.waitForSelector('[data-skin]');
  await expect(sheet).toHaveCount(0);

  await page.locator('[data-skin]').first().click();
  await expect(page.locator('[data-act="replace"]')).toBeVisible();
  await expect(sheet).toHaveCount(0);

  const before = await page.evaluate(() => window.planEntries().length);
  await page.locator('[data-act="replace"]').click();
  await expect(sheet).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before);

  await page.locator('[data-person="Samu"]').click();
  await expect(sheet).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.planEntries().length)).toBe(before + 1);
  await expect(page.locator('#toast')).toContainText('Propuesta guardada');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ssbu_person'))).toBe('Samu');

  await page.locator('[data-person-opener]').click();
  await page.locator('[data-person-menu]').click();
  await expect(sheet).toBeVisible();
  await expect(page.locator('[data-person="Samu"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-person="Alan"]').click();
  await expect(sheet).toBeHidden();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ssbu_person'))).toBe('Alan');
});
