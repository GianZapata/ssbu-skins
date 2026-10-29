"""Manifiesto del Drive (tools/scan_drive.py) sobre un Drive falso: slots de los .zip, archivos sin listar, MD5 con caché, origen (ORIGENES.md), kind y salida determinista."""
import hashlib, json, os, subprocess, sys, tempfile, unittest, zipfile
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def scan(root, out, *extra, path=None):
    """path: PATH del proceso hijo. Por defecto uno sin 7zz, para que las pruebas no dependan de la herramienta real."""
    env = {**os.environ, 'PATH': path if path is not None else os.devnull}
    return subprocess.run([sys.executable, os.path.join(R, 'tools', 'scan_drive.py'), root, '--out', out, *extra], capture_output=True, text=True, env=env)

LISTADO = """Path = Mod X (c00-c02)
Folder = +
Attributes = D

Path = Mod X (c00-c02)/fighter/falco/model/body/c00/a.nutexb
Folder = -
Attributes = A

Path = Mod X (c00-c02)/fighter/falco/model/body/c02/a.nutexb
Folder = -
Attributes = A

Path = Mod X (c00-c02)/ui/replace/chara/chara_0/chara_0_falco_01.bntx
Folder = -
Attributes = A

Path = Mod X (c00-c02)/effect/fighter/falco/ef_falco.eff
Folder = -
Attributes = A

Path = Mod X (c00-c02)/effect/fighter/falco/ef_falco_c02.eff
Folder = -
Attributes = A

Path = Mod X (c00-c02)/ui/param/database/ui_chara_db.prcxml
Folder = -
Attributes = A
"""

def fake_7zz(dirpath, body, code=0):
    """Deja un `7zz` falso en dirpath: imprime `body` y sale con `code`. Devuelve el PATH que lo contiene."""
    exe = os.path.join(dirpath, '7zz'); os.makedirs(dirpath, exist_ok=True)
    open(exe, 'w').write(f"#!/bin/sh\n/bin/cat <<'EOF'\n{body}EOF\nexit {code}\n"); os.chmod(exe, 0o755)
    return dirpath

def write_zip(path, names):
    with zipfile.ZipFile(path, 'w') as z:
        for n in names: z.writestr(n, b'x')

