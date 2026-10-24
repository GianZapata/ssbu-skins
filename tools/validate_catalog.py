# Valida data/catalog.json contra docs/AUDIT_CONTRACT.md antes de generar la página.
import json, os, sys
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
c = json.load(open(os.path.join(R, 'data', 'catalog.json')))
states = set(c.get('wifi_states') or [])
errs, seen = [], set()
for e in c['entries']:
    tag = f"{e.get('roster_no')}:{e.get('mod_id')}"
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
if errs:
    print('\n'.join(errs[:50]), f'\n{len(errs)} error(es)')
    sys.exit(1)
print('catálogo ok:', len(c['entries']), 'entradas')
