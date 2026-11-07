// Recorridos de la app Vue: candidata, botón, catálogo, luchadores, notas, Atrás y sync.
const { execFileSync } = require('child_process');
const L = require('./lib');
const { ok, until, mk, tap } = L;

module.exports = async (b, base) => {
  const widths = [390, 360, 320, 1440];
  for (const width of widths) {
    const page = await mk(b, { w: width, h: width >= 1024 ? 900 : 844, mobile: width < 1024 });
    await page.goto(base + '#/luchadores');
    await page.waitForSelector('.rrow');
    await until(page, () => dbState === 'ok', null, 15000);
    const title = await page.locator('#ttl').boundingBox();
    ok((await page.locator('#sync').textContent()) === '', 'la cabecera no anuncia Guardado a ' + width);
    ok(!!title && title.width > 8 && title.x >= 0 && title.x + title.width <= width + 1, 'el título sigue en pantalla a ' + width);
    ok(await page.locator('.picked').count() === 0, 'sin barra al pie a ' + width);
    await page.ctx.close();
  }

  const A = await mk(b, { w: 390, h: 844 });
  await A.goto(base + '#/luchadores');
  await A.waitForSelector('.rrow');
  await until(A, () => dbState === 'ok', null, 15000);
  ok((await A.textContent('#sync')) === '', 'la cabecera no deja Guardado fijo');
  ok(await A.getByRole('button', { name: 'Historial' }).count() === 0, 'no hay Historial');
  ok(await A.getByRole('button', { name: 'Sobre los datos' }).count() === 0, 'no hay Sobre los datos');
  ok(await A.getByRole('button', { name: 'Cómo se usa' }).count() === 0, 'no hay Cómo se usa');

  await A.goto(base + '#/catalogo');
  await A.waitForSelector('.cgroup');
  ok(await A.getByRole('button', { name: 'Dry Bones (v3.1 Update)', exact: true }).count() === 1, 'el catálogo muestra skins de Mario');
  ok(await A.getByRole('button', { name: 'Breath of the Wild Princess Zelda', exact: true }).count() === 1, 'el catálogo muestra skins de Zelda');
  ok(await A.getByRole('button', { name: 'Instalar' }).count() === 0, 'la tarjeta del catálogo no lleva acciones');
  await A.getByRole('button', { name: 'Personaje: Todos los personajes' }).click();
  await A.getByRole('button', { name: /^Mario, \d+ apariencias/ }).click();
  ok(await A.getByRole('button', { name: 'Dry Bones (v3.1 Update)', exact: true }).count() === 1, 'Mario deja ver sus skins');
  ok(await A.getByRole('button', { name: 'Breath of the Wild Princess Zelda', exact: true }).count() === 0, 'filtrar Mario oculta a Zelda');

  await A.goto(base + '#/instaladas');
  await A.waitForSelector('.rcost');
  ok(/#\/luchadores\?filtro=perfil$/.test(A.url()), '#/instaladas redirige a Luchadores con el filtro del perfil');
  ok(await A.getByRole('link', { name: /: Ventus/ }).count() >= 1, 'Sora con Ventus aparece en Luchadores');
  ok(await A.getByRole('link', { name: /Breath of the Wild/ }).count() === 0, 'una skin que solo está en el catálogo no sale en Luchadores');

  const before = await A.evaluate(() => planEntries().length);
  await A.goto(base + '#/luchador/01/3');
  await A.waitForSelector('[data-skin]');
  await A.locator('[data-skin]').first().click();
  ok(await A.locator('[data-act="use"], [data-act="replace"]').count() === 1, 'el toque deja el botón del escenario');
  ok(await A.evaluate(n => planEntries().length === n, before), 'un toque no escribe el plan');
  const label = await A.locator('[data-act]').first().textContent();
  ok(/Guardar propuesta/.test(label || ''), 'el botón confirma la propuesta');
  ok(/Mario · Traje 3/.test(await A.textContent('main') || ''), 'la acción muestra el traje');
  await A.locator('[data-act="use"], [data-act="replace"]').first().click();
  ok(await until(A, () => PEND.length === 0, null, 15000), 'el botón guarda la propuesta');
  ok(/Propuesta guardada/.test(await A.locator('main').textContent() || ''), 'la confirmación llega después de guardar');
  const kept = await A.evaluate(() => planVid('01', 2));
  await A.reload();
  ok(await until(A, (vid) => planVid('01', 2) === vid && !!vid, kept, 15000), 'recargar conserva la propuesta');
  await A.waitForSelector('[data-skin]');

  await A.locator('[data-skin]').nth(1).click();
  ok(await A.locator('[data-act="replace"]').count() === 1 && /Guardar propuesta/.test(await A.locator('[data-act]').first().textContent() || ''), 'reemplazar también se confirma con Guardar propuesta');
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
  await A.locator('.card__more').first().click();
  await A.waitForSelector('.pswp--open', { timeout: 8000 });
  await A.waitForTimeout(800);
  await A.getByRole('button', { name: 'Cerrar' }).last().click();
  await until(A, () => !document.querySelector('.pswp'), null, 8000);
  ok(await A.locator('[data-skin="' + vid + '"][aria-pressed="true"]').count() === 1, 'cerrar la imagen no quita la candidata');
  await A.locator('[data-slot="5"]').click();
  ok(await A.locator('[aria-pressed="true"][data-skin="' + vid + '"]').count() === 1 && /\/6\?skin=/.test(A.url()), 'cambiar de traje lleva la candidata para compararla ahí');
  await A.getByRole('button', { name: 'Descartar skin' }).click();
  ok(await A.locator('[aria-pressed="true"][data-skin]').count() === 0 && !/skin=/.test(A.url()), 'descartar la skin quita la candidata y la ruta la olvida');

  await A.fill('[aria-label="Buscar skin"]', 'Happy190');
  await A.waitForTimeout(200);
  ok(await A.getByText('Sin resultados').count() === 1, 'buscar por autor no encuentra');

  await A.goto(base + '#/notas');
  await A.getByLabel('¿Qué skin quieres buscar después?').fill('DBZ');
  await A.getByRole('button', { name: 'Anotar' }).click();
  ok(await until(A, () => NOTES.some(note => note.text === 'DBZ' && !note.done), null, 15000), 'la nota DBZ se guarda');
  const changes = await A.evaluate(() => planEntries().length);
  await A.getByRole('button', { name: 'Hecha' }).click();
  ok(await until(A, () => NOTES.some(note => note.text === 'DBZ' && note.done), null, 15000), 'la nota se marca hecha');
  ok(await A.evaluate(n => planEntries().length === n, changes), 'marcar la nota no añade un change');
  const exported = await A.evaluate(() => buildExport());
  ok(exported.schema === 3 && !JSON.stringify(exported).includes('DBZ') && !('requests' in exported), 'el JSON schema 3 no trae la nota');

  const B = await mk(b, { w: 390, h: 844, person: 'Alan' });
  await B.goto(base + '#/notas');
  ok(await until(B, () => NOTES.some(note => note.text === 'DBZ'), null, 15000), 'otro cliente ve la nota');
  await B.goto(base + '#/catalogo');
  ok(await B.getByText('DBZ').count() === 0, 'la nota no aparece en el catálogo');
  await B.goto(base + '#/luchadores');
  ok(await B.getByText('DBZ').count() === 0, 'la nota no aparece en Luchadores');

  await A.goto(base + '#/cambios');
  await A.waitForSelector('[aria-label="Cambios"]');
  ok(await A.getByRole('button', { name: 'Exportar' }).count() === 0 && (await A.evaluate(() => buildExport())).schema === 3, 'Cambios no exporta y el contrato interno sigue');
  await A.keyboard.press('Escape');

  await A.goto(base + '#/luchador/01/1');
  await A.waitForSelector('.card__more');
  await A.locator('.card__more').first().click();
  await A.waitForSelector('.pswp', { timeout: 8000 });
  await A.waitForTimeout(800);
  await A.goBack();
  await A.waitForTimeout(600);
  ok(await A.locator('.pswp').count() === 0 && /\/luchador\/01\/1/.test(A.url()), 'Atrás cierra la imagen sin salir del luchador');
  const focused = await A.evaluate(() => { const el = document.activeElement && document.activeElement.closest('[aria-label]'); return el && el.getAttribute('aria-label'); });
  ok(/^Ampliar imagen de /.test(focused || ''), 'el foco vuelve al botón de ampliar');

  // dos personas proponen en el mismo traje sin pisarse; cada una solo deshace lo suyo
  await B.goto(base + '#/luchadores');
  await until(B, () => dbState === 'ok', null, 15000);
  await A.goto(base + '#/luchadores');
  await until(A, () => dbState === 'ok', null, 15000);
  const vidAlan = await B.evaluate(() => byCode['02'].picks[0].vid);
  const vidGian = await B.evaluate(() => byCode['02'].picks[1].vid);
  await B.evaluate(vid => proposeAt('02', 1, vid), vidAlan);
  ok(await until(B, () => PEND.length === 0, null, 15000), 'Alan guarda una propuesta');
  ok(await until(A, vid => proposalsAt('02', 1).some(p => p.name === 'Alan' && p.vid === vid), vidAlan, 15000), 'la propuesta de Alan llega en vivo a Gian');
  await A.evaluate(vid => proposeAt('02', 1, vid), vidGian);
  ok(await until(A, () => PEND.length === 0, null, 15000), 'Gian guarda otra propuesta en el mismo traje');
  ok(await until(B, vid => proposalsAt('02', 1).some(p => p.name === 'Gian' && p.vid === vid), vidGian, 15000), 'la propuesta de Gian llega en vivo a Alan');
  const names = await A.evaluate(() => proposalsAt('02', 1).map(p => p.name + ':' + p.vid));
  ok(names.length === 2 && names[0] === 'Gian:' + vidGian && names[1] === 'Alan:' + vidAlan, 'proposalsAt trae 2 propuestas, la propia primero: ' + names.join(', '));
  const namesB = await B.evaluate(() => proposalsAt('02', 1).map(p => p.name));
  ok(namesB.length === 2 && namesB[0] === 'Alan', 'para Alan la suya va primero');

  await A.goto(base + '#/cambios');
  await A.waitForSelector('[data-section="friend"]');
  ok(await A.locator('[data-section="mine"] [data-undo="02_1_Gian"]').count() === 1, 'Cambios deja a Gian quitar su propuesta');
  ok(await A.locator('[data-section="friend"] .srow').count() >= 1 && await A.locator('[data-undo="02_1_Alan"]').count() === 0, 'la propuesta de Alan es de solo lectura para Gian');
  ok(await A.locator('[data-undo-confirm]').count() === 0 && await A.getByRole('button', { name: 'Conservar' }).count() === 0, 'ya no hay confirmación para quitar lo ajeno');
  await A.locator('[data-undo="02_1_Gian"]').click();
  ok(await until(A, () => PEND.length === 0 && !proposalsAt('02', 1).some(p => p.name === 'Gian'), null, 15000), 'Gian quita su propuesta');
  ok(await A.evaluate(vid => proposalsAt('02', 1).some(p => p.name === 'Alan' && p.vid === vid), vidAlan), 'la propuesta de Alan sigue después de que Gian quita la suya');
  ok(await until(B, () => !proposalsAt('02', 1).some(p => p.name === 'Gian') && proposalsAt('02', 1).some(p => p.name === 'Alan'), null, 15000), 'Alan sigue viendo la suya intacta');
  await A.keyboard.press('Escape');
  await B.goto(base + '#/cambios');
  await B.waitForSelector('[data-section="mine"]');
  ok(await B.locator('[data-section="mine"] [data-undo="02_1_Alan"]').count() === 1, 'Alan sí puede quitar la suya');
  await B.keyboard.press('Escape');

  // gate perezoso: sin persona guardada, navegar no abre la hoja; guardar la pide y completa la propuesta
  const C = await mk(b, { w: 390, h: 844, person: null });
  await C.goto(base + '#/luchadores');
  await C.waitForSelector('.rrow');
  await until(C, () => dbState === 'ok', null, 15000);
  await C.goto(base + '#/luchador/01/3');
  await C.waitForSelector('[data-skin]');
  ok(await C.getByRole('dialog', { name: '¿Quién propone?' }).count() === 0, 'sin persona, navegar y leer no abre la hoja');
  await C.locator('[data-skin]').first().click();
  ok(await C.getByRole('dialog', { name: '¿Quién propone?' }).count() === 0, 'sin persona, elegir candidata tampoco abre la hoja');
  await C.locator('[data-act]').first().click();
  await C.getByRole('dialog', { name: '¿Quién propone?' }).waitFor();
  ok(await C.evaluate(() => PEND.length === 0 && !PLAN['01_2_Ches']), 'la hoja aparece antes de escribir nada');
  await C.locator('[data-person="Ches"]').click();
  await C.getByRole('dialog', { name: '¿Quién propone?' }).waitFor({ state: 'hidden' });
  ok(await until(C, () => !!PLAN['01_2_Ches'] && PEND.length === 0, null, 15000), 'al elegir persona se guarda la propuesta como Ches');
  ok(await C.evaluate(() => localStorage.getItem('ssbu_person')) === 'Ches', 'la persona queda recordada');
  ok(JSON.parse(L.py('draft')).changes.some(c => c.roster_no === '01' && c.traje === 3 && c.person === 'Ches'), 'Firestore conserva la propuesta de Ches');

  // reglas de Firestore sobre el emulador
  execFileSync(L.PY, ['-c', "from google.cloud import firestore as f; f.Client(project='ssbu-441b1').collection('changes').document('01_7').set({'code': '01', 'slot': 7, 'vid': 'x'})"], { env: L.ENV });
  ok(await until(C, () => proposalsAt('01', 7).length === 1, null, 15000), 'la propuesta antigua sin name llega a la app');
  await C.evaluate(() => { window.__vid = byCode['01'].picks[0].vid; });
  const R = await L.raw(C, async (f, t) => {
    const body = extra => ({ code: '01', slot: 0, vid: window.__vid, by: f.auth.currentUser.uid, at: f.serverTimestamp(), ...extra });
    await t('sin name', () => f.setDoc(f.doc(f.db, 'changes', '01_0'), body({})));
    await t('name fuera de la lista', () => f.setDoc(f.doc(f.db, 'changes', '01_0_Otro'), body({ name: 'Otro' })));
    await t('id distinto de name', () => f.setDoc(f.doc(f.db, 'changes', '01_0_Gian'), body({ name: 'Alan' })));
    await t('borrar propuesta antigua', () => f.deleteDoc(f.doc(f.db, 'changes', '01_7')));
    await t('propuesta válida', () => f.setDoc(f.doc(f.db, 'changes', '01_0_Samu'), body({ name: 'Samu' })));
  });
  ok(R['sin name'] === 'permission-denied', 'reglas: una propuesta sin name se rechaza ' + JSON.stringify(R));
  ok(R['name fuera de la lista'] === 'permission-denied', 'reglas: un name fuera de la lista se rechaza');
  ok(R['id distinto de name'] === 'permission-denied', 'reglas: el id debe terminar en el name');
  ok(R['borrar propuesta antigua'] === 'permission-denied', 'reglas: la propuesta antigua sin name no se borra desde el cliente');
  ok(R['propuesta válida'] === 'PERMITIDO', 'reglas: una propuesta válida se acepta');
  ok(await C.evaluate(() => { const p = proposalsAt('01', 7); return p.length === 1 && p[0].name === null; }), 'la propuesta antigua sigue legible como «Otros»');
  await C.ctx.close();

  ok(!A.errs.filter(message => !/access control checks/.test(message)).length, 'sin errores de la app');
  await A.ctx.close();
  await B.ctx.close();
};
