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
    PEND: [{ code: '01', slot: 2, to: '01:local' }],
    now,
    byCode,
  };
  assert.equal(SSBU.planVid('01', 2, ctx), '01:local');
  assert.equal(SSBU.planVid('01', 2, { PLAN: { '01_2': { vid: '01:remoto' } }, PEND: [], now, byCode }), '01:remoto');
  assert.equal(SSBU.planVid('01', 0, { ...ctx, PEND: [] }), null);
  const sent = { PLAN: { '01_2': { vid: '01:confirmado' } }, SENT: { '01_2': { to: '01:enviado', t: now - 1000 } }, PEND: [], now, byCode };
  assert.equal(SSBU.planVid('01', 2, sent), '01:confirmado');
});

test('planEntries ignora un traje vaciado y ordena por el catálogo', () => {
  const ctx = {
    PLAN: { '82_1': { vid: '82:b' }, '01_0': { vid: '01:a' } },
    SENT: {},
    PEND: [{ code: '82', slot: 1, to: null }],
    now: 1,
    byCode,
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
  const marked = SSBU.curOf('01', 1, { byCode, idx, INV: { fighters: { '01': { slots: { 1: { src: 'perfil', name: 'Kellytoy', replace: 'WuBoy' } } } } } });
  assert.equal(marked.kind, 'mod');
  assert.equal(marked.replace, 'WuBoy');
  assert.equal(SSBU.curOf('01', 2, ctx).kind, 'pending');
  assert.equal(SSBU.curOf('01', 3, ctx).kind, 'unknown');
  assert.match(SSBU.curOf('01', 3, ctx).verif, /emuMMC sin conexion/);
  assert.equal(SSBU.curOf('01', 4, ctx).kind, 'original');
  assert.equal(SSBU.curOf('01', 4, ctx).staged.name, 'En rama');
  assert.equal(SSBU.curOf('mii', 0, ctx).kind, 'na');
  assert.equal(SSBU.curOf('no', 0, ctx), null);
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
  const op = SSBU.setOp('01', 1, '01:z', null);
  const pend = SSBU.withOp([], op);
  const ctx = { PLAN: {}, SENT: {}, PEND: pend, now: 1, byCode };
  assert.equal(SSBU.planVid('01', 1, ctx), '01:z');
  const cleared = SSBU.withOp(pend, SSBU.clearOp('01', 1, '01:z'));
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

test('stageChoice nombra Usar, Reemplazar, Quitar o Ir, y no copia', () => {
  const base = { slot: 2, vid: null, saved: null, elsewhere: null, withdrawn: false, mii: false, incompatible: false };
  assert.equal(SSBU.stageChoice({ ...base, vid: '01:a' }).kind, 'use');
  assert.equal(SSBU.stageChoice({ ...base, vid: '01:a' }).label, 'Usar en Traje 3');
  assert.match(SSBU.stageChoice({ ...base, vid: '01:a' }).line, /no la instala/);
  assert.equal(SSBU.stageChoice({ ...base, vid: '01:b', saved: '01:a' }).label, 'Reemplazar en Traje 3');
  assert.equal(SSBU.stageChoice({ ...base, saved: '01:a' }).kind, 'clear');
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
