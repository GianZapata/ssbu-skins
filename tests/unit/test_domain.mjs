import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../../src/shared/helpers/domain.ts', import.meta.url), 'utf8');
const sandbox = {};
sandbox.globalThis = sandbox;
vm.runInNewContext(src, sandbox);
const SSBU = sandbox.SSBU;

const mario = { code: '01', name: 'Mario', portrait: 'assets/fighters/01.webp', mii: false };
const sora = { code: '82', name: 'Sora', portrait: null, mii: false };
const mii = { code: 'mii', name: 'Luchador Mii', mii: true };
const byCode = { '01': mario, '82': sora, mii };

function pick(over) {
  return {
    vid: '01:a', name: 'Piel A', author: 'Ana', role: 'propuesta principal', audited: true,
    wifi_status: 'autor_explicito', withdrawn: false, mii: false, variant: null, ...over,
  };
}

test('planVid: lo pendiente gana al plan y una marca enviada no lo tapa', () => {
  const now = 10_000;
  const ctx = {
    PLAN: { '01_2': { vid: '01:remoto' } },
    PEND: [{ code: '01', slot: 2, to: '01:local', name: 'Gian' }],
    now,
    byCode,
    person: 'Gian',
  };
  assert.equal(SSBU.planVid('01', 2, ctx), '01:local');
  assert.equal(SSBU.planVid('01', 2, { PLAN: { '01_2': { vid: '01:remoto' } }, PEND: [], now, byCode }), '01:remoto');
  assert.equal(SSBU.planVid('01', 0, { ...ctx, PEND: [] }), null);
  const sent = { PLAN: { '01_2': { vid: '01:confirmado' } }, SENT: { '01_2': { to: '01:enviado', t: now - 1000 } }, PEND: [], now, byCode };
  assert.equal(SSBU.planVid('01', 2, sent), '01:confirmado');
});

test('planEntries ignora un traje vaciado y ordena por el catálogo', () => {
  const ctx = {
    PLAN: { '82_1_Gian': { vid: '82:b' }, '01_0_Gian': { vid: '01:a' } },
    SENT: {},
    PEND: [{ code: '82', slot: 1, to: null, name: 'Gian' }],
    now: 1,
    byCode,
    person: 'Gian',
  };
  assert.equal(SSBU.planEntries(ctx).map(e => e.code + ':' + e.n).join(','), '01:0');
});

test('catList separa declaración, condiciones, terceros, sin evidencia, incompatible y sin auditar', () => {
  const f = { code: '01', name: 'Mario' };
  const all = [
    { f, p: pick({ vid: '01:ex', wifi_status: 'autor_explicito' }) },
    { f, p: pick({ vid: '01:cond', wifi_status: 'autor_condicionado', role: 'alternativa' }) },
    { f, p: pick({ vid: '01:ter', wifi_status: 'tercero' }) },
    { f, p: pick({ vid: '01:sin', wifi_status: 'sin_evidencia' }) },
    { f, p: pick({ vid: '01:inc', wifi_status: 'incompatible' }) },
    { f, p: pick({ vid: '01:no', audited: false, wifi_status: null }) },
    { f, p: pick({ vid: '01:out', withdrawn: true, wifi_status: 'sin_evidencia' }) },
    { f, p: pick({ vid: '01:mii', mii: true, wifi_status: 'sin_evidencia' }) },
  ];
  const only = (st) => SSBU.catList(all, null, { ...SSBU.emptyCat(), ...st }).map(e => e.p.vid);
  assert.deepEqual(only({ autor_explicito: true }), ['01:ex']);
  assert.deepEqual(only({ autor_condicionado: true }), ['01:cond']);
  assert.deepEqual(only({ tercero: true }), ['01:ter']);
  assert.deepEqual(only({ sin_evidencia: true }), ['01:sin', '01:out', '01:mii']);
  assert.deepEqual(only({ incompatible: true }), ['01:inc']);
  assert.deepEqual(only({ unaudited: true }), ['01:no']);
  assert.ok(!only({ rec: true }).includes('01:cond'));
  assert.ok(!only({ avail: true }).includes('01:out'));
  assert.ok(!only({ avail: true }).includes('01:mii'));
  assert.deepEqual(only({ q: 'piel' }).length, all.length);
  assert.deepEqual(SSBU.catList(all, { code: '82' }, SSBU.emptyCat()), []);
});

