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
const planVidSource = between('function planVid(', '\nfunction planEntries(');
const timestampSource = between('const ts=', '\nasync function startDb(');
const reconciliationSource = source.includes('function confirmPlan(') ? between('const confirmedPlan=', 'let PEND=') : '';
const listenerMarker = "sub(f.collection(f.db,'changes'),";
const listenerSource = between(listenerMarker, '\n  sub(f.query').slice(listenerMarker.length).trim().replace(/\);$/, '');

const key = '82_0';
const timestamp = milliseconds => ({ toMillis: () => milliseconds });
const stored = (vid, at = 1) => ({ code: '82', slot: 0, vid, by: 'fixture-user', at: timestamp(at) });
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
    PEND: [{ code: '82', slot: 0, to, exp: current, kind: to === null ? 'clear' : 'set' }],
    planVersions: { [key]: 1 },
    FBCFG: { projectId: 'unit-test-only' }, navigator: { onLine: true },
    flushing: false, planLoaded: true, idx: { A: {}, B: {}, C: {} },
    keyOf: (code, slot) => `${code}_${slot}`,
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
  vm.runInContext(`${timestampSource}\n${reconciliationSource}\n${planVidSource}\n${flushSource}\nthis.deliver = (${listenerSource});`, context);
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
  h.deliver({ [key]: stored('A', 1), '01_1': stored('X', 2) }, [{ id: '01_1', data: stored('X', 2) }]);
  acknowledged(h, 'B');
  assert.equal(h.state.PLAN['01_1'].vid, 'X', 'the unrelated remote update remains visible');
});

test('a late unrelated snapshot cannot resurrect a proposal after undo was acknowledged', async () => {
  const h = harness({ to: null }); await h.flush(); acknowledged(h, null);
  h.deliver({ [key]: stored('A', 1), '01_1': stored('X', 2) }, [{ id: '01_1', data: stored('X', 2) }]);
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
  h.state.PEND.push({ code: '82', slot: 0, to: 'B', exp: null, kind: 'set' });
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
