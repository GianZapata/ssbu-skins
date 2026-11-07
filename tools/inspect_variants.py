# Inspecciona las variantes reales de un mod del Drive: descomprime una COPIA local del archivo y lista qué apariencias trae cada color.
# Uso: python3 tools/inspect_variants.py <SSBU_mods> <mod_id>... [--work <dir>] [--out data/variants] [--portraits <dir>]
# Solo lee el Drive. No toca la SD, el catálogo ni Firestore. Escribe un manifiesto por mod en --out (<mod_id>.json).
import argparse, hashlib, json, os, re, shutil, struct, subprocess, sys, zipfile

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SKIP_DIRS = {'__MACOSX'}
SKIP_FILES = {'.DS_Store'}
DIR_TOKEN = re.compile(r'(?:^|/)c(\d\d)(?=/)')
FILE_TOKEN = re.compile(r'[_.]c(\d\d)(?=[_.])')
CHARA = re.compile(r'^chara_\d+_[a-z0-9_]+_(\d\d)\.bntx$')
ARCHIVE_EXT = ('.zip', '.rar', '.7z')
SPLIT = re.compile(r'\.(z\d\d|part\d+\.rar|r\d\d)$')
TRIM_MARGIN = 0.08


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def md5(path):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def portrait_size(path):
    """Área en píxeles leída de la cabecera BRTI del BNTX (0 si no es BNTX válido)."""
    try:
        with open(path, 'rb') as stream:
            header = stream.read(4096)
    except OSError:
        return 0
    offset = header.find(b'BRTI')
    if header[:4] != b'BNTX' or offset < 0 or offset + 0x2C > len(header):
        return 0
    width, height = struct.unpack_from('<II', header, offset + 0x24)
    return width * height


def trim_to_figure(image, margin_ratio=TRIM_MARGIN):
    rgba = image.convert('RGBA')
    bbox = rgba.getbbox()
    if not bbox:
        return rgba
    x0, y0, x1, y1 = bbox
    pad = max(1, int(max(x1 - x0, y1 - y0) * margin_ratio))
    return rgba.crop((max(0, x0 - pad), max(0, y0 - pad), min(rgba.width, x1 + pad), min(rgba.height, y1 + pad)))


def color_of(rel):
    """(índice 0-7 o None, ruta normalizada sin el color). Un número fuera de 0-7 no es un color."""
    name = os.path.basename(rel)
    m = CHARA.match(name)
    if m and 'chara' in rel and int(m[1]) <= 7:
        return int(m[1]), rel[:-len(name)] + re.sub(r'_\d\d\.bntx$', '_XX.bntx', name)
    m = DIR_TOKEN.search(rel)
    if m and int(m[1]) <= 7:
        return int(m[1]), rel[:m.start(1)] + 'XX' + rel[m.end(1):]
    m = FILE_TOKEN.search(name)
    if m and int(m[1]) <= 7:
        return int(m[1]), rel[:-len(name)] + name[:m.start(1)] + 'XX' + name[m.end(1):]
    return None, rel


def real_files(root):
    for base, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS and not d.startswith('._'))
        for name in sorted(files):
            if name in SKIP_FILES or name.startswith('._'):
                continue
            full = os.path.join(base, name)
            if os.path.islink(full):
                continue
            yield os.path.relpath(full, root).replace(os.sep, '/'), full


def best_portrait(items):
    candidates = [(idx, portrait_size(full), rel) for idx, (_, rel, full) in enumerate(items) if CHARA.match(os.path.basename(rel))]
    if not candidates:
        return None
    return max(candidates, key=lambda item: (item[1], -item[0]))[2]


