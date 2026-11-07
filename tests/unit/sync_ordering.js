// Ordering regressions for the real application flush and changes listener.
// No Firebase, network, timers, DOM, emulator state or product source is changed.
// The transport controls delivery order only. Expected visible values are literals.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(process.env.SSBU_UI_SOURCE || path.resolve(__dirname, '../../src/features/plan/services/sync.ts'), 'utf8');
function between(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `cannot extract application section ${start}`);
  return source.slice(a, b);
}
const flushSource = between('async function flush(){', '// otra persona cambió');
const keyHelpersSource = between('const PEOPLE =', 'let activePerson');
const planVidSource = between('function proposalsAt(', '\nfunction planEntries(');
const timestampSource = between('const ts=', '\nasync function startDb(');
const reconciliationSource = source.includes('function confirmPlan(') ? between('const confirmedPlan=', 'let PEND=') : '';
const listenerMarker = "sub(f.collection(f.db,'changes'),";
const listenerSource = between(listenerMarker, '\n  sub(f.query').slice(listenerMarker.length).trim().replace(/\);$/, '');

const key = '82_0_Gian';
const timestamp = milliseconds => ({ toMillis: () => milliseconds });
const stored = (vid, at = 1, name = 'Gian') => ({ code: '82', slot: 0, vid, name, by: 'fixture-user', at: timestamp(at) });
const document = (id, data) => ({ id, exists: () => !!data, data: () => data });
function snapshot(entries, changes) {
  return {
    forEach: callback => Object.entries(entries).forEach(([id, data]) => callback(document(id, data))),
    docChanges: () => changes.map(({ id = key, type = 'modified', data }) => ({ type, doc: document(id, data) })),
    metadata: { fromCache: false, hasPendingWrites: false },
  };
}

function harness({ to = 'B', current = 'A', readAt = 1, commitAt = 2, afterCommit = () => {} } = {}) {
  let resolvedRead = current ? stored(current, readAt) : null;
  const context = {
    PLAN: current ? { [key]: { vid: current, at: readAt, by: 'fixture-user' } } : {},
    PEND: [{ code: '82', slot: 0, to, exp: current, name: 'Gian', kind: to === null ? 'clear' : 'set' }],
    planVersions: { [key]: 1 },
    FBCFG: { projectId: 'unit-test-only' }, navigator: { onLine: true },
    flushing: false, planLoaded: true, idx: { A: {}, B: {}, C: {} },
    keyOf: (code, slot) => `${code}_${slot}`, activePerson: 'Gian', byCode: { '01': {}, '82': {} },
    LS: () => {}, savePend: () => {}, render: () => {}, paintSync: () => {}, good: () => {},
    noteSaved: () => {}, toast: () => {}, stable: value => JSON.stringify(value),
    conflict: () => {}, classify: () => 'other',
    fail: (where, error) => { throw new Error(`${where}: ${error.stack || error}`); },
  };
  const api = {
    db: {}, auth: { currentUser: { uid: 'fixture-user' } },
    collection: (db, name) => ({ collection: name }),
    doc: (db, collection, id) => id ? { collection, id } : { collection: db.collection, id: 'fixture-history' },
    serverTimestamp: () => timestamp(commitAt),
    runTransaction: async (db, callback) => {
      const read = resolvedRead;
      const result = await callback({
        get: async () => document(key, read),
        set: () => {}, delete: () => {},
      });
      // The commit has completed, but its promise has not resolved.
      await afterCommit(context);
      return result;
    },
  };
  context.fb = async () => api;
  vm.createContext(context);
  vm.runInContext(`${keyHelpersSource}\n${timestampSource}\n${reconciliationSource}\n${planVidSource}\n${flushSource}\nthis.deliver = (${listenerSource});`, context);
  return {
    state: context,
    flush: () => context.flush(),
    visible: () => context.planVid('82', 0),
    deliver: (entries, changes) => context.deliver(snapshot(entries, changes)),
    resolveReadFrom: data => { resolvedRead = data; },
  };
}
function acknowledged(harness, expected) {
  assert.equal(harness.state.PEND.length, 0, 'transaction was acknowledged and removed from the queue');
  assert.equal(harness.state.flushing, false, 'transaction loop finished');
  assert.equal(harness.visible(), expected, 'visible plan must agree with the confirmed ordering');
}

