# Puente entre el repositorio y Firestore (lo usan la Action de publicación, Grok y el instalador).
#
#   python3 tools/db.py seed [--only catalog|installed]   copia data/catalog.json y data/installed.json a Firestore
#   python3 tools/db.py selection                          imprime lo que eligió el dueño (JSON, contrato de docs/SELECTION_CONTRACT.md)
#   python3 tools/db.py status KEY installed|failed|skipped [--result TEXTO]   anota el resultado de una instalación
#
# Credenciales: GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de una cuenta de servicio del proyecto
# (Configuración del proyecto → Cuentas de servicio → Generar clave privada). Para pruebas locales,
# FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 y GOOGLE_CLOUD_PROJECT=demo-ssbu bastan. Requiere: pip install google-cloud-firestore
import argparse, datetime, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog_data as cd

def client():
    from google.cloud import firestore
    cfg = cd.load_firebase() or {}
    project = os.environ.get('GOOGLE_CLOUD_PROJECT') or cfg.get('projectId')
    return firestore.Client(project=project)

def now(): return datetime.datetime.now(datetime.timezone.utc)

def _replace(db, coll, docs):
    """Escribe `docs` ({id: dict}) en la colección y borra los documentos que ya no existen."""
    ref = db.collection(coll); keep = set(docs)
    for d in ref.stream():
        if d.id not in keep: d.reference.delete()
    for i in range(0, len(docs), 400):
        b = db.batch()
        for k in list(docs)[i:i + 400]: b.set(ref.document(k), docs[k])
        b.commit()

def seed(db, only=None):
    done = []
    if only in (None, 'catalog'):
        fighters, meta = cd.load()
        _replace(db, 'catalog', {f['code']: {**f, 'order': i, 'updatedAt': now()} for i, f in enumerate(fighters)})
        db.collection('meta').document('catalog').set({**meta, 'updatedAt': now()})
        done.append(f'{len(fighters)} luchadores')
    if only in (None, 'installed'):
        inst = cd.load_installed()
        if inst:
            _replace(db, 'installed', {c: {'slots': s, 'info': inst['info'].get(c, {}), 'updatedAt': now()} for c, s in inst['fighters'].items()})
            db.collection('meta').document('installed').set({'scanned_at': inst['scanned_at'], 'source': inst['source'], 'updatedAt': now()})
            done.append(f"{len(inst['fighters'])} luchadores instalados")
    print('ok · Firestore actualizado:', ', '.join(done) or 'nada')

def selection(db):
    snap = db.collection('selection').document('main').get()
    sel = snap.to_dict() if snap.exists else {}
    status = {d.id: d.to_dict() for d in db.collection('status').stream()}
    fighters, _ = cd.load()
    idx = {f"{f['code']}:{p['id']}": (f, p) for f in fighters for p in f['picks']}
    picks = sel.get('picks') or {}
    items = []
    for k, v in sorted(picks.items(), key=lambda kv: (kv[1].get('order') or 0)):
        if k not in idx: continue
        f, p = idx[k]; st = status.get(k) or {}
        sl = v.get('slot')
        items.append({'key': k, 'fighter': f['name'], 'roster_no': f['code'], 'mod_id': p['id'], 'name': p['name'], 'author': p['author'], 'url': p['url'],
                      'assigned_slot': None if sl is None else f'c{sl:02d}', 'order': v.get('order'), 'dest_slot': p.get('dest'),
                      'native_slots': p.get('slots_orig'), 'assignment': p.get('assignment'), 'audited': p.get('audited'),
                      'wifi': p.get('wifi_status') or 'pendiente', 'dependencies': p.get('deps') or None, 'conflicts': p.get('conflicts') or None,
                      'notes': p.get('notes') or None, 'status': st.get('status', 'wanted'), 'result': st.get('result'), 'updated_at': st.get('updated_at')})
    out = {'schema': 2, 'owner': sel.get('ownerName'), 'catalog': (db.collection('meta').document('catalog').get().to_dict() or {}).get('generated'),
           'target': {'game': 'Super Smash Bros. Ultimate', 'version': '13.0.5', 'loader': 'ARCropolis 4.1.1', 'modpack_repo': 'GianZapata/Gian-Ultimate-Modpack-private'},
           'limits': {'per_fighter': 7 if sel.get('keepOrig') else 8, 'keep_original_slot': bool(sel.get('keepOrig'))},
           'replace_slots': sel.get('repl') or {}, 'items': items}
    print(json.dumps(out, ensure_ascii=False, indent=2))

def set_status(db, key, status, result):
    db.collection('status').document(key).set({'key': key, 'status': status, 'result': result, 'updated_at': now().isoformat()})
    print('ok ·', key, '→', status)

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    s = sp.add_parser('seed'); s.add_argument('--only', choices=['catalog', 'installed'])
    sp.add_parser('selection')
    t = sp.add_parser('status'); t.add_argument('key'); t.add_argument('status', choices=['installed', 'failed', 'skipped', 'wanted']); t.add_argument('--result')
    a = ap.parse_args(); db = client()
    if a.cmd == 'seed': seed(db, a.only)
    elif a.cmd == 'selection': selection(db)
    else: set_status(db, a.key, a.status, a.result)