def variants_in(root):
    """Variantes por color de un árbol ya extraído. Un color solo existe si tiene archivos reales."""
    colors, shared = {}, []
    for rel, full in real_files(root):
        n, norm = color_of(rel)
        if n is None:
            shared.append(rel)
        else:
            colors.setdefault(n, []).append((norm, rel, full))
    out, seen = [], {}
    for n in sorted(colors):
        items = sorted(colors[n])
        digest = hashlib.sha256()
        for norm, _, full in items:
            digest.update(norm.encode() + b'\0' + sha256(full).encode() + b'\0')
        content = digest.hexdigest()
        out.append({
            'color': n,
            'slot': f'c{n:02d}',
            'files_count': len(items),
            'content_sha256': content,
            'duplicate_of': seen.get(content),
            'portrait_source': best_portrait(items),
            'has_model': any('/model/' in '/' + rel for _, rel, _ in items),
        })
        seen.setdefault(content, f'c{n:02d}')
    return out, shared


def extract(archive, dest):
    """Devuelve None si extrajo, o el motivo si no pudo. Siempre trabaja sobre una copia en dest.

    Extrae en dest + '.partial' y lo renombra a dest solo al terminar: dest existe únicamente si quedó completo."""
    if os.path.isdir(dest) and os.listdir(dest):
        return None
    low = archive.lower()
    if SPLIT.search(low):
        return 'archivo partido'
    partial = dest + '.partial'
    shutil.rmtree(partial, ignore_errors=True)
    os.makedirs(partial, exist_ok=True)
    try:
        reason = unpack(archive, low, partial)
        if reason:
            return reason
        shutil.rmtree(dest, ignore_errors=True)
        os.replace(partial, dest)
        return None
    except Exception as e:
        return f'{type(e).__name__}: {e}'
    finally:
        shutil.rmtree(partial, ignore_errors=True)


def unpack(archive, low, dest):
    """Extrae en dest (ya creado). Devuelve None si salió bien o el motivo."""
    if low.endswith('.zip'):
        with zipfile.ZipFile(archive) as z:
            base = os.path.realpath(dest)
            for info in z.infolist():
                target = os.path.realpath(os.path.join(dest, info.filename))
                if target != base and not target.startswith(base + os.sep):
                    raise ValueError('ruta fuera del destino')
            z.extractall(dest)
        return None
    tools = [(name, cmd) for name, cmd in (
        ('7zz', ['7zz', 'x', '-y', '-bd', '-o' + dest, archive]),
        ('unar', ['unar', '-q', '-f', '-o', dest, archive]),
    ) if shutil.which(name)]
    if not tools:
        return 'sin 7zz ni unar'
    failures = []
    for name, cmd in tools:
        r = subprocess.run(cmd, capture_output=True, text=True)
        if not r.returncode:
            return None
        shutil.rmtree(dest, ignore_errors=True)
        os.makedirs(dest, exist_ok=True)
        failures.append(name + (' no soporta el método' if 'Unsupported' in r.stdout + r.stderr else ' falló'))
    return '; '.join(failures)


def inspect_mod(mod, drive_root, work):
    mod_dir = os.path.join(drive_root, mod['folder'])
    archives = []
    for item in mod.get('files') or []:
        if not (item['path'].lower().endswith(ARCHIVE_EXT) or SPLIT.search(item['path'].lower())):
            continue
        full = os.path.join(mod_dir, item['path'])
        entry = {'path': item['path'], 'md5': item.get('md5'), 'kind': item.get('kind')}
        if not os.path.isfile(full):
            archives.append({**entry, 'inspected': False, 'reason': 'archivo ausente del Drive'})
            continue
        actual = md5(full)
        if item.get('md5') and actual != item['md5']:
            archives.append({**entry, 'inspected': False, 'reason': f'MD5 distinto del manifiesto ({actual})'})
            continue
        dest = os.path.join(work, str(mod['mod_id']), actual)
        reason = extract(full, dest)
        if reason:
            archives.append({**entry, 'md5': actual, 'inspected': False, 'reason': reason})
            continue
        found, shared = variants_in(dest)
        for v in found:
            v['variant_id'] = f"{mod['code']}:{mod['mod_id']}:{actual[:8]}:{v['slot']}"
        archives.append({**entry, 'md5': actual, 'inspected': True, 'variants': found, 'shared_files': len(shared), 'shared_sample': shared[:10], '_root': dest})
    return {'mod_id': mod['mod_id'], 'code': mod['code'], 'folder': mod['folder'], 'archives': archives}