test('set remains proposed when its listener is delayed past acknowledgment', async () => {
  const h = harness(); await h.flush(); acknowledged(h, 'B');
  h.deliver({ [key]: stored('B', 2) }, [{ data: stored('B', 2) }]);
  acknowledged(h, 'B');
});

test('undo remains cleared when its listener is delayed past acknowledgment', async () => {
  const h = harness({ to: null }); await h.flush(); acknowledged(h, null);
  h.deliver({}, [{ type: 'removed', data: stored('A', 1) }]);
  acknowledged(h, null);
});

test('an older snapshot delivered during a successful set cannot replace the acknowledged proposal', async () => {
  const h = harness({ afterCommit: context => context.deliver(snapshot(
    { [key]: stored('A', 1) }, [{ data: stored('A', 1) }],
  )) });
  await h.flush(); acknowledged(h, 'B');
});

test('an older snapshot delivered during undo cannot resurrect the acknowledged removal', async () => {
  const h = harness({ to: null, afterCommit: context => context.deliver(snapshot(
    { [key]: stored('A', 1) }, [{ data: stored('A', 1) }],
  )) });
  await h.flush(); acknowledged(h, null);
});

test('a late unrelated snapshot cannot restore an older value after a set was acknowledged', async () => {
  const h = harness(); await h.flush(); acknowledged(h, 'B');
  h.deliver({ [key]: stored('A', 1), '01_1_Alan': stored('X', 2, 'Alan') }, [{ id: '01_1_Alan', data: stored('X', 2, 'Alan') }]);
  acknowledged(h, 'B');
  assert.equal(h.state.PLAN['01_1_Alan'].vid, 'X', 'the unrelated remote update remains visible');
});

test('a late unrelated snapshot cannot resurrect a proposal after undo was acknowledged', async () => {
  const h = harness({ to: null }); await h.flush(); acknowledged(h, null);
  h.deliver({ [key]: stored('A', 1), '01_1_Alan': stored('X', 2, 'Alan') }, [{ id: '01_1_Alan', data: stored('X', 2, 'Alan') }]);
  acknowledged(h, null);
});

test('a remote edit committed after our set and delivered before acknowledgment wins', async () => {
  const h = harness({ afterCommit: context => context.deliver(snapshot(
    { [key]: stored('C', 3) }, [{ data: stored('C', 3) }],
  )) });
  await h.flush(); acknowledged(h, 'C');
});

test('a remote edit committed after our undo and delivered before acknowledgment wins', async () => {
  const h = harness({ to: null, afterCommit: context => context.deliver(snapshot(
    { [key]: stored('C', 3) }, [{ data: stored('C', 3) }],
  )) });
  await h.flush(); acknowledged(h, 'C');
});

test('a newer remote edit still wins after the own-commit snapshot clears the acknowledgment overlay', async () => {
  const h = harness(); await h.flush(); acknowledged(h, 'B');
  h.deliver({ [key]: stored('B', 2) }, [{ data: stored('B', 2) }]);
  h.deliver({ [key]: stored('C', 3) }, [{ data: stored('C', 3) }]);
  acknowledged(h, 'C');
});

test('a historical removal cannot hide a new set after undo has already reached the listener', async () => {
  const h = harness({ to: null }); await h.flush(); acknowledged(h, null);
  h.deliver({}, [{ type: 'removed', data: stored('A', 1) }]);
  h.resolveReadFrom(null);
  h.state.PEND.push({ code: '82', slot: 0, to: 'B', exp: null, name: 'Gian', kind: 'set' });
  await h.flush(); acknowledged(h, 'B');
});

test('an old snapshot with the desired ID cannot clear protection against a later stale snapshot', async () => {
  const h = harness({ readAt: 2, commitAt: 3 }); await h.flush(); acknowledged(h, 'B');
  // The canonical listener is still catching up with B(old) -> A(read) -> B(commit).
  h.deliver({ [key]: stored('B', 1) }, [{ data: stored('B', 1) }]);
  acknowledged(h, 'B');
  h.deliver({ [key]: stored('A', 2) }, [{ data: stored('A', 2) }]);
  acknowledged(h, 'B');
  h.deliver({ [key]: stored('B', 3) }, [{ data: stored('B', 3) }]);
  acknowledged(h, 'B');
});

