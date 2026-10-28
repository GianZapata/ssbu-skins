# Puente entre el repositorio y Firestore (lo usan la Action de publicación, Grok y quien instala).
#
#   python3 tools/db.py seed --only catalog               copia SOLO el catálogo (lo hace la Action en cada push; es lo que cambia la investigación)
#   python3 tools/db.py seed --only installed             copia SOLO el inventario: acción manual, después de revisarlo (nunca automática)
#   python3 tools/db.py seed --only all                   las dos cosas
#   python3 tools/db.py seed --only drive                 copia el manifiesto del Drive (data/drive.json, de tools/scan_drive.py); `all` no lo incluye
#   python3 tools/db.py seed --only ... --dry-run         no escribe: dice qué documentos se crearían, cambiarían o borrarían
#   (seed no toca nunca changes, history ni status)
#   python3 tools/db.py backup [--out data/plan_backup]   copia a JSON lo que solo vive en Firestore (changes, history, status, meta, selection); solo lee
#   python3 tools/db.py plan                              imprime el plan compartido (un cambio por traje) para revisarlo e instalarlo
#   python3 tools/db.py status VID installed|failed|skipped [--result TEXTO]   anota el resultado de una instalación
#   python3 tools/db.py migrate                           pasa la selección anterior (selection/main) al plan compartido (idempotente)
#
# Credenciales: GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de una cuenta de servicio del proyecto
# (Configuración del proyecto → Cuentas de servicio → Generar clave privada). Para pruebas locales,
# FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 y GOOGLE_CLOUD_PROJECT=ssbu-441b1 bastan. Requiere: pip install google-cloud-firestore
import argparse, datetime, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog_data as cd

ONLINE = {'autor_explicito': 'Online: lo declara el autor', 'autor_condicionado': 'Online: con condiciones', 'tercero': 'Online: según terceros',
          'sin_evidencia': 'Online: sin datos', 'incompatible': 'Online: incompatible'}

def client():
    from google.cloud import firestore
    cfg = cd.load_firebase() or {}
    return firestore.Client(project=os.environ.get('GOOGLE_CLOUD_PROJECT') or cfg.get('projectId'))

def now(): return datetime.datetime.now(datetime.timezone.utc)

def _plain(v, drop=('updatedAt',)):
    """Valor de Firestore serializable (fechas a ISO). Sin `drop` por defecto, para comparar sin la hora de escritura."""
    if hasattr(v, 'isoformat'): return v.isoformat()
    if isinstance(v, dict): return {k: _plain(x, drop) for k, x in v.items() if k not in drop}
    if isinstance(v, list): return [_plain(x, drop) for x in v]
    return v

def _replace(db, coll, docs, dry=False):
    """Escribe `docs` ({id: dict}) en la colección y borra los documentos que ya no existen. En `dry` solo informa."""
    ref = db.collection(coll); keep = set(docs)
    if dry:
        cur = {d.id: _plain(d.to_dict()) for d in ref.stream()}
        new = sorted(k for k in docs if k not in cur); gone = sorted(k for k in cur if k not in keep)
        changed = sorted(k for k in docs if k in cur and cur[k] != _plain(json.loads(json.dumps(docs[k], default=str))))
        for label, ids in (('se crean', new), ('cambian', changed), ('se borran', gone)):
            print(f'{coll}: {len(ids)} {label}' + (f" ({', '.join(ids)})" if ids else ''))
        return
    for d in ref.stream():
        if d.id not in keep: d.reference.delete()
    for i in range(0, len(docs), 400):
        b = db.batch()
        for k in list(docs)[i:i + 400]: b.set(ref.document(k), docs[k])
        b.commit()

def _drive_docs(drive):
    """Un documento por luchador; los plugins y las carpetas sin luchador reconocido van aparte."""
    docs = {}
    for m in drive['mods']:
        k = 'plugins' if m.get('plugin') else m['code'] or 'sin_luchador'
        docs.setdefault(k, {'code': m['code'] if k == m['code'] else None, 'mods': []})['mods'].append(m)
    return {k: {**v, 'updatedAt': now()} for k, v in docs.items()}

