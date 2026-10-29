#!/usr/bin/env python3
"""Revisa el plan compartido ANTES de instalar: solo analiza, no instala ni escribe nada.

  python3 tools/review_plan.py                    # revisa la orden de Git (data/slot_plan.json); no lee Firestore
  python3 tools/review_plan.py --source changes   # lee las propuestas de Firestore por su API REST pública
  python3 tools/review_plan.py --source admin     # lo lee con credenciales de cuenta de servicio / emulador (como db.py)
  python3 tools/review_plan.py --source file plan.json   # revisa una exportación de la web (Más → Exportar el plan)
  opciones: --out informe.md  --json informe.json  --strict (código de salida 1 si hay errores)

Cruza cada cambio (traje elegido) con el catálogo y el inventario y avisa de lo que pueda salir mal al instalar. Severidades:
  ERROR  no instalar tal cual (apariencia retirada o inexistente, traje Mii, mismo mod dos veces en un luchador…)
  AVISO  hay que mirarlo antes (reemplaza un favorito del perfil, hay que mover el mod de slot, plugin necesario, online no confirmado…)
  INFO   para saber (mod compartido con otros luchadores, hay una skin preparada en una rama, variante concreta…)
Nada de esto sustituye probar en la consola."""
import argparse, collections, datetime, json, os, re, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog_data as cd

PAIRS = [('79', '80')]   # Pyra/Mythra: el perfil exige coordinar el par (slot_pairs nivel error en opt-aqua)
ONLINE = {'autor_explicito': 'declarado por el autor', 'autor_condicionado': 'declarado con condiciones', 'tercero': 'solo según terceros',
          'sin_evidencia': 'sin datos', 'incompatible': 'incompatible'}
NRO = re.compile(r'\.nro|plugin|smashline|one.?slot|file addition|exo', re.I)

def _val(v):
    if 'stringValue' in v: return v['stringValue']
    if 'integerValue' in v: return int(v['integerValue'])
    if 'timestampValue' in v: return v['timestampValue']
    if 'nullValue' in v: return None
    return None

def read_rest(project, base=None):
    """changes e history por la API REST de Firestore sin credenciales (las reglas dejan leer)."""
    base = base or f'https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents'
    def page(coll, extra=''):
        out, tok = [], ''
        while True:
            u = f'{base}/{coll}?pageSize=300{extra}{("&pageToken=" + tok) if tok else ""}'
            d = json.load(urllib.request.urlopen(u, timeout=30))
            out += [{k: _val(v) for k, v in x.get('fields', {}).items()} | {'_id': x['name'].rsplit('/', 1)[-1]} for x in d.get('documents', [])]
            tok = d.get('nextPageToken')
            if not tok: return out
    return page('changes'), page('history', '&orderBy=at%20desc')[:60]

def read_admin():
    import db
    c = db.client()
    ch = [dict(d.to_dict(), _id=d.id) for d in c.collection('changes').stream()]
    hi = [h.to_dict() for h in c.collection('history').order_by('at', direction='DESCENDING').limit(60).stream()]
    for h in hi:
        if h.get('at') is not None and hasattr(h['at'], 'isoformat'): h['at'] = h['at'].isoformat()
    for x in ch:
        if x.get('at') is not None and hasattr(x['at'], 'isoformat'): x['at'] = x['at'].isoformat()
    return ch, hi

def from_git():
    import db
    rows, missing = [], []
    for row in db.install_rows():
        if not row.get('vid'):
            missing.append(f"{row['fighter']} {row['slot']}: {row['name']} no está en el catálogo")
            continue
        rows.append({'code': row['roster_no'], 'slot': row['traje'] - 1, 'vid': row['vid']})
    return rows, missing

def read_file(path):
    d = json.load(open(path, encoding='utf-8'))
    ch = [{'code': c['roster_no'], 'slot': c['traje'] - 1, 'vid': c['vid'], 'at': None, 'by': None} for c in d.get('changes', [])]
    return ch, d.get('history', []), d.get('inventory', {}).get('version')

def slot_now(inv, code, n):
    s = (((inv or {}).get('fighters') or {}).get(code) or {}).get('slots', {}).get(str(n)) or {}
    return s