class Drive(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); t = self.tmp.name
        self.root = os.path.join(t, 'SSBU_mods'); self.out = os.path.join(t, 'drive.json')
        mod = os.path.join(self.root, 'falco', '174558_falco_n64', 'original'); os.makedirs(mod)
        write_zip(os.path.join(mod, 'skin.zip'), ['falco/model/body/c00/a.nutexb', 'falco/model/body/c03/a.nutexb', 'ui/replace/chara/chara_0/chara_0_falco_00.bntx'])
        write_zip(os.path.join(mod, 'sound.zip'), ['sound/bank/fighter_voice/vc_falco_c05.nus3audio'])
        open(os.path.join(mod, '..', 'LINK.txt'), 'w', encoding='utf-8-sig').write('https://gamebanana.com/mods/174558\n')
        open(os.path.join(mod, '.DS_Store'), 'w').write('x')
        rar = os.path.join(self.root, 'terry', '609500_vegeta', 'original'); os.makedirs(rar)
        open(os.path.join(rar, 'vegeta.rar'), 'wb').write(b'Rar!')
        parts = os.path.join(self.root, 'chrom', '175495_squall', 'original'); os.makedirs(parts)
        open(os.path.join(parts, 'squall.zip.part01'), 'wb').write(b'PK')
        os.makedirs(os.path.join(self.root, 'luchador_raro', '1_algo', 'original'))
        open(os.path.join(self.root, 'luchador_raro', '1_algo', 'original', 'a.zip'), 'wb').write(b'no es zip')
        os.makedirs(os.path.join(self.root, '_respaldos', 'firestore'))
        open(os.path.join(self.root, 'REPORTE.md'), 'w').write('suelto')
    def tearDown(self): self.tmp.cleanup()
    def load(self): return json.load(open(self.out, encoding='utf-8'))
    def mod(self, d, folder): return next(m for m in d['mods'] if m['folder'] == folder)

    def test_slots_c00_y_sin_listar(self):
        r = scan(self.root, self.out); self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('luchador_raro', r.stderr)
        d = self.load(); falco = self.mod(d, 'falco/174558_falco_n64')
        self.assertEqual((falco['mod_id'], falco['code'], falco['internal']), (174558, '20', 'falco'))
        self.assertEqual(falco['link'], 'https://gamebanana.com/mods/174558')
        skin = next(f for f in falco['files'] if f['path'] == 'original/skin.zip')
        self.assertEqual((skin['slots'], skin['touches_c00'], skin['listed'], skin['kind']), ([0, 3], True, True, 'original'))
        snd = next(f for f in falco['files'] if f['path'] == 'original/sound.zip')
        self.assertEqual((snd['slots'], snd['touches_c00']), ([5], False))
        self.assertEqual(skin['md5'], hashlib.md5(open(os.path.join(self.root, 'falco', '174558_falco_n64', 'original', 'skin.zip'), 'rb').read()).hexdigest())
        self.assertFalse(any(f['path'].endswith('.DS_Store') or f['path'] == 'LINK.txt' for f in falco['files']))
        rar = self.mod(d, 'terry/609500_vegeta')['files'][0]
        self.assertEqual((rar['listed'], rar['unlisted_reason'], rar['touches_c00']), (False, 'rar/7z sin herramienta para listar', None))
        self.assertEqual(self.mod(d, 'chrom/175495_squall')['files'][0]['unlisted_reason'], 'zip partido en partes')
        raro = self.mod(d, 'luchador_raro/1_algo')
        self.assertEqual((raro['code'], raro['files'][0]['unlisted_reason']), (None, 'zip dañado o incompleto'))
        self.assertFalse(any(m['fighter_folder'] == '_respaldos' for m in d['mods']))
        self.assertEqual(d['counts']['touches_c00'], 1); self.assertEqual(d['counts']['mods'], 4)
        self.assertNotIn(self.tmp.name, open(self.out, encoding='utf-8').read())
        self.assertEqual((falco['kind'], falco['origin'], d['counts']['origins']), ('skin', None, {'sin registro': 4}))   # sin ORIGENES.md: sin origen y sin avisos
        self.assertNotIn('ORIGENES', r.stderr)

    def test_origen_kind_y_avisos(self):
        for d in ('_ui/431072_banner/original', '_plugins/549058_ose/original', '_musica/63158_kh/original'):
            os.makedirs(os.path.join(self.root, d)); write_zip(os.path.join(self.root, d, 'a.zip'), ['x/ui/a.bntx'])
        open(os.path.join(self.root, 'ORIGENES.md'), 'w', encoding='utf-8-sig').write(
            '# ORIGENES\n\n| modid | nombre | fighter | origen | wifi | Drive |\n|---|---|---|---|---|---|\n'
            '| 174558 | falco n64 | falco | búsqueda | — | [carpeta](x) |\n'
            '| 609500 | Vegeta | terry | enlace del usuario | — | [carpeta](x) |\n'
            '| 431072 | Banner | _ui | enlace del usuario | Declaración explícita | [carpeta](x) |\n'
            '| 549058 | One Slot Effects | _plugins | desconocido | — | [carpeta](x) |\n'
            '| 63158 | Música KH | _musica | perfil del modpack | — | [carpeta](x) |\n'
            '| 999 | fantasma | mario | desconocido | — | [carpeta](x) |\n')
        r = scan(self.root, self.out); self.assertEqual(r.returncode, 0, r.stderr)
        d = self.load()
        self.assertEqual({m['folder']: m['origin'] for m in d['mods']}, {
            'falco/174558_falco_n64': 'búsqueda', 'terry/609500_vegeta': 'enlace del usuario', 'chrom/175495_squall': None, 'luchador_raro/1_algo': None,
            '_ui/431072_banner': 'enlace del usuario', '_plugins/549058_ose': 'desconocido', '_musica/63158_kh': 'perfil del modpack'})
        self.assertEqual(d['counts']['origins'], {'búsqueda': 1, 'enlace del usuario': 2, 'desconocido': 1, 'perfil del modpack': 1, 'sin registro': 2})
        ui, plug, music = self.mod(d, '_ui/431072_banner'), self.mod(d, '_plugins/549058_ose'), self.mod(d, '_musica/63158_kh')
        self.assertEqual((ui['kind'], ui['code'], ui['plugin']), ('ui', None, False)); self.assertEqual((plug['kind'], plug['plugin']), ('plugin', True))
        self.assertEqual((music['kind'], music['code'], music['plugin']), ('music', None, False))
        self.assertEqual(self.mod(d, 'falco/174558_falco_n64')['kind'], 'skin')
        self.assertNotIn('carpeta de luchador desconocida: _ui', r.stderr)            # _ui no es un luchador
        self.assertNotIn('carpeta de luchador desconocida: _musica', r.stderr)        # _musica tampoco
        self.assertIn('el mod 175495 (chrom/175495_squall) no tiene fila en ORIGENES.md', r.stderr)
        self.assertIn('ORIGENES.md lista el mod 999 (mario) y no está en el Drive', r.stderr)

    def test_notas_carpetas_vacias_y_repetidos(self):
        open(os.path.join(self.root, 'chrom', '175495_squall', 'original', 'PARTES.txt'), 'w').write('unir partes')
        os.makedirs(os.path.join(self.root, 'terry', '609500_vegeta (1)'))
        r = scan(self.root, self.out); self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('sin archivos: terry/609500_vegeta (1)', r.stderr); self.assertIn('mod 609500 repetido', r.stderr)
        c = self.load()['counts']
        self.assertEqual((c['other'], c['unlisted']), (1, 3))   # la nota no cuenta como archivo sin listar

    def test_rar_se_lista_con_7zz(self):
        bin_ = fake_7zz(os.path.join(self.tmp.name, 'bin'), LISTADO)
        r = scan(self.root, self.out, path=bin_); self.assertEqual(r.returncode, 0, r.stderr)
        rar = self.mod(self.load(), 'terry/609500_vegeta')['files'][0]
        self.assertEqual((rar['listed'], rar['slots'], rar['touches_c00'], rar['files_count']), (True, [0, 1, 2], True, 6))
        self.assertNotIn('unlisted_reason', rar)
        # un efecto sin slot y el ui_chara_db son candidatos a globales; el efecto con _c02 pertenece a su slot
        self.assertEqual(rar['non_slot'], ['effect/fighter/falco/ef_falco.eff', 'ui/param/database/ui_chara_db.prcxml'])

    def test_rar_sin_7zz_o_con_fallo(self):
        r = scan(self.root, self.out); self.assertEqual(r.returncode, 0, r.stderr)
        rar = self.mod(self.load(), 'terry/609500_vegeta')['files'][0]
        self.assertEqual((rar['listed'], rar['unlisted_reason'], rar['touches_c00']), (False, 'rar/7z sin herramienta para listar', None))
        self.assertNotIn('files_count', rar)
        bin_ = fake_7zz(os.path.join(self.tmp.name, 'bin2'), 'ERROR: no es un archivo\n', code=2)
        r = scan(self.root, self.out, path=bin_); self.assertEqual(r.returncode, 0, r.stderr)
        rar = self.mod(self.load(), 'terry/609500_vegeta')['files'][0]
        self.assertEqual((rar['listed'], rar['unlisted_reason']), (False, 'rar/7z no se pudo listar'))

    def test_zip_trae_files_count_y_non_slot(self):
        z = os.path.join(self.root, 'falco', '174558_falco_n64', 'original', 'skin.zip')
        write_zip(z, ['mod/fighter/falco/model/body/c00/a.nutexb', 'mod/config.json', 'mod/sound/bgm_x.nus3audio', 'mod/motion/body/c03/swing.prc'])
        scan(self.root, self.out)
        e = next(f for f in self.mod(self.load(), 'falco/174558_falco_n64')['files'] if f['path'] == 'original/skin.zip')
        self.assertEqual((e['slots'], e['files_count']), ([0, 3], 4)); self.assertEqual(e['non_slot'], ['config.json', 'sound/bgm_x.nus3audio'])

    def test_determinista(self):
        scan(self.root, self.out); a = open(self.out, encoding='utf-8').read()
        os.remove(self.out); scan(self.root, self.out)
        self.assertEqual(a, open(self.out, encoding='utf-8').read())

    def test_cache_de_md5(self):
        scan(self.root, self.out)
        rar = os.path.join(self.root, 'terry', '609500_vegeta', 'original', 'vegeta.rar')
        old = self.mod(self.load(), 'terry/609500_vegeta')['files'][0]['md5']
        open(rar, 'wb').write(b'RAR?')   # mismo tamaño: la caché conserva el MD5 anterior…
        scan(self.root, self.out); self.assertEqual(self.mod(self.load(), 'terry/609500_vegeta')['files'][0]['md5'], old)
        scan(self.root, self.out, '--rehash')   # …y --rehash lo recalcula
        self.assertEqual(self.mod(self.load(), 'terry/609500_vegeta')['files'][0]['md5'], hashlib.md5(b'RAR?').hexdigest())

class DriveDocs(unittest.TestCase):
    """tools/db.py: a qué documento de Firestore va cada mod (plugins y UI juntos; los de una versión antigua del manifiesto, sin kind, por su bandera plugin)."""
    def test_plugins_y_ui_van_aparte(self):
        sys.path.insert(0, os.path.join(R, 'tools')); import db
        m = lambda **k: {'mod_id': 1, 'code': None, 'files': [], **k}
        docs = db._drive_docs({'mods': [m(code='20', kind='skin'), m(code='20'), m(kind='skin'), m(kind='plugin', plugin=True), m(kind='ui'), m(plugin=True)]})
        self.assertEqual(sorted(docs), ['20', 'plugins', 'sin_luchador'])
        self.assertEqual((len(docs['20']['mods']), len(docs['plugins']['mods']), len(docs['sin_luchador']['mods'])), (2, 3, 1))
        self.assertEqual((docs['20']['code'], docs['plugins']['code']), ('20', None))

if __name__ == '__main__': unittest.main()