def export_portraits(manifest, out_dir):
    """Retratos opcionales: decodifica con tools/bntx.py y Pillow, recortando igual que sd_board_portraits.py."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from bntx import decode
    os.makedirs(out_dir, exist_ok=True)
    for a in manifest['archives']:
        for v in a.get('variants') or []:
            v['portrait'] = None
            if not v['portrait_source']:
                continue
            src = os.path.join(a['_root'], v['portrait_source'])
            if os.path.islink(src):
                continue
            try:
                sha = sha256(src)
                dest = os.path.join(out_dir, sha + '.webp')
                if not os.path.isfile(dest):
                    image = trim_to_figure(decode(src))
                    image.thumbnail((512, 512))
                    image.save(dest, 'WEBP', quality=85, method=4)
                v['portrait'] = sha
            except Exception:
                v['portrait'] = None


def keeps_previous(path, inspected):
    """True si no se debe sobrescribir: la corrida nueva inspeccionó 0 archivos y el manifiesto existente tenía alguno."""
    if inspected or not os.path.isfile(path):
        return False
    try:
        with open(path, encoding='utf-8') as f:
            old = json.load(f)
    except (OSError, ValueError):
        return False
    return any(x.get('inspected') for x in old.get('archives') or [])


def main():
    p = argparse.ArgumentParser(description='Inspecciona variantes de mods del Drive sobre una copia local.')
    p.add_argument('drive')
    p.add_argument('mod_ids', nargs='+')
    p.add_argument('--work', default=os.path.expanduser('~/Documents/smash-mod-assets/derived/variants'))
    p.add_argument('--out', default=os.path.join(R, 'data', 'variants'))
    p.add_argument('--portraits')
    p.add_argument('--force', action='store_true', help='sobrescribe un manifiesto con archivos inspeccionados aunque esta corrida no inspeccione ninguno')
    a = p.parse_args()
    if not os.path.isdir(a.drive):
        sys.exit('El Drive no es una carpeta: no escribo nada.')
    if not os.path.isdir(os.path.join(a.drive, 'mario')) and not any(os.path.isdir(os.path.join(a.drive, d)) for d in os.listdir(a.drive)):
        sys.exit('El Drive no tiene carpetas de luchadores: no escribo nada.')
    with open(os.path.join(R, 'data', 'drive.json'), encoding='utf-8') as f:
        drive = json.load(f)
    mods = {str(m['mod_id']): m for m in drive['mods']}
    os.makedirs(a.out, exist_ok=True)
    rc = 0
    for mod_id in a.mod_ids:
        mod = mods.get(mod_id)
        if not mod or mod.get('kind') != 'skin':
            print(f'{mod_id}: no es una skin del manifiesto')
            rc = 1
            continue
        manifest = inspect_mod(mod, a.drive, a.work)
        if a.portraits:
            export_portraits(manifest, a.portraits)
        for ar in manifest['archives']:
            ar.pop('_root', None)
        ok = sum(1 for x in manifest['archives'] if x['inspected'])
        path = os.path.join(a.out, f'{mod_id}.json')
        if not a.force and keeps_previous(path, ok):
            print(f'{mod_id}: 0 archivos inspeccionados; conservo el manifiesto anterior')
            rc = 1
            continue
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=1, sort_keys=True)
            f.write('\n')
        print(f"{mod_id}: {ok}/{len(manifest['archives'])} archivos inspeccionados")
    return rc


if __name__ == '__main__':
    sys.exit(main())
