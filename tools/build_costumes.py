# Trajes originales de cada luchador (c00…c07): assets/costumes/<código>-<n>.webp, n = 1…8, más data/original_costumes.json (qué trajes existen).
#   python3 tools/build_costumes.py            baja los que falten
#   python3 tools/build_costumes.py --force    los baja todos otra vez
# Fuente: render oficial de smashbros.com (main.png = traje 1, main2.png … main8.png = trajes 2…8; el orden coincide con c00…c07, comprobado con Steve/Alex).
# La URL base de cada luchador sale de data/catalog.json → original_refs. Un traje que el sitio no tiene (HTTP 404) se omite y queda anotado en el JSON.
# Lo ejecuta la Action «Trajes originales» (el sandbox de desarrollo no llega a smashbros.com).
import io, json, os, sys, urllib.error, urllib.request
from PIL import Image
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def file_of(code): return code.replace('ε', 'e')
def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read()
def main(force):
    refs = json.load(open(os.path.join(R, 'data', 'catalog.json'), encoding='utf-8'))['original_refs']
    out = os.path.join(R, 'assets', 'costumes'); os.makedirs(out, exist_ok=True)
    have, errors, new = {}, [], 0
    for code, ref in refs.items():
        base = ref['image_url'].rsplit('/', 1)[0]; have[code] = []
        for n in range(1, 9):
            dst = os.path.join(out, f'{file_of(code)}-{n}.webp')
            if os.path.exists(dst) and not force: have[code].append(n); continue
            try: raw = fetch(f"{base}/main{'' if n == 1 else n}.png")
            except urllib.error.HTTPError as e:
                if e.code != 404: errors.append(f'{code} traje {n}: HTTP {e.code}')
                continue
            except Exception as e: errors.append(f'{code} traje {n}: {e}'); continue
            im = Image.open(io.BytesIO(raw)).convert('RGBA'); box = im.getchannel('A').getbbox()
            if box: im = im.crop(box)
            side = max(im.size); sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
            sq.resize((256, 256), Image.LANCZOS).save(dst, 'WEBP', quality=80, method=6); have[code].append(n); new += 1
    json.dump({'source': 'smashbros.com main.png…main8.png', 'costumes': have}, open(os.path.join(R, 'data', 'original_costumes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    short = {c: [n for n in range(1, 9) if n not in v] for c, v in have.items() if len(v) < 8}
    print(f'ok · {new} nuevos · luchadores con menos de 8 trajes: {short} · errores: {errors}')
    if errors: sys.exit(1)
if __name__ == '__main__': main('--force' in sys.argv)
