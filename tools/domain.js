'use strict';
/* Lógica del plan y del catálogo, sin DOM. La página la concatena antes de ui.js. */
const SSBU = (() => {
  const keyOf = (c, n) => c + '_' + n;
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const ONLINE = {
    autor_explicito: ['g', 'Online: lo declara el autor'],
    autor_condicionado: ['y', 'Online: con condiciones'],
    tercero: ['y', 'Online: según terceros'],
    sin_evidencia: ['', 'Online: sin datos'],
    incompatible: ['r', 'Incompatible online'],
  };
  const WIFI_KEYS = ['autor_explicito', 'autor_condicionado', 'tercero', 'sin_evidencia', 'incompatible'];
  const FILTER_KEYS = ['rec', ...WIFI_KEYS, 'unaudited', 'avail'];

  function emptyCat() {
    const st = { q: '', f: '' };
    FILTER_KEYS.forEach(k => { st[k] = false; });
    return st;
  }

  function migrateCat(saved) {
    const st = emptyCat();
    if (!saved || typeof saved !== 'object') return st;
    st.q = typeof saved.q === 'string' ? saved.q : '';
    st.f = typeof saved.f === 'string' ? saved.f : '';
    if (saved.rec || saved.aud) st.rec = true;
    if (saved.on) {
      st.autor_explicito = true;
      st.autor_condicionado = true;
    }
    FILTER_KEYS.forEach(k => { if (saved[k]) st[k] = true; });
    return st;
  }

  function validSlot(n) {
    return Number.isInteger(n) && n >= 0 && n <= 7;
  }

  function planVid(code, n, ctx) {
    const plan = ctx.PLAN || {};
    const sent = ctx.SENT || {};
    const pend = ctx.PEND || [];
    const now = ctx.now;
    const k = keyOf(code, n);
    let v = (plan[k] || {}).vid || null;
    const sn = sent[k];
    if (sn && now - sn.t < 8000) v = sn.to;
    for (const o of pend) if (o.code === code && o.slot === n) v = o.to;
    return v;
  }

  function planEntries(ctx) {
    const plan = ctx.PLAN || {};
    const sent = ctx.SENT || {};
    const pend = ctx.PEND || [];
    const byCode = ctx.byCode || {};
    const ks = new Set([...Object.keys(plan), ...Object.keys(sent)]);
    pend.forEach(o => ks.add(keyOf(o.code, o.slot)));
    const out = [];
    ks.forEach(k => {
      const i = k.lastIndexOf('_');
      const code = k.slice(0, i);
      const n = +k.slice(i + 1);
      const vid = planVid(code, n, ctx);
      if (vid && byCode[code]) out.push({ code, n, vid });
    });
    const ord = Object.keys(byCode);
    out.sort((a, b) => ord.indexOf(a.code) - ord.indexOf(b.code) || a.n - b.n);
    return out;
  }

  function isAlt(p) {
    return p.role === 'alternativa';
  }

  function onlineOf(p) {
    if (!p || !p.audited) return ['', 'Sin auditar'];
    return ONLINE[p.wifi_status] || ['', 'Online: sin datos'];
  }

  function catList(all, ctx, st) {
    const c = st || emptyCat();
    const q = norm(c.q);
    const fcode = ctx ? ctx.code : c.f;
    const wifiOn = WIFI_KEYS.filter(k => c[k]);
    return (all || []).filter(e => {
      const p = e.p;
      if (fcode && e.f.code !== fcode) return false;
      if (ctx && p.mii) return false;
      if (c.rec && isAlt(p)) return false;
      if (c.avail && (p.withdrawn || p.mii)) return false;
      if (c.unaudited && p.audited) return false;
      if (wifiOn.length && !wifiOn.includes(p.wifi_status)) return false;
      if (q && !q.split(/\s+/).filter(Boolean).every(w => norm(p.name + ' ' + e.f.name + ' ' + p.author + ' ' + (p.variant || '')).includes(w))) return false;
      return true;
    });
  }

  function initials(n) {
    return String(n || '').replace(/\(.*?\)/g, '').trim().split(/[\s&.]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  function monoSvg(f) {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#262c3a"/><text x="50" y="62" font-family="system-ui,sans-serif" font-size="40" font-weight="800" fill="#a3aabc" text-anchor="middle">' + initials(f.name) + '</text></svg>');
  }

  function originalArt(f) {
    return (f && f.portrait) || monoSvg(f || { name: '' });
  }

  function curOf(code, n, ctx) {
    const byCode = ctx.byCode || {};
    const inv = ctx.INV;
    const idx = ctx.idx || {};
    const f = byCode[code];
    if (!f) return null;
    if (f.mii) return { kind: 'na', name: 'Sin trajes de este tipo', img: null, badge: '' };
    const slots = inv && inv.fighters && inv.fighters[code] && inv.fighters[code].slots;
    const s = slots && slots[String(n)];
    const stg = s && s.staged ? { name: s.staged.name, img: s.staged.img, branch: (s.staged.branch || '').split('/').pop(), src: s.staged.name_src } : null;
    if (s && s.src) {
      const prof = s.src === 'perfil';
      const p = s.vid && idx[s.vid] ? idx[s.vid].p : null;
      const img = s.img || (p && p.img) || null;
      const known = v => v && v !== 'pending' ? v : null;
      const base = {
        img, src: s.src, vid: s.vid || null, author: known(s.author), url: s.url, version: known(s.version), staged: stg,
        badge: prof ? 'Perfil' : 'Pack base',
        verif: prof ? (s.test ? 'Según el ModPack: ' + s.test : 'Perfil armado y verificado en archivos; sin prueba en consola anotada.') : 'Revisado en el repositorio del ModPack; no probado en la consola.',
      };
      if (s.name) return { ...base, kind: 'mod', name: s.name };
      return (s.img || s.skin) ? { ...base, kind: 'pending', name: 'Nombre pendiente' } : { ...base, kind: 'unknown', name: 'Sin identificar' };
    }
    return { kind: 'original', name: 'Original', img: originalArt(f), badge: '', art: true, staged: stg, verif: 'Sin ningún mod en el inventario revisado. No está comprobado en la consola.' };
  }

  function assignBlock(entries, code, slot, vid) {
    if (!validSlot(slot)) return { kind: 'bad-slot' };
    const dup = (entries || []).find(e => e.code === code && e.vid === vid && e.n !== slot);
    if (dup) return { kind: 'duplicate', other: dup.n };
    const cur = (entries || []).find(e => e.code === code && e.n === slot);
    if (cur && cur.vid === vid) return { kind: 'same' };
    if (cur) return { kind: 'replace', currentVid: cur.vid };
    return { kind: 'free' };
  }

  function setOp(code, n, vid, prev) {
    if (!validSlot(n)) return null;
    if (prev === vid) return null;
    return { code, slot: n, to: vid, exp: prev, kind: 'set' };
  }

  function clearOp(code, n, prev) {
    if (!validSlot(n) || !prev) return null;
    return { code, slot: n, to: null, exp: prev, kind: 'clear' };
  }

  function withOp(pend, op) {
    if (!op) return pend.slice();
    return pend.concat([op]);
  }

  return {
    keyOf, norm, ONLINE, WIFI_KEYS, FILTER_KEYS, emptyCat, migrateCat, validSlot,
    planVid, planEntries, isAlt, onlineOf, catList, initials, originalArt, curOf,
    assignBlock, setOp, clearOp, withOp,
  };
})();
globalThis.SSBU = SSBU;