def review(changes, history, fighters, inv, plan_inv_version=None):
    by_code = {f['code']: f for f in fighters}; idx = {p['vid']: (f, p) for f in fighters for p in f['picks']}
    items, F = [], []   # items: un registro por cambio; F: hallazgos globales
    def add(lst, sev, msg): lst.append({'sev': sev, 'msg': msg})
    rows = sorted(changes, key=lambda c: (list(by_code).index(c['code']) if c['code'] in by_code else 999, c['slot']))
    per_fighter, per_mod = collections.defaultdict(list), collections.defaultdict(list)
    for c in rows:
        code, n, vid = c['code'], c['slot'], c['vid']
        f, p = idx.get(vid, (None, None)); fi = by_code.get(code)
        it = {'fighter': fi['name'] if fi else code, 'roster_no': code, 'traje': n + 1, 'slot': f'c0{n}', 'vid': vid, 'name': p['name'] if p else None, 'notes': []}
        N = it['notes']
        if not fi: add(N, 'ERROR', f'el luchador {code} no existe en el catálogo')
        elif not (0 <= n <= 7): add(N, 'ERROR', f'traje {n + 1} fuera de rango')
        if fi and fi['mii']: add(N, 'ERROR', 'es un luchador Mii: no usa los 8 trajes habituales')
        if not p: add(N, 'ERROR', 'la apariencia ya no existe en el catálogo (id desconocido)'); items.append(it); continue
        it.update(author=p['author'], url=p['url'], role='alternativa' if p['role'] == 'alternativa' else 'recomendada', variant=p['variant'])
        if f['code'] != code: add(N, 'ERROR', f'la apariencia es de {f["name"]}, no de {fi["name"] if fi else code}')
        if p['withdrawn']: add(N, 'ERROR', 'la apariencia está RETIRADA del catálogo')
        per_fighter[code].append((n, p)); per_mod[p['id']].append((code, n, p))
        # lo que reemplaza
        s = slot_now(inv, code, n); cur = 'original'
        if s.get('src') == 'perfil':
            cur = s.get('name') or 'mod del perfil'
            add(N, 'AVISO', f'reemplaza «{cur}», un favorito del perfil {inv["meta"]["profile"]["name"]}' + (f' (probado en consola: {s["test"][:60]}…)' if s.get('test') else '') + ': se perdería lo que ya funciona')
        elif s.get('src') == 'base':
            cur = s.get('name') or ('nombre pendiente' if s.get('skin') else 'sin identificar')
            add(N, 'INFO', f'reemplaza una apariencia del pack base ({cur})')
        if s.get('staged'):
            st = s['staged']; add(N, 'INFO', f'ya hay una skin preparada en una rama del ModPack ({st.get("name") or "sin nombre"}, rama {(st.get("branch") or "").split("/")[-1]}): se pisarían')
        it['current'] = cur
        # reubicación
        if p['native'] and n not in p['native']:
            add(N, 'AVISO', f'el mod trae trajes para {", ".join("c0%d" % k for k in p["native"])}; ponerlo en c0{n} exige moverlo de slot (nadie ha comprobado que se pueda)')
        elif not p['native'] and p['slots_orig'] in (None, '', 'sin especificar'):
            add(N, 'INFO', 'el catálogo no indica sus slots originales')
        if p['dest'] and p['dest'] != f'c0{n}' and not isinstance(p['dest'], int):
            add(N, 'INFO', f'el auditor sugería {p["dest"]}; tu elección (c0{n}) manda')
        # online / condiciones / dependencias
        st = p['wifi_status']
        if st in ('autor_condicionado',): add(N, 'AVISO', f'online {ONLINE[st]}: ' + (p['conditions'] or 'revisa las condiciones')[:200])
        elif st in ('tercero', 'sin_evidencia', 'incompatible'): add(N, 'AVISO' if st != 'incompatible' else 'ERROR', f'online {ONLINE.get(st, st)}')
        elif st == 'autor_explicito' and p['conditions']: add(N, 'AVISO', 'declarado por el autor pero con condiciones: ' + p['conditions'][:200])
        if p['deps'] and NRO.search(p['deps']): add(N, 'AVISO', 'necesita: ' + p['deps'][:200])
        conf = [x for x in (p['conflicts'] or '').split(' · ') if x and not x.startswith('choca con propuestas principales')]
        for x in conf: add(N, 'AVISO', 'conflicto anotado: ' + x[:200])
        if p['pack']: add(N, 'INFO', f'es un paquete compartido con {", ".join(p["pack"]["with"])}: las fotos muestran todo el paquete')
        if p['variant']: add(N, 'INFO', f'variante concreta: {p["variant"]}')
        if p['console_test'] and 'pendiente' in p['console_test']: add(N, 'INFO', 'sin prueba en consola; compatibilidad 13.0.5 sin verificar')
        items.append(it)
    # globales
    for code, lst in per_fighter.items():
        c = collections.Counter(p['id'] for _, p in lst)
        for mid, k in c.items():
            if k > 1: add(F, 'AVISO', f'{by_code[code]["name"]}: el mismo mod ({mid}) está en {k} trajes ({", ".join("c0%d" % n for n, p in lst if p["id"] == mid)}); si es un pack de varios diseños está bien, si no es un duplicado')
    for mid, lst in per_mod.items():
        fs = sorted({c for c, _, _ in lst})
        if len(fs) > 1: add(F, 'INFO', f'el mod {mid} («{lst[0][2]["name"]}») sirve a {len(fs)} luchadores del plan: se descarga una sola vez')
    changed = {(c['code'], c['slot']) for c in rows}
    for a, b in PAIRS:
        for n in range(8):
            if ((a, n) in changed) != ((b, n) in changed):
                add(F, 'AVISO', f'Pyra y Mythra comparten traje: cambiaste el c0{n} de {"Pyra" if (a, n) in changed else "Mythra"} pero no el del otro; el perfil exige coordinar el par')
    pm = collections.Counter(c['code'] for c in rows)
    for code, k in pm.items():
        if k == 8: add(F, 'INFO', f'{by_code[code]["name"]}: cambiaste los 8 trajes, no queda ninguno original')
    if inv and plan_inv_version and plan_inv_version != inv['meta'].get('version'):
        add(F, 'AVISO', f'la exportación se hizo con otra versión del inventario ({plan_inv_version}) que la actual ({inv["meta"].get("version")})')
    # historial: cambios de opinión recientes
    flips = collections.Counter((h.get('code'), h.get('slot')) for h in history if h.get('kind') in ('set', 'undo', 'clear'))
    for (code, n), k in flips.items():
        if k >= 4 and code in by_code: add(F, 'INFO', f'{by_code[code]["name"]} traje {n + 1}: {k} cambios recientes en el historial (hay desacuerdo); revisa antes de instalar')
    if not rows: add(F, 'INFO', 'el plan está vacío: nada que revisar')
    return items, F