test('curOf distingue original, mod, pendiente, desconocido, Mii y preparación', () => {
  const idx = { '01:mod': { p: { img: 'mod.webp' } } };
  const INV = {
    fighters: {
      '01': {
        slots: {
          1: { src: 'base', name: 'Gorra', img: 'g.webp', vid: '01:mod' },
          2: { src: 'base', img: 'solo.webp', skin: true },
          3: { src: 'perfil', test: 'emuMMC sin conexion' },
          4: { staged: { name: 'En rama', img: 'st.webp', branch: 'refs/heads/wip', name_src: 'archivo' } },
        },
      },
    },
  };
  const ctx = { byCode, INV, idx };
  assert.equal(SSBU.curOf('01', 0, ctx).kind, 'original');
  assert.equal(SSBU.curOf('01', 0, ctx).img, mario.portrait);
  assert.equal(SSBU.curOf('01', 0, ctx).art, true);
  assert.equal(SSBU.curOf('82', 0, ctx).img.startsWith('data:image/svg+xml'), true);
  assert.equal(SSBU.curOf('01', 1, ctx).kind, 'mod');
  assert.equal(SSBU.curOf('01', 1, ctx).name, 'Gorra');
  assert.equal(SSBU.curOf('01', 1, ctx).img, null);
  assert.notEqual(SSBU.curOf('01', 1, ctx).img, mario.portrait);
  const marked = SSBU.curOf('01', 1, { byCode, idx, INV: { fighters: { '01': { slots: { 1: { src: 'perfil', name: 'Kellytoy', replace: 'WuBoy' } } } } } });
  assert.equal(marked.kind, 'mod');
  assert.equal(marked.replace, 'WuBoy');
  assert.equal(marked.img, null);
  assert.equal(marked.layer, 'profile');
  assert.equal(SSBU.curOf('01', 1, ctx).layer, 'base');
  assert.equal(SSBU.curOf('01', 4, ctx).layer, 'original');
  assert.equal(SSBU.curOf('01', 2, ctx).kind, 'unnamed');
  assert.equal(SSBU.curOf('01', 2, ctx).img, null);
  assert.equal(SSBU.curOf('01', 3, ctx).kind, 'unknown');
  assert.match(SSBU.curOf('01', 3, ctx).verif, /emuMMC sin conexion/);
  assert.equal(SSBU.curOf('01', 4, ctx).kind, 'original');
  assert.equal(SSBU.curOf('01', 4, ctx).staged.name, 'En rama');
  assert.equal(SSBU.curOf('mii', 0, ctx).kind, 'na');
  assert.equal(SSBU.curOf('no', 0, ctx), null);
});

test('un mod sin retrato SHA no usa arte original ni s.img', () => {
  const sha = 'a'.repeat(64);
  const withSha = SSBU.curOf('01', 1, {
    byCode,
    INV: { fighters: { '01': { slots: { 1: { src: 'perfil', name: 'Kellytoy', portrait: sha, img: 'g.webp' } } } } },
  });
  const without = SSBU.curOf('01', 1, {
    byCode,
    INV: { fighters: { '01': { slots: { 1: { src: 'perfil', name: 'Kellytoy', img: 'g.webp' } } } } },
  });
  assert.equal(withSha.kind, 'mod');
  assert.equal(withSha.img, 'https://res.cloudinary.com/gian-dev/image/upload/f_auto,q_auto,w_512/ssbu/portraits/' + sha);
  assert.equal(without.img, null);
  assert.notEqual(without.img, mario.portrait);
  assert.notEqual(without.img, 'g.webp');
});

