// Selector visual: propuesta por traje, foco, cabecera, botones y los recorridos E2E-01…12.
const L = require('./lib'); const { ok, until, mk, tap } = L;
const syncSamples = ['Conectando…', 'Guardando…', 'Guardado ✓', 'Sin conexión', 'Pendiente (12)', 'No se pudo guardar (12)', 'Solo en este dispositivo', 'Servicio no disponible'];

async function chooseFree(p) {
  return p.evaluate(() => {
    const used = new Set(planEntries().filter(e => e.code === RT.code).map(e => e.vid));
    const b = [...document.querySelectorAll('[data-skin]')].find(x => !used.has(x.dataset.skin) && !x.closest('.cd').textContent.includes('Retirada'));
    if (!b) return null; b.click(); return b.dataset.skin;
  });
}

module.exports = async (b, base) => {
  const P = await mk(b, { w: 390, h: 844 });
  await P.setViewportSize({ width: 320, height: 700 });
  await P.goto(base + '#/luchadores'); await P.waitForSelector('.ft'); await until(P, () => dbState === 'ok', null);
  const header = await P.evaluate(samples => samples.every(s => {
    const sync = document.getElementById('sync'), ttl = document.getElementById('ttl');
    sync.textContent = s;
    const c = sync.getBoundingClientRect();
    return c.right <= innerWidth + 1 && c.left >= 0 && c.top < innerHeight;
  }), syncSamples);
  ok(header, 'cabecera a 320px: los estados de sincronización no desbordan');
  await P.evaluate(() => { lastAct = { code: '01', slot: 0, from: null, to: '01:x' }; showHist(); }); await P.waitForSelector('#hUndo');
  const histBtn = await P.evaluate(() => { const el = document.getElementById('hUndo'); if (!el) return null; const bg = getComputedStyle(el).backgroundColor; return { cls: el.className, bg }; });
  ok(!!histBtn && /\bbtn\b/.test(histBtn.cls) && /\bp\b/.test(histBtn.cls), 'historial: la acción primaria usa el botón p');
  await P.keyboard.press('Escape');
  await P.evaluate(() => showExport()); await P.waitForSelector('#xCopy');
  ok(await P.evaluate(() => { const el = document.getElementById('xCopy'); const bg = getComputedStyle(el).backgroundColor; return /\bbtn\b/.test(el.className) && /\bp\b/.test(el.className) && bg !== 'rgba(0, 0, 0, 0)'; }), 'exportar: Copiar es botón primario');
  await P.keyboard.press('Escape');

  await P.setViewportSize({ width: 390, height: 844 });
  await P.goto(base + '#/luchador/01/3'); await P.waitForSelector('[data-slot="2"][aria-checked="true"]');
  ok(await P.locator('#slots [role="radio"]').count() === 8, 'E2E-01: ocho trajes');
  const vid = await chooseFree(P); ok(!!vid, 'E2E-01: hay una skin para Mario');
  await P.waitForSelector('[data-add]');
  ok(/Usar en Traje 3/.test(await P.textContent('[data-add]')), 'E2E-01: la acción nombra el Traje 3');
  await tap(P, '[data-add]'); await P.waitForSelector('.cmp2 .prop');
  ok(/Todavía no se ha instalado en la consola/.test(await P.textContent('#toast')), 'E2E-01: el aviso no dice que ya está instalada');
  ok(await until(P, (v) => PEND.length === 0 && planVid('01', 2) === v, vid), 'E2E-01: la propuesta queda en el traje 3');
  await P.goto(base + '#/cambios'); await P.waitForSelector('.chg-row');
  ok(/Traje 3/.test(await P.textContent('main')) && /Exportar/.test(await P.textContent('main')), 'E2E-01: Elegidas muestra el Traje 3 y Exportar');

  await P.goto(base + '#/luchador/01/3'); await P.waitForSelector('[data-skin]');
  const vid2 = await chooseFree(P);
  await P.waitForSelector('[data-add]');
  ok(/Reemplazar en Traje 3/.test(await P.textContent('[data-add]')), 'E2E-02: reemplazar es explícito');
  await tap(P, '[data-add]');
  ok(await until(P, v => planVid('01', 2) === v && planEntries().filter(e => e.code === '01' && e.n === 2).length === 1, vid2), 'E2E-02: queda una sola propuesta en ese traje');

  const before = await P.evaluate(() => planEntries().length);
  await tap(P, '[data-undo]');
  ok(await until(P, n => planVid('01', 2) == null && planEntries().length === n - 1, before), 'E2E-03: quitar propuesta actualiza el plan');
  await tap(P, '#toast button');
  ok(await until(P, v => planVid('01', 2) === v, vid2), 'E2E-03: Deshacer restaura la propuesta');
  await tap(P, '[data-undo]'); await until(P, () => planVid('01', 2) == null, null);

  await P.goto(base + '#/luchador/01/1'); await P.waitForSelector('[data-skin]');
  const shared = await chooseFree(P); await tap(P, '[data-add]'); await until(P, v => planVid('01', 0) === v, shared);
  await P.goto(base + '#/luchador/01/2'); await P.waitForSelector('[data-skin="' + shared + '"]');
  await tap(P, '[data-skin="' + shared + '"]');
  ok(/Ya está en el Traje 1/.test(await P.textContent('#stage')) && await P.locator('#stage [data-add]').count() === 0, 'E2E-04: la misma skin no se duplica');
  ok(await P.evaluate(v => planVid('01', 0) === v && planVid('01', 1) == null, shared), 'E2E-04: la otra propuesta sigue en su traje');
  await tap(P, '[data-goto-slot="0"]');
  ok(/#\/luchador\/01\/1$/.test(P.url()), 'E2E-04: Ver Traje abre ese traje');

  const Off = await mk(b); await Off.goto(base + '#/luchador/02/2'); await Off.waitForSelector('[data-skin]'); await until(Off, () => dbState === 'ok', null);
  const offVid = await Off.evaluate(() => document.querySelector('[data-skin]').dataset.skin);
  await Off.context().setOffline(true);
  await Off.evaluate(v => proposeAt('02', 1, v), offVid);
  ok(await Off.evaluate(() => PEND.length === 1 && JSON.parse(localStorage.getItem('ssbu_pend3') || '[]').length === 1), 'E2E-05: sin red queda en la cola local');
  ok(/Pendiente|pendiente/.test(await Off.textContent('#sync')) && /no se ha instalado/i.test(await Off.textContent('#toast')), 'E2E-05: se ve pendiente y que no está instalada');
  await Off.context().setOffline(false);
  ok(await until(Off, v => PEND.length === 0 && planVid('02', 1) === v, offVid, 15000), 'E2E-05: al volver la red se envía');
  await Off.ctx.close();

  const A = await mk(b), B = await mk(b);
  await A.goto(base + '#/luchadores'); await B.goto(base + '#/luchadores');
  await until(A, () => dbState === 'ok', null); await until(B, () => dbState === 'ok', null);
  const pair = await A.evaluate(() => byCode['05'].picks.filter(p => !p.withdrawn && !p.mii).slice(0, 2).map(p => p.vid));
  await B.context().setOffline(true);
  await B.evaluate(v => proposeAt('05', 0, v), pair[1]);
  await A.evaluate(v => proposeAt('05', 0, v), pair[0]);
  ok(await until(A, v => planVid('05', 0) === v && PEND.length === 0, pair[0]), 'E2E-06: la primera propuesta queda guardada');
  await B.context().setOffline(false);
  ok(await until(B, () => (document.getElementById('toast').textContent || '').includes('Se conservó'), null, 15000), 'E2E-06: el otro cliente ve el aviso');
  ok(await until(B, v => planVid('05', 0) === v, pair[0]), 'E2E-06: se conserva quien ya estaba');
  await A.ctx.close(); await B.ctx.close();

  await P.goto(base + '#/luchadores'); await P.waitForSelector('#fq');
  await P.evaluate(() => { const i = document.getElementById('fq'); i.focus(); i.value = 'ma'; i.setSelectionRange(1, 1); S.fq = 'ma'; S.galI = 3; scrollTo(0, 220); });
  const y0 = await P.evaluate(() => scrollY);
  const remote = await mk(b); await remote.goto(base); await until(remote, () => dbState === 'ok', null);
  await remote.evaluate(() => { const p = byCode['06'].picks.find(x => !x.withdrawn && !x.mii); proposeAt('06', 3, p.vid); });
  await P.waitForTimeout(900);
  const focus = await P.evaluate(() => ({ id: document.activeElement.id, v: document.getElementById('fq').value, s: document.getElementById('fq').selectionStart, y: scrollY, g: S.galI }));
  ok(focus.id === 'fq' && focus.v === 'ma' && focus.s === 1 && Math.abs(focus.y - y0) < 5 && focus.g === 3, 'E2E-07: un snapshot no roba el foco, el texto, el cursor ni el scroll');
  await remote.ctx.close();

  await P.goto(base + '#/luchador/01/1'); await P.waitForSelector('[data-skin]');
  const gal = await P.evaluate(() => { const e = all.find(x => x.p.g && x.p.g.length > 1 && !x.p.withdrawn); return { code: e.f.code, vid: e.p.vid, name: e.p.name }; });
  await P.goto(base + '#/luchador/' + gal.code + '/1'); await P.waitForSelector('#cq');
  await P.fill('#cq', gal.name); await P.waitForTimeout(300); await P.waitForSelector('[data-skin="' + gal.vid + '"]');
  await tap(P, '[data-skin="' + gal.vid + '"]'); await P.waitForSelector('.hero');
  await P.click('.hero'); await P.waitForSelector('.pswp--open'); await P.waitForTimeout(900);
  await P.keyboard.press('ArrowRight'); await P.waitForTimeout(700);
  ok(await P.evaluate(() => S.galI) === 1, 'E2E-08: la galería avanza');
  await P.keyboard.press('Escape'); await P.waitForTimeout(1200);
  ok(await P.locator('.pswp--open').count() === 0 && await P.evaluate(() => document.activeElement && document.activeElement.matches('[data-gal]')), 'E2E-08: al cerrar vuelve el foco');

  await P.goto(base + '#/luchador/01/4'); await P.waitForSelector('[data-slot="3"][aria-checked="true"]');
  await P.fill('#cq', 'mario'); await P.waitForTimeout(250);
  await tap(P, 'a.mas'); await P.waitForSelector('.hero'); await P.goBack(); await P.waitForSelector('[data-slot="3"][aria-checked="true"]');
  ok(/\/4$/.test(P.url()) && await P.inputValue('#cq') === 'mario', 'E2E-09: atrás conserva traje y búsqueda');
  await P.goForward(); ok(/apariencia/.test(P.url()), 'E2E-09: adelante vuelve a la ficha');
  await P.goto(base + '#/luchador/01/6'); ok(await P.locator('[data-slot="5"][aria-checked="true"]').count() === 1, 'E2E-09: la ruta profunda abre ese traje');

  const ex = await P.evaluate(() => buildExport());
  ok(ex.schema === 3 && ex.changes.some(c => c.slot && c.user_destination) && ex.changes.every(c => c.current && c.current.confirmed === false && c.proposal && typeof c.proposal.online === 'string'), 'E2E-10: el JSON es schema 3, con destino, online y confirmed false');

  const bad = await mk(b, { badImg: true });
  await bad.goto(base + '#/luchador/01/1'); await bad.waitForSelector('.cd'); await bad.waitForTimeout(500);
  ok(await bad.locator('.cd .noimg').count() > 0, 'E2E-11: foto caída tiene sustituto');
  const special = await bad.evaluate(() => {
    const wd = F.flatMap(f => f.picks).find(p => p.withdrawn);
    const mii = F.find(f => f.mii);
    let unk = null;
    for (const f of F) { if (f.mii) continue; for (let n = 0; n < 8; n++) { const c = curOf(f.code, n); if (c && c.kind === 'unknown') { unk = { code: f.code, n }; break; } } if (unk) break; }
    return { wd: wd && wd.vid, mii: mii && mii.code, unk };
  });
  await bad.goto(base + '#/apariencia/' + encodeURIComponent(special.wd));
  ok(/Retirada/.test(await bad.textContent('main')) && await bad.locator('[data-use]').count() === 0, 'E2E-11: una retirada no se agrega');
  await bad.goto(base + '#/luchador/' + special.mii + '/3'); await bad.waitForTimeout(400);
  ok(/no usan los ocho/.test(await bad.textContent('main')) && !/\/3$/.test(bad.url()), 'E2E-11: un Mii no finge ocho trajes');
  if (special.unk) { await bad.goto(base + '#/luchador/' + special.unk.code + '/' + (special.unk.n + 1)); await bad.waitForSelector('.cur'); ok(/Sin identificar/.test(await bad.textContent('#stage')), 'E2E-11: inventario incompleto se nombra'); }
  else ok(true, 'E2E-11: este inventario no tiene un traje sin identificar');
  await bad.ctx.close();

  await P.goto(base + '#/luchador/01/1'); await P.waitForSelector('[data-slot="0"]');
  await P.focus('[data-slot="0"]'); await P.keyboard.press('ArrowRight'); await P.waitForTimeout(200);
  ok(/\/2$/.test(P.url()) && await P.evaluate(() => document.activeElement && document.activeElement.dataset.slot === '1'), 'E2E-12: las flechas mueven el traje');
  await P.keyboard.press('Tab');
  ok(await P.evaluate(() => { const el = document.activeElement; return !(el && el.closest && el.closest('#slots')); }), 'E2E-12: Tab sale del grupo de trajes');
  for (const w of [320, 375, 390, 430, 768, 1024, 1440]) {
    await P.setViewportSize({ width: w, height: w >= 1024 ? 900 : 800 });
    await P.goto(base + '#/luchador/01'); await P.waitForSelector('.tgrid'); await P.waitForTimeout(100);
    const fit = await P.evaluate(() => {
      const desk = getComputedStyle(document.querySelector('nav.desk')).display !== 'none';
      const tabs = document.querySelector('nav.tabs');
      const bar = document.querySelector('.picked');
      const barOn = !!(bar && !bar.hidden && bar.getBoundingClientRect().height > 0);
      const nav = barOn ? bar.getBoundingClientRect() : null;
      const last = [...document.querySelectorAll('main button,main a')].filter(e => e.offsetParent).pop();
      if (last) last.focus();
      const fr = last ? last.getBoundingClientRect() : null;
      const covered = !!(fr && nav && fr.bottom > nav.top + 1 && fr.top < nav.bottom);
      return document.documentElement.scrollWidth <= innerWidth + 1 && !tabs && (innerWidth >= 1024 ? desk : !desk) && !covered;
    });
    ok(fit, 'E2E-12: cabe y el foco no queda bajo la barra a ' + w + 'px');
  }
  await P.setViewportSize({ width: 320, height: 700 });
  await P.goto(base + '#/luchadores'); await P.waitForSelector('.ft');
  await P.evaluate(() => { document.documentElement.style.fontSize = '32px'; }); await P.waitForTimeout(100);
  ok(await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'E2E-12: texto grande sin desbordar a 320px');
  const appErrs = P.errs.filter(e => !/access control checks/.test(e));
  ok(!appErrs.length, 'selector sin errores de JS ' + JSON.stringify(appErrs));
  await P.ctx.close();
};
