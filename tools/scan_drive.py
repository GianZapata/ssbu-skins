# Escanea la carpeta de mods del Drive y escribe data/drive.json: qué archivos hay, su MD5 y qué slots traen.
# Uso: python3 tools/scan_drive.py "<ruta a My Drive/SSBU_mods>" [--out data/drive.json] [--rehash]
# Estructura esperada: <raíz>/<luchador>/<modid>_<slug>/{LINK.txt, NOTA.txt, original/, modificado/}; `_plugins` es la carpeta de plugins y `_ui` la de UI/CSS (no son luchadores).
# Por mod: `kind` ('skin', 'plugin' o 'ui') y `origin`, la columna «origen» de ORIGENES.md en la raíz (enlace del usuario, búsqueda, búsqueda + enlace del usuario o desconocido; null si no hay fila).
# Los binarios viven en el Drive; git guarda este manifiesto (el historial lo da cada commit, por eso no lleva fecha).
# Slots: los .zip se leen con zipfile y los .rar/.7z con `7zz l` (solo lista, nunca extrae). Sin 7zz, o si falla, y en los zip partidos, queda `listed: false` con su motivo.
# Por archivo listado: `files_count` y `non_slot` (rutas de efectos, motion, param, .prc, config.json, ui_chara_db, msg_name o bgm que no llevan slot cNN: candidatos a archivos globales).
# El MD5 se reutiliza del manifiesto anterior si el archivo tiene la misma ruta y el mismo tamaño (--rehash lo recalcula todo).
import argparse, hashlib, json, os, re, shutil, subprocess, sys, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scan_installed import INTERNAL
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# carpeta del Drive (nombre en inglés, snake_case) -> nombre interno del juego
FOLDERS = {
 'mario':'mario','donkey_kong':'donkey','dk':'donkey','link':'link','samus':'samus','dark_samus':'samusd','yoshi':'yoshi','kirby':'kirby','fox':'fox',
 'pikachu':'pikachu','luigi':'luigi','ness':'ness','captain_falcon':'captain','jigglypuff':'purin','peach':'peach','daisy':'daisy','bowser':'koopa',
 'ice_climbers':'popo','sheik':'sheik','zelda':'zelda','dr_mario':'mariod','pichu':'pichu','falco':'falco','marth':'marth','lucina':'lucina',
 'young_link':'younglink','ganondorf':'ganon','mewtwo':'mewtwo','roy':'roy','chrom':'chrom','mr_game_and_watch':'gamewatch','game_and_watch':'gamewatch',
 'meta_knight':'metaknight','pit':'pit','dark_pit':'pitb','zero_suit_samus':'szerosuit','wario':'wario','snake':'snake','ike':'ike','squirtle':'pzenigame',
 'ivysaur':'pfushigisou','charizard':'plizardon','diddy_kong':'diddy','lucas':'lucas','sonic':'sonic','king_dedede':'dedede','dedede':'dedede',
 'olimar':'pikmin','lucario':'lucario','rob':'robot','toon_link':'toonlink','wolf':'wolf','villager':'murabito','mega_man':'rockman',
 'wii_fit_trainer':'wiifit','rosalina':'rosetta','rosalina_and_luma':'rosetta','little_mac':'littlemac','greninja':'gekkouga','mii_brawler':'miifighter',
 'mii_swordfighter':'miiswordsman','mii_gunner':'miigunner','palutena':'palutena','pac_man':'pacman','pacman':'pacman','robin':'reflet','shulk':'shulk',
 'bowser_jr':'koopajr','duck_hunt':'duckhunt','ryu':'ryu','ken':'ken','cloud':'cloud','corrin':'kamui','bayonetta':'bayonetta','inkling':'inkling',
 'ridley':'ridley','simon':'simon','richter':'richter','king_k_rool':'krool','k_rool':'krool','isabelle':'shizue','incineroar':'gaogaen',
 'piranha_plant':'packun','joker':'jack','hero':'brave','banjo':'buddy','banjo_and_kazooie':'buddy','terry':'dolly','byleth':'master','min_min':'tantan',
 'steve':'pickel','sephiroth':'edge','pyra':'eflame','mythra':'elight','kazuya':'demon','sora':'trail',
 'pyra_mythra':'eflame'}   # pyra_mythra comparte slots con Mythra (elight, código 80): el manifiesto la guarda bajo Pyra (79)
PLUGINS = '_plugins'
UI = '_ui'   # UI/CSS/banners: no son skins ni luchadores
NO_FIGHTER = {PLUGINS, UI}
SKIP = {'_respaldos'}
SLOT_RES = [re.compile(r'/c(\d\d)/'), re.compile(r'_c(\d\d)[._]'), re.compile(r'chara_\d+_\w+?_(\d\d)\.bntx$')]
MOD = re.compile(r'^(\d+)_(.+)$')
PART = re.compile(r'\.zip\.part\d+$', re.I)
NOT_MOD = 'no es un archivo de mod'  # notas sueltas (.txt): no cuentan como archivos sin listar

