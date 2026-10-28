// Fallo de configuración/autenticación/permisos ≠ pérdida de conexión: estado breve para el visitante y diagnóstico para mantenimiento.
const L = require('./lib'); const { ok, until, mk, tap, shot } = L;
module.exports = async (b, base) => {
  // 1) Autenticación anónima desactivada en Firebase (OPERATION_NOT_ALLOWED)
  const A = await mk(b);
  await A.route('http://localhost:9099/**/accounts:signUp**', r => r.fulfill({ status: 400, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: { code: 400, message: 'OPERATION_NOT_ALLOWED' } }) }));
  await A.goto(base); await A.waitForSelector('.ft');
  ok(await until(A, () => syncKind === 'service', null, 12000), 'auth desactivada: el estado pasa a «servicio» (no a «sin conexión»)');
  const txt = await A.locator('.sync-fail').textContent(); ok(/No se pudo guardar la elección/.test(txt) && !/Sin conexión/.test(txt), `el visitante ve un estado breve: «${txt}»`);
  const d1 = await A.evaluate(() => window.__ssbuDiag()); ok(d1.errors[0] && d1.errors[0].kind === 'auth' && /operation-not-allowed/.test(d1.errors[0].code), 'diagnóstico registra kind=auth y el código de Firebase');
  await A.evaluate(() => proposeAt('01', 3, byCode['01'].picks[0].vid));
  ok(/No se pudo guardar la elección/.test(await A.locator('.sync-fail').textContent()) && await A.evaluate(() => PEND.length === 1), 'el cambio no se pierde: queda pendiente en este dispositivo');
  ok(await A.locator('button', { hasText: 'Reintentar' }).count() === 1 && await A.locator('.error').count() === 0, 'el fallo es una frase y Reintentar, sin un informe que tape las skins');
  ok(!A.errs.length, 'auth desactivada: sin errores de JS ' + JSON.stringify(A.errs)); await A.ctx.close();
  // 2) Pérdida real de conexión: se recupera sola
  const B = await mk(b); await B.goto(base); await B.waitForSelector('.ft'); await until(B, () => dbState === 'ok', null);
  await B.context().setOffline(true); await B.evaluate(() => window.dispatchEvent(new Event('offline')));
  ok(/Sin conexión/.test(await B.locator('.sync-fail').textContent()) && await B.evaluate(() => syncKind === 'offline'), 'sin red: «Sin conexión» (no «servicio»)');
  await B.evaluate(() => proposeAt('01', 4, byCode['01'].picks[1].vid)); ok(/elección pendiente/.test(await B.locator('.sync-fail').textContent()) && await B.locator('button', { hasText: 'Reintentar' }).count() === 1, 'sin red: la elección queda pendiente y se puede reintentar');
  await B.context().setOffline(false); await B.evaluate(() => window.dispatchEvent(new Event('online')));
  ok(await until(B, () => PEND.length === 0 && dbState === 'ok' && syncKind === null, null, 15000) && (await B.textContent('#sync')) === '', 'al volver la red se guarda solo y la cabecera no deja Guardado fijo');
  const d2 = await B.evaluate(() => window.__ssbuDiag().errors.filter(e => e.kind !== 'offline').length); ok(d2 === 0, 'una caída de red no se registra como fallo de configuración');
  // 3) Reglas que rechazan un cambio (apariencia inexistente): no bloquea la cola y deja diagnóstico
  await B.evaluate(() => { PEND.push({ code: '01', slot: 5, to: '01:no-existe', exp: null, kind: 'set' }); savePend(); flush(); });
  ok(await until(B, () => PEND.length === 0, null, 20000), 'el cambio que las reglas rechazan (apariencia inexistente) se descarta y la cola sigue libre');
  const d3 = await B.evaluate(() => window.__ssbuDiag()); ok(d3.errors.some(e => e.kind === 'perm'), 'el rechazo por permisos queda como kind=perm en el diagnóstico');
  await B.evaluate(() => { proposeAt('01', 6, byCode['01'].picks[2].vid); });
  ok(await until(B, () => PEND.length === 0 && dbState === 'ok', null, 20000), 'después de un rechazo los cambios válidos se siguen guardando');
  // 4) clasificación
  const K = await B.evaluate(() => ({ a: classify({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }), b: classify({ code: 'auth/network-request-failed' }), c: classify({ code: 'auth/operation-not-allowed' }), d: classify({ code: 'unavailable' }), e: classify({ code: 'failed-precondition' }), f: classify({ message: 'Cloud Firestore API has not been used in project ssbu-441b1 before or it is disabled' }) }));
  ok(K.a === 'perm' && K.b === 'offline' && K.c === 'auth' && K.d === 'offline' && K.e === 'config' && K.f === 'perm', 'classify(): permisos, red, autenticación y configuración se distinguen ' + JSON.stringify(K));
  await B.ctx.close();
};
