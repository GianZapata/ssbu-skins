#!/usr/bin/env python3
"""Deriva las familias de colores (c00-c07) de cada luchador desde dir_info_with_files_trimmed.json.

Uso:
  python3 tools/export_families.py [--vanilla-files RUTA] [--out data/families.json]
  python3 tools/export_families.py --check [--vanilla-files RUTA] [--out data/families.json]

Compara únicamente fighter/<interno>/model/body/c0[0-7]/*.nutexb, excluyendo animaciones (.nuanmb),
adyacencia (.adjb), LOD (.xmb) y texturas de accesorios numerados por slot."""
import argparse, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog_data as cd
from scan_installed import INTERNAL

DEFAULT_VANILLA = os.path.expanduser(
    '~/Documents/smash-mod-assets/tools-data/reslotter/a853c3d09181/dir_info_with_files_trimmed.json'
)
NUTEXB = re.compile(r'^fighter/([a-z0-9_]+)/model/body/c0([0-7])/([^/]+\.nutexb)$')
ACCESSORY = re.compile(r'^(?:(?:def|alp)_(?:pikachu|pichu|purin)parts_|def_sonic_00[2-8]_)')

# Normalizaciones documentadas del ModPack donde la malla real difiere o se comparte respecto a .nutexb sueltos:
# - 49 Little Mac: c00-c05 boxeador normal; c06-c07 wireframe / sudadera (malla distinta).
# - 80 Mythra: los 8 trajes comparten familia funcional en el ModPack (c07 solo añade media opaca).
# - 81 Kazuya: pares (traje) e impares (karategi).
OVERRIDES = {
    '49': [[0, 1, 2, 3, 4, 5], [6, 7]],
    '80': [[0, 1, 2, 3, 4, 5, 6, 7]],
    '81': [[0, 2, 4, 6], [1, 3, 5, 7]],
}


def load_vanilla_paths(path):
    if not os.path.isfile(path):
        raise FileNotFoundError(f'no existe --vanilla-files: {path}')
    with open(path, encoding='utf-8') as f:
        if path.endswith('.json'):
            data = json.load(f)
            if not isinstance(data, dict) or not isinstance(data.get('file_array'), list):
                raise ValueError(f'{path}: falta la lista file_array')
            return [row for row in data['file_array'] if isinstance(row, str) and not row.startswith('0x')]
        return [line.strip() for line in f if line.strip() and not line.startswith('0x')]


def build_families(paths, codes, overrides=None):
    active_overrides = OVERRIDES if overrides is None else overrides
    by_code = {}
    for raw in paths:
        match = NUTEXB.match(raw)
        if not match:
            continue
        internal, slot_str, tex = match.group(1), match.group(2), match.group(3)
        code = INTERNAL.get(internal)
        if not code or ACCESSORY.match(tex):
            continue
        by_code.setdefault(code, {slot: set() for slot in range(8)})[int(slot_str)].add(f'{internal}:{tex}')

    out = {}
    for code in codes:
        if code in active_overrides:
            out[code] = [list(group) for group in active_overrides[code]]
            continue
        slots_map = by_code.get(code)
        if not slots_map or all(len(files) == 0 for files in slots_map.values()):
            out[code] = [list(range(8))]
            continue
        groups, seen = [], {}
        for slot in range(8):
            sig = tuple(sorted(slots_map[slot]))
            if sig not in seen:
                seen[sig] = []
                groups.append(seen[sig])
            seen[sig].append(slot)
        out[code] = groups
    return out


def format_json(families):
    lines = ['{']
    items = list(families.items())
    for idx, (code, groups) in enumerate(items):
        comma = ',' if idx + 1 < len(items) else ''
        lines.append(f'  {json.dumps(code, ensure_ascii=False)}: {json.dumps(groups)}{comma}')
    lines.append('}\n')
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--vanilla-files', default=DEFAULT_VANILLA, help='ruta a dir_info_with_files_trimmed.json')
    parser.add_argument('--out', default=os.path.join(cd.R, 'data', 'families.json'), help='JSON de salida')
    parser.add_argument('--check', action='store_true', help='verifica que el archivo coincide sin escribir')
    args = parser.parse_args()

    fighters, _ = cd.load()
    codes = [fighter['code'] for fighter in fighters]
    families = build_families(load_vanilla_paths(args.vanilla_files), codes)
    rendered = format_json(families)

    if args.check:
        if not os.path.isfile(args.out):
            print(f'falta {args.out}', file=sys.stderr)
            return 1
        with open(args.out, encoding='utf-8') as f:
            current = json.load(f)
        if current != families:
            print(f'{args.out} no coincide con {args.vanilla_files}', file=sys.stderr)
            return 1
        print(f'ok · {args.out} al día ({len(families)} luchadores)')
        return 0

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, 'w', encoding='utf-8') as f:
        f.write(rendered)
    multi = sum(1 for groups in families.values() if len(groups) > 1)
    print(f'ok · {args.out} · {len(families)} luchadores ({multi} con múltiples familias)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