def md5(path):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()

def text(path):
    if not os.path.isfile(path): return None
    return open(path, encoding='utf-8-sig', errors='replace').read().strip() or None

NON_SLOT = re.compile(r'(^|/)(effect|motion|param|stream;|bgm)(/|$)|\.(prc|eff)$|(^|/)(config\.json|ui_chara_db\.prcxml|msg_name\.xmsbt)$|(^|/)bgm_', re.I)

def analyze(names):
    """names: rutas de archivos (sin carpetas). Devuelve slots, files_count y non_slot (sin la carpeta raíz común)."""
    names = [n.replace('\\', '/') for n in names]
    roots = {n.split('/')[0] for n in names}
    if len(roots) == 1 and all('/' in n for n in names): names = [n.split('/', 1)[1] for n in names]
    found = set(); glob = set()
    for n in names:
        hit = {int(x) for rx in SLOT_RES for x in rx.findall('/' + n)}
        found |= hit
        if not hit and NON_SLOT.search(n): glob.add(n)
    return {'slots': sorted(found), 'files_count': len(names), 'non_slot': sorted(glob)[:40]}

def zip_info(path):
    """Slots (c00-c99 y retratos chara_N_<luchador>_NN) y archivos no slotteados de un .zip."""
    with zipfile.ZipFile(path) as z: return analyze([n for n in z.namelist() if not n.endswith('/')])

def sevenzip_names(path, exe):
    """Archivos (sin carpetas) de un .rar/.7z según `7zz l -slt`; None si no se pudo listar. Solo lista."""
    try: r = subprocess.run([exe, 'l', '-ba', '-slt', '--', path], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=120)
    except (subprocess.TimeoutExpired, OSError): return None
    if r.returncode != 0: return None
    names = []
    for block in r.stdout.split('\n\n'):
        f = dict(l.split(' = ', 1) for l in block.splitlines() if ' = ' in l)
        if 'Path' not in f: continue
        if f.get('Folder') == '+' or f.get('Attributes', '')[:1] in ('D', 'd'): continue
        names.append(f['Path'])
    return names

def inspect(path, name):
    low = name.lower()
    if PART.search(low): return {'listed': False, 'slots': [], 'unlisted_reason': 'zip partido en partes'}
    if low.endswith(('.rar', '.7z')):
        exe = shutil.which('7zz')
        if not exe: return {'listed': False, 'slots': [], 'unlisted_reason': 'rar/7z sin herramienta para listar'}
        names = sevenzip_names(path, exe)
        if names is None: return {'listed': False, 'slots': [], 'unlisted_reason': 'rar/7z no se pudo listar'}
        return {'listed': True, **analyze(names)}
    if low.endswith('.zip'):
        try: return {'listed': True, **zip_info(path)}
        except zipfile.BadZipFile: return {'listed': False, 'slots': [], 'unlisted_reason': 'zip dañado o incompleto'}
    return {'listed': False, 'slots': [], 'unlisted_reason': NOT_MOD}

def files(mod_dir, mod_rel, cache, rehash):
    out = []
    for dp, dns, fns in os.walk(mod_dir):
        dns[:] = sorted(d for d in dns if not d.startswith('.'))
        for fn in sorted(fns):
            if fn.startswith('.'): continue
            full = os.path.join(dp, fn); rel = os.path.relpath(full, mod_dir).replace(os.sep, '/')
            top = rel.split('/')[0]
            if '/' not in rel and fn.upper() in ('LINK.TXT', 'NOTA.TXT'): continue
            size = os.path.getsize(full); old = cache.get((mod_rel, rel))
            e = {'path': rel, 'kind': top if top in ('original', 'modificado') else 'otro', 'bytes': size,
                 'md5': old['md5'] if old and old['bytes'] == size and not rehash else md5(full), **inspect(full, fn)}
            e['touches_c00'] = 0 in e['slots'] if e['listed'] else None  # sin listar no se sabe
            out.append(e)
    return sorted(out, key=lambda e: e['path'])

def load_origins(root):
    """ORIGENES.md de la raíz -> {(mod_id, carpeta del luchador): origen}; None si no existe. Si una clave se repite gana la primera fila."""
    p = os.path.join(root, 'ORIGENES.md')
    if not os.path.isfile(p): return None
    out = {}
    for line in open(p, encoding='utf-8-sig', errors='replace'):
        if not re.match(r'^\|\s*\d+\s*\|', line): continue
        c = [x.strip() for x in line.strip().strip('|').split('|')]
        if len(c) >= 5: out.setdefault((int(c[0]), c[2]), c[3])
    return out

