// Utilidades comunes de las pruebas end-to-end.
// Se sirve la carpeta _site (tools/make_site.py: lo mismo que publica la Action) y solo se sustituyen los CDN externos
// (SDK de Firebase de gstatic y PhotoSwipe de jsdelivr) por copias locales de las mismas versiones fijadas.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const TESTS = path.resolve(__dirname, '..');
const SITE = process.env.SITE || path.join(ROOT, '_site');
const PY = process.env.PY || 'python3';
const FB = fs.existsSync(path.join(TESTS, '.cache/fb-all.js')) ? fs.readFileSync(path.join(TESTS, '.cache/fb-all.js'), 'utf8') : null;
const ENV = { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', GOOGLE_CLOUD_PROJECT: 'ssbu-441b1' };
const py = args => execFileSync(PY, [path.join(ROOT, 'tools', 'db.py'), ...args.split(' ')], { env: ENV, cwd: ROOT }).toString();
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#369"/></svg>';
let fails = 0, passes = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? passes++ : fails++; };
const until = async (p, fn, arg, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await p.evaluate(fn, arg).catch(() => false)) return true; await p.waitForTimeout(120); } return false; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
function serve() { // servidor estático mínimo sobre SITE; devuelve {url, close}
  const srv = http.createServer((q, r) => {
    let f = path.join(SITE, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
    if (!f.startsWith(SITE) || !fs.existsSync(f)) { r.writeHead(404); return r.end('no'); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  return new Promise(res => srv.listen(0, '127.0.0.1', () => { const port = srv.address().port; res({ url: `http://localhost:${port}/index.html?fbemu`, close: () => srv.close() }); }));
}
async function browser() { return chromium.launch(); }
async function mk(b, { w = 390, h = 844, mobile = true, badImg = false, noFirebase = false, deferChanges = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  await ctx.route('**/images.gamebanana.com/**', r => badImg ? r.abort() : r.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg }));
  await ctx.route('**/cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/**', r => { const f = r.request().url().split('/').pop(); const fp = path.join(TESTS, 'node_modules/photoswipe/dist', f);
    r.fulfill({ status: 200, contentType: f.endsWith('css') ? 'text/css' : 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(fp) }); });
  await ctx.route('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: FB }));
  for (const f of ['firebase-auth.js', 'firebase-firestore.js']) await ctx.route('https://www.gstatic.com/firebasejs/10.14.1/' + f, r => r.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: (deferChanges && f === 'firebase-auth.js' ? "export {getAuth,onAuthStateChanged,connectAuthEmulator,signInAnonymously,signOut} from './firebase-app.js';" : "export * from './firebase-app.js';") + (deferChanges && f === 'firebase-firestore.js' ? `
import {onSnapshot as observe} from './firebase-app.js';
export function onSnapshot(ref, next, ...rest) {
  if(ref.type !== 'collection' || ref.id !== 'changes') return observe(ref, next, ...rest);
  return observe(ref, snapshot => {
    if(globalThis.__holdChanges) (globalThis.__changeDeliveries ||= []).push(() => next(snapshot));
    else next(snapshot);
  }, ...rest);
}` : '') }));
  const p = await ctx.newPage(); p.ctx = ctx; p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return p;
}
const tap = (p, sel) => p.locator(sel).first().click();
const SHOTS = process.env.SHOTS || path.join(TESTS, '.shots'); fs.mkdirSync(SHOTS, { recursive: true });
const shot = (p, n) => p.screenshot({ path: path.join(SHOTS, n + '.png') });
const planOf = p => p.evaluate(() => JSON.stringify(Object.fromEntries(planEntries().map(e => [e.code + '_' + e.n, e.vid]))));
const raw = (p, fn) => p.evaluate(async fnS => { const f = await fb(), R = {}; const t = async (n, fn) => { try { await fn(); R[n] = 'PERMITIDO'; } catch (e) { R[n] = e.code || String(e); } }; await (0, eval)('(' + fnS + ')')(f, t, R); return R; }, fn.toString());
async function wipe() {
  await fetch('http://127.0.0.1:8080/emulator/v1/projects/ssbu-441b1/databases/(default)/documents', { method: 'DELETE' });
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/ssbu-441b1/accounts', { method: 'DELETE' });
}
// recorrido completo por la interfaz: traje → alternativa → «Usar en Traje N»
async function pick(p, base, code, n, name) {
  await p.goto(base + '#/luchador/' + code + '/' + (n + 1)); await p.waitForSelector('[data-skin]');
  if (name) await tap(p, `.cd:has-text("${name}") [data-skin]`);
  else await p.evaluate(() => { const used = new Set(planEntries().filter(e => e.code === RT.code).map(e => e.vid)); const b = [...document.querySelectorAll('[data-skin]')].find(x => !used.has(x.dataset.skin)); b.click(); });
  await p.waitForSelector('[data-add]'); await tap(p, '[data-add]'); await p.waitForSelector('.cmp2');
}
const done = () => { console.log(`\n${passes} correctas, ${fails} fallos`); return fails; };
module.exports = { chromium, ROOT, TESTS, SITE, PY, py, svg, ok, until, serve, browser, mk, tap, shot, planOf, raw, wipe, pick, done, ENV, get fails() { return fails; } };
