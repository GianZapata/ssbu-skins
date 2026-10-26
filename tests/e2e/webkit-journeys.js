// Recorridos reales con WebKit de Playwright. No usa ni reinicia emuladores.
// SITE=_site WEBKIT_EXECUTABLE_PATH=/ruta/al/wrapper node tests/e2e/webkit-journeys.js
const { webkit, chromium } = require('playwright');
const L = require('./lib');
(async () => {
  const srv = await L.serve();
  const engine = process.env.E2E_ENGINE === 'chromium' ? chromium : webkit;
  const executablePath = engine === webkit ? process.env.WEBKIT_EXECUTABLE_PATH : process.env.CHROMIUM_EXECUTABLE_PATH;
  let b;
  try {
    b = await engine.launch({ ...(executablePath ? { executablePath } : {}), ...(engine === chromium ? { args: ['--no-sandbox'] } : {}) });
    console.log(`Recorridos de interacción: ${engine.name()} ${b.version()} · Firebase bloqueado`);
    if (process.argv[2] === 'deep-pagination') await require('./ux').deepPagination(b, srv.url);
    else if (process.argv[2]) throw new Error('Recorrido desconocido: ' + process.argv[2]);
    else {
      await require('./identity').portraits(b, srv.url);
      await require('./ux').interactions(b, srv.url);
    }
  } finally { if (b) await b.close(); srv.close(); }
  process.exitCode = L.done() ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 2; });
