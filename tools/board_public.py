"""Alternativas del Drive listas para la tarjeta pública.

Cada fila lleva el `vid` del catálogo si existe. Sin `vid`, Firestore rechaza la propuesta
(`firestore.rules` exige que el vid esté en catalog/{code}.vids), así que la web la muestra
deshabilitada.

  python3 tools/board_public.py            # escribe public/drive-alts.json y resume
  python3 tools/board_public.py --check    # no escribe; sale 1 si el JSON publicado no cuadra
"""
import argparse, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog_data as cd

def vids_by_mod(catalog):
    found = {}
    for entry in catalog.get('entries') or []:
        mod_id, code = entry.get('mod_id'), entry.get('roster_no')
        if mod_id is None or not isinstance(code, str):
            continue
        vid = entry.get('look_id') or entry.get('variant_id') or f"{code}:{mod_id}"
        found.setdefault((code, str(mod_id)), vid)
    return found

def file_slots(mod):
    """Igual que el tablero: un archivo que toca los 8 colores no fija un color."""
    specific, broad = set(), set()
    for item in mod.get('files') or []:
        if not isinstance(item, dict) or 'animation' in str(item.get('path') or '').lower():
            continue
        got = [n for n in (item.get('slots') or []) if isinstance(n, int) and 0 <= n <= 7]
        if not got:
            continue
        (broad if len(got) == 8 else specific).update(got)
    chosen = specific or broad
    return sorted(chosen), not specific and bool(broad)

def look_name(mod):
    catalog = mod.get('catalog') or []
    if catalog and isinstance(catalog[0], dict) and catalog[0].get('look_name'):
        return catalog[0]['look_name']
    return mod.get('slug') or str(mod.get('mod_id') or '')

def drive_alts(drive, vids):
    rows = []
    for mod in drive.get('mods') or []:
        if mod.get('kind') != 'skin' or mod.get('plugin'):
            continue
        code = mod.get('code')
        if not isinstance(code, str) or not code or len(code) > 4:
            continue
        mod_id = str(mod.get('mod_id') or '')
        slots, any_color = file_slots(mod)
        if not slots:
            continue
        rows.append({
            'code': code,
            'mod_id': mod_id,
            'name': look_name(mod),
            'slots': [n + 1 for n in slots],
            'any': any_color,
            'vid': vids.get((code, mod_id)),
        })
    rows.sort(key=lambda row: (row['code'], row['name'].lower()))
    return rows

def load_rows():
    return drive_alts(cd._jload('drive.json') or {}, vids_by_mod(cd._jload('catalog.json') or {}))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    rows = load_rows()
    missing = sum(1 for row in rows if not row['vid'])
    dest = os.path.join(cd.R, 'public', 'drive-alts.json')
    if args.check:
        current = json.load(open(dest, encoding='utf-8')) if os.path.isfile(dest) else None
        if current != rows:
            print(f'drive-alts.json no cuadra ({missing} sin vid de {len(rows)})')
            return 1
    else:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        json.dump(rows, open(dest, 'w', encoding='utf-8'), ensure_ascii=False)
        print(f'ok · {dest} · {len(rows)} alternativas · {missing} sin vid')
    return 0

if __name__ == '__main__':
    sys.exit(main())
