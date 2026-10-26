// Datos que llegan a la web: totales del catálogo ampliado, identificadores, campos conservados, retratos, inventario del perfil.
const fs = require('fs'), path = require('path'), { isDeepStrictEqual } = require('node:util'); const L = require('./lib'); const { ok, until, mk, tap, shot } = L;
// Los renders remotos se sustituyen solo en el transporte; su URL/procedencia se contrastan
// con el catálogo de entrada. Esto no acredita los bytes ni la disponibilidad de Nintendo.
const officialImages = P => P.ctx.route('https://www.smashbros.com/assets_v2/img/fighter/**', r => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: L.svg }));
function officialPortrait(t, refs) {
  if (!t.src) return false;
  if (/^assets\/fighters\/[\w]+\.webp$/.test(t.src)) return !!(t.source && t.source.asset === t.src && t.source.source_page);
  const ref = refs[t.c];
  return !!(ref && ref.verified === true && t.src === ref.image_url && /^https:\/\/www\.smashbros\.com\/assets_v2\/img\/fighter\//.test(t.src) && isDeepStrictEqual(t.source, ref));
}
module.exports = async (b, base) => {
  const cat = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'data/catalog.json'), 'utf8'));
  const P = await mk(b); await officialImages(P); await P.goto(base); await P.waitForSelector('.ft'); await until(P, () => dbState === 'ok', null);
  const t = await P.evaluate(() => { const a = F.flatMap(f => f.picks); const act = a.filter(p => !p.withdrawn); return { f: F.length, act: act.length, main: act.filter(p => !isAlt(p)).length, alt: act.filter(isAlt).length, wd: a.length - act.length, ids: new Set(a.map(p => p.vid)).size, all: a.length }; });
  const expectedAlt = cat.entries.filter(e => e.role === 'alternativa').length, expectedMain = cat.entries.filter(e => e.role === 'propuesta principal').length;
  ok(t.f === 89 && t.act === cat.entries.length && t.main === expectedMain && t.alt === expectedAlt && t.wd === cat.withdrawn.length, `totales de la web: ${t.f} luchadores · ${t.act} activas (${t.main} principales + ${t.alt} alternativas) · ${t.wd} retiradas`);
  ok(t.act === cat.entries.length && cat.counts.looks === t.act && t.ids === t.all, 'los totales coinciden con data/catalog.json y todos los identificadores son únicos');
  const sample = cat.entries.every(e => e.look_id) && await P.evaluate(ids => ids.every(id => !!idx[id]), cat.entries.map(e => e.look_id));
  ok(sample, 'cada look_id del catálogo es el identificador de su apariencia en la web');
  // campos conservados en la web y en Firestore
  const keep = ['role', 'variant', 'audit_scope', 'downloads_scope', 'images_scope'];
  const mism = await P.evaluate(async keep => { const f = await fb(); const s = await f.getDocs(f.collection(f.db, 'catalog')); let bad = 0, n = 0;
    s.forEach(d => d.data().picks.forEach(p => { n++; const e = idx[p.vid] && idx[p.vid].p; if (!e || keep.some(k => (p[k] ?? null) !== (e[k] ?? null))) bad++; })); return { bad, n }; }, keep);
  ok(mism.bad === 0 && mism.n === t.all, `Firestore conserva ${keep.join(', ')} en las ${mism.n} apariencias`);
  const emb = cat.entries.filter(e => e.role).length; const withScopes = await P.evaluate(() => all.filter(e => e.p.audit_scope && e.p.downloads_scope && e.p.images_scope).length);
  ok(withScopes === emb, `la web trae audit_scope, downloads_scope e images_scope en las ${emb} apariencias`);
  // retratos: identidad del luchador ≠ apariencia de sus trajes
  await P.goto(base + '#/luchadores'); await P.waitForSelector('.ft img', { timeout: 8000 }); await P.waitForTimeout(500);
  const tiles = await P.evaluate(() => [...document.querySelectorAll('.ft')].map(a => { const c = decodeURIComponent(a.getAttribute('href').split('/').pop()); const i = a.querySelector('img'); return { c, src: i ? i.getAttribute('src') : null, ok: i ? i.complete && i.naturalWidth > 0 : null, mono: !!a.querySelector('.mono'), source: byCode[c].portrait_source }; }));
  ok(tiles.length === 89 && tiles.every(t => officialPortrait(t, cat.original_refs)), 'los 89 retratos conservan su procedencia oficial; ninguno usa imágenes de trajes o GameBanana');
  ok(tiles.every(t => t.ok), 'cargan los retratos locales publicados y los renders remotos servidos por la fixture');
  ok(tiles.filter(t => +t.c >= 71).every(t => !t.mono && officialPortrait(t, cat.original_refs)), 'DLC 71–82: retrato oficial local o referencia oficial verificada, con su procedencia completa');
  ok(tiles.find(t => t.c === '03').src === 'assets/fighters/03.webp', 'Link usa su propio retrato (regresión «Lightning como Link»)');
  const linkInv = await P.evaluate(() => Object.values((INV.fighters['03'] || { slots: {} }).slots).filter(s => s.img).length);
  await P.goto(base + '#/luchador/03'); await P.waitForSelector('.tgrid');
  const hdr = await P.evaluate(() => document.querySelector('.fh img').getAttribute('src')); ok(hdr === 'assets/fighters/03.webp', `la cabecera de Link conserva su retrato aunque el inventario trae ${linkInv} retratos de trajes`);
  await shot(P, '08-selector'); await P.goto(base + '#/luchadores'); await P.waitForSelector('.ft'); await P.evaluate(() => scrollTo(0, 0)); await shot(P, '08-selector');
  // inventario del perfil gian-sin-musica
  const inv = await P.evaluate(() => { const k = (c, n) => { const x = curOf(c, n); return { kind: x.kind, name: x.name, verif: x.verif, stg: !!x.staged }; }; return { sora4: k('82', 4), sora7: k('82', 7), sora6: k('82', 6), mario1: k('01', 1), mario0: k('01', 0), pyra0: k('79', 0), myth0: k('80', 0), steve0: k('77', 0), steve1: k('77', 1), ike0: k('32', 0), dk1: k('02', 1), meta: INV.meta.profile && INV.meta.profile.name, ver: INV.meta.version }; });
  ok(inv.meta === 'gian-sin-musica', 'el inventario representa el perfil gian-sin-musica');
  ok(inv.sora4.name === 'Ventus (Dusk)' && /13\.0\.5/.test(inv.sora4.verif), 'Sora c04 Ventus: nombre y prueba en consola del ModPack (13.0.5, sin conexión)');
  ok(inv.sora7.name.includes('Villa') && inv.ike0.name === 'Terra' && inv.dk1.name === 'Funky Kong', 'favoritos del perfil: Roxas, Terra y Funky Kong en sus trajes');
  ok(inv.pyra0.name === 'Aqua (Dusk)' && inv.myth0.name === 'Aqua (Dusk)', 'Aqua ocupa el traje 1 de Pyra y de Mythra');
  ok(inv.steve0.kind === 'original' && inv.steve1.kind === 'original', 'Steve: el perfil excluye «Optionals», así que sus trajes no cuentan como instalados');
  ok(inv.mario1.kind === 'pending' && inv.mario1.name === 'Nombre pendiente', 'Mario traje 2: se ve su retrato pero falta el nombre → «Nombre pendiente»');
  ok(inv.mario0.kind === 'original' && inv.sora6.kind === 'pending', 'originales y trajes por identificar se distinguen');
  await P.goto(base + '#/luchador/01'); await P.waitForSelector('.tgrid'); ok((await P.textContent('.tgrid')).includes('Nombre pendiente') && !/Apariencia sin identificar/.test(await P.textContent('.tgrid')), 'la pantalla del luchador usa «Nombre pendiente», sin etiquetas duplicadas');
  await P.goto(base + '#/luchador/01/2'); await P.waitForSelector('.cur'); await P.click('details.prov summary'); ok(/Revisado en el repositorio/.test(await P.textContent('details.prov')), 'procedencia y verificación quedan en el desplegable del traje');
  await P.goto(base + '#/luchador/82/5'); await P.waitForSelector('.cur'); await P.click('details.prov summary'); ok(/emuMMC sin conexion/.test(await P.textContent('details.prov')), 'el desplegable cita la prueba del ModPack (sin conexión, no certifica online)');
  // regresión Shadow Mewtwo
  const mw = await P.evaluate(() => { const f = F.find(f => /Mewtwo/.test(f.name)); const sm = f.picks.find(p => /Shadow Mewtwo/i.test(p.name)); return { code: f.code, vid: sm && sm.vid }; });
  await P.goto(base + '#/luchador/' + mw.code + '/8'); await P.waitForSelector('.cur,.cmp2'); ok(!/libre/i.test(await P.textContent('main')), 'Mewtwo c07: no aparece «libre»');
  await P.goto(base + '#/apariencia/' + encodeURIComponent(mw.vid)); await P.waitForSelector('details');
  ok(/puede estar ocupado/.test(await P.evaluate(() => document.querySelector('details').textContent)), 'el destino sugerido por el análisis solo es orientativo (y puede estar ocupado)');
  ok(!/slot nativo libre/.test(await P.textContent('main')), 'la ficha no afirma disponibilidad');
  ok(!P.errs.length, 'sin errores de JS ' + JSON.stringify(P.errs)); await P.ctx.close();
};