def render(items, F, meta):
    cnt = collections.Counter(x['sev'] for it in items for x in it['notes']) + collections.Counter(x['sev'] for x in F)
    ok = sum(1 for it in items if not any(x['sev'] in ('ERROR', 'AVISO') for x in it['notes']))
    L = [f'# Revisión del plan ({meta["generated"]})', '',
         f'**{len(items)} cambios** · {ok} sin avisos · {cnt["ERROR"]} errores · {cnt["AVISO"]} avisos · {cnt["INFO"]} notas. Catálogo {meta.get("catalog")} · inventario {meta.get("inv")} ({meta.get("profile")}).', '',
         'Solo análisis: no se ha instalado ni modificado nada. El inventario es parcial y no está comprobado online.', '']
    icon = {'ERROR': '⛔', 'AVISO': '⚠️', 'INFO': 'ℹ️'}
    if F:
        L += ['## Generales', ''] + [f'- {icon[x["sev"]]} {x["msg"]}' for x in sorted(F, key=lambda x: ['ERROR', 'AVISO', 'INFO'].index(x['sev']))] + ['']
    cur = None
    for it in items:
        if it['fighter'] != cur: cur = it['fighter']; L += [f'## {cur}', '']
        worst = min((['ERROR', 'AVISO', 'INFO'].index(x['sev']) for x in it['notes']), default=3)
        L.append(f'### {["⛔", "⚠️", "ℹ️", "✅"][worst]} Traje {it["traje"]} ({it["slot"]}): {it.get("current", "?")} → {it["name"] or it["vid"]}')
        meta_bits = [b for b in (it.get('role'), it.get('author') and 'por ' + it['author'], it.get('url')) if b]
        if meta_bits: L.append('_' + ' · '.join(meta_bits) + '_')
        L += [f'- {icon[x["sev"]]} {x["msg"]}' for x in sorted(it['notes'], key=lambda x: ['ERROR', 'AVISO', 'INFO'].index(x['sev']))] or ['- ✅ sin observaciones']
        L.append('')
    return '\n'.join(L)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--source', choices=['git', 'changes', 'admin', 'file'], default='git'); ap.add_argument('file', nargs='?')
    ap.add_argument('--out'); ap.add_argument('--json'); ap.add_argument('--strict', action='store_true'); ap.add_argument('--rest-base', help='URL base REST (emulador)')
    a = ap.parse_args()
    fighters, cmeta = cd.load(); inv = cd.load_inventory(fighters); ver = None
    missing = []
    if a.source == 'file':
        if not a.file: ap.error('indica el archivo de la exportación')
        ch, hi, ver = read_file(a.file)
        changes = [{'code': c['code'], 'slot': int(c['slot']), 'vid': c['vid']} for c in ch if c.get('vid')]
    elif a.source == 'admin':
        ch, hi = read_admin()
        changes = [{'code': c['code'], 'slot': int(c['slot']), 'vid': c['vid']} for c in ch if c.get('vid')]
    elif a.source == 'changes':
        pid = (cd.load_firebase() or {}).get('projectId'); ch, hi = read_rest(pid, a.rest_base)
        changes = [{'code': c['code'], 'slot': int(c['slot']), 'vid': c['vid']} for c in ch if c.get('vid')]
    else:
        changes, missing = from_git(); hi = []
    items, F = review(changes, hi, fighters, inv, ver)
    for text in missing: F.append({'sev': 'ERROR', 'msg': text})
    meta = {'generated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC'), 'catalog': cmeta.get('generated'),
            'inv': (inv or {}).get('meta', {}).get('version'), 'profile': ((inv or {}).get('meta', {}).get('profile') or {}).get('name')}
    md = render(items, F, meta); print(md)
    if a.out: open(a.out, 'w', encoding='utf-8').write(md)
    if a.json: json.dump({'meta': meta, 'general': F, 'changes': items}, open(a.json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    errs = sum(1 for it in items for x in it['notes'] if x['sev'] == 'ERROR') + sum(1 for x in F if x['sev'] == 'ERROR')
    sys.exit(1 if (a.strict and errs) else 0)
if __name__ == '__main__': main()