def seed(db, only=None, dry=False):
    done = []; fighters, meta = cd.load()
    if only in ('all', 'catalog'):
        # `vids` permite a las reglas comprobar que un cambio apunta a una apariencia que existe
        _replace(db, 'catalog', {f['code']: {**f, 'vids': [p['vid'] for p in f['picks']], 'order': i, 'updatedAt': now()} for i, f in enumerate(fighters)}, dry)
        if not dry: db.collection('meta').document('catalog').set({**meta, 'updatedAt': now()})
        done.append(f'{len(fighters)} luchadores')
    if only in ('all', 'installed'):
        inv = cd.load_inventory(fighters)
        if inv:
            _replace(db, 'installed', {c: {**v, 'updatedAt': now()} for c, v in inv['fighters'].items()}, dry)
            if not dry: db.collection('meta').document('installed').set({**inv['meta'], 'updatedAt': now()})
            done.append(f"inventario de {len(inv['fighters'])} luchadores")
    if only == 'drive':
        p = os.path.join(cd.R, 'data', 'drive.json')
        if not os.path.isfile(p): print('aviso · no existe data/drive.json (genéralo con tools/scan_drive.py); no se sincronizó el Drive')
        else:
            drive = json.load(open(p, encoding='utf-8')); docs = _drive_docs(drive)
            _replace(db, 'drive', docs, dry)
            if not dry: db.collection('meta').document('drive').set({'source': drive['source'], 'counts': drive['counts'], 'updatedAt': now()})
            done.append(f"Drive: {drive['counts']['mods']} mods en {len(docs)} documentos")
    print('ok · simulación, no se escribió nada:' if dry else 'ok · Firestore actualizado:', ', '.join(done) or 'nada')

BACKUP = ('changes', 'history', 'status', 'meta', 'selection')

def backup(db, out):
    """Copia a JSON las colecciones que no salen del repositorio. Solo lee Firestore."""
    os.makedirs(out, exist_ok=True); resumen = {}
    for coll in BACKUP:
        docs = {d.id: _plain(d.to_dict(), ()) for d in db.collection(coll).stream()}
        with open(os.path.join(out, f'{coll}.json'), 'w', encoding='utf-8') as f: f.write(json.dumps(docs, ensure_ascii=False, indent=1, sort_keys=True) + '\n')
        resumen[coll] = len(docs)
    with open(os.path.join(out, '_resumen.json'), 'w', encoding='utf-8') as f: f.write(json.dumps({'docs': resumen, 'taken_at': now().isoformat()}, indent=1) + '\n')
    print('ok · respaldo en', out, '·', ', '.join(f'{k} {v}' for k, v in resumen.items()))

def _current(inv, code, n):
    s = (((inv or {}).get('fighters') or {}).get(code) or {}).get('slots', {}).get(str(n)) or {}
    if s.get('src'):
        return {'kind': 'mod' if s.get('name') else 'unknown', 'name': s.get('name') or 'Apariencia sin identificar', 'source': s['src']}
    return {'kind': 'original', 'name': 'Original del juego', 'source': None, 'confirmed': False}

