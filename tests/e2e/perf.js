// Rendimiento percibido en móvil (CPU 4× más lenta) sobre lo que se publica: LCP y CLS de las dos pantallas más usadas.
const L = require('./lib');
const { ok, mk } = L;

const LCP_MS = 2500;
const CLS_MAX = 0.05;

const measure = async (page, url, ready) => {
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, cls: 0 };
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__vitals.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__vitals.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(url);
  await page.waitForSelector(ready);
  await page.waitForTimeout(2500);
  return page.evaluate(() => window.__vitals);
};

module.exports = async (b, base) => {
  for (const [name, hash, ready] of [['Entrada inicial (redirección)', '#/luchadores', '.costume-strip'], ['Luchador directo', '#/luchador/01/3', '.costume-strip']]) {
    const page = await mk(b, { w: 390, h: 844 });
    const vitals = await measure(page, base + hash, ready);
    ok(vitals.lcp > 0 && vitals.lcp <= LCP_MS, `${name}: LCP ${Math.round(vitals.lcp)} ms (máximo ${LCP_MS})`);
    ok(vitals.cls <= CLS_MAX, `${name}: CLS ${vitals.cls.toFixed(3)} (máximo ${CLS_MAX})`);
    await page.ctx.close();
  }
};