test('onlineOf no trata una declaración como una auditoría ni como incompatible', () => {
  assert.deepEqual(SSBU.onlineOf({ audited: true, wifi_status: 'autor_explicito' })[1], 'Online: lo declara el autor');
  assert.deepEqual(SSBU.onlineOf({ audited: true, wifi_status: 'autor_condicionado' })[1], 'Online: con condiciones');
  assert.deepEqual(SSBU.onlineOf({ audited: true, wifi_status: 'tercero' })[1], 'Online: según terceros');
  assert.deepEqual(SSBU.onlineOf({ audited: true, wifi_status: 'sin_evidencia' })[1], 'Online: sin datos');
  assert.deepEqual(SSBU.onlineOf({ audited: true, wifi_status: 'incompatible' })[1], 'Incompatible online');
  assert.deepEqual(SSBU.onlineOf({ audited: false, wifi_status: 'autor_explicito' })[1], 'Sin auditar');
});

test('destino, duplicado y reemplazo', () => {
  const entries = [{ code: '01', n: 0, vid: '01:a' }, { code: '01', n: 2, vid: '01:b' }];
  assert.equal(SSBU.assignBlock(entries, '01', 1, '01:a').kind, 'duplicate');
  assert.equal(SSBU.assignBlock(entries, '01', 1, '01:a').other, 0);
  assert.equal(SSBU.assignBlock(entries, '01', 2, '01:c').kind, 'replace');
  assert.equal(SSBU.assignBlock(entries, '01', 0, '01:a').kind, 'same');
  assert.equal(SSBU.assignBlock(entries, '01', 1, '01:z').kind, 'free');
  assert.equal(SSBU.assignBlock(entries, '01', 8, '01:z').kind, 'bad-slot');
  assert.equal(SSBU.validSlot(7), true);
  assert.equal(SSBU.setOp('01', 8, '01:z', null), null);
  assert.equal(SSBU.setOp('01', 1, '01:z', '01:z'), null);
  const op = SSBU.setOp('01', 1, '01:z', null, null, null, 'Gian');
  const pend = SSBU.withOp([], op);
  const ctx = { PLAN: {}, SENT: {}, PEND: pend, now: 1, byCode, person: 'Gian' };
  assert.equal(SSBU.planVid('01', 1, ctx), '01:z');
  const cleared = SSBU.withOp(pend, SSBU.clearOp('01', 1, '01:z', null, 'Gian'));
  assert.equal(SSBU.planVid('01', 1, { ...ctx, PEND: cleared }), null);
  assert.equal(SSBU.clearOp('01', 1, null), null);
});

test('catList busca solo el nombre de la skin', () => {
  const all = [{ f: mario, p: pick({ name: 'Dry Bones', author: 'Ana', variant: 'v3' }) }];
  const st = (q) => ({ ...SSBU.emptyCat(), q });
  assert.equal(SSBU.catList(all, null, st('Ana')).length, 0);
  assert.equal(SSBU.catList(all, null, st('v3')).length, 0);
  assert.equal(SSBU.catList(all, null, st('Dry')).length, 1);
});

test('stageChoice confirma con Guardar propuesta y no copia', () => {
  const base = { slot: 2, vid: null, saved: null, elsewhere: null, withdrawn: false, mii: false, incompatible: false };
  assert.equal(SSBU.stageChoice({ ...base, vid: '01:a' }).kind, 'use');
  assert.equal(SSBU.stageChoice({ ...base, vid: '01:a' }).label, 'Guardar propuesta');
  assert.equal(SSBU.stageChoice({ ...base, vid: '01:a' }).line, '');
  const replaced = SSBU.stageChoice({ ...base, vid: '01:b', saved: '01:a' });
  assert.equal(replaced.kind, 'replace');
  assert.equal(replaced.label, 'Guardar propuesta');
  assert.equal(SSBU.stageChoice({ ...base, saved: '01:a' }).kind, 'clear');
  assert.equal(SSBU.stageChoice({ ...base, saved: '01:a' }).label, 'Quitar propuesta');
  const gone = SSBU.stageChoice({ ...base, vid: '01:a', elsewhere: 0 });
  assert.equal(gone.kind, 'goto');
  assert.equal(gone.other, 0);
  assert.equal(gone.label, 'Ir a Traje 1');
  assert.equal(SSBU.stageChoice({ ...base, vid: '01:a', withdrawn: true }).kind, 'none');
  assert.equal(SSBU.stageChoice({ ...base, vid: '01:a', withdrawn: true }).line, 'Retirada');
  assert.match(SSBU.stageChoice({ ...base, vid: '01:a', incompatible: true }).line, /Incompatible online/);
});

