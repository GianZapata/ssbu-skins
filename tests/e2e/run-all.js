// Orquesta las pruebas end-to-end: sirve _site, siembra el emulador y ejecuta cada recorrido. Requiere los emuladores (ver tests/README.md).
const L = require('./lib');
(async () => {
  const srv = await L.serve(); const b = await L.browser();
  try {
    await L.wipe(); L.py('seed --only all');
    const only = process.argv[2];
    for (const name of ['ack-transition', 'journeys', 'identity', 'ux', 'sync-errors']) {
      if (only && only !== name) continue;
      console.log('\n== ' + name); await L.wipe(); L.py('seed --only all'); await require('./' + name)(b, srv.url);
    }
  } finally { await b.close(); srv.close(); }
  process.exit(L.done() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