test('a newer remote deletion delivered before our acknowledgment remains deleted', async () => {
  const h = harness({ afterCommit: context => context.deliver(snapshot(
    {}, [{ type: 'removed', data: stored('B', 2) }],
  )) });
  await h.flush(); acknowledged(h, null);
});

test('replacing one variant with another of the same mod preserves the chosen variant and detects remote variant conflicts', async () => {
  const h = harness({ current: 'A', readAt: 1, commitAt: 2 });
  h.resolveReadFrom({ code: '82', slot: 0, vid: 'A', variant: 'A:11111111:c00', by: 'fixture-user', at: timestamp(1) });
  h.state.PLAN[key] = { vid: 'A', variant: 'A:11111111:c00', at: 1, by: 'fixture-user' };
  h.state.PEND = [{ code: '82', slot: 0, name: 'Gian', to: 'A', exp: 'A', expVariant: 'A:11111111:c00', variant: 'A:11111111:c03', kind: 'set' }];
  await h.flush();
  acknowledged(h, 'A');
  assert.equal(h.state.planVariant('82', 0), 'A:11111111:c03');

  let conflicted = false;
  h.state.conflict = () => { conflicted = true; };
  h.resolveReadFrom({ code: '82', slot: 0, vid: 'A', variant: 'A:11111111:c05', by: 'other', at: timestamp(3) });
  h.state.PEND.push({ code: '82', slot: 0, name: 'Gian', to: 'A', exp: 'A', expVariant: 'A:11111111:c03', variant: 'A:11111111:c07', kind: 'set' });
  await h.flush();
  assert.equal(conflicted, true);
  assert.equal(h.state.planVariant('82', 0), 'A:11111111:c05');
});

function variantHarness({ remote, op }) {
  const h = harness({ current: 'A', readAt: 1, commitAt: 2 });
  let conflicted = false;
  h.state.conflict = () => { conflicted = true; };
  h.resolveReadFrom(remote && { code: '82', slot: 0, name: 'Gian', by: 'other', at: timestamp(1), ...remote });
  h.state.PEND = [{ code: '82', slot: 0, name: 'Gian', ...op }];
  return { h, conflicted: () => conflicted };
}

test('a clear carrying expVariant conflicts when the remote variant changed', async () => {
  const { h, conflicted } = variantHarness({
    remote: { vid: 'A', variant: 'A:11111111:c05' },
    op: { to: null, exp: 'A', expVariant: 'A:11111111:c00', kind: 'clear' },
  });
  await h.flush();
  assert.equal(conflicted(), true);
  assert.equal(h.state.planVariant('82', 0), 'A:11111111:c05');
});

test('an op that saw no variant conflicts when the remote now has one', async () => {
  const { h, conflicted } = variantHarness({
    remote: { vid: 'A', variant: 'A:11111111:c05' },
    op: { to: 'B', exp: 'A', expVariant: null, kind: 'set' },
  });
  await h.flush();
  assert.equal(conflicted(), true);
  assert.equal(h.state.planVariant('82', 0), 'A:11111111:c05');
});

test('a legacy op without the expVariant key still flushes against a remote with a variant', async () => {
  const { h, conflicted } = variantHarness({
    remote: { vid: 'A', variant: 'A:11111111:c05' },
    op: { to: 'B', exp: 'A', kind: 'set' },
  });
  await h.flush();
  assert.equal(conflicted(), false);
  acknowledged(h, 'B');
});

test('an op equal to the remote vid and variant is a noop', async () => {
  const writes = [];
  const { h, conflicted } = variantHarness({
    remote: { vid: 'A', variant: 'A:11111111:c03' },
    op: { to: 'A', exp: 'A', expVariant: 'A:11111111:c00', variant: 'A:11111111:c03', kind: 'set' },
  });
  const original = h.state.fb;
  h.state.fb = async () => {
    const api = await original();
    const run = api.runTransaction;
    api.runTransaction = (db, callback) => run(db, tx => callback({ ...tx, set: (...args) => writes.push(args), delete: (...args) => writes.push(args) }));
    return api;
  };
  await h.flush();
  assert.equal(conflicted(), false);
  assert.equal(writes.length, 0);
  acknowledged(h, 'A');
});

