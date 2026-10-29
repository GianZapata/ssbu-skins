// Datos que llegan a la web: totales del catálogo ampliado, identificadores, campos conservados, retratos, inventario del perfil.
const fs = require('fs'), path = require('path'); const L = require('./lib'); const { ok, until, mk, tap, shot } = L;
module.exports = async (b, base) => {
  const cat = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'data/catalog.json'), 'utf8'));
  const P = await mk(b); await P.goto(base); await P.waitForSelector('.ft'); await until(P, () => dbState === 'ok', null);
  const t = await P.evaluate(() => { const a = F.flatMap(f => f.picks); const act = a.filter(p => !p.withdrawn); return { f: F.length, act: act.length, main: act.filter(p => !isAlt(p)).length, alt: act.filter(isAlt).length, wd: a.length - act.length, ids: new Set(a.map(p => p.vid)).size, all: a.length }; });
  ok(t.f === 89 && t.act === cat.counts.looks && t.main === cat.counts.main_proposals && t.alt === cat.counts.alternatives && t.wd === cat.withdrawn.length, `totales de la web: ${t.f} luchadores · ${t.act} activas (${t.main} principales + ${t.alt} alternativas) · ${t.wd} retiradas`);
  ok(cat.counts.looks === 1245 && cat.counts.unique_mods === 1224 && cat.counts.main_proposals === 696 && cat.counts.alternatives === 549 && cat.counts.withdrawn === 16, 'el catálogo publicado conserva 1245 apariencias, 1224 mods, 696 principales, 549 alternativas y 16 retiradas');
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
  const tiles = await P.evaluate(() => [...document.querySelectorAll('.ft')].map(a => { const c = decodeURIComponent(a.getAttribute('href').split('/').pop()); const i = a.querySelector('img'); return { c, src: i ? i.getAttribute('src') : null, ok: i ? i.complete && i.naturalWidth > 0 : null, mono: !!a.querySelector('.mono') }; }));
  const bad = tiles.filter(t => t.src && !/^assets\/fighters\/[\w]+\.webp$/.test(t.src));
  ok(tiles.length === 89 && bad.length === 0, 'todos los retratos del selector son oficiales (assets/fighters), ninguno es la imagen de un traje o de GameBanana');
  ok(tiles.filter(t => t.src).every(t => t.ok), 'los retratos oficiales cargan (archivos publicados)');
  ok(tiles.filter(t => t.mono).length === 0 && tiles.filter(t => t.src && t.src.startsWith('assets/fighters/')).length === 89, 'los 89 luchadores (incluyendo DLC 71–82) tienen su retrato oficial publicado');
  ok(tiles.find(t => t.c === '03').src === 'assets/fighters/03.webp', 'Link usa su propio retrato (regresión «Lightning como Link»)');
  const linkInv = await P.evaluate(() => Object.values((INV.fighters['03'] || { slots: {} }).slots).filter(s => s.img).length);
  await P.goto(base + '#/luchador/03'); await P.waitForSelector('.strip');
  const hdr = await P.evaluate(() => document.querySelector('.app-header__face img').getAttribute('src')); ok(hdr === 'assets/fighters/03.webp', `la cabecera de Link conserva su retrato aunque el inventario trae ${linkInv} retratos de trajes`);
  await shot(P, '08-selector'); await P.goto(base + '#/luchadores'); await P.waitForSelector('.ft'); await P.evaluate(() => scrollTo(0, 0)); await shot(P, '08-selector');
  // el traje «Original» nunca se ve vacío: render oficial de ese traje (assets/costumes/<código>-<n>.webp)
  for (const [code, re, what] of [['03', /^assets\/costumes\/03-1\.webp$/, 'el render oficial de su traje 1'], ['81', /^assets\/costumes\/81-1\.webp$/, 'el render oficial de su traje 1 (DLC)']]) {
    await P.goto(base + '#/luchador/' + code); await P.waitForSelector(`[data-view="fighter:${code}"] .cmp__img--cur img`); await P.waitForTimeout(300);
    const t1 = await P.evaluate(() => { const i = document.querySelector('.cmp__img--cur img'); return { src: i && i.getAttribute('src'), ok: i && i.complete && i.naturalWidth > 0, txt: (document.querySelector('.cmp__name') || {}).textContent || '' }; });
    ok(t1.src && re.test(t1.src) && t1.ok && t1.txt === 'Original', `la primera opción de ${code === '03' ? 'Link' : 'Kazuya'} muestra ${what} y la etiqueta «Original»`);
  }
  await P.goto(base + '#/luchador/81/1'); await P.waitForSelector('.cmp__img--cur img'); ok(await P.evaluate(() => { const i = document.querySelector('.cmp__img--cur img'); return !!i && i.complete && i.naturalWidth > 0; }), 'la pantalla del traje también muestra la imagen del original');
  // inventario del perfil gian-prs
  const inv = await P.evaluate(() => { const k = (c, n) => { const x = curOf(c, n); return { kind: x.kind, name: x.name, verif: x.verif, stg: !!x.staged, rep: x.replace || null }; }; return { sora4: k('82', 4), sora7: k('82', 7), samus5: k('04', 5), mario1: k('01', 1), mario2: k('01', 2), mario5: k('01', 5), pyra0: k('79', 0), myth0: k('80', 0), steve0: k('77', 0), steve1: k('77', 1), steve2: k('77', 2), steve3: k('77', 3), cap2: k('11', 2), ike0: k('32', 0), dk1: k('02', 1), meta: INV.meta.profile && INV.meta.profile.name, ver: INV.meta.version }; });
  ok(inv.meta === 'gian-prs', 'el inventario representa el perfil gian-prs');
  ok(inv.sora4.name === 'Ventus (Dusk)' && /13\.0\.5/.test(inv.sora4.verif), 'Sora c04 Ventus: nombre y prueba en consola del ModPack (13.0.5, sin conexión)');
  ok(inv.sora7.name.includes('Villa') && inv.ike0.name === 'Terra' && inv.dk1.name === 'Funky Kong', 'favoritos del perfil: Roxas, Terra y Funky Kong en sus trajes');
  ok(inv.pyra0.name === 'Aqua (Dusk)' && inv.myth0.name === 'Aqua (Dusk)', 'Aqua ocupa el traje 1 de Pyra y de Mythra');
  ok(inv.steve0.name === 'Red Steve' && inv.steve1.name === 'White Alex' && inv.steve2.name === 'Herobrine' && inv.steve3.kind === 'original', 'Steve: los trajes del PR 11 y del plan de slots; «Optionals» excluido, c03 queda original y nada de la base cuenta como instalado');
  ok(inv.mario1.kind === 'mod' && inv.mario1.name === 'Kellytoy Mario' && inv.cap2.name === 'Dark Falcon' && inv.cap2.rep === null && inv.cap2.kind === 'mod', 'skins de los PR con prioridad: Kellytoy en Mario traje 2 y Dark Falcon en Captain Falcon traje 3 (sin pendientes de reemplazo)');
  ok(inv.mario2.kind === 'mod' && inv.mario2.name === 'Wheelchair Mario', 'Mario traje 3: Wheelchair Mario del plan de slots');
  ok(inv.mario5.kind === 'original' && inv.samus5.kind === 'pending', 'originales y trajes por identificar se distinguen');
  // la tira muestra «Traje N»; el nombre de cada traje va en la etiqueta accesible del botón
  await P.goto(base + '#/luchador/04'); await P.waitForSelector('[data-view="fighter:04"] .strip .cell__btn');
  const tags = (await P.$$eval('[data-view="fighter:04"] .strip .cell__btn', bs => bs.map(b => b.getAttribute('aria-label') || ''))).join(' | ');
  ok(tags.includes('Traje 6: Nombre pendiente') && !/Apariencia sin identificar/.test(tags), 'la pantalla del luchador usa «Nombre pendiente», sin etiquetas duplicadas');
  await P.goto(base + '#/luchador/11/3'); await P.waitForSelector('.cmp'); ok(/Dark Falcon/.test(await P.textContent('.cmp')), 'Dark Falcon sigue instalado en su traje');
  // regresión Shadow Mewtwo
  const mw = await P.evaluate(() => { const f = F.find(f => /Mewtwo/.test(f.name)); const sm = f.picks.find(p => /Shadow Mewtwo/i.test(p.name)); return { code: f.code, vid: sm && sm.vid }; });
  await P.goto(base + '#/luchador/' + mw.code + '/8'); await P.waitForSelector('.cmp'); ok(!/libre/i.test(await P.textContent('main')), 'Mewtwo c07: no aparece «libre»');
  await P.goto(base + '#/apariencia/' + encodeURIComponent(mw.vid)); await P.waitForSelector('.sheet');
  ok(!/libre/i.test(await P.textContent('main')) && !/slot nativo libre/.test(await P.textContent('main')), 'la ficha no afirma disponibilidad');
  ok(!P.errs.length, 'sin errores de JS ' + JSON.stringify(P.errs)); await P.ctx.close();
};
