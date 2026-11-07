// @ts-nocheck
'use strict';
/* Lógica del plan y del catálogo, sin DOM. La página la concatena antes de ui.js. */
const SSBU = (() => {
  const keyOf = (c, n) => c + '_' + n;
  const PEOPLE = ['Gian', 'Alan', 'Ches', 'Samu'];
  const validPerson = name => PEOPLE.includes(name);
  const docKey = (c, n, name) => (validPerson(name) ? c + '_' + n + '_' + name : c + '_' + n);

  function parseDocKey(key) {
    const parts = String(key || '').split('_');

    if (parts.length !== 2 && parts.length !== 3) return null;

    const slot = Number(parts[1]);

    if (!validSlot(slot) || !parts[0]) return null;

    const name = parts.length === 3 ? parts[2] : null;

    if (name !== null && !validPerson(name)) return null;
    return { code: parts[0], slot, name };
  }

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

  const ALL_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7];

  function familiesOf(code, families) {
    const map = families || (globalThis.META && globalThis.META.families) || {};
    const groups = map[code];

    return Array.isArray(groups) && groups.length ? groups : [ALL_SLOTS];
  }

  function sameFamily(code, from, to, families) {
    if (!validSlot(from) || !validSlot(to)) return false;

    return familiesOf(code, families).some((group) => group.includes(from) && group.includes(to));
  }

  function compatibleSlots(code, sourceSlots, families) {
    if (!Array.isArray(sourceSlots)) return ALL_SLOTS.slice();

    const valid = sourceSlots.filter(validSlot);

    if (!valid.length) return ALL_SLOTS.slice();

    const out = new Set();

    familiesOf(code, families).forEach((group) => {
      if (!valid.some((slot) => group.includes(slot))) return;

      group.forEach((slot) => {
        if (validSlot(slot)) out.add(slot);
      });
    });

    if (!out.size) return ALL_SLOTS.slice();

    return Array.from(out).sort((a, b) => a - b);
  }

  function sourceSlotsOf(input) {
    const current = input || {};

    if (typeof current.variant === 'string') {
      const match = /:c0([0-7])$/.exec(current.variant);

      if (match) return [Number(match[1])];
    }

    if (current.alt) {
      if (current.alt.any) return ALL_SLOTS.slice();
      if (Array.isArray(current.alt.slots)) {
        const fromAlt = current.alt.slots.map((slot) => Number(slot) - 1).filter(validSlot);

        if (fromAlt.length) return fromAlt;
      }
    }

    if (current.skin && Array.isArray(current.skin.native) && current.skin.native.length) {
      return current.skin.native.filter(validSlot);
    }

    return [];
  }

  function proposalsAt(code, n, ctx) {
    const plan = (ctx && ctx.PLAN) || {};
    const pend = (ctx && ctx.PEND) || [];
    const person = ctx && validPerson(ctx.person) ? ctx.person : null;
    const byAuthor = new Map();

    Object.entries(plan).forEach(([k, val]) => {
      const parsed = parseDocKey(k);

      if (!parsed || parsed.code !== code || parsed.slot !== n || !val || !val.vid) return;

      const author = parsed.name || (validPerson(val.name) ? val.name : null);

      byAuthor.set(author || '__legacy__', {
        key: k,
        code,
        n,
        vid: val.vid,
        variant: val.variant || null,
        name: author,
        by: val.by || null,
        at: val.at ?? null,
        unsent: false,
      });
    });

    for (const o of pend) {
      const opName = validPerson(o.name) ? o.name : person;

      if (o.code !== code || o.slot !== n || !opName) continue;

      if (o.to) {
        byAuthor.set(opName, {
          key: docKey(code, n, opName),
          code,
          n,
          vid: o.to,
          variant: o.variant || null,
          name: opName,
          by: null,
          at: Date.now(),
          unsent: true,
        });
      } else {
        byAuthor.delete(opName);
      }
    }

    const list = Array.from(byAuthor.values());

    list.sort((a, b) => {
      const aMine = person && a.name === person ? 1 : 0;
      const bMine = person && b.name === person ? 1 : 0;

      if (aMine !== bMine) return bMine - aMine;

      const aLegacy = a.name === null ? 1 : 0;
      const bLegacy = b.name === null ? 1 : 0;

      if ((b.at || 0) !== (a.at || 0)) return (b.at || 0) - (a.at || 0);
      if (aLegacy !== bLegacy) return aLegacy - bLegacy;

      return PEOPLE.indexOf(a.name) - PEOPLE.indexOf(b.name);
    });

    return list;
  }

  function ownVid(code, n, ctx) {
    const person = ctx && validPerson(ctx.person) ? ctx.person : null;

    if (!person) return null;

    const hit = proposalsAt(code, n, ctx).find(item => item.name === person);

    return hit ? hit.vid : null;
  }

  function ownVariant(code, n, ctx) {
    const person = ctx && validPerson(ctx.person) ? ctx.person : null;

    if (!person) return null;

    const hit = proposalsAt(code, n, ctx).find(item => item.name === person);

    return hit ? (hit.variant || null) : null;
  }

  function planVid(code, n, ctx) {
    const first = proposalsAt(code, n, ctx)[0];

    return first ? first.vid : null;
  }

  function planVariant(code, n, ctx) {
    const first = proposalsAt(code, n, ctx)[0];

    return first ? (first.variant || null) : null;
  }

  function planEntries(ctx) {
    const plan = (ctx && ctx.PLAN) || {};
    const pend = (ctx && ctx.PEND) || [];
    const byCode = (ctx && ctx.byCode) || {};
    const pairs = new Set();

    Object.keys(plan).forEach(k => {
      const parsed = parseDocKey(k);

      if (parsed && byCode[parsed.code]) pairs.add(parsed.code + '_' + parsed.slot);
    });

    pend.forEach(o => {
      if (byCode[o.code] && validSlot(o.slot)) pairs.add(o.code + '_' + o.slot);
    });

    const out = [];

    pairs.forEach(pair => {
      const idxSep = pair.lastIndexOf('_');
      const code = pair.slice(0, idxSep);
      const n = Number(pair.slice(idxSep + 1));

      proposalsAt(code, n, ctx).forEach(row => out.push(row));
    });

    const ord = Object.keys(byCode);
    const rank = row => (row.name === null ? 99 : PEOPLE.indexOf(row.name));

    out.sort((a, b) => ord.indexOf(a.code) - ord.indexOf(b.code) || a.n - b.n || rank(a) - rank(b));
    return out;
  }

  function ownEntries(ctx) {
    const person = ctx && validPerson(ctx.person) ? ctx.person : null;

    if (!person) return [];

    return planEntries(ctx).filter(row => row.name === person);
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
      if (q && !q.split(/\s+/).filter(Boolean).every(w => norm(p.name).includes(w))) return false;
      return true;
    });
  }

  function initials(n) {
    return String(n || '').replace(/\(.*?\)/g, '').trim().split(/[\s&.]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  function monoSvg(f) {
    return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#262c3a"/><text x="50" y="62" font-family="system-ui,sans-serif" font-size="40" font-weight="800" fill="#a3aabc" text-anchor="middle">' + initials(f.name) + '</text></svg>');
  }

  function originalArt(f, n) {
    return (f && f.costumes && f.costumes[n]) || (f && f.portrait) || monoSvg(f || { name: '' });
  }

  function curOf(code, n, ctx) {
    const byCode = ctx.byCode || {};
    const inv = ctx.INV;
    const f = byCode[code];

    if (!f) return null;
    if (f.mii) return { kind: 'na', name: 'Sin trajes de este tipo', img: null, badge: '' };

    const slots = inv && inv.fighters && inv.fighters[code] && inv.fighters[code].slots;
    const s = slots && slots[String(n)];
    const stg = s && s.staged ? { name: s.staged.name, img: s.staged.img, branch: (s.staged.branch || '').split('/').pop(), src: s.staged.name_src } : null;
    const rep = s && s.replace ? { replace: s.replace } : {};
    const reference = n === 0 && f.original_ref && f.original_ref.costume === 'c00' && f.original_ref.verified === true ? f.original_ref : null;

    if (s && s.src) {
      const prof = s.src === 'perfil';
      const sha = s.portrait;
      let img = null;

      if (typeof sha === 'string' && /^[a-f0-9]{64}$/.test(sha)) {
        img = 'https://res.cloudinary.com/gian-dev/image/upload/f_auto,q_auto,w_512/ssbu/portraits/' + sha;
      }

      const known = v => v && v !== 'pending' ? v : null;
      let verif = 'Revisado en el repositorio del ModPack; no probado en la consola.';

      if (prof) {
        verif = s.test ? 'Según el ModPack: ' + s.test : 'Perfil armado y verificado en archivos; sin prueba en consola anotada.';
      }

      const base = {
        ...rep, img, src: s.src, vid: s.vid || null, author: known(s.author), url: s.url, version: known(s.version), staged: stg,
        badge: prof ? 'Perfil' : 'Pack base',
        layer: prof ? 'profile' : 'base',
        verif,
      };

      if (s.name) return { ...base, kind: 'mod', name: s.name };
      if (s.img || s.skin) return { ...base, kind: 'unnamed', name: 'Sin nombre' };

      return { ...base, kind: 'unknown', name: 'Sin identificar' };
    }

    return { ...rep, kind: 'original', name: 'Original', img: originalArt(f, n), reference, badge: '', layer: 'original', art: true, staged: stg, verif: 'Sin ningún mod en el inventario revisado. No está comprobado en la consola.' };
  }

  const SERIES = {
    '01': 'mario', '09': 'mario', '13': 'mario', '13ε': 'mario', '14': 'mario', '18': 'mario', '48': 'mario', '58': 'mario', '70': 'mario',
    '02': 'donkey', '36': 'donkey', '67': 'donkey',
    '03': 'zelda', '16': 'zelda', '17': 'zelda', '22': 'zelda', '23': 'zelda', '43': 'zelda',
    '04': 'metroid', '04ε': 'metroid', '29': 'metroid', '65': 'metroid',
    '05': 'yoshi',
    '06': 'kirby', '27': 'kirby', '39': 'kirby',
    '07': 'starfox', '20': 'starfox', '44': 'starfox',
    '08': 'pokemon', '12': 'pokemon', '19': 'pokemon', '24': 'pokemon', '33': 'pokemon', '34': 'pokemon', '35': 'pokemon', '41': 'pokemon', '50': 'pokemon', '69': 'pokemon',
    '10': 'earthbound', '37': 'earthbound',
    '11': 'fzero',
    '15': 'ice',
    '21': 'fireemblem', '21ε': 'fireemblem', '25': 'fireemblem', '25ε': 'fireemblem', '32': 'fireemblem', '56': 'fireemblem', '62': 'fireemblem', '75': 'fireemblem',
    '26': 'gamewatch',
    '28': 'kidicarus', '28ε': 'kidicarus', '54': 'kidicarus',
    '30': 'wario',
    '31': 'metalgear',
    '38': 'sonic',
    '40': 'pikmin',
    '42': 'rob',
    '45': 'animal', '68': 'animal',
    '46': 'megaman',
    '47': 'wiifit',
    '49': 'punchout',
    '51': 'mii', '52': 'mii', '53': 'mii',
    '55': 'pacman',
    '57': 'xenoblade', '79': 'xenoblade', '80': 'xenoblade',
    '59': 'duckhunt',
    '60': 'streetfighter', '60ε': 'streetfighter',
    '61': 'finalfantasy', '78': 'finalfantasy',
    '63': 'bayonetta',
    '64': 'splatoon',
    '66': 'castlevania', '66ε': 'castlevania',
    '71': 'persona',
    '72': 'dragonquest',
    '73': 'banjo',
    '74': 'fatalfury',
    '76': 'arms',
    '77': 'minecraft',
    '81': 'tekken',
    '82': 'kingdomhearts',
  };

  const SERIES_LABEL = {
    mario: 'Mario', donkey: 'Donkey Kong', zelda: 'The Legend of Zelda', metroid: 'Metroid', yoshi: 'Yoshi',
    kirby: 'Kirby', starfox: 'Star Fox', pokemon: 'Pokémon', earthbound: 'EarthBound', fzero: 'F-Zero', ice: 'Ice Climber',
    fireemblem: 'Fire Emblem', gamewatch: 'Game & Watch', kidicarus: 'Kid Icarus', wario: 'Wario', metalgear: 'Metal Gear',
    sonic: 'Sonic', pikmin: 'Pikmin', rob: 'R.O.B.', animal: 'Animal Crossing', megaman: 'Mega Man', wiifit: 'Wii Fit',
    punchout: 'Punch-Out!!', mii: 'Mii', pacman: 'Pac-Man', xenoblade: 'Xenoblade', duckhunt: 'Duck Hunt',
    streetfighter: 'Street Fighter', finalfantasy: 'Final Fantasy', bayonetta: 'Bayonetta', splatoon: 'Splatoon',
    castlevania: 'Castlevania', persona: 'Persona', dragonquest: 'Dragon Quest', banjo: 'Banjo-Kazooie',
    fatalfury: 'Fatal Fury', arms: 'ARMS', minecraft: 'Minecraft', tekken: 'Tekken', kingdomhearts: 'Kingdom Hearts',
  };

  function seriesOf(code) { return SERIES[code] || ''; }
  function seriesLabel(id) { return SERIES_LABEL[id] || 'Sin franquicia'; }

  function stageChoice(o) {
    const slot = Number(o && o.slot) || 0;
    const n = slot + 1;
    const none = (line) => ({ kind: 'none', label: '', line: line || '', other: null });
    if (o && o.mii) return none('');
    if (o && o.withdrawn) return none('Retirada');
    const elsewhere = o && o.elsewhere != null && o.elsewhere !== slot ? o.elsewhere : null;

    if (elsewhere != null) return { kind: 'goto', label: 'Ir a Traje ' + (elsewhere + 1), line: 'Ya está en el Traje ' + (elsewhere + 1), other: elsewhere };

    const saved = o && o.saved ? o.saved : null;
    const vid = o && o.vid ? o.vid : null;

    if (!vid && saved) return { kind: 'clear', label: 'Quitar propuesta', line: '', other: null };
    if (!vid) return none('');
    if (saved === vid) return { kind: 'clear', label: 'Quitar propuesta', line: '', other: null };
    const bits = [];
    if (o.incompatible) bits.push('Incompatible online');
    const line = bits.join(' · ');
    if (saved) return { kind: 'replace', label: 'Guardar propuesta', line, other: null };
    return { kind: 'use', label: 'Guardar propuesta', line, other: null };
  }

  const sameLook = (e, vid, variant) =>
    e.vid === vid && (!variant || !e.variant || e.variant === variant);

  function assignBlock(entries, code, slot, vid, variant) {
    if (!validSlot(slot)) return { kind: 'bad-slot' };

    const dup = (entries || []).find(e => e.code === code && e.n !== slot && sameLook(e, vid, variant));

    if (dup) return { kind: 'duplicate', other: dup.n };

    const cur = (entries || []).find(e => e.code === code && e.n === slot);

    if (cur && cur.vid === vid && (cur.variant || null) === (variant || null)) return { kind: 'same' };
    if (cur) return { kind: 'replace', currentVid: cur.vid };
    return { kind: 'free' };
  }

  function setOp(code, n, vid, prev, variant, prevVariant, name) {
    if (!validSlot(n)) return null;
    if (prev === vid && (variant || null) === (prevVariant || null)) return null;

    const op = { code, slot: n, to: vid, exp: prev, kind: 'set' };

    if (validPerson(name)) op.name = name;
    if (variant) op.variant = variant;
    op.expVariant = prevVariant || null;
    return op;
  }

  function clearOp(code, n, prev, prevVariant, name) {
    if (!validSlot(n) || !prev) return null;

    const op = { code, slot: n, to: null, exp: prev, kind: 'clear' };

    if (validPerson(name)) op.name = name;
    op.expVariant = prevVariant || null;
    return op;
  }

  function withOp(pend, op) {
    if (!op) return pend.slice();
    return pend.concat([op]);
  }

  function installFace(ready, slot, current) {
    const img = current && current.img;

    if (!ready) return { kind: 'unsynced', img, install: null };
    if (slot && slot.estado === 'aprobado' && slot.state === 'mod') {
      return { kind: 'install', img, install: { name: slot.name, vid: slot.vid || null, mod_id: slot.mod_id } };
    }

    if (current && current.kind === 'original') return { kind: 'original', img, install: null };
    return { kind: 'base', img, install: null };
  }

  return {
    keyOf, norm, ONLINE, WIFI_KEYS, FILTER_KEYS, emptyCat, migrateCat, validSlot,
    familiesOf, sameFamily, compatibleSlots, sourceSlotsOf,
    PEOPLE, validPerson, docKey, parseDocKey, proposalsAt, ownVid, ownVariant, ownEntries,
    planVid, planVariant, planEntries, isAlt, onlineOf, catList, initials, originalArt, curOf,
    assignBlock, setOp, clearOp, withOp, stageChoice, seriesOf, seriesLabel, installFace,
  };
})();
globalThis.SSBU = SSBU;
