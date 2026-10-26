"""Sincronización con Firestore (requiere el emulador en 127.0.0.1:8080 y google-cloud-firestore): el catálogo y el inventario son independientes
y ninguna siembra toca changes, history ni status."""
import json, os, subprocess, sys, tempfile, unittest, urllib.request
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PROJECT = 'ssbu-seed-tests'  # separado de las pruebas del navegador y de cualquier proyecto real
ENV = {**os.environ, 'FIRESTORE_EMULATOR_HOST': '127.0.0.1:8080', 'GOOGLE_CLOUD_PROJECT': PROJECT}
def up():
    try: urllib.request.urlopen('http://127.0.0.1:8080', timeout=2); return True
    except Exception: return False
def db(*a, catalog=None):
    env = {**ENV}
    if catalog: env['SSBU_CATALOG'] = catalog
    return subprocess.run([sys.executable, os.path.join(R, 'tools', 'db.py'), *a], env=env, capture_output=True, text=True, cwd=R)

@unittest.skipUnless(up(), 'emulador de Firestore no disponible')
class Seed(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        urllib.request.urlopen(urllib.request.Request(f'http://127.0.0.1:8080/emulator/v1/projects/{PROJECT}/databases/(default)/documents', method='DELETE'))
        from google.cloud import firestore
        cls.previous = {k: os.environ.get(k) for k in ('FIRESTORE_EMULATOR_HOST', 'GOOGLE_CLOUD_PROJECT')}
        os.environ.update({k: ENV[k] for k in cls.previous}); cls.fs = firestore.Client(project=PROJECT)
    @classmethod
    def tearDownClass(cls):
        cls.fs.close()
        for key, value in cls.previous.items():
            if value is None: os.environ.pop(key, None)
            else: os.environ[key] = value
    def count(self, coll): return len(list(self.fs.collection(coll).stream()))
    def test_1_seed_exige_decidir_que_sincronizar(self):
        r = db('seed'); self.assertNotEqual(r.returncode, 0); self.assertIn('--only', r.stderr)
    def test_2_solo_catalogo_no_toca_el_inventario(self):
        self.assertEqual(db('seed', '--only', 'catalog').returncode, 0)
        self.assertEqual(self.count('catalog'), 89); self.assertEqual(self.count('installed'), 0)
        self.assertFalse(self.fs.collection('meta').document('installed').get().exists)
    def test_3_inventario_manual_y_changes_history_status_intactos(self):
        self.fs.collection('changes').document('01_2').set({'code': '01', 'slot': 2, 'vid': '01:174057', 'by': 'x'})
        self.fs.collection('history').document('h1').set({'code': '01', 'slot': 2, 'kind': 'set'})
        self.fs.collection('status').document('01:174057').set({'vid': '01:174057', 'status': 'installed'})
        self.assertEqual(db('seed', '--only', 'installed').returncode, 0)
        self.assertGreater(self.count('installed'), 50)
        inv_before = self.fs.collection('meta').document('installed').get().to_dict()['version']
        self.assertEqual(db('seed', '--only', 'catalog').returncode, 0)   # una nueva sincronización de investigación…
        self.assertEqual(self.fs.collection('meta').document('installed').get().to_dict()['version'], inv_before)   # …no cambia el inventario
        self.assertTrue(self.fs.collection('changes').document('01_2').get().exists)
        self.assertTrue(self.fs.collection('history').document('h1').get().exists)
        self.assertEqual(self.fs.collection('status').document('01:174057').get().to_dict()['status'], 'installed')
    def test_4_campos_de_investigacion_en_firestore(self):
        d = self.fs.collection('catalog').document('01').get().to_dict()
        p = d['picks'][0]
        for k in ('role', 'variant', 'audit_scope', 'downloads_scope', 'images_scope', 'look_id'): self.assertIn(k, p)
        self.assertIn(p['vid'], d['vids'])
        with open(ENV.get('SSBU_CATALOG') or os.path.join(R, 'data', 'catalog.json'), encoding='utf-8') as raw:
            refs = json.load(raw).get('original_refs', {})
        for code, ref in refs.items():
            fighter = self.fs.collection('catalog').document(code).get().to_dict()
            self.assertEqual(fighter.get('original_ref'), ref, code)
    def test_5_la_referencia_original_llega_al_emulador(self):
        with open(ENV.get('SSBU_CATALOG') or os.path.join(R, 'data', 'catalog.json'), encoding='utf-8') as raw:
            catalog = json.load(raw)
        ref = {'fighter': 'Mario', 'costume': 'c00', 'verified': True,
               'image_url': 'https://www.smashbros.com/assets_v2/img/fighter/mario/main.png',
               'source_page': 'https://www.smashbros.com/en_US/fighter/01.html',
               'source': 'Sitio oficial', 'scope': 'Solo el traje c00',
               'http_check': 'HTTP 200', 'visual_check': 'c00 revisado'}
        catalog.setdefault('original_refs', {})['01'] = ref
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, 'catalog.json')
            with open(path, 'w', encoding='utf-8') as raw: json.dump(catalog, raw)
            result = db('seed', '--only', 'catalog', catalog=path)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        fighter = self.fs.collection('catalog').document('01').get().to_dict()
        self.assertEqual(fighter.get('original_ref'), ref)
if __name__ == '__main__': unittest.main()