// También se ejecuta en WebKit sin Firebase: reconocimiento y navegación, con los
// retratos locales de la carpeta publicada (sin sustituirlos por fotos simuladas).
module.exports.portraits = async (b, base) => {
  const P = await require('./ux').offlinePage(b);
  const refs = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'data/catalog.json'), 'utf8')).original_refs;
  try {
    await officialImages(P);
    await P.goto(base + '#/luchadores'); await P.waitForSelector('.ft');
    const roster = await P.evaluate(() => [...document.querySelectorAll('.ft')].map(a => ({
      href: a.getAttribute('href'), label: a.getAttribute('aria-label'), name: a.querySelector('b').textContent.trim(),
      c: decodeURIComponent(a.getAttribute('href').split('/').pop()), src: a.querySelector('img')?.getAttribute('src'), mono: !!a.querySelector('.mono'),
      source: byCode[decodeURIComponent(a.getAttribute('href').split('/').pop())].portrait_source
    })));
    ok(roster.length === 89 && new Set(roster.map(a => a.href)).size === 89, 'identidad sin red: cada luchador tiene una tarjeta y destino propios');
    ok(roster.every(a => a.label && a.label.startsWith(a.name) && (a.src || a.mono)), 'identidad sin red: retratos e iniciales conservan el nombre accesible del luchador');
    ok(roster.every(a => officialPortrait(a, refs)), 'identidad sin red: retratos canónicos locales o Nintendo verificado con procedencia, nunca inventario/GameBanana');
    ok(roster.filter(a => +a.c >= 71).every(a => !a.mono && officialPortrait(a, refs)), 'DLC: la referencia oficial verificada identifica al luchador cuando falta su archivo local');
    ok(await until(P, () => [...document.querySelectorAll('.ft img')].every(i => i.complete && i.naturalWidth > 0), null), 'identidad sin red: cargan archivos locales reales y renders remotos de fixture');
    await P.fill('#fq', 'link'); await P.waitForTimeout(180);
    const link = P.locator('.ft[href="#/luchador/03"]');
    ok(await link.count() === 1 && await link.locator('img').getAttribute('src') === 'assets/fighters/03.webp', 'buscar Link permite reconocer a Link con su retrato, no Lightning');
    await link.focus(); await P.keyboard.press('Enter'); await P.waitForSelector('.tgrid');
    ok(await P.locator('.tj').count() === 8 && await P.locator('.fh img').getAttribute('src') === 'assets/fighters/03.webp', 'Enter en Link abre sus ocho trajes y conserva la identidad de la cabecera');
    ok(await P.evaluate(() => [...document.querySelectorAll('.tgrid img')].some(i => /installed\//.test(i.getAttribute('src')))), 'los trajes conservan sus propias imágenes de inventario, distintas del retrato del luchador');
    await P.click('#back'); await P.waitForSelector('#fq');
    ok(await P.inputValue('#fq') === 'link' && await P.locator('.ft[href="#/luchador/03"]').count() === 1, 'Atrás desde Link conserva la búsqueda y su tarjeta reconocible');
    ok(P.errs.length === 0, 'recorrido de identidad sin errores de JS ' + JSON.stringify(P.errs));
  } finally { await P.ctx.close(); }
  const original = await require('./ux').offlinePage(b);
  try {
    await officialImages(original);
    await original.goto(base + '#/luchador/77'); await original.waitForSelector('.tj');
    // Entrada controlada completa: un render verificado solo acredita c00, no las otras siete variantes.
    const reference = { fighter: 'Steve', costume: 'c00', verified: true, image_url: 'https://www.smashbros.com/assets_v2/img/fighter/steve/main.png', source_page: 'https://www.smashbros.com/en_US/fighter/77.html', source: 'Referencia oficial de prueba', scope: 'solo traje c00', http_check: 'fixture', visual_check: 'fixture' };
    await original.evaluate(ref => { byCode['77'].original_ref = ref; INV.fighters['77'] = { slots: {} }; }, reference);
    await original.click('.tj-a[href="#/luchador/77/1"]'); await original.waitForSelector('.cur');
    ok(await until(original, url => { const i = document.querySelector('.cur img'); return i && i.getAttribute('src') === url && i.naturalWidth > 0; }, reference.image_url), 'traje c00 Original consume la referencia verificada del propio luchador');
    await original.click('details.prov summary');
    ok(await original.locator(`details.prov a[href="${reference.source_page}"]`).count() === 1 && (await original.textContent('details.prov')).includes('solo traje c00'), 'procedencia de Original enlaza la fuente y muestra su alcance c00');
    await original.click('#back'); await original.waitForSelector('.tj');
    await original.click('.tj-a[href="#/luchador/77/2"]'); await original.waitForSelector('.cur');
    ok(await original.evaluate(() => curOf('77', 1).kind === 'original') && await original.locator('.cur img').count() === 0 && await original.locator('.cur [aria-label="Original del juego"]').count() === 1, 'traje c01 Original no reutiliza el render c00: mantiene marcador honesto');
    ok(await original.locator(`details.prov a[href="${reference.source_page}"]`).count() === 0, 'c01 no presenta como propia la procedencia exclusiva de c00');
    for (const change of [{ verified: false }, { costume: 'c01' }]) {
      await original.click('#back'); await original.waitForSelector('.tj');
      await original.evaluate(ref => { byCode['77'].original_ref = ref; }, { ...reference, ...change });
      await original.click('.tj-a[href="#/luchador/77/1"]'); await original.waitForSelector('.cur');
      ok(await original.locator('.cur img').count() === 0, `c00 rechaza referencia ${change.verified === false ? 'sin verificar' : 'de otro traje'}`);
    }
    ok(original.errs.length === 0, 'recorrido de referencias originales sin errores de JS ' + JSON.stringify(original.errs));
  } finally { await original.ctx.close(); }
};
