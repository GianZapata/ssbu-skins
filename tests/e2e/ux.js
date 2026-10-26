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

// Regresiones de interacción sin emulador: se conserva la aplicación real y solo se controlan
// sus dependencias de red. Las figuras SVG tienen dimensiones conocidas; no acreditan el contenido
// de las fotos de GameBanana, pero sí su encuadre, carga, fallback y navegación en el visor real.
const image = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="#369" stroke="#ff0" stroke-width="2"/></svg>`;
async function offlinePage(b, options = {}) {
  const p = await mk(b, { ...options, noFirebase: true });
  // También las referencias originales oficiales son un transporte controlado en estos recorridos.
  await p.ctx.route('https://www.smashbros.com/assets_v2/img/fighter/**', r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: L.svg }));
  // Defensa independiente de mk: este recorrido jamás debe conectarse al proyecto ni al emulador.
  await p.ctx.route('**/*', r => /firebase|firestore|identitytoolkit|securetoken|gstatic\.com/i.test(r.request().url()) || !['GET', 'HEAD', 'OPTIONS'].includes(r.request().method()) ? r.abort() : r.fallback());
  return p;
}
async function focusedVisible(p) {
  return until(p, () => {
    const e = document.activeElement, r = e.getBoundingClientRect();
    const header = document.querySelector('.top').getBoundingClientRect(), nav = document.querySelector('nav.tabs').getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return e !== document.body && r.top >= header.bottom - 1 && r.bottom <= nav.top + 1 && (hit === e || e.contains(hit));
  }, null, 1200);
}
async function deepPagination(b, base) {
  const p = await offlinePage(b);
  p.setDefaultTimeout(6000);
  try {
    await p.goto(base + '#/catalogo'); await p.waitForSelector('#cg .cd');
    // WebKit móvil no admite mouse.wheel: desplazar al último resultado cargado
    // ejercita la misma paginación real por IntersectionObserver en ambos motores.
    await p.locator('#cg .cd').nth(39).scrollIntoViewIfNeeded();
    await p.waitForFunction(() => document.querySelectorAll('#cg .cd').length >= 80);
    await p.locator('#cg .cd').nth(75).scrollIntoViewIfNeeded();
    const y = await p.evaluate(() => scrollY);
    await p.locator('#cg .cd').nth(75).click(); await p.waitForSelector('.hero');
    await p.goBack(); await p.waitForSelector('#cg');
    ok(await until(p, y => document.querySelectorAll('#cg .cd').length >= 76 && Math.abs(scrollY - y) < 50, y, 1500), 'catálogo paginado: Atrás restaura la tarjeta 76 y su desplazamiento, sin limitarse a las primeras 40');
    await p.waitForFunction(() => document.querySelectorAll('#cg .cd').length >= 80);
    await p.locator('#cg .cd').nth(75).scrollIntoViewIfNeeded();
    const refreshedY = await p.evaluate(() => scrollY);
    await p.evaluate(() => render(true));
    ok(await until(p, y => document.querySelectorAll('#cg .cd').length >= 76 && Math.abs(scrollY - y) < 50, refreshedY, 1500), 'catálogo paginado: actualización en vivo conserva resultados cargados y desplazamiento profundo');
    await shot(p, 'regresion-catalogo-paginado');
  } catch (e) { ok(false, 'catálogo paginado: ' + e.message); }
  finally { await p.ctx.close(); }
}
async function interactions(b, base) {
  // Cada caso cierra su contexto aunque falle; los fallos de una regresión no ocultan las demás.
  async function scenario(name, options, run) {
    const p = await offlinePage(b, options);
    p.setDefaultTimeout(6000);
    try { await run(p); } catch (e) { ok(false, `${name}: ${e.message}`); }
    finally { await p.ctx.close(); }
  }
  const detail = base + '#/apariencia/01%3A174057';
  await deepPagination(b, base);
  await scenario('búsqueda y navegación rápida', {}, async p => {
    await p.goto(base + '#/luchadores'); await p.waitForSelector('#fq');
    // Mismo turno de eventos: el usuario navega antes de que venza el debounce.
    await p.evaluate(() => { const i = document.querySelector('#fq'); i.value = 'mario'; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('nav [data-tab="catalogo"]').click(); });
    await p.waitForSelector('#cq'); await p.waitForTimeout(250);
    ok(p.errs.length === 0 && await p.locator('#cg .cd').count() > 0, 'búsqueda rápida de luchador → Catálogo: sin callback contra nodos desmontados ' + JSON.stringify(p.errs));
    p.errs.length = 0;
    await p.evaluate(() => { const i = document.querySelector('#cq'); i.value = 'shadow'; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('nav [data-tab="luchadores"]').click(); });
    await p.waitForSelector('#fq'); await p.waitForTimeout(300);
    ok(p.errs.length === 0 && await p.locator('.ft').count() > 0, 'búsqueda rápida de apariencia → Luchadores: sin callback contra nodos desmontados ' + JSON.stringify(p.errs));
  });
  for (const route of ['#/catalogo', '#/catalogo?f=01', '#/luchador/01/1']) for (const back of ['cabecera', 'navegador']) {
    await scenario(`Atrás de ${back} conserva contexto ${route}`, {}, async p => {
      const query = route.includes('?f=01') ? 'shadow' : 'mario', card = query === 'shadow' ? 0 : 2;
      await p.goto(base + route); await p.waitForSelector('#cq'); await p.fill('#cq', query);
      await p.click('[data-chip="aud"]'); await p.locator('#cq').blur();
      await p.waitForTimeout(220); await p.locator('#cg .cd').nth(card).scrollIntoViewIfNeeded();
      const before = await p.locator('#cg .cd').allTextContents(), y = await p.evaluate(() => scrollY);
      await p.locator('#cg .cd').nth(card).click(); await p.waitForSelector('.hero');
      if (back === 'cabecera') await p.click('#back'); else await p.goBack();
      await p.waitForSelector('#cq'); await p.waitForTimeout(150);
      ok(await p.inputValue('#cq') === query && await p.getAttribute('[data-chip="aud"]', 'aria-pressed') === 'true', `${route}: Atrás de ${back} conserva búsqueda y filtro`);
      ok(JSON.stringify(await p.locator('#cg .cd').allTextContents()) === JSON.stringify(before) && Math.abs(await p.evaluate(() => scrollY) - y) < 50, `${route}: Atrás de ${back} conserva resultados y desplazamiento`);
    });
  }
  await scenario('actualización en vivo conserva filtros editados', {}, async p => {
    await p.goto(base + '#/catalogo?f=03'); await p.waitForSelector('#cf');
    await p.selectOption('#cf', '04'); await p.fill('#cq', 'mario'); await p.locator('#cq').blur();
    await p.waitForTimeout(220);
    const before = await p.locator('#cg .cd').allTextContents();
    // Misma ruta de render usado al recibir inventario, catálogo o cambios compartidos.
    await p.evaluate(() => render(true));
    ok(await p.inputValue('#cf') === '04' && await p.inputValue('#cq') === 'mario', 'actualización en vivo: conserva Samus y búsqueda editados tras entrar por URL de Link');
    ok(JSON.stringify(await p.locator('#cg .cd').allTextContents()) === JSON.stringify(before), 'actualización en vivo: conserva el resultado visible, incluido el vacío');
  });
  await scenario('elegir, recargar y deshacer sin red', {}, async p => {
    await p.goto(base); await p.fill('#fq', 'mario'); await p.waitForTimeout(160);
    await p.locator('.ft[href="#/luchador/01"]').click(); await p.waitForSelector('.tj');
    ok(await p.locator('.tj').count() === 8, 'recorrido sin red: buscar Mario abre sus ocho trajes');
    await p.locator('.tj-a').first().click(); await p.waitForSelector('#cg .cd');
    await p.locator('#cg .cd').first().click(); await p.waitForSelector('[data-use]');
    await p.ctx.setOffline(true); await p.click('[data-use]');
    await p.waitForSelector('.cmp2 .prop');
    ok(await p.evaluate(() => planEntries().length === 1) && (await p.textContent('#sync')).includes('Pendiente'), 'recorrido sin red: elegir muestra Actual/Propuesta y un cambio pendiente');
    await p.ctx.setOffline(false); await p.reload(); await p.waitForSelector('.cmp2 .prop');
    await p.click('nav [data-tab="cambios"]'); await p.waitForSelector('.chg-row');
    ok(await p.locator('.chg-row').count() === 1, 'recorrido sin red: recargar conserva la propuesta en Cambios');
    await p.locator('[data-undo]').first().click();
    ok(await until(p, () => planEntries().length === 0 && !document.querySelector('.chg-row'), null), 'recorrido sin red: Deshacer quita la propuesta visible');
    ok(p.errs.length === 0, 'recorrido sin red completo sin errores de JS ' + JSON.stringify(p.errs));
  });
  await scenario('selección conserva foco', {}, async p => {
    await p.goto(detail); await p.waitForSelector('[data-dest]');
    await p.locator('[data-dest="2"]').focus(); await p.keyboard.press('Enter');
    ok(await p.evaluate(() => document.activeElement.matches('[data-dest="2"][aria-pressed="true"]')), 'Enter en un destino conserva el foco en el destino seleccionado');
    await p.keyboard.press('Tab'); ok(await p.evaluate(() => document.activeElement.matches('[data-dest="3"]')), 'Tab tras elegir destino avanza al siguiente traje');
    await p.locator('[data-thumb="1"]').focus(); await p.keyboard.press('Enter');
    ok(await p.evaluate(() => document.activeElement.matches('[data-thumb="1"][aria-current="true"]')), 'Enter en una foto conserva el foco en la miniatura seleccionada');
    await p.keyboard.press('Tab'); ok(await p.evaluate(() => document.activeElement.matches('[data-thumb="2"]')), 'Tab tras elegir foto avanza a la siguiente miniatura');
  });
  for (const [w, h, mobile] of [[390, 844, true], [1280, 800, false], [390, 400, true], [844, 390, true]]) {
    await scenario(`foco visible ${w}×${h}`, { w, h, mobile }, async p => {
      await p.goto(detail); await p.waitForSelector('[data-dest]');
      await p.locator('[data-dest="6"]').focus(); await p.keyboard.press('Tab');
      ok(await focusedVisible(p), `${w}×${h}: destino 8 enfocado queda visible entre cabecera y barra inferior`);
      await p.keyboard.press('Tab');
      ok(await p.evaluate(() => document.activeElement.matches('summary')) && await focusedVisible(p), `${w}×${h}: Tab alcanza Detalles y fuentes sin ocultarlo bajo la barra`);
      await shot(p, `regresion-foco-${w}x${h}`);
    });
  }
  await scenario('encuadre real de la imagen cargada', {}, async p => {
    await p.goto(detail); await p.waitForSelector('.hero');
    const files = await p.evaluate(() => idx['01:174057'].p.g.slice(0, 3));
    const sizes = [[640, 360], [360, 640], [360, 360]];
    await p.ctx.route('**/images.gamebanana.com/**', r => {
      const i = files.findIndex(f => r.request().url().includes(f)); const [w, h] = sizes[Math.max(i, 0)];
      return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: image(w, h) });
    });
    await p.reload(); await p.waitForSelector('.hero');
    for (let i = 0; i < sizes.length; i++) {
      if (i) await p.click(`[data-thumb="${i}"]`);
      const loaded = await until(p, ([w, h]) => { const x = document.querySelector('.hero img'); return x && x.naturalWidth === w && x.naturalHeight === h; }, sizes[i]);
      const framed = await p.evaluate(() => { const h = document.querySelector('.hero').getBoundingClientRect(), i = document.querySelector('.hero img'), r = i && i.getBoundingClientRect(); return !!r && r.left >= h.left - 1 && r.top >= h.top - 1 && r.right <= h.right + 1 && r.bottom <= h.bottom + 1 && getComputedStyle(i).objectFit === 'contain'; });
      ok(loaded && framed, `foto ${sizes[i].join('×')}: imagen cargada completa dentro del hero, sin recorte por wrapper cuadrado`);
    }
    await shot(p, 'regresion-encuadre');
  });
  await scenario('derivados 404 conservan la foto disponible', {}, async p => {
    await p.ctx.route('**/images.gamebanana.com/**', r => /\/(220|530)-90_/.test(r.request().url()) ? r.fulfill({ status: 404, body: 'derivado inexistente' }) : r.fulfill({ status: 200, contentType: 'image/svg+xml', body: image(640, 360) }));
    await p.goto(detail); await p.waitForSelector('.hero');
    ok(await until(p, () => { const i = document.querySelector('.hero img'); return i && i.naturalWidth === 640 && i.naturalHeight === 360; }, null, 3000), 'derivados 530/220 caídos: el hero recupera el original disponible');
    ok(await until(p, () => { const i = document.querySelector('[data-thumb="1"] img'); return i && i.naturalWidth > 0; }, null, 3000), 'derivado 220 caído: la miniatura recupera el original disponible');
    await p.click('.hero'); await p.waitForSelector('.pswp--open');
    ok(await until(p, () => { const i = document.querySelectorAll('.pswp__thumbs button img')[1]; return i && i.naturalWidth > 0; }, null, 3000), 'galería: las miniaturas también recuperan originales en vez de iconos rotos');
    await shot(p, 'regresion-fallback-original');
  });
  await scenario('galería: teclado, encuadre y devolución del foco', { w: 844, h: 390, mobile: true }, async p => {
    await p.goto(detail); await p.waitForSelector('.hero'); await p.locator('.hero').focus(); await p.keyboard.press('Enter');
    await p.waitForSelector('.pswp--open'); await until(p, () => PSWP && PSWP.opener.isOpen, null);
    await p.keyboard.press('ArrowRight'); ok(await until(p, () => S.galI === 1, null), 'galería: flecha derecha cambia la foto visible');
    await until(p, () => PSWP && PSWP.currSlide.content.element && PSWP.currSlide.content.element.naturalWidth > 0, null);
    const visible = await p.evaluate(() => { const i = PSWP.currSlide.content.element.getBoundingClientRect(), t = document.querySelector('.pswp__thumbs').getBoundingClientRect(); return i.bottom <= t.top + 1 && i.top >= 0; });
    ok(visible, 'galería horizontal: la foto ajustada queda completa por encima de las miniaturas');
    await shot(p, 'regresion-galeria-horizontal');
    await p.keyboard.press('Escape'); await p.waitForSelector('.pswp', { state: 'detached' });
    ok(await p.evaluate(() => document.activeElement.matches('.hero')), 'Escape de la galería devuelve el foco al hero');
    ok((await p.textContent('.hero .n')).trim().startsWith('2'), 'cerrar conserva la segunda foto en el detalle');
  });
  for (const delay of [0, 50, 150]) {
    await scenario(`Atrás durante apertura de galería (${delay}ms)`, {}, async p => {
      await p.goto(detail); await p.waitForSelector('.hero');
      await p.evaluate(delay => {
        const observer = new MutationObserver(() => {
          if (!document.querySelector('.pswp--open')) return;
          observer.disconnect(); setTimeout(() => { window.__backDuringOpening = !!(PSWP && PSWP.opener.isOpening); history.back(); }, delay);
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        document.querySelector('.hero').click();
      }, delay);
      const closed = await until(p, () => '__backDuringOpening' in window && !document.querySelector('.pswp') && !ovs.includes('gal') && !PSWP, null, 2500);
      ok(closed && p.url().includes('/apariencia/'), `Atrás a ${delay}ms de abrir: sin galería huérfana ni estado de overlay residual`);
      if (!closed) await shot(p, `regresion-galeria-atras-${delay}`);
    });
  }
  await scenario('exportación accesible con teclado', {}, async p => {
    await p.goto(detail); await p.waitForSelector('.hero'); await p.click('#menuBtn'); await p.click('[data-m="export"]');
    await p.locator('#xDown').focus(); await p.keyboard.press('Tab');
    ok(await p.evaluate(() => document.activeElement.id === 'xPre'), 'exportación: Tab después de Descargar alcanza el JSON desplazable');
    if (await p.evaluate(() => document.activeElement.id === 'xPre')) {
      await p.keyboard.press('PageDown'); await p.waitForTimeout(150);
      ok(await p.evaluate(() => document.querySelector('#xPre').scrollTop > 0), 'exportación: teclado desplaza el JSON');
      await p.keyboard.press('Tab'); ok(await p.evaluate(() => document.querySelector('#dlg').contains(document.activeElement) && document.activeElement.id !== 'xPre'), 'exportación: Tab después del JSON sigue dentro del diálogo');
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => document.activeElement.id === 'menuBtn'), 'cerrar exportación devuelve el foco a Más opciones');
  });
}
module.exports.interactions = interactions;
module.exports.offlinePage = offlinePage;
module.exports.deepPagination = deepPagination;
