// Recorridos de la app Vue: candidata, botón, catálogo, instaladas, notas, Atrás y sync.
const L = require('./lib');
const { ok, until, mk, tap } = L;

module.exports = async (b, base) => {
  const widths = [390, 360, 320, 1440];
  for (const width of widths) {
    const page = await mk(b, { w: width, h: width >= 1024 ? 900 : 844, mobile: width < 1024 });
    await page.goto(base + '#/luchadores');
    await page.waitForSelector('.ft');
    await until(page, () => dbState === 'ok', null, 15000);
    const sync = await page.locator('#sync').boundingBox();
    const title = await page.locator('#ttl').boundingBox();
    ok(!!sync && sync.x >= 0 && sync.x + sync.width <= width + 1, 'sync cabe a ' + width);
    ok(!!title && title.width > 8 && title.x >= 0, 'el título sigue en pantalla a ' + width);
    ok(await page.locator('.picked').count() === 0, 'sin barra al pie a ' + width);
    await page.ctx.close();
  }

  const A = await mk(b, { w: 390, h: 844 });
  await A.goto(base + '#/luchadores');
  await A.waitForSelector('.ft');
  await until(A, () => dbState === 'ok', null, 15000);
  ok((await A.textContent('#sync')).includes('Guardado'), 'estado breve: Guardado');
  ok(await A.getByRole('button', { name: 'Historial' }).count() === 0, 'no hay Historial');
  ok(await A.getByRole('button', { name: 'Sobre los datos' }).count() === 0, 'no hay Sobre los datos');
  ok(await A.getByRole('button', { name: 'Cómo se usa' }).count() === 0, 'no hay Cómo se usa');

  await A.goto(base + '#/catalogo');
  await A.waitForSelector('.cgroup');
  ok(await A.getByRole('button', { name: 'Dry Bones (v3.1 Update)', exact: true }).count() === 1, 'el catálogo muestra skins de Mario');
  ok(await A.getByRole('button', { name: 'Breath of the Wild Princess Zelda', exact: true }).count() === 1, 'el catálogo muestra skins de Zelda');
  ok(await A.getByRole('button', { name: 'Instalar' }).count() === 0, 'la tarjeta del catálogo no lleva acciones');
  await A.getByRole('button', { name: /Agrupar por franquicia/ }).click();
  const series = await A.locator('.cgroup__name').allTextContents();
  ok(series.includes('Mario') && series.includes('The Legend of Zelda') && series.indexOf('Mario') !== series.indexOf('The Legend of Zelda'), 'Mario y Zelda son series distintas');

  await A.goto(base + '#/instaladas');
  await A.waitForSelector('.card__btn');
  ok(await A.getByRole('link', { name: /Ventus/ }).count() >= 1, 'Sora con Ventus aparece en instaladas');
  ok(await A.getByRole('link', { name: /Dry Bones/ }).count() === 0, 'una skin que solo está en el catálogo no sale en instaladas');

  const before = await A.evaluate(() => planEntries().length);
  await A.goto(base + '#/luchador/01/3');
  await A.waitForSelector('[data-skin]');
  await A.locator('[data-skin]').first().click();
  ok(await A.locator('[data-act="use"], [data-act="replace"]').count() === 1, 'el toque deja el botón del escenario');
  ok(await A.evaluate(n => planEntries().length === n, before), 'un toque no escribe el plan');
  const label = await A.locator('[data-act]').first().textContent();
  ok(/Usar en Traje 3|Reemplazar en Traje 3/.test(label || ''), 'el botón nombra el traje');
  await A.locator('[data-act="use"], [data-act="replace"]').first().click();
  ok(await until(A, () => PEND.length === 0, null, 15000), 'el botón guarda la propuesta');

  await A.locator('[data-skin]').nth(1).click();
  ok(/Reemplazar en Traje 3/.test(await A.locator('[data-act]').first().textContent() || ''), 'reemplazar es explícito');
  const used = await A.evaluate(() => planVid('01', 2));
  await A.goto(base + '#/luchador/01/4');
  await A.waitForSelector('[data-skin="' + used + '"]');
  await A.locator('[data-skin="' + used + '"]').click();
  ok(/Ir a Traje 3/.test(await A.locator('[data-act]').first().textContent() || ''), 'no se copia: el botón lleva al otro traje');
  ok(await A.evaluate(v => planVid('01', 3) == null && planVid('01', 2) === v, used), 'sigue una sola copia');

  await A.goto(base + '#/luchador/01/5');
  await A.waitForSelector('[data-skin]');
  await A.locator('[data-skin]').first().click();
  const vid = await A.locator('[data-skin][aria-pressed="true"]').getAttribute('data-skin');
  await A.locator('[aria-label^="Ver detalle"]').first().click();
  await A.waitForSelector('[data-use]');
  await A.getByRole('button', { name: 'Cerrar' }).click();
  ok(await A.locator('[data-skin="' + vid + '"][aria-pressed="true"]').count() === 1, 'cerrar la ficha no quita la candidata');
  await A.locator('[data-slot="5"]').click();
  ok(await A.locator('[aria-pressed="true"][data-skin]').count() === 0, 'cambiar de traje quita la candidata');

  await A.fill('[aria-label="Buscar skin"]', 'Happy190');
  await A.waitForTimeout(200);
  ok(await A.getByText('Sin resultados').count() === 1, 'buscar por autor no encuentra');

  await A.goto(base + '#/notas');
  await A.getByLabel('Pedido de búsqueda').fill('DBZ');
  await A.getByRole('button', { name: 'Añadir' }).click();
  ok(await until(A, () => NOTES.some(note => note.text === 'DBZ' && !note.done), null, 15000), 'la nota DBZ se guarda');
  const changes = await A.evaluate(() => planEntries().length);
  await A.getByRole('button', { name: 'Hecha' }).click();
  ok(await until(A, () => NOTES.some(note => note.text === 'DBZ' && note.done), null, 15000), 'la nota se marca hecha');
  ok(await A.evaluate(n => planEntries().length === n, changes), 'marcar la nota no añade un change');
  const exported = await A.evaluate(() => buildExport());
  ok(exported.schema === 3 && !JSON.stringify(exported).includes('DBZ') && !('requests' in exported), 'el JSON schema 3 no trae la nota');

  const B = await mk(b, { w: 390, h: 844 });
  await B.goto(base + '#/notas');
  ok(await until(B, () => NOTES.some(note => note.text === 'DBZ'), null, 15000), 'otro cliente ve la nota');
  await B.goto(base + '#/catalogo');
  ok(await B.getByText('DBZ').count() === 0, 'la nota no aparece en el catálogo');
  await B.goto(base + '#/instaladas');
  ok(await B.getByText('DBZ').count() === 0, 'la nota no aparece en instaladas');

  await A.goto(base + '#/cambios');
  await A.waitForSelector('[data-export]');
  ok(await A.getByRole('button', { name: 'Exportar' }).count() === 1, 'Elegidas exporta');
  await A.keyboard.press('Escape');

  await A.goto(base + '#/luchador/01/1');
  await A.waitForSelector('[aria-label^="Ver detalle"]');
  await A.locator('[aria-label^="Ver detalle"]').first().click();
  await A.waitForSelector('[aria-label="Ampliar foto"]');
  await A.click('[aria-label="Ampliar foto"]');
  await A.waitForSelector('.pswp', { timeout: 8000 });
  await A.goBack();
  await A.waitForTimeout(400);
  ok(await A.locator('.pswp').count() === 0 && A.url().includes('/apariencia/'), 'Atrás cierra la foto antes que la ficha');
  const focused = await A.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'));
  ok(focused === 'Ampliar foto', 'el foco vuelve a Ampliar');
  await A.goBack();
  ok(/\/luchador\//.test(A.url()), 'Atrás cierra la ficha y vuelve al luchador');

  ok(!A.errs.filter(message => !/access control checks/.test(message)).length, 'sin errores de la app');
  await A.ctx.close();
  await B.ctx.close();
};