def load_catalog():
    p = os.path.join(R, 'data', 'catalog.json')
    if not os.path.isfile(p): return {}
    idx = {}
    for e in json.load(open(p, encoding='utf-8'))['entries']:
        idx.setdefault((e['roster_no'], e['mod_id']), []).append({'look_name': e['look_name'], 'role': e.get('role'), 'proposed_destination': e.get('proposed_destination')})
    return idx

def scan(root, prev=None, rehash=False):
    cache = {(m['folder'], f['path']): f for m in (prev or {}).get('mods', []) for f in m['files']}
    cat = load_catalog(); mods = []; origins = load_origins(root); used = set()
    for ff in sorted(os.listdir(root)):
        fdir = os.path.join(root, ff)
        if ff.startswith('.') or ff in SKIP or not os.path.isdir(fdir): continue
        internal = None if ff in NO_FIGHTER else FOLDERS.get(ff)
        code = INTERNAL.get(internal) if internal else None
        if ff not in NO_FIGHTER and code is None: print(f'aviso: carpeta de luchador desconocida: {ff}', file=sys.stderr)
        for md in sorted(os.listdir(fdir)):
            mdir = os.path.join(fdir, md)
            if md.startswith('.') or not os.path.isdir(mdir): continue
            m = MOD.match(md); mod_id = int(m.group(1)) if m else None; rel = f'{ff}/{md}'
            origin = (origins or {}).get((mod_id, ff)); used.add((mod_id, ff))
            if origins is not None and mod_id and origin is None: print(f'aviso: el mod {mod_id} ({rel}) no tiene fila en ORIGENES.md', file=sys.stderr)
            mods.append({'mod_id': mod_id, 'slug': m.group(2) if m else md, 'folder': rel, 'fighter_folder': ff, 'code': code, 'internal': internal,
                         'kind': 'plugin' if ff == PLUGINS else 'ui' if ff == UI else 'skin', 'origin': origin,
                         'plugin': ff == PLUGINS, 'link': text(os.path.join(mdir, 'LINK.txt')), 'note': text(os.path.join(mdir, 'NOTA.txt')),
                         'catalog': cat.get((code, mod_id)) if code and mod_id else None, 'files': files(mdir, rel, cache, rehash)})
    mods.sort(key=lambda x: (x['code'] or '~', x['mod_id'] or 0, x['folder']))
    seen = {}
    for x in mods:
        if not x['files']: print(f"aviso: carpeta de mod sin archivos: {x['folder']}", file=sys.stderr)
        if x['mod_id'] and (x['code'], x['mod_id']) in seen: print(f"aviso: mod {x['mod_id']} repetido en {seen[(x['code'], x['mod_id'])]} y {x['folder']}", file=sys.stderr)
        seen.setdefault((x['code'], x['mod_id']), x['folder'])
    for k in sorted(set(origins or {}) - used): print(f'aviso: ORIGENES.md lista el mod {k[0]} ({k[1]}) y no está en el Drive', file=sys.stderr)
    orig = {}
    for x in mods: orig[x['origin'] or 'sin registro'] = orig.get(x['origin'] or 'sin registro', 0) + 1
    fl = [f for x in mods for f in x['files']]; other = [f for f in fl if f.get('unlisted_reason') == NOT_MOD]
    counts = {'mods': len(mods), 'files': len(fl), 'bytes': sum(f['bytes'] for f in fl), 'listed': sum(f['listed'] for f in fl),
              'unlisted': sum(not f['listed'] for f in fl) - len(other), 'other': len(other), 'touches_c00': sum(bool(f['touches_c00']) for f in fl),
              'origins': dict(sorted(orig.items()))}
    return {'source': 'Google Drive · SSBU_mods',
            'note': 'Manifiesto de los mods descargados en el Drive (los binarios no se versionan). Slots leídos solo de los .zip; nada de esto está instalado ni probado en consola.',
            'counts': counts, 'mods': mods}

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Escanea la carpeta de mods del Drive y escribe data/drive.json')
    ap.add_argument('root'); ap.add_argument('--out', default=os.path.join(R, 'data', 'drive.json'))
    ap.add_argument('--rehash', action='store_true', help='recalcula el MD5 de todos los archivos')
    a = ap.parse_args()
    if not os.path.isdir(a.root): sys.exit(f'no existe la carpeta: {a.root}')
    prev = json.load(open(a.out, encoding='utf-8')) if os.path.isfile(a.out) else None
    out = scan(a.root, prev, a.rehash)
    with open(a.out, 'w', encoding='utf-8') as f: f.write(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
    c = out['counts']
    print(f"ok · {a.out}: {c['mods']} mods, {c['files']} archivos ({c['bytes'] / 1e6:.1f} MB), {c['listed']} listados, {c['unlisted']} sin listar, {c['other']} notas, {c['touches_c00']} tocan c00; orígenes: " + ', '.join(f'{k} {v}' for k, v in c['origins'].items()))
