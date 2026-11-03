"""Da entrada de catálogo «sin auditar» a las skins del Drive que aún no la tienen.

Firestore solo acepta una propuesta si su vid existe en el catálogo, así que una skin descargada sin
entrada no se puede elegir en la tarjeta. Los datos salen de data/drive.json (LINK.txt); lo que falta se
deja en `pending`, sin inventar autor, URL ni estado online.

  python3 tools/drive_to_catalog.py           # agrega las entradas que faltan a data/catalog.json
  python3 tools/drive_to_catalog.py --check   # no escribe; sale 1 si falta alguna entrada
"""
import argparse, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import board_public as bp
import catalog_data as cd

PENDING = 'pending'

def field(mod, key):
    found = re.search(rf'^{key}:\s*(.+)$', mod.get('link') or '', re.M)
    return found.group(1).strip() if found else None

def link_url(mod):
    text = mod.get('link') or ''
    found = re.search(r'https?://gamebanana\.com/mods/\d+', text)
    return found.group(0) if found else None

def readable(slug):
    return ' '.join(part for part in re.split(r'[_\-\s]+', slug or '') if part).title()

def build_entry(mod, fighter, slots, any_color):
    code, mod_id = mod['code'], mod['mod_id']
    return {
        'roster_no': code,
        'fighter': fighter,
        'dlc_required': False,
        'look_name': field(mod, 'Nombre') or readable(mod.get('slug')) or str(mod_id),
        'mod_id': mod_id,
        'url': link_url(mod) or PENDING,
        'author': field(mod, 'Autor') or PENDING,
        'preview_images': [],
        'native_slots': [] if any_color else slots,
        'proposed_destination': None,
        'role': 'alternativa',
        'look_id': f'{code}:{mod_id}',
        'audit_status': 'pending',
        'source_note': 'Descargada en el Drive; sin entrada previa en el catálogo. Sin auditar ni probar.',
    }

def missing_entries(drive, catalog):
    fighters = {e['roster_no']: e['fighter'] for e in catalog.get('entries') or [] if e.get('roster_no')}
    known = bp.vids_by_mod(catalog)
    # Lo retirado (withdrawn) se retiró a propósito: no se vuelve a abrir.
    known.update({(w.get('roster_no'), str(w.get('mod_id'))): w.get('look_id') for w in catalog.get('withdrawn') or [] if w.get('roster_no')})
    out, seen = [], set()
    # Una carpeta duplicada del Drive («… (1)») del mismo mod: gana la de nombre más corto.
    for mod in sorted(drive.get('mods') or [], key=lambda m: len(m.get('folder') or '')):
        if mod.get('kind') != 'skin' or mod.get('plugin') or not mod.get('mod_id'):
            continue
        code = mod.get('code')
        key = (code, str(mod['mod_id']))
        if not isinstance(code, str) or code not in fighters or key in known or key in seen:
            continue
        slots, any_color = bp.file_slots(mod)
        if not slots:
            continue
        seen.add(key)
        out.append(build_entry(mod, fighters[code], slots, any_color))
    return out

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    path = os.path.join(cd.R, 'data', 'catalog.json')
    catalog = json.load(open(path, encoding='utf-8'))
    new = missing_entries(cd._jload('drive.json') or {}, catalog)
    if args.check:
        print(f'{len(new)} descargadas sin entrada')
        return 1 if new else 0
    if new:
        catalog['entries'].extend(new)
        counts = catalog.setdefault('counts', {})
        # `looks` y los demás conteos son de la investigación auditada; las descargadas se cuentan aparte.
        counts['downloaded_unaudited'] = sum(e.get('audit_status') == 'pending' for e in catalog['entries'])
        with open(path, 'w', encoding='utf-8') as handle:
            json.dump(catalog, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
    print(f'ok · {len(new)} entradas nuevas · {len(catalog["entries"])} en total')
    return 0

if __name__ == '__main__':
    sys.exit(main())
