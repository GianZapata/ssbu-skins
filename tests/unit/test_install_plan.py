import json, os, subprocess, sys, unittest
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(R, 'tools'))
import db

class OrdenDeGit(unittest.TestCase):
    def test_solo_mods_aprobados_y_sin_firestore(self):
        rows = db.install_rows()
        self.assertTrue(rows)
        self.assertTrue(all(r['source'] in ('drive', 'profile', 'wuboy', 'vanilla') for r in rows))
        self.assertIn({'roster_no': '23', 'slot': 'c02', 'name': 'Pikadorf', 'mod_id': 406732},
                      [{k: r[k] for k in ('roster_no', 'slot', 'name', 'mod_id')} for r in rows])
        self.assertFalse(any(r['roster_no'] == '01' for r in rows))
        self.assertTrue(all(r['slot'].startswith('c0') for r in rows))

    def test_el_comando_no_abre_firestore(self):
        env = {k: v for k, v in os.environ.items() if k not in ('GOOGLE_APPLICATION_CREDENTIALS', 'FIRESTORE_EMULATOR_HOST')}
        r = subprocess.run([sys.executable, os.path.join(R, 'tools', 'db.py'), 'plan'], capture_output=True, text=True, env=env)
        self.assertEqual(r.returncode, 0, r.stderr)
        out = json.loads(r.stdout)
        self.assertEqual(out['schema'], 4)
        self.assertIn('install', out)
        self.assertNotIn('changes', out)
        self.assertNotIn('history', out)
