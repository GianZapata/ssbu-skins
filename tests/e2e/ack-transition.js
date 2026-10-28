// La confirmación de una transacción puede adelantarse al listener. La propuesta nunca debe desaparecer al vaciar PEND.
const L = require('./lib');
module.exports = async (browser, base) => {
  const A = await L.mk(browser, { deferChanges: true });
  await A.goto(base); await A.waitForSelector('.ft');
  L.ok(await L.until(A, () => dbState === 'ok' && planLoaded), 'ack: listener inicial preparado');
  await A.addInitScript(() => { globalThis.__holdChanges = true; });
  await A.evaluate(() => { globalThis.__holdChanges = true; });
  await L.pick(A, base, '82', 0);
  L.ok(await L.until(A, () => PEND.length === 0 && !flushing), 'ack: transacción confirmada y cola vacía antes de entregar snapshots');
  const server = JSON.parse(L.py('plan')).changes.find(c => c.roster_no === '82' && c.traje === 1);
  L.ok(!!server, 'ack: Firestore realmente conserva la propuesta');
  L.ok(await A.evaluate(vid => planVid('82', 0) === vid, server.vid), 'ack: la propuesta sigue visible entre confirmación y snapshot');
  L.ok(await A.locator('[data-act="clear"]').count() === 1, 'ack: la propuesta sigue en Nueva tras vaciar la cola');
  await A.evaluate(() => { globalThis.__holdChanges = false; for(const deliver of globalThis.__changeDeliveries || []) deliver(); globalThis.__changeDeliveries = []; });
  L.ok(await L.until(A, vid => PLAN['82_0']?.vid === vid && PEND.length === 0, server.vid), 'ack: el listener confirma la misma propuesta sin perderla');
  L.ok(await A.locator('[data-act="clear"]').count() === 1, 'ack: Nueva permanece después del listener');
  // el plan es una hoja sobre el luchador: su «Quitar» es la fila 82_0, no el de la tira que queda debajo
  await A.goto(base + '#/cambios'); await A.waitForSelector('[data-undo="82_0"]');
  await A.evaluate(() => { globalThis.__holdChanges = true; });
  await A.locator('[data-undo="82_0"]').click();
  L.ok(await L.until(A, () => PEND.length === 0 && !flushing), 'ack: deshacer confirmado antes del snapshot');
  L.ok(await A.evaluate(() => !planVid('82', 0)), 'ack: deshacer no resucita la propuesta al vaciar PEND');
  await A.evaluate(() => { globalThis.__holdChanges = false; for(const deliver of globalThis.__changeDeliveries || []) deliver(); });
  L.ok(await L.until(A, () => !planVid('82', 0)), 'ack: el listener conserva el deshacer');
  L.ok(!A.errs.length, 'ack: sin excepciones de página');
  await A.ctx.close();
};
