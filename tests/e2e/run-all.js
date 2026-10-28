// Orquesta las pruebas end-to-end: sirve _site, siembra el emulador y ejecuta cada recorrido. Requiere los emuladores (ver tests/README.md).
const L = require('./lib');
(async () => {
  const srv = await L.serve(); const b = await L.browser();
  try {
    await L.wipe(); L.py('seed --only all');
    const only = process.argv[2];
    for (const name of ['recorridos', 'identity', 'sync-errors', 'ack-transition']) {
      if (only && only !== name) continue;
      console.log('\n== ' + name); await L.wipe(); L.py('seed --only all'); await require('./' + name)(b, srv.url);
    }
    if (only === 'selector') {
      for (const kind of ['webkit', 'firefox']) {
        let extra = null;
        try { extra = await require('playwright')[kind].launch(); }
        catch (e) { console.log('\n== selector ' + kind + ' omitido: ' + String(e.message || e).split('\n')[0]); continue; }
        try { console.log('\n== selector ' + kind); await L.wipe(); L.py('seed --only all'); await require('./selector')(extra, srv.url); }
        finally { await extra.close(); }
      }
    }
  } finally { await b.close(); srv.close(); }
  process.exit(L.done() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