def plan(db):
    fighters, meta = cd.load(); inv = cd.load_inventory(fighters)
    by_vid = {p['vid']: (f, p) for f in fighters for p in f['picks']}
    status = {d.id: d.to_dict() for d in db.collection('status').stream()}
    rows = []
    for d in db.collection('changes').stream():
        c = d.to_dict(); f, p = by_vid.get(c.get('vid'), (None, None))
        code, n = c['code'], c['slot']; fi = next((x for x in fighters if x['code'] == code), None)
        st = status.get(c['vid']) or {}
        rows.append({'fighter': fi['name'] if fi else code, 'roster_no': code, 'traje': n + 1, 'slot': f'c{n:02d}',
                     'current': _current(inv, code, n),
                     'proposal': None if not p else {'vid': p['vid'], 'role': p['role'], 'variant': p['variant'], 'mod_id': p['id'], 'name': p['name'], 'author': p['author'], 'url': p['url'],
                                                    'online': ONLINE.get(p['wifi_status'], 'Online: sin auditar'), 'conditions': p['conditions'] or None,
                                                    'dependencies': p['deps'] or None, 'conflicts': p['conflicts'] or None, 'native_slots': p['slots_orig'],
                                                    'dest_hint': p['dest'], 'pack': p['pack'], 'withdrawn': p['withdrawn']},
                     'missing_in_catalog': p is None, 'vid': c['vid'], 'proposed_at': c['at'].isoformat() if c.get('at') else None,
                     'status': st.get('status', 'wanted'), 'result': st.get('result')})
    rows.sort(key=lambda r: (r['roster_no'], r['traje']))
    hist = [{'at': h['at'].isoformat() if h.get('at') else None, 'roster_no': h['code'], 'traje': h['slot'] + 1, 'from': h.get('from'), 'to': h.get('to'), 'kind': h.get('kind')}
            for h in (d.to_dict() for d in db.collection('history').order_by('at', direction='DESCENDING').limit(50).stream())]
    out = {'schema': 3, 'generated_at': now().isoformat(), 'catalog': meta.get('generated'),
           'inventory': {'verification': ((inv or {}).get('meta') or {}).get('verification'), 'scanned_at': ((inv or {}).get('meta') or {}).get('scanned_at'),
                         'sources': ((inv or {}).get('meta') or {}).get('sources'), 'note': ((inv or {}).get('meta') or {}).get('note')},
           'target': {'game': 'Super Smash Bros. Ultimate', 'version': '13.0.5', 'loader': 'ARCropolis 4.1.1'},
           'changes': rows, 'history': hist}
    print(json.dumps(out, ensure_ascii=False, indent=2))

def set_status(db, vid, status, result):
    db.collection('status').document(vid).set({'vid': vid, 'status': status, 'result': result, 'updated_at': now().isoformat()})
    print('ok ·', vid, '→', status)

def migrate(db):
    """selection/main (modelo anterior: una lista por dueño con slot por skin) → un cambio por traje en `changes`.
    No pisa lo que ya haya propuesto alguien en ese traje. Las claves antiguas «luchador:mod» se traducen a identificadores de variante."""
    snap = db.collection('selection').document('main').get()
    if not snap.exists: print('ok · no hay selección anterior que migrar'); return
    fighters, _ = cd.load()
    legacy = {}
    for f in fighters:
        for p in f['picks']:
            if not p['withdrawn']: legacy.setdefault(p['legacy'], p['vid'])
    done = skipped = 0
    for key, v in (snap.to_dict().get('picks') or {}).items():
        code, slot = key.split(':')[0], v.get('slot'); vid = legacy.get(key)
        fi = next((x for x in fighters if x['code'] == code), None)
        if vid is None or slot is None or fi is None or fi.get('mii'): skipped += 1; continue
        ref = db.collection('changes').document(f'{code}_{slot}')
        if ref.get().exists: skipped += 1; continue
        ref.set({'code': code, 'slot': int(slot), 'vid': vid, 'by': 'migracion', 'at': now()})
        db.collection('history').add({'code': code, 'slot': int(slot), 'from': None, 'to': vid, 'kind': 'migrate', 'by': 'migracion', 'at': now()})
        done += 1
    db.collection('meta').document('plan').set({'migrated_at': now(), 'from': 'selection/main', 'migrated': done, 'skipped': skipped})
    print(f'ok · migrados {done} cambios; omitidos {skipped} (ya existían, sin traje o sin equivalente)')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    s = sp.add_parser('seed'); s.add_argument('--only', choices=['catalog', 'installed', 'all', 'drive'], required=True, help='qué sincronizar; el inventario nunca se sincroniza sin pedirlo')
    s.add_argument('--dry-run', action='store_true', help='no escribe: muestra qué documentos se crean, cambian o borran')
    b = sp.add_parser('backup'); b.add_argument('--out', default=os.path.join(cd.R, 'data', 'plan_backup'))
    sp.add_parser('plan'); sp.add_parser('migrate')
    t = sp.add_parser('status'); t.add_argument('vid'); t.add_argument('status', choices=['installed', 'failed', 'skipped', 'wanted']); t.add_argument('--result')
    a = ap.parse_args(); db = client()
    if a.cmd == 'seed': seed(db, a.only, a.dry_run)
    elif a.cmd == 'backup': backup(db, a.out)
    elif a.cmd == 'plan': plan(db)
    elif a.cmd == 'migrate': migrate(db)
    else: set_status(db, a.vid, a.status, a.result)