const other = '82_0_Alan';
const legacy = '82_0';
const plain = value => JSON.parse(JSON.stringify(value));

test('an edit or snapshot of another person never overrides or conflicts with my proposal', async () => {
  const h = harness(); await h.flush(); acknowledged(h, 'B');
  h.deliver({ [key]: stored('B', 2), [other]: stored('C', 3, 'Alan') }, [{ id: other, data: stored('C', 3, 'Alan') }]);
  assert.equal(h.state.PLAN[key].vid, 'B', 'my proposal remains');
  assert.equal(h.state.PLAN[other].vid, 'C', 'the other proposal lives beside mine');
  assert.equal(h.visible(), 'B', 'mine is shown first');
  assert.deepEqual(plain(h.state.proposalsAt('82', 0).map(row => row.name)), ['Gian', 'Alan']);
  h.deliver({ [key]: stored('B', 2) }, [{ id: other, type: 'removed', data: stored('C', 3, 'Alan') }]);
  assert.equal(h.state.PLAN[other], undefined);
  assert.equal(h.visible(), 'B');
});

test('a transaction only reads and writes the document of the operation person', async () => {
  const seen = [];
  const h = harness({ to: 'B', current: null });
  const original = h.state.fb;
  h.state.fb = async () => {
    const api = await original();
    const run = api.runTransaction;
    api.runTransaction = (db, callback) => run(db, tx => callback({ ...tx, set: (ref, data) => seen.push([ref.id, data.name]) }));
    return api;
  };
  h.state.PEND = [{ code: '82', slot: 0, to: 'B', exp: null, name: 'Alan', kind: 'set' }];
  h.resolveReadFrom(null);
  await h.flush();
  assert.equal(h.state.PEND.length, 0);
  assert.deepEqual(plain(seen[0]), ['82_0_Alan', 'Alan']);
  assert.equal(seen[1][1], 'Alan', 'the history row carries the person too');
  assert.equal(h.state.PLAN[other].vid, 'B');
  assert.equal(h.state.PLAN[key], undefined, 'the doc of the active person is untouched');
});

test('an old document without name coexists as read-only legacy beside named proposals', () => {
  const h = harness({ current: null });
  h.deliver({ [legacy]: { vid: 'L', variant: null, by: 'old', at: timestamp(1) }, [key]: stored('B', 2) }, [{ id: legacy, data: { vid: 'L', at: timestamp(1) } }]);
  assert.equal(h.state.PLAN[legacy].vid, 'L');
  assert.equal(h.state.PLAN[legacy].name, null);
  assert.deepEqual(plain(h.state.proposalsAt('82', 0).map(row => row.name)), ['Gian', null]);
  assert.equal(h.state.ownVid('82', 0), 'B');
  h.deliver({ [legacy]: { vid: 'L', at: timestamp(1) }, '82_0_Otro': stored('X', 1, 'Otro') }, []);
  assert.equal(h.state.PLAN['82_0_Otro'], undefined, 'a name outside the closed list is ignored');
});

test('queued operations saved before the person split are dropped, named ones are kept', () => {
  const context = { LS: () => null };
  vm.createContext(context);
  vm.runInContext(`${keyHelpersSource}\nthis.migrate = namedOps;`, context);
  const kept = context.migrate([
    { code: '82', slot: 0, to: 'A', exp: null, kind: 'set' },
    { code: '82', slot: 1, to: 'B', exp: null, name: 'Samu', kind: 'set' },
    { code: '82', slot: 2, to: null, exp: 'C', name: 'Otro', kind: 'clear' },
  ]);
  assert.deepEqual(plain(kept.map(op => op.slot)), [1]);
  assert.deepEqual(plain(context.migrate(null)), []);
});

test('an operation without name falls back to the active person and flushes to that document', async () => {
  const h = harness();
  h.state.PEND = [{ code: '82', slot: 0, to: 'B', exp: 'A', kind: 'set' }];
  await h.flush(); acknowledged(h, 'B');
  assert.equal(h.state.PLAN[key].name, 'Gian');
});
