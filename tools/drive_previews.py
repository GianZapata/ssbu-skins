"""Trae las capturas de GameBanana de las descargadas sin auditar y sube la portada a Cloudinary.

1. Para cada entrada `audit_status == 'pending'` sin `preview_images`, consulta la API pública de
   GameBanana y guarda las capturas con la misma forma que el resto del catálogo.
2. Con `--cloudinary`, sube la portada (530 px) como `ssbu/previews/{mod_id}` y la anota en
   data/drive_previews.json (mod_id -> public_id). Repetir no duplica.

  python3 tools/drive_previews.py --dry-run
  python3 tools/drive_previews.py --cloudinary

Credenciales de Cloudinary en el entorno o en un .env.local (no se versiona; nunca se imprimen):
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
"""
import argparse, hashlib, json, mimetypes, os, sys, time, urllib.request, uuid
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog_data as cd

API = 'https://gamebanana.com/apiv11/Mod/{id}?_csvProperties=_aPreviewMedia'
MAP = os.path.join(cd.R, 'data', 'drive_previews.json')

def get(url, timeout=30):
    request = urllib.request.Request(url, headers={'User-Agent': 'ssbu-skins/1.0'})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()

def fetch_images(mod_id):
    """Capturas de la página del mod en el formato de `preview_images` del catálogo; [] si no hay."""
    try:
        data = json.loads(get(API.format(id=mod_id)).decode())
    except Exception:
        return None
    images = ((data.get('_aPreviewMedia') or {}).get('_aImages')) or []
    out = []
    for item in images:
        base, name = item.get('_sBaseUrl'), item.get('_sFile')
        if item.get('_sType') != 'screenshot' or not base or not name:
            continue
        mid, small = item.get('_sFile530'), item.get('_sFile220')
        out.append({
            'base': base, 'file': name, 'file530': mid, 'file220': small,
            'url': f'{base}/{name}',
            'url530': f'{base}/{mid}' if mid else None,
            'url220': f'{base}/{small}' if small else None,
        })
    return out

def load_env(path):
    if not os.path.isfile(path):
        return
    for line in open(path, encoding='utf-8'):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

def sign(params, secret):
    raw = '&'.join(f'{key}={params[key]}' for key in sorted(params)) + secret
    return hashlib.sha1(raw.encode()).hexdigest()

def upload(cloud, key, secret, public_id, name, content):
    params = {'public_id': public_id, 'timestamp': str(int(time.time()))}
    fields = {**params, 'api_key': key, 'signature': sign(params, secret)}
    boundary = uuid.uuid4().hex
    chunks = [f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in fields.items()]
    mime = mimetypes.guess_type(name)[0] or 'image/jpeg'
    chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\nContent-Type: {mime}\r\n\r\n'.encode())
    chunks.append(content)
    chunks.append(f'\r\n--{boundary}--\r\n'.encode())
    request = urllib.request.Request(
        f'https://api.cloudinary.com/v1_1/{cloud}/image/upload', data=b''.join(chunks),
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode())

def cover_url(entry):
    for image in entry.get('preview_images') or []:
        if image.get('url530') or image.get('url'):
            return image.get('url530') or image['url']
    return None

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cloudinary', action='store_true', help='sube la portada a Cloudinary')
    parser.add_argument('--dry-run', action='store_true', help='no escribe ni sube; solo cuenta')
    args = parser.parse_args()
    path = os.path.join(cd.R, 'data', 'catalog.json')
    catalog = json.load(open(path, encoding='utf-8'))
    pending = [e for e in catalog['entries'] if e.get('audit_status') == 'pending']
    filled = skipped = 0
    for entry in pending:
        if entry.get('preview_images'):
            continue
        images = fetch_images(entry['mod_id'])
        if not images:
            skipped += 1
            continue
        filled += 1
        if not args.dry_run:
            entry['preview_images'] = images
        time.sleep(0.2)
    print(f'capturas: {filled} entradas con imágenes · {skipped} sin imágenes · {len(pending)} sin auditar')
    if args.dry_run:
        return 0
    with open(path, 'w', encoding='utf-8') as handle:
        json.dump(catalog, handle, ensure_ascii=False, indent=2)
        handle.write('\n')
    if not args.cloudinary:
        return 0
    for env in (os.path.join(cd.R, '.env.local'), os.path.join(cd.R, '..', 'Gian-Ultimate-Modpack-private', '.env.local')):
        load_env(env)
    cloud, key, secret = (os.environ.get(n) for n in ('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'))
    if not (cloud and key and secret):
        print('faltan credenciales de Cloudinary', file=sys.stderr)
        return 1
    done = json.load(open(MAP, encoding='utf-8')) if os.path.isfile(MAP) else {}
    sent = failed = 0
    for entry in pending:
        mod_id, url = str(entry['mod_id']), cover_url(entry)
        if not url or mod_id in done:
            continue
        try:
            public_id = f'ssbu/previews/{mod_id}'
            upload(cloud, key, secret, public_id, os.path.basename(url), get(url))
            done[mod_id] = public_id
            sent += 1
        except Exception as error:
            failed += 1
            print(f'{mod_id}: {type(error).__name__}', file=sys.stderr)
    with open(MAP, 'w', encoding='utf-8') as handle:
        json.dump(done, handle, ensure_ascii=False, indent=1, sort_keys=True)
        handle.write('\n')
    print(f'cloudinary: {sent} subidas · {failed} con error · {len(done)} en el mapa')
    return 1 if failed else 0

if __name__ == '__main__':
    sys.exit(main())