test('cada código del catálogo tiene serie y Mario no mezcla a Zelda', () => {
  const cat = JSON.parse(fs.readFileSync(new URL('../../data/catalog.json', import.meta.url), 'utf8'));
  const codes = new Set();
  for (const row of [...cat.entries, ...(cat.withdrawn || [])]) if (row.roster_no) codes.add(row.roster_no);
  const missing = [...codes].filter(code => !SSBU.seriesOf(code));
  assert.deepEqual(missing, []);
  assert.equal(SSBU.seriesOf('01'), SSBU.seriesOf('09'));
  assert.notEqual(SSBU.seriesOf('01'), SSBU.seriesOf('17'));
  assert.equal(SSBU.seriesLabel(''), 'Sin franquicia');
});

test('migrateCat restaura recomendadas y el filtro antiguo de online', () => {
  const st = SSBU.migrateCat({ q: 'mario', f: '01', aud: true, on: true });
  assert.equal(st.q, 'mario');
  assert.equal(st.f, '01');
  assert.equal(st.rec, true);
  assert.equal(st.autor_explicito, true);
  assert.equal(st.autor_condicionado, true);
  assert.equal(st.tercero, false);
  assert.deepEqual(SSBU.migrateCat(null), SSBU.emptyCat());
});

test('originalArt: cada traje usa su render original; sin él, el retrato del luchador', () => {
  const f = { ...mario, costumes: ['assets/costumes/01-1.webp', null, 'assets/costumes/01-3.webp'] };
  assert.equal(SSBU.originalArt(f, 2), 'assets/costumes/01-3.webp');
  assert.equal(SSBU.originalArt(f, 1), 'assets/fighters/01.webp');
  assert.equal(SSBU.originalArt(mario, 4), 'assets/fighters/01.webp');
  const cur = SSBU.curOf('01', 2, { byCode: { '01': f }, INV: null, idx: {} });
  assert.equal(cur.kind, 'original'); assert.equal(cur.img, 'assets/costumes/01-3.webp');
});

test('installFace: sin decisión, sin WuBoy y sin perfil se ve el original', () => {
  const current = { kind: 'original', img: 'assets/costumes/01-6.webp', src: null, name: 'Original' }
  const face = SSBU.installFace(true, null, current)
  assert.equal(face.kind, 'original')
  assert.equal(face.img, 'assets/costumes/01-6.webp')
  assert.equal(face.install, null)
})

test('installFace: WuBoy no se sustituye por el original', () => {
  const current = { kind: 'mod', img: 'installed/wuboy.webp', src: 'base', name: 'WuBoy' }
  const face = SSBU.installFace(true, { estado: 'sin decidir' }, current)
  assert.equal(face.kind, 'base')
  assert.equal(face.img, 'installed/wuboy.webp')
})

test('installFace: sin espejo no se usa la propuesta como orden', () => {
  const face = SSBU.installFace(false, null, { kind: 'original', img: 'assets/costumes/01-1.webp', name: 'Original' })
  assert.equal(face.kind, 'unsynced')
  assert.equal(face.install, null)
})

test('installFace: un mod aprobado es la orden', () => {
  const slot = { estado: 'aprobado', state: 'mod', name: 'Pikadorf', mod_id: 406732, vid: '23:406732' }
  const face = SSBU.installFace(true, slot, { kind: 'mod', img: 'installed/hoy.webp', src: 'base', name: 'WuBoy' })
  assert.equal(face.kind, 'install')
  assert.equal(face.install.name, 'Pikadorf')
  assert.equal(face.install.vid, '23:406732')
})

