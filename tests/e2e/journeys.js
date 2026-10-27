// Recorridos de personas: buscar luchador, comparar, elegir, ver desde otra sesión, deshacer, choques, reglas.
const L = require('./lib'); const { ok, until, tap, shot, planOf, raw, mk, pick } = L;
module.exports = async (b, base) => {
  const A = await mk(b); await A.goto(base); await A.waitForSelector('.ft');
  ok(await until(A, () => dbState === 'ok', null), 'A: se conecta solo (sesión anónima automática, sin login ni nombre)');
  ok((await A.textContent('#sync')).includes('Guardado'), 'A: estado visible «Guardado»');
  ok(await A.evaluate(() => !document.body.innerText.match(/token|GitHub|Mi selección|Conectar y enviar/i)), 'A: sin «Mi selección», tokens ni «Conectar y enviar»');
  ok(await A.locator('#fq').count() === 1 && await A.locator('nav.tabs').count() === 0, 'A: la entrada es buscar luchador, sin barra inferior');
  // buscar y reconocer lo actual
  await A.fill('#fq', 'sora'); await A.waitForTimeout(250);
  ok(await A.locator('.ft').count() === 1, 'A: la búsqueda de luchador filtra'); await shot(A, '01-luchadores-busqueda');
  await tap(A, '.ft'); await A.waitForSelector('.tgrid');
  ok(await A.locator('.tj').count() === 8, 'A: ocho trajes visibles');
  ok((await A.textContent('.tgrid')).includes('Ventus'), 'A: Sora c04 reconoce «Ventus» como actual (perfil)');
  ok(!/libre/i.test(await A.textContent('main')), 'A: nunca dice «libre»'); await shot(A, '02-trajes-sora');
  // «Cambiar» abre directamente las alternativas del traje, con su contexto
  const code = await A.evaluate(() => RT.code);
  await tap(A, '[data-slot="0"]'); await A.waitForSelector('.cd');
  ok(/#\/luchador\/82\/1$/.test(A.url()) && await A.locator('.cur').count() === 1 && await A.locator('.cmp2').count() === 0, 'A: el Traje 1 muestra la apariencia actual, sin propuesta');
  await shot(A, '03-cambiar-traje');
  await tap(A, 'a.mas'); await A.waitForSelector('[data-use]');
  ok(await A.locator('.hero').count() === 1, 'A: la tarjeta abre una ficha con imágenes'); await shot(A, '04-ficha');
  await tap(A, '[data-use]'); await A.waitForSelector('.cmp2 .prop');
  ok(await until(A, () => PEND.length === 0 && dbState === 'ok', null), 'A: el cambio se guarda en la base (pendiente → guardado)');
  ok((await A.textContent('#toast')).includes('Deshacer'), 'A: aviso con «Deshacer»');
  ok(await A.locator('.cmp2').count() === 1, 'A: con candidata aparece Actual/Propuesta'); await shot(A, '05-propuesta');
  ok(Object.keys(JSON.parse(await planOf(A))).length === 1, 'A: plan con 1 cambio');
  // otra sesión (escritorio)
  const B = await mk(b, { w: 1280, h: 800, mobile: false }); await B.goto(base + '#/cambios'); await B.waitForSelector('.chg-row,.empty');
  ok(await until(B, () => planEntries().length === 1, null), 'B (escritorio, otra sesión): ve el cambio de A');
  ok(await B.evaluate(() => document.querySelectorAll('.chg-row').length === 1), 'B: pantalla Cambios muestra la fila'); await shot(B, '06-cambios-escritorio');
  // ediciones simultáneas en trajes distintos
  await Promise.all([pick(A, base, code, 3, null), pick(B, base, '04', 1, null)]);
  ok(await until(A, () => planEntries().length === 3 && PEND.length === 0, null, 15000), 'A: ve los 3 cambios (suyos + de B)');
  ok(await until(B, () => planEntries().length === 3 && PEND.length === 0, null, 15000), 'B: ve los 3 cambios');
  ok(await planOf(A) === await planOf(B), 'A y B ven exactamente el mismo plan');
  // choque en el mismo traje
  const vids = await A.evaluate(() => { const used = new Set(planEntries().filter(e => e.code === '04').map(e => e.vid)); return byCode['04'].picks.filter(p => !p.withdrawn && !p.mii && !used.has(p.vid)).slice(0, 2).map(p => p.vid); });
  await B.context().setOffline(true);
  await B.evaluate(v => proposeAt('04', 5, v[0]), vids);
  ok(await B.evaluate(() => PEND.length) === 1 && (await B.textContent('#sync')).includes('Pendiente'), 'B sin conexión: cambio pendiente visible');
  await A.evaluate(v => proposeAt('04', 5, v[1]), vids);
  ok(await until(A, () => PEND.length === 0, null), 'A guarda su opción en el traje 6');
  await B.context().setOffline(false);
  ok(await until(B, () => PEND.length === 0 && dbState === 'ok', null, 15000), 'B vuelve la conexión: la cola se vacía');
  ok(await until(B, v => planVid('04', 5) === v, vids[1]), 'conflicto: se conserva la opción de A (no se pisó en silencio)');
  ok((await B.textContent('#toast')).includes('Se conservó'), 'B recibe aviso del conflicto');
  // deshacer
  await A.goto(base + '#/cambios'); await A.waitForSelector('.chg-row');
  const n0 = await A.evaluate(() => planEntries().length);
  await tap(A, '[data-undo]');
  ok(await until(A, n => planEntries().length === n - 1 && PEND.length === 0, n0), 'A: «Deshacer» quita el cambio');
  ok(await until(B, n => planEntries().length === n - 1, n0), 'B: lo ve');
  await tap(A, '#toast button'); ok(await until(A, n => planEntries().length === n && PEND.length === 0, n0), 'A: «Deshacer» del aviso restaura el cambio');
  await A.evaluate(() => showHist()); await A.waitForSelector('.hrow'); ok(await A.locator('.hrow').count() >= 4, 'historial con entradas'); await shot(A, '07-historial'); await A.keyboard.press('Escape');
  // reglas de seguridad
  const R = await raw(A, async (f, t, R) => { const d = f.db, u = f.auth.currentUser.uid, vid = byCode['01'].picks[0].vid;
    await t('catálogo', () => f.setDoc(f.doc(d, 'catalog', '01'), { x: 1 }));
    await t('inventario', () => f.setDoc(f.doc(d, 'installed', '01'), { x: 1 }));
    await t('estado', () => f.setDoc(f.doc(d, 'status', 'x'), { x: 1 }));
    await t('meta', () => f.setDoc(f.doc(d, 'meta', 'catalog'), { x: 1 }));
    await t('vid inválido', () => f.setDoc(f.doc(d, 'changes', '01_2'), { code: '01', slot: 2, vid: '01:nope', by: u, at: f.serverTimestamp() }));
    await t('traje 9', () => f.setDoc(f.doc(d, 'changes', '01_9'), { code: '01', slot: 9, vid, by: u, at: f.serverTimestamp() }));
    await t('id incoherente', () => f.setDoc(f.doc(d, 'changes', '01_3'), { code: '01', slot: 2, vid, by: u, at: f.serverTimestamp() }));
    await t('campo extra', () => f.setDoc(f.doc(d, 'changes', '01_2'), { code: '01', slot: 2, vid, by: u, at: f.serverTimestamp(), x: 1 }));
    await t('suplantar by', () => f.setDoc(f.doc(d, 'changes', '01_2'), { code: '01', slot: 2, vid, by: 'otro', at: f.serverTimestamp() }));
    await t('cambio válido', () => f.setDoc(f.doc(d, 'changes', '01_2'), { code: '01', slot: 2, vid, by: u, at: f.serverTimestamp() }));
    const h = await f.getDocs(f.query(f.collection(d, 'history'), f.limit(1))); const hid = h.docs[0].id;
    await t('editar historial', () => f.setDoc(f.doc(d, 'history', hid), { code: '01', slot: 1, from: null, to: null, kind: 'set', by: u, at: f.serverTimestamp() }));
    await t('borrar historial', () => f.deleteDoc(f.doc(d, 'history', hid)));
    await t('deshacer válido', () => f.deleteDoc(f.doc(d, 'changes', '01_2'))); });
  for (const k of ['catálogo', 'inventario', 'estado', 'meta', 'vid inválido', 'traje 9', 'id incoherente', 'campo extra', 'suplantar by', 'editar historial', 'borrar historial']) ok(R[k] === 'permission-denied', 'regla: «' + k + '» denegado');
  ok(R['cambio válido'] === 'PERMITIDO' && R['deshacer válido'] === 'PERMITIDO', 'regla: editar el borrador compartido permitido');
  ok([A, B].every(p => !p.errs.length), 'sin errores de JS ' + JSON.stringify([A.errs, B.errs]));
  await A.ctx.close(); await B.ctx.close();
};
