// Interfaz: alternativas y destino, galería, navegación (Atrás, filtros, desplazamiento), accesibilidad, imágenes caídas, selecciones antiguas y exportación.
const L = require('./lib'); const { ok, until, mk, tap, shot, py, wipe } = L;
module.exports = async (b, base) => {
  const P = await mk(b); await P.goto(base); await P.waitForSelector('.ft'); await until(P, () => dbState === 'ok', null);
  // alternativas: elegibles, condiciones visibles al elegir, reubicación honesta, exportación
  const alt = await P.evaluate(() => { const e = all.find(e => isAlt(e.p) && e.p.native.length && e.p.native.length < 8 && !e.p.mii); return { vid: e.p.vid, n: [0, 1, 2, 3, 4, 5, 6, 7].find(n => !e.p.native.includes(n)) }; });
  await P.goto(base + '#/apariencia/' + encodeURIComponent(alt.vid)); await P.waitForSelector('[data-dest]');
  ok(/Alternativa/.test(await P.textContent('main')), 'ficha de alternativa: se distingue de las recomendadas');
  await P.click(`[data-dest="${alt.n}"]`); await P.waitForSelector('.note.y[role=status]'); await P.locator('#usebox').scrollIntoViewIfNeeded(); await shot(P, '10-ficha-destino');
  ok(/no está comprobado/.test(await P.textContent('#usebox')), 'destino fuera de los slots del mod: aviso honesto de reubicación');
  ok(!/choca con propuestas principales/.test(await P.evaluate(() => document.querySelector('main').innerText)), 'los choques internos del catálogo no estorban al elegir (van en detalles)');
  const det = await P.evaluate(() => document.querySelector('details:not(.prov)').textContent); ok(det.includes('Descargas') && det.includes('Fotos:') && det.includes('Revisión:'), 'detalles: descargas, alcance de las fotos y de la revisión');
  await tap(P, '[data-use]'); await P.waitForSelector('.cmp2 .prop'); ok(await until(P, () => PEND.length === 0 && dbState === 'ok', null), 'una alternativa se puede elegir y guardar');
  await until(P, v => planEntries().some(e => e.vid === v), alt.vid);
  const ex = await P.evaluate(() => buildExport()); const exa = ex.changes.find(c => c.proposal && c.proposal.vid);
  ok(exa.relocation && exa.relocation.needs_move === true && exa.relocation.checked === false, 'exportación: reubicación marcada como no comprobada');
  ok(ex.inventory.version && ex.inventory.profile.name === 'gian-sin-musica', 'exportación: versión y perfil del inventario');
  ok(ex.changes.every(c => c.user_destination && c.replaces && ('relocation' in c) && c.proposal.role), 'exportación: destino elegido, apariencia sustituida, reubicación y rol por cambio');
  ok(exa.proposal.role === 'alternativa' && ('variant' in exa.proposal), 'exportación: rol y variante de la propuesta');
  await P.goto(base + '#/catalogo'); await P.waitForSelector('.cd'); await P.click('[data-chip="aud"]'); await P.waitForTimeout(250);
  ok(await P.evaluate(() => [...document.querySelectorAll('#cg .cd')].every(c => c.textContent.includes('Recomendada'))), 'filtro «Recomendadas» solo muestra recomendadas');
  // galería
  const pk = await P.evaluate(() => all.find(e => e.p.pack).p.vid);
  await P.goto(base + '#/apariencia/' + encodeURIComponent(pk)); await P.waitForSelector('.hero');
  ok(/Paquete compartido/.test(await P.textContent('main')), 'ficha de paquete: avisa que las fotos son de todo el paquete');
  await P.click('.hero'); await P.waitForSelector('.pswp--open', { timeout: 8000 });
  ok(await P.locator('.pswp__thumbs button').count() > 1, 'galería: miniaturas visibles'); ok(await P.locator('.pswp__counter').count() === 1, 'galería: contador de fotos');
  await P.waitForTimeout(900); await P.keyboard.press('ArrowRight'); await P.waitForTimeout(700); ok(await P.evaluate(() => S.galI) === 1, 'galería: avanzar con teclado'); await P.waitForTimeout(500); await shot(P, '11-galeria');
  ok(await P.locator('button.pswp__button--close[aria-label]').count() === 1, 'galería: botón cerrar con nombre accesible');
  ok(await P.evaluate(() => !document.getElementById('dlg').classList.contains('open')), 'galería: sin otra ventana apilada');
  await P.goBack(); await P.waitForTimeout(600);
  ok(await P.locator('.pswp--open').count() === 0 && P.url().includes('/apariencia/'), '«Atrás» cierra la galería y vuelve a la ficha');
  ok(await P.locator('.hero .n').textContent().then(t => t.trim().startsWith('2')), 'al cerrar se conserva la foto en la que estabas');
  ok(await P.evaluate(() => getComputedStyle(document.querySelector('.hero img')).objectFit) === 'contain', 'imagen sin deformar (object-fit contain)');
  // navegación: Atrás conserva filtro y posición
  await P.goto(base + '#/catalogo'); await P.waitForSelector('.cd'); await P.fill('#cq', 'mario'); await P.waitForTimeout(300);
  await P.evaluate(() => scrollTo(0, 500)); await P.waitForTimeout(100); const y0 = await P.evaluate(() => scrollY);
  await tap(P, '.cd >> nth=3'); await P.waitForSelector('.hero,.note'); await P.goBack(); await P.waitForSelector('.cd'); await P.waitForTimeout(400);
  ok(await P.inputValue('#cq') === 'mario', 'atrás: el filtro de búsqueda se conserva'); ok(Math.abs(await P.evaluate(() => scrollY) - y0) < 80, 'atrás: el desplazamiento del catálogo se conserva');
  await P.goto(base + '#/luchadores'); await P.waitForSelector('.ft'); await P.evaluate(() => scrollTo(0, 900)); await P.waitForTimeout(100);
  await tap(P, '.ft >> nth=12'); await P.waitForSelector('.tgrid'); const y1 = await P.evaluate(() => scrollMem['#/luchadores']); await P.goBack(); await P.waitForSelector('.ft'); await P.waitForTimeout(500);
  ok(y1 > 300 && Math.abs(await P.evaluate(() => scrollY) - y1) < 40, 'atrás desde un luchador: se conserva la posición de la lista');
  await P.goto(base + '#/luchador/01/1'); await P.waitForSelector('.cd'); await P.fill('#cq', 'koopa'); await P.waitForTimeout(300); await P.evaluate(() => scrollTo(0, 600)); await P.waitForTimeout(100);
  await tap(P, '.cd'); await P.waitForSelector('.hero'); await P.goBack(); await P.waitForSelector('.cd'); await P.waitForTimeout(400);
  ok(await P.inputValue('#cq') === 'koopa', 'atrás desde una ficha: el filtro del traje se conserva');
  // accesibilidad
  await P.goto(base + '#/luchador/01'); await P.waitForSelector('.tj');
  ok(await P.evaluate(() => [...document.querySelectorAll('button,a,input,select')].filter(e => e.offsetParent && !(e.getAttribute('aria-label') || e.innerText.trim() || e.title)).length) === 0, 'todos los controles visibles tienen nombre accesible');
  const small = await P.evaluate(() => [...document.querySelectorAll('button,a.btn,.tj-a,nav.tabs a,.ib,.tj-cta')].filter(e => e.offsetParent).filter(e => { const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).map(e => e.className + e.textContent.slice(0, 10)));
  ok(small.length === 0, 'objetivos táctiles ≥44px ' + JSON.stringify(small.slice(0, 4)));
  await P.keyboard.press('Tab'); ok(await P.evaluate(() => document.activeElement !== document.body), 'teclado: el foco avanza');
  await P.evaluate(() => showMenu()); await P.waitForSelector('#dlg.open'); await P.waitForTimeout(150);
  ok(await P.evaluate(() => document.getElementById('dlg').contains(document.activeElement)), 'menú: el foco entra en el diálogo'); await shot(P, '12-menu');
  await P.keyboard.press('Escape'); await P.waitForTimeout(300); ok(await P.evaluate(() => !document.getElementById('dlg').classList.contains('open')), 'Escape cierra el diálogo');
  ok(await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin desplazamiento horizontal en móvil');
  // imagen caída: aviso en la tarjeta, ficha utilizable y «Reintentar» en la galería
  const F2 = await mk(b, { badImg: true }); await F2.goto(base + '#/luchador/01/1'); await F2.waitForSelector('.cd'); await F2.waitForTimeout(600);
  ok(await F2.locator('.cd .noimg').count() > 0, 'imagen caída: aviso en lugar de rectángulo vacío');
  await tap(F2, '.cd'); await F2.waitForSelector('.hero'); ok(true, 'imagen caída en una tarjeta: el toque sigue abriendo la ficha');
  await F2.click('.hero'); await F2.waitForSelector('.pswp__err button', { timeout: 8000 }).then(() => ok(true, 'galería: foto caída muestra «Reintentar»'), () => ok(false, 'galería: sin Reintentar')); await shot(F2, '13-foto-caida');
  await F2.context().unroute('**/images.gamebanana.com/**'); await F2.context().route('**/images.gamebanana.com/**', r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: L.svg }));
  await F2.click('.pswp__err button'); await F2.waitForFunction(() => PSWP && PSWP.currSlide.content.state === 'loaded' && PSWP.currSlide.container.querySelector('img'), null, { timeout: 6000 }).then(() => ok(true, '«Reintentar» recupera la foto'), () => ok(false, 'reintento no recupera'));
  await F2.ctx.close();
  // selecciones antiguas: nunca se suben solas
  await wipe(); py('seed --only all');
  const M = await mk(b); await M.addInitScript(() => { if (!localStorage.getItem('ssbu_sel_v2') && !localStorage.getItem('ssbu_mig3')) localStorage.setItem('ssbu_sel_v2', JSON.stringify({ '01:174057': { slot: 2 } })); });
  await M.goto(base + '#/cambios'); await M.waitForSelector('.empty'); await until(M, () => dbState === 'ok', null); await M.waitForTimeout(800);
  ok(await M.evaluate(() => planEntries().length === 0 && PEND.length === 0), 'selección antigua: NO se sube sola al plan compartido');
  ok(await M.locator('[data-m="recover"]').count() > 0, 'selección antigua: se ofrece «Revisar» de forma visible');
  await M.click('[data-m="recover"]'); await M.waitForSelector('[data-m="recover-go"]'); await shot(M, '14-recuperar'); await M.click('[data-m="recover-go"]');
  ok(await until(M, () => planVid('01', 2) === '01:174057' && PEND.length === 0 && dbState === 'ok', null, 12000), 'selección antigua: tras confirmar pasa al plan (Mario traje 3)');
  const plan = JSON.parse(py('plan')); ok(plan.schema === 3 && plan.changes.some(c => c.vid === '01:174057' && c.traje === 3 && c.proposal && c.proposal.url && c.current), 'db.py plan: exporta traje de destino, variante y actual');
  ok(plan.inventory && plan.inventory.verification === 'parcial', 'db.py plan: declara la verificación del inventario');
  py('status 01:174057 installed --result prueba'); ok(JSON.parse(py('plan')).changes.find(c => c.vid === '01:174057').status === 'installed', 'db.py status: registra el resultado');
  const ex2 = await M.evaluate(() => buildExport()); ok(ex2.changes.some(c => c.vid === '01:174057' && c.traje === 3 && c.slot === 'c02'), 'exportar desde la web usa el mismo plan global');
  ok([P, M].every(p => !p.errs.length), 'sin errores de JS ' + JSON.stringify([P.errs, M.errs])); await P.ctx.close(); await M.ctx.close();
};