test('variantes de un mismo mod: se pueden poner en trajes distintos, no repetir la misma', () => {
  const entries = [{ code: '01', n: 0, vid: '01:a', variant: '01:a:aaaaaaaa:c00' }];
  assert.equal(SSBU.assignBlock(entries, '01', 1, '01:a', '01:a:aaaaaaaa:c03').kind, 'free');
  assert.equal(SSBU.assignBlock(entries, '01', 1, '01:a', '01:a:aaaaaaaa:c00').kind, 'duplicate');
  assert.equal(SSBU.assignBlock(entries, '01', 0, '01:a', '01:a:aaaaaaaa:c00').kind, 'same');
  assert.equal(SSBU.assignBlock(entries, '01', 0, '01:a', '01:a:aaaaaaaa:c03').kind, 'replace');
  assert.equal(SSBU.setOp('01', 0, '01:a', '01:a', '01:a:aaaaaaaa:c00', '01:a:aaaaaaaa:c00'), null);
  const op = SSBU.setOp('01', 0, '01:a', '01:a', '01:a:aaaaaaaa:c03', '01:a:aaaaaaaa:c00');
  assert.equal(op.variant, '01:a:aaaaaaaa:c03');
  assert.equal(op.expVariant, '01:a:aaaaaaaa:c00');
  const cl = SSBU.clearOp('01', 0, '01:a', '01:a:aaaaaaaa:c03');
  assert.equal(cl.expVariant, '01:a:aaaaaaaa:c03');
  assert.equal('variant' in SSBU.setOp('01', 1, '01:b', null), false);
  const bare = SSBU.setOp('01', 1, '01:b', null);
  assert.equal('expVariant' in bare, true);
  assert.equal(bare.expVariant, null);
  const bareClear = SSBU.clearOp('01', 1, '01:b');
  assert.equal('expVariant' in bareClear, true);
  assert.equal(bareClear.expVariant, null);
  const withVariant = [{ code: '01', n: 0, vid: '01:a' }];
  assert.equal(SSBU.assignBlock(withVariant, '01', 1, '01:a', '01:a:aaaaaaaa:c03').kind, 'duplicate');
  assert.equal(SSBU.assignBlock(withVariant, '01', 1, '01:a', '01:a:aaaaaaaa:c03').other, 0);
});

