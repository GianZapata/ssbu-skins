# Valida data/catalog.json contra docs/AUDIT_CONTRACT.md antes de generar la página.
import json, os, re, sys
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default
CATALOG = arg('--catalog', os.path.join(R, 'data', 'catalog.json'))
c = json.load(open(CATALOG))
states = set(c.get('wifi_states') or [])
errs, seen = [], set()
LOCK = arg('--lock', os.path.join(R, 'data', 'ids.lock.json'))
ID_RE = re.compile(r'^(\w+):(\d+)(?::([a-z0-9][a-z0-9-]*))?$')
def identity(e):
    """Identificador persistente de una apariencia: look_id (o variant_id) del catálogo; nunca depende del orden ni del nombre."""
    return e.get('look_id') or e.get('variant_id') or f"{e.get('roster_no')}:{e.get('mod_id')}"
for e in c['entries']:
    tag = identity(e)
    m = ID_RE.match(tag)
    if not m:
        errs.append(f'{tag}: identificador con formato inválido (esperado <luchador>:<mod>[:<variante>])')
    elif (m.group(1), int(m.group(2))) != (str(e.get('roster_no')), e.get('mod_id')):
        errs.append(f'{tag}: el identificador no coincide con roster_no/mod_id ({e.get("roster_no")}:{e.get("mod_id")})')
    if e.get('role') and not e.get('look_id'):
        errs.append(f'{tag}: falta look_id (las entradas con role deben traer su identificador)')
    for f in ('roster_no', 'fighter', 'mod_id', 'look_name', 'author', 'url'):
        if not e.get(f):
            errs.append(f'{tag}: falta {f}')
    if tag in seen:
        errs.append(f'{tag}: entrada duplicada')
    seen.add(tag)
    if e.get('audit_status') != 'verified':
        continue
    ws = e.get('wifi_state')
    if ws not in states:
        errs.append(f'{tag}: wifi_state inválido: {ws!r}')
    if ws != 'Sin evidencia localizada':
        for f in ('wifi_quote', 'wifi_source', 'wifi_evidence_url'):
            if not e.get(f):
                errs.append(f'{tag}: auditada sin {f}')
    pd = e.get('proposed_destination')
    if pd is not None and not (isinstance(pd, int) and 0 <= pd <= 7):
        errs.append(f'{tag}: proposed_destination fuera de 0-7: {pd!r}')
    for f in ('conditions', 'dependencies', 'conflicts'):
        if not isinstance(e.get(f, []), list):
            errs.append(f'{tag}: {f} debe ser lista')
ids = {identity(e) for e in c['entries']}
for w in c.get('withdrawn', []):
    if w.get('roster_no') and w.get('mod_id'):
        ids.add(identity(w))
lock = set(json.load(open(LOCK))['ids']) if os.path.exists(LOCK) else set()
if '--update-lock' in sys.argv:
    json.dump({'_nota': 'Identificadores de apariencia ya publicados. Una apariencia puede retirarse (withdrawn) pero su id no puede desaparecer ni cambiar: las propuestas guardadas apuntan a él.', 'ids': sorted(lock | ids)}, open(LOCK, 'w'), ensure_ascii=False, indent=0)
    print('lock actualizado:', len(lock | ids), 'ids')
else:
    for gone in sorted(lock - ids)[:50]:
        errs.append(f'{gone}: el identificador ya publicado desapareció del catálogo (muévelo a withdrawn en lugar de borrarlo o renombrarlo)')
    new = ids - lock
    if new and lock:
        print(f'aviso: {len(new)} identificadores nuevos sin registrar; ejecuta python3 tools/validate_catalog.py --update-lock tras revisarlos')
if errs:
    print('\n'.join(errs[:50]), f'\n{len(errs)} error(es)')
    sys.exit(1)
print('catálogo ok:', len(c['entries']), 'entradas')
