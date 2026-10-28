"""Sincronización con Firestore (requiere el emulador en 127.0.0.1:8080 y google-cloud-firestore): el catálogo y el inventario son independientes
y ninguna siembra toca changes, history ni status."""
import json, os, subprocess, sys, unittest, urllib.request
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ENV = {**os.environ, 'FIRESTORE_EMULATOR_HOST': '127.0.0.1:8080', 'GOOGLE_CLOUD_PROJECT': 'ssbu-441b1'}
def up():
    try: urllib.request.urlopen('http://127.0.0.1:8080', timeout=2); return True
    except Exception: return False
def db(*a, check=True):
    return subprocess.run([sys.executable, os.path.join(R, 'tools', 'db.py'), *a], env=ENV, capture_output=True, text=True, cwd=R)

@unittest.skipUnless(up(), 'emulador de Firestore no disponible')
class Seed(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8080/emulator/v1/projects/ssbu-441b1/databases/(default)/documents', method='DELETE'))
        from google.cloud import firestore
        os.environ.update(ENV); cls.fs = firestore.Client(project='ssbu-441b1')
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
    @unittest.skipUnless(os.path.isfile(os.path.join(R, 'data', 'drive.json')), 'no hay data/drive.json')
    def test_5_drive_dry_run_no_escribe_y_seed_no_toca_lo_demas(self):
        before = {c: self.count(c) for c in ('catalog', 'installed', 'changes', 'history', 'status')}
        r = db('seed', '--only', 'drive', '--dry-run'); self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('drive:', r.stdout); self.assertEqual(self.count('drive'), 0)
        self.assertFalse(self.fs.collection('meta').document('drive').get().exists)
        r = db('seed', '--only', 'drive'); self.assertEqual(r.returncode, 0, r.stderr)
        drive = json.load(open(os.path.join(R, 'data', 'drive.json'), encoding='utf-8'))
        docs = {d.id: d.to_dict() for d in self.fs.collection('drive').stream()}
        self.assertEqual(sum(len(d['mods']) for d in docs.values()), drive['counts']['mods'])
        self.assertEqual(self.fs.collection('meta').document('drive').get().to_dict()['counts'], drive['counts'])
        self.assertEqual({c: self.count(c) for c in before}, before)
        r = db('seed', '--only', 'drive', '--dry-run')   # recién sembrado: nada que crear, cambiar ni borrar
        self.assertIn('drive: 0 se crean', r.stdout); self.assertIn('drive: 0 cambian', r.stdout); self.assertIn('drive: 0 se borran', r.stdout)
    def test_6_all_no_incluye_el_drive(self):
        self.fs.collection('drive').document('zz').set({'code': 'zz', 'mods': []})
        self.assertEqual(db('seed', '--only', 'all').returncode, 0)
        self.assertTrue(self.fs.collection('drive').document('zz').get().exists)
    def test_7_plan_de_slots(self):
        before = {c: self.count(c) for c in ('catalog', 'installed', 'changes', 'history', 'status', 'drive')}
        r = db('seed', '--only', 'slots', '--dry-run'); self.assertEqual(r.returncode, 0, r.stderr); self.assertEqual(self.count('slot_plan'), 0)
        r = db('seed', '--only', 'slots'); self.assertEqual(r.returncode, 0, r.stderr)
        docs = {d.id: d.to_dict() for d in self.fs.collection('slot_plan').stream()}
        self.assertGreater(len(docs), 30); self.assertTrue(all(len(v['slots']) == 8 for v in docs.values()))
        self.assertEqual(self.fs.collection('meta').document('slot_plan').get().to_dict()['fighters'], len(docs))
        self.assertEqual({c: self.count(c) for c in before}, before)
if __name__ == '__main__': unittest.main()
