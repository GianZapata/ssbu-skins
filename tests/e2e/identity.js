// Datos que llegan a la web: totales del catálogo ampliado, identificadores, campos conservados, retratos, inventario del perfil y copy limpio.
const fs = require('fs'), path = require('path'); const L = require('./lib'); const { ok, until, mk, shot } = L;
module.exports = async (b, base) => {
  const cat = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'data/catalog.json'), 'utf8'));
  const verified = cat.entries.filter(e => e.audit_status === 'verified');
  const P = await mk(b);
  await P.goto(base + '#/luchadores');
  await P.waitForSelector('.costume-strip');
  await until(P, () => dbState === 'ok', null);

  const t = await P.evaluate(() => {
    const a = F.flatMap(f => f.picks);
    const act = a.filter(p => !p.withdrawn && p.audited);
    return {
      f: F.length,
      act: act.length,
      main: act.filter(p => !isAlt(p)).length,
      alt: act.filter(isAlt).length,
      wd: a.filter(p => p.withdrawn).length,
      ids: new Set(a.map(p => p.vid)).size,
      all: a.length,
    };
  });
  ok(t.f === 89 && t.act === cat.counts.looks && t.main === cat.counts.main_proposals && t.alt === cat.counts.alternatives && t.wd === cat.withdrawn.length, `totales de la web: ${t.f} luchadores · ${t.act} activas (${t.main} principales + ${t.alt} alternativas) · ${t.wd} retiradas`);
  ok(cat.counts.looks === 1245 && cat.counts.unique_mods === 1224 && cat.counts.main_proposals === 696 && cat.counts.alternatives === 549 && cat.counts.withdrawn === 16, 'el catálogo publicado conserva 1245 apariencias, 1224 mods, 696 principales, 549 alternativas y 16 retiradas');
  ok(t.act === verified.length && cat.counts.looks === t.act && t.all === cat.entries.length + cat.withdrawn.length && t.ids === t.all, 'los totales coinciden con data/catalog.json y todos los identificadores son únicos');
  const sample = cat.entries.every(e => e.look_id) && await P.evaluate(ids => ids.every(id => !!idx[id]), cat.entries.map(e => e.look_id));
  ok(sample, 'cada look_id del catálogo es el identificador de su apariencia en la web');

  // campos conservados en la web y en Firestore
  const keep = ['role', 'variant', 'audit_scope', 'downloads_scope', 'images_scope'];
  const mism = await P.evaluate(async keep => {
    const f = await fb();
    const s = await f.getDocs(f.collection(f.db, 'catalog'));
    let bad = 0, n = 0;
    s.forEach(d => d.data().picks.forEach(p => {
      n++;
      const e = idx[p.vid] && idx[p.vid].p;
      if (!e || keep.some(k => (p[k] ?? null) !== (e[k] ?? null))) bad++;
    }));
    return { bad, n };
  }, keep);
  ok(mism.bad === 0 && mism.n === t.all, `Firestore conserva ${keep.join(', ')} en las ${mism.n} apariencias`);
  const emb = verified.filter(e => e.role).length;
  const withScopes = await P.evaluate(() => all.filter(e => e.p.audited && e.p.audit_scope && e.p.downloads_scope && e.p.images_scope).length);
  ok(withScopes === emb, `la web trae audit_scope, downloads_scope e images_scope en las ${emb} apariencias`);

  // retratos en el selector global de luchador: identidad del luchador ≠ apariencia de sus trajes
  await P.locator('[data-fighter-pick]').click();
  await P.waitForSelector('[data-fighter-tile]');
  await P.evaluate(async () => {
    const scroller = document.querySelector('.sheet--pick .sheet__scroll');
    if (!scroller) return;
    for (let y = 0; y <= scroller.scrollHeight; y += 300) {
      scroller.scrollTop = y;
      await new Promise(r => setTimeout(r, 40));
    }
    scroller.scrollTop = 0;
  });
  await until(P, () => [...document.querySelectorAll('[data-fighter-tile] img')].every(i => i.complete && i.naturalWidth > 0), null, 8000);
  const tiles = await P.evaluate(() => [...document.querySelectorAll('[data-fighter-tile]')].map(btn => {
    const c = btn.getAttribute('data-fighter-tile');
    const i = btn.querySelector('img');
    return {
      c,
      src: i ? i.getAttribute('src') : null,
      ok: i ? i.complete && i.naturalWidth > 0 : false,
    };
  }));
  const bad = tiles.filter(t => !t.src || !/^assets\/fighters\/[\w]+\.webp$/.test(t.src) || !t.ok);
  ok(tiles.length === 86 && bad.length === 0, 'todos los 86 retratos del selector global son oficiales (assets/fighters) y cargan con naturalWidth > 0');
  const missing = await P.evaluate(async srcs => (await Promise.all(srcs.map(src => fetch(src).then(r => (r.ok ? '' : src), () => src)))).filter(Boolean), [...new Set(tiles.map(t => t.src).filter(Boolean))]);
  ok(missing.length === 0, 'los retratos oficiales cargan (archivos publicados)' + (missing.length ? ' · faltan ' + missing.join(', ') : ''));
  ok(tiles.find(t => t.c === '03').src === 'assets/fighters/03.webp', 'Link usa su propio retrato en el selector global (regresión «Lightning como Link»)');
  await shot(P, '08-selector');
  await P.keyboard.press('Escape');
  await until(P, () => !document.querySelector('[data-fighter-tile]'), null, 5000);

  const linkInv = await P.evaluate(() => Object.values((INV.fighters['03'] || { slots: {} }).slots).filter(s => s.img).length);
  await P.goto(base + '#/luchador/03');
  await P.waitForSelector('[data-view="fighter:03"] .costume-strip');
  const hdr = await P.evaluate(() => document.querySelector('.app-header__face img')?.getAttribute('src'));
  ok(hdr === 'assets/fighters/03.webp', `la cabecera de Link conserva su retrato aunque el inventario trae ${linkInv} retratos de trajes`);

  // el traje «Original» nunca se ve vacío: render oficial de ese traje (assets/costumes/<código>-<n>.webp)
  for (const [code, re, what] of [['05', /^assets\/costumes\/05-1\.webp$/, 'el render oficial de su traje 1'], ['75', /^assets\/costumes\/75-1\.webp$/, 'el render oficial de su traje 1 (DLC)']]) {
    await P.goto(base + '#/luchador/' + code + '/1');
    await P.waitForSelector(`[data-view="fighter:${code}"] .costume-cell[data-costume="0"] img`);
    await until(P, () => {
      const stripImg = document.querySelector('.costume-cell[data-costume="0"] img');
      const barImg = document.querySelector('.active-bar img');
      return !!(stripImg && stripImg.complete && stripImg.naturalWidth > 0 && barImg && barImg.complete && barImg.naturalWidth > 0);
    }, null, 6000);
    const t1 = await P.evaluate(() => {
      const stripImg = document.querySelector('.costume-cell[data-costume="0"] img');
      const barImg = document.querySelector('.active-bar img');
      return {
        stripSrc: stripImg && stripImg.getAttribute('src'),
        barSrc: barImg && barImg.getAttribute('src'),
        ok: !!(stripImg && stripImg.naturalWidth > 0 && barImg && barImg.naturalWidth > 0),
        badge: (document.querySelector('.costume-cell[data-costume="0"] .costume-cell__badge') || {}).textContent?.trim() || '',
        barTxt: (document.querySelector('.active-bar') || {}).textContent || '',
      };
    });
    ok(t1.stripSrc && re.test(t1.stripSrc) && t1.barSrc && re.test(t1.barSrc) && t1.ok && t1.badge === 'Original' && /Original/.test(t1.barTxt), `la primera opción de ${code === '05' ? 'Yoshi' : 'Byleth'} muestra ${what} y la etiqueta «Original»`);
  }

  // inventario del perfil gian-prs
  const inv = await P.evaluate(() => {
    const k = (c, n) => { const x = curOf(c, n); return { kind: x.kind, name: x.name, verif: x.verif, stg: !!x.staged, rep: x.replace || null }; };
    return {
      sora4: k('82', 4), sora5: k('82', 5), daisy1: k('13', 1), daisy3: k('13', 2),
      mario1: k('01', 1), mario2: k('01', 2), pyra0: k('79', 0), myth0: k('80', 0),
      steve0: k('77', 0), steve1: k('77', 1), steve2: k('77', 2), steve3: k('77', 3),
      cap2: k('11', 2), ike0: k('32', 0), dk1: k('02', 1),
      meta: INV.meta.profile && INV.meta.profile.name, ver: INV.meta.version,
    };
  });
  ok(inv.meta === 'gian-prs', 'el inventario representa el perfil gian-prs');
  ok(inv.sora4.name === 'Ventus (Dusk)' && /13\.0\.5/.test(inv.sora4.verif), 'Sora c04 Ventus: nombre y prueba en consola del ModPack (13.0.5, sin conexión)');
  ok(inv.sora5.name.includes('Roxas') && inv.ike0.name === 'Terra' && inv.dk1.name === 'Funky Kong', 'favoritos del perfil: Roxas, Terra y Funky Kong en sus trajes');
  ok(inv.pyra0.name === 'Aqua (Dusk)' && inv.myth0.name === 'Aqua (Dusk)', 'Aqua ocupa el traje 1 de Pyra y de Mythra');
  ok(inv.steve0.name === 'Steviroth' && inv.steve1.name === 'Villager' && inv.steve2.name === 'Stick Figures' && inv.steve3.name === 'ROBLOX Noob', 'Steve: los 8 colores vienen del perfil; «Optionals» excluido');
  ok(inv.mario1.kind === 'mod' && inv.mario1.name === 'Kellytoy Mario' && inv.cap2.name === 'Shaggy' && inv.cap2.rep === null && inv.cap2.kind === 'mod', 'skins de los PR con prioridad: Kellytoy en Mario traje 2 y Shaggy en Captain Falcon traje 3 (sin pendientes de reemplazo)');
  ok(inv.mario2.kind === 'mod' && inv.mario2.name === 'Wheelchair Mario', 'Mario traje 3: Wheelchair Mario del plan de slots');
  ok(inv.daisy1.kind === 'original' && inv.daisy3.kind === 'unnamed', 'originales y trajes por identificar se distinguen en el dominio');

  // Daisy y Captain Falcon en la pantalla única usan «Mod» y nombres reales sin copy técnico prohibido
  await P.goto(base + '#/luchador/13');
  await P.waitForSelector('[data-view="fighter:13"] .costume-cell');
  const tags = (await P.$$eval('[data-view="fighter:13"] .costume-cell', bs => bs.map(b => b.getAttribute('aria-label') || ''))).join(' | ');
  ok(tags.includes('Traje 3, Mod') && !/Sin nombre|Pack base|Apariencia sin identificar/.test(tags), 'la tira usa «Mod» sin exponer «Sin nombre» ni «Pack base»');
  await P.goto(base + '#/luchador/11/3');
  await P.waitForSelector('[data-view="fighter:11"] .active-bar');
  ok(/Shaggy/.test(await P.textContent('.active-bar')), 'Shaggy sigue instalado en su traje');

  // copy limpio en #/luchador/01 y con SkinSheet abierta
  const banned = [/\bPerfil\b/, /Pack base/, /Plan de Gian/, /Sin nombre/, /Traje \d+ de 8/, /en tu perfil/, /Plan actualizado el/, /Elige un traje para compararlo/];
  await P.goto(base + '#/luchador/01');
  await P.waitForSelector('[data-view="fighter:01"] [data-skin]');
  const bodyClosed = await P.evaluate(() => document.body.innerText);
  ok(banned.every(re => !re.test(bodyClosed)), 'copy limpio en #/luchador/01 cerrado');
  await P.locator('[data-skin]').first().click();
  await P.waitForSelector('.skin-sheet-body');
  const bodyOpen = await P.evaluate(() => document.body.innerText);
  ok(banned.every(re => !re.test(bodyOpen)), 'copy limpio con SkinSheet abierta');
  await P.keyboard.press('Escape');

  // regresión Shadow Mewtwo
  const mw = await P.evaluate(() => { const f = F.find(f => /Mewtwo/.test(f.name)); const sm = f.picks.find(p => /Shadow Mewtwo/i.test(p.name)); return { code: f.code, vid: sm && sm.vid }; });
  await P.goto(base + '#/luchador/' + mw.code + '/8');
  await P.waitForSelector(`[data-view="fighter:${mw.code}"] .active-bar`);
  ok(!/libre/i.test(await P.textContent('main')), 'Mewtwo c07: no aparece «libre»');
  await P.goto(base + '#/luchador/' + mw.code + '?skin=' + encodeURIComponent(mw.vid));
  await P.waitForSelector('.skin-sheet-body');
  ok(!/libre/i.test(await P.evaluate(() => document.body.innerText)) && !/slot nativo libre/.test(await P.evaluate(() => document.body.innerText)), 'la skin candidata no afirma disponibilidad');

  ok(!P.errs.length, 'sin errores de JS ' + JSON.stringify(P.errs));
  await P.ctx.close();
};
