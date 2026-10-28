"""Manifiesto del Drive (tools/scan_drive.py) sobre un Drive falso: slots de los .zip, archivos sin listar, MD5 con caché y salida determinista."""
import hashlib, json, os, subprocess, sys, tempfile, unittest, zipfile
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def scan(root, out, *extra):
    return subprocess.run([sys.executable, os.path.join(R, 'tools', 'scan_drive.py'), root, '--out', out, *extra], capture_output=True, text=True)

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

    def test_notas_carpetas_vacias_y_repetidos(self):
        open(os.path.join(self.root, 'chrom', '175495_squall', 'original', 'PARTES.txt'), 'w').write('unir partes')
        os.makedirs(os.path.join(self.root, 'terry', '609500_vegeta (1)'))
        r = scan(self.root, self.out); self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('sin archivos: terry/609500_vegeta (1)', r.stderr); self.assertIn('mod 609500 repetido', r.stderr)
        c = self.load()['counts']
        self.assertEqual((c['other'], c['unlisted']), (1, 3))   # la nota no cuenta como archivo sin listar

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

if __name__ == '__main__': unittest.main()