test('sameFamily y compatibleSlots respetan familias reales y habilitan los 8 cuando no hay datos', () => {
  const families = JSON.parse(fs.readFileSync(new URL('../../data/families.json', import.meta.url), 'utf8'));
  sandbox.META = { families };

  assert.equal(SSBU.sameFamily('61', 0, 2), true);
  assert.equal(SSBU.sameFamily('61', 0, 1), false);
  assert.equal(SSBU.sameFamily('61', -1, 0), false);
  assert.equal(SSBU.sameFamily('58', 0, 1), false);
  assert.equal(SSBU.sameFamily('11', 0, 7), true);

  assert.deepEqual(Array.from(SSBU.compatibleSlots('61', [1])), [1, 3, 5, 7]);
  assert.deepEqual(Array.from(SSBU.compatibleSlots('61', [0, 1])), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(Array.from(SSBU.compatibleSlots('78', [6])), [6, 7]);
  assert.deepEqual(Array.from(SSBU.compatibleSlots('58', [3])), [3]);
  assert.deepEqual(Array.from(SSBU.compatibleSlots('82', [1])), [1, 5]);
  assert.deepEqual(Array.from(SSBU.compatibleSlots('61', [])), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(Array.from(SSBU.compatibleSlots('61', null)), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('sourceSlotsOf prioriza variant sobre DriveAlt (1..8) y Skin.native (0..7)', () => {
  const families = JSON.parse(fs.readFileSync(new URL('../../data/families.json', import.meta.url), 'utf8'));
  sandbox.META = { families };

  const fromVariant = SSBU.sourceSlotsOf({
    variant: '61:123456:aaeedf35:c03',
    alt: { any: true, slots: [1, 2, 3, 4, 5, 6, 7, 8] },
    skin: { native: [0, 2, 4, 6] },
  });
  assert.deepEqual(Array.from(fromVariant), [3]);
  assert.deepEqual(Array.from(SSBU.compatibleSlots('61', fromVariant)), [1, 3, 5, 7]);

  const fromDriveSlots = SSBU.sourceSlotsOf({
    variant: null,
    alt: { any: false, slots: [2, 4] },
    skin: { native: [] },
  });
  assert.deepEqual(Array.from(fromDriveSlots), [1, 3]);
  assert.deepEqual(Array.from(SSBU.compatibleSlots('61', fromDriveSlots)), [1, 3, 5, 7]);

  const fromDriveAny = SSBU.sourceSlotsOf({
    alt: { any: true, slots: [1] },
  });
  assert.deepEqual(Array.from(fromDriveAny), [0, 1, 2, 3, 4, 5, 6, 7]);

  const fromNative = SSBU.sourceSlotsOf({
    skin: { native: [6] },
  });
  assert.deepEqual(Array.from(SSBU.compatibleSlots('49', fromNative)), [6, 7]);

  assert.deepEqual(Array.from(SSBU.sourceSlotsOf({ skin: { native: [] } })), []);
  assert.deepEqual(Array.from(SSBU.compatibleSlots('58', SSBU.sourceSlotsOf({ skin: { native: [] } }))), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('familias: código desconocido, families explícito y respaldos sin bloqueo', () => {
  sandbox.META = { families: {} };

  assert.equal(SSBU.sameFamily('99', 0, 1), true);

  const explicit = { 99: [[0, 1], [2, 3]] };
  assert.equal(SSBU.sameFamily('99', 0, 1, explicit), true);
  assert.equal(SSBU.sameFamily('99', 0, 2, explicit), false);
  assert.deepEqual(Array.from(SSBU.compatibleSlots('99', [2], explicit)), [2, 3]);

  assert.deepEqual(Array.from(SSBU.compatibleSlots('99', [5], explicit)), [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('sourceSlotsOf ignora variant :c08 y alt.slots inválidos y respeta alt.any sobre native', () => {
  assert.deepEqual(Array.from(SSBU.sourceSlotsOf({ variant: '61:1:aa:c08', skin: { native: [2] } })), [2]);
  assert.deepEqual(Array.from(SSBU.sourceSlotsOf({ alt: { slots: [0] }, skin: { native: [4] } })), [4]);
  assert.deepEqual(Array.from(SSBU.sourceSlotsOf({ alt: { slots: [0] } })), []);
  assert.deepEqual(Array.from(SSBU.sourceSlotsOf({ alt: { any: true }, skin: { native: [4] } })), [0, 1, 2, 3, 4, 5, 6, 7]);
});

const plain = (value) => JSON.parse(JSON.stringify(value));

test('docKey y parseDocKey: persona válida, documento antiguo y nombre fuera de la lista', () => {
  assert.deepEqual([...SSBU.PEOPLE], ['Gian', 'Alan', 'Ches', 'Samu']);
  assert.equal(SSBU.docKey('01', 2, 'Gian'), '01_2_Gian');
  assert.equal(SSBU.docKey('01', 2, 'Otro'), '01_2');
  assert.equal(SSBU.docKey('01', 2), '01_2');
  assert.deepEqual({ ...SSBU.parseDocKey('01_2_Gian') }, { code: '01', slot: 2, name: 'Gian' });
  assert.deepEqual({ ...SSBU.parseDocKey('01_2') }, { code: '01', slot: 2, name: null });
  assert.equal(SSBU.parseDocKey('01_2_Otro'), null);
  assert.equal(SSBU.parseDocKey('01_9_Gian'), null);
  assert.equal(SSBU.parseDocKey('01_x'), null);
  assert.equal(SSBU.parseDocKey(''), null);
});

test('proposalsAt: la propuesta propia no se confunde con la de otro ni con la antigua', () => {
  const PLAN = { '01_0_Alan': { vid: '01:100', at: 20 }, '01_0': { vid: '01:200', at: 10 } };
  const ctx = { PLAN, PEND: [], byCode, person: 'Gian' };
  assert.equal(SSBU.ownVid('01', 0, ctx), null);
  assert.equal(SSBU.planVid('01', 0, ctx), '01:100');
  const rows = SSBU.proposalsAt('01', 0, ctx);
  assert.deepEqual(plain(rows.map((r) => r.name)), ['Alan', null]);
  assert.deepEqual(plain(rows.map((r) => r.vid)), ['01:100', '01:200']);
  assert.equal(rows[0].key, '01_0_Alan');
  assert.equal(rows[1].key, '01_0');
  const withMine = { ...ctx, PLAN: { ...PLAN, '01_0_Gian': { vid: '01:300', variant: '01:300:aaaaaaaa:c01', at: 5 } } };
  assert.equal(SSBU.ownVid('01', 0, withMine), '01:300');
  assert.equal(SSBU.ownVariant('01', 0, withMine), '01:300:aaaaaaaa:c01');
  assert.equal(SSBU.planVid('01', 0, withMine), '01:300');
  assert.equal(SSBU.proposalsAt('01', 0, withMine)[0].name, 'Gian');
  assert.equal(SSBU.ownVid('01', 0, { ...withMine, person: null }), null);
});

test('proposalsAt: lo pendiente solo toca la propuesta de su persona', () => {
  const PLAN = { '01_0_Alan': { vid: '01:100', at: 20 }, '01_0_Gian': { vid: '01:300', at: 5 } };
  const pend = [{ code: '01', slot: 0, to: null, name: 'Gian', kind: 'clear' }];
  const ctx = { PLAN, PEND: pend, byCode, person: 'Gian' };
  assert.equal(SSBU.ownVid('01', 0, ctx), null);
  assert.equal(SSBU.planVid('01', 0, ctx), '01:100');
  const set = [{ code: '01', slot: 0, to: '01:400', name: 'Alan', kind: 'set' }];
  const rows = SSBU.proposalsAt('01', 0, { PLAN, PEND: set, byCode, person: 'Gian' });
  assert.equal(rows.find((r) => r.name === 'Alan').vid, '01:400');
  assert.equal(rows.find((r) => r.name === 'Alan').unsent, true);
  assert.equal(rows.find((r) => r.name === 'Gian').vid, '01:300');
  assert.deepEqual(plain(SSBU.proposalsAt('01', 0, { PLAN, PEND: [{ code: '01', slot: 0, to: '01:z', kind: 'set' }], byCode }).map((r) => r.vid).sort()), ['01:100', '01:300']);
});

test('assignBlock sobre ownEntries: solo bloquea lo que la misma persona ya puso en otro traje', () => {
  const ctx = {
    PLAN: { '01_0_Alan': { vid: '01:a' }, '01_0_Gian': { vid: '01:g' } },
    PEND: [],
    byCode,
    person: 'Gian',
  };
  assert.equal(SSBU.planEntries(ctx).length, 2);
  const own = SSBU.ownEntries(ctx);
  assert.deepEqual(plain(own.map((r) => r.vid)), ['01:g']);
  assert.equal(SSBU.assignBlock(own, '01', 1, '01:a').kind, 'free');
  const dup = SSBU.assignBlock(own, '01', 1, '01:g');
  assert.equal(dup.kind, 'duplicate');
  assert.equal(dup.other, 0);
  assert.deepEqual(plain(SSBU.ownEntries({ ...ctx, person: null })), []);
});

test('planEntries: devuelve una fila por persona y traje, ordenadas por luchador, traje y persona', () => {
  const ctx = {
    PLAN: { '01_1_Alan': { vid: '01:a', at: 9 }, '01_1_Gian': { vid: '01:g', at: 1 }, '01_0': { vid: '01:old', at: 1 }, '82_0_Samu': { vid: '82:s', at: 1 } },
    PEND: [],
    byCode,
    person: 'Gian',
  };
  assert.deepEqual(plain(SSBU.planEntries(ctx).map((r) => r.key)), ['82_0_Samu', '01_0', '01_1_Gian', '01_1_Alan']);
});

test('setOp y clearOp llevan la persona solo si es válida', () => {
  assert.equal(SSBU.setOp('01', 1, '01:z', null, null, null, 'Alan').name, 'Alan');
  assert.equal('name' in SSBU.setOp('01', 1, '01:z', null, null, null, 'Otro'), false);
  assert.equal(SSBU.clearOp('01', 1, '01:z', null, 'Ches').name, 'Ches');
  assert.equal('name' in SSBU.clearOp('01', 1, '01:z'), false);
});
