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

def unaudited_mods(catalog):
    """(código, mod) de las entradas que el catálogo aún no audita (descargadas del Drive)."""
    return {(e.get('roster_no'), str(e.get('mod_id'))) for e in catalog.get('entries') or [] if e.get('audit_status') != 'verified'}

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


def load_variants():
    """Manifiestos de tools/inspect_variants.py por mod_id. Sin carpeta, la web ofrece el mod sin variantes."""
    folder = os.path.join(cd.R, 'data', 'variants')
    found = {}
    if os.path.isdir(folder):
        for name in sorted(os.listdir(folder)):
            if name.endswith('.json'):
                with open(os.path.join(folder, name), encoding='utf-8') as f:
                    found[name[:-5]] = json.load(f)
    return found


def published_portraits(sd_map=None, extra=None):
    """Unión de hashes SHA-256 ya publicados en Cloudinary (SD instalada + variantes subidas)."""
    found = {
        sha
        for slots in (sd_map or {}).values()
        if isinstance(slots, dict)
        for sha in slots.values()
        if isinstance(sha, str) and len(sha) == 64
    }
    if isinstance(extra, dict):
        extra = extra.values()
    for sha in extra or []:
        if isinstance(sha, str) and len(sha) == 64:
            found.add(sha)
    return found


def variants_of(manifest, published=frozenset()):
    """Apariencias distintas de un mod: solo archivos originales con modelo, sin colores repetidos ni packs parciales.

    Dos archivos con el mismo contenido de un color (pack completo y single_slot) son una sola apariencia: gana el que trae más colores.
    El retrato solo se ofrece si ya está publicado; nunca se sustituye por otra imagen."""
    archives = [a for a in (manifest or {}).get('archives') or [] if a.get('inspected') and a.get('kind') == 'original' and a.get('path')]
    archives.sort(key=lambda a: (-len(a.get('variants') or []), a['path']))
    seen, out = set(), []
    for archive in archives:
        for v in archive.get('variants') or []:
            if not v.get('content_sha256') or not v.get('variant_id') or not isinstance(v.get('color'), int):
                continue
            if not v.get('has_model') or v.get('duplicate_of') or v['content_sha256'] in seen:
                continue
            seen.add(v['content_sha256'])
            sha = v.get('portrait')
            out.append({
                'id': v['variant_id'],
                'slot': v['color'] + 1,
                'source': archive['path'],
                'portrait': sha if sha in published else None,
            })
    out.sort(key=lambda row: (row['slot'], row['id']))
    return out


def drive_alts(drive, vids, unaudited=frozenset(), previews=None, variants=None, published=frozenset()):
    previews = previews or {}
    variants = variants or {}
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
            'unaudited': (code, mod_id) in unaudited,
            'img': previews.get(mod_id),
            'variants': variants_of(variants.get(mod_id), published),
        })
    rows.sort(key=lambda row: (row['code'], row['name'].lower()))
    return rows


def load_rows():
    catalog = cd._jload('catalog.json') or {}
    published = published_portraits(cd._jload('sd_portraits.json'), cd._jload('variant_portraits.json'))
    return drive_alts(
        cd._jload('drive.json') or {},
        vids_by_mod(catalog),
        unaudited_mods(catalog),
        cd._jload('drive_previews.json') or {},
        load_variants(),
        published,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    rows = load_rows()
    missing = sum(1 for row in rows if not row['vid'])
    dest = os.path.join(cd.R, 'public', 'drive-alts.json')
    if args.check:
        current = None
        if os.path.isfile(dest):
            with open(dest, encoding='utf-8') as f:
                current = json.load(f)
        if current != rows:
            print(f'drive-alts.json no cuadra ({missing} sin vid de {len(rows)})')
            return 1
    else:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'w', encoding='utf-8') as f:
            json.dump(rows, f, ensure_ascii=False)
        print(f'ok · {dest} · {len(rows)} alternativas · {missing} sin vid')
    return 0


if __name__ == '__main__':
    sys.exit(main())
