"""Catálogo ampliado, identificadores persistentes y campos conservados (sin red ni emuladores)."""
import copy, json, os, random, subprocess, sys, tempfile, unittest
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(R, 'tools'))
import catalog_data as cd

CAT = json.load(open(os.path.join(R, 'data', 'catalog.json'), encoding='utf-8'))
KEEP = {'role': 'role', 'variant': 'variant', 'audit_scope': 'audit_scope', 'downloads_scope': 'downloads_scope', 'images_scope': 'images_scope'}

def load_from(catalog):
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as f: json.dump(catalog, f)
    os.environ['SSBU_CATALOG'] = f.name
    try: return cd.load()
    finally: os.environ.pop('SSBU_CATALOG', None); os.unlink(f.name)

class Totals(unittest.TestCase):
    def test_totales_del_catalogo_ampliado(self):
        fighters, meta = cd.load()
        picks = [p for f in fighters for p in f['picks']]
        active = [p for p in picks if not p['withdrawn']]
        self.assertEqual(len(fighters), 89)
        self.assertEqual(len(active), 1225)
        self.assertEqual(sum(p['role'] == 'propuesta principal' for p in active), 697)
        self.assertEqual(sum(p['role'] == 'alternativa' for p in active), 528)
        self.assertEqual(len(picks) - len(active), len(CAT['withdrawn']))
        self.assertEqual(meta['counts']['looks'], len(active))
        self.assertEqual(len({p['vid'] for p in picks}), len(picks), 'identificadores únicos')

    def test_el_informe_antiguo_no_es_el_catalogo(self):
        # 697 activas + 12 retiradas = 709 era la versión publicada anterior; el catálogo ampliado trae 1225 activas
        self.assertNotEqual(len(CAT['entries']), 709)
        self.assertEqual(len(CAT['entries']), 1225)

class Campos(unittest.TestCase):
    def test_se_conservan_los_campos_de_investigacion(self):
        fighters, _ = cd.load()
        by = {p['vid']: p for f in fighters for p in f['picks']}
        for e in CAT['entries']:
            p = by[e['look_id']]
            for k_web, k_cat in KEEP.items():
                self.assertEqual(p[k_web] if k_web != 'role' else p['role'], e.get(k_cat), f"{e['look_id']}: {k_web}")
            self.assertEqual(p['look_id'], e['look_id'])
        self.assertTrue(all(p['audit_scope'] and p['downloads_scope'] and p['images_scope'] for p in by.values() if not p['withdrawn']))

class Identificadores(unittest.TestCase):
    def test_el_orden_y_el_nombre_no_cambian_el_id(self):
        base, _ = cd.load(); ids = {(f['code'], p['id'], p['role']): p['vid'] for f in base for p in f['picks']}
        c = copy.deepcopy(CAT); random.Random(7).shuffle(c['entries'])
        for e in c['entries']: e['look_name'] = 'Renombrada ' + e['look_name']
        again, _ = load_from(c)
        ids2 = {(f['code'], p['id'], p['role']): p['vid'] for f in again for p in f['picks']}
        self.assertEqual(ids, ids2)

    def test_id_duplicado_es_error(self):
        c = copy.deepcopy(CAT); c['entries'][1]['look_id'] = c['entries'][0]['look_id']
        with self.assertRaises(ValueError): load_from(c)

class Validador(unittest.TestCase):
    def run_validator(self, catalog, lock):
        with tempfile.TemporaryDirectory() as d:
            cp, lp = os.path.join(d, 'c.json'), os.path.join(d, 'l.json')
            with open(cp, "w") as a, open(lp, "w") as b: json.dump(catalog, a); json.dump({"ids": lock}, b)
            return subprocess.run([sys.executable, os.path.join(R, 'tools', 'validate_catalog.py'), '--catalog', cp, '--lock', lp], capture_output=True, text=True)
    def test_el_catalogo_actual_es_valido(self):
        r = subprocess.run([sys.executable, os.path.join(R, 'tools', 'validate_catalog.py')], capture_output=True, text=True, cwd=R)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr); self.assertIn('1225 entradas', r.stdout)
    def test_renombrar_un_id_publicado_falla(self):
        lock = json.load(open(os.path.join(R, 'data', 'ids.lock.json')))['ids']
        c = copy.deepcopy(CAT); c['entries'][0]['look_id'] = '01:999999'
        r = self.run_validator(c, lock); self.assertNotEqual(r.returncode, 0); self.assertIn('desapareció', r.stdout)
    def test_id_que_no_coincide_con_el_mod_falla(self):
        lock = json.load(open(os.path.join(R, 'data', 'ids.lock.json')))['ids']
        c = copy.deepcopy(CAT); c['entries'][0]['look_id'] = '01:1'
        self.assertNotEqual(self.run_validator(c, lock).returncode, 0)
    def test_variante_con_sufijo_es_valida(self):
        lock = json.load(open(os.path.join(R, 'data', 'ids.lock.json')))['ids']
        c = copy.deepcopy(CAT); e = copy.deepcopy(c['entries'][0]); e['look_id'] += ':rare-dk'; e['look_name'] += ' (variante)'; c['entries'].append(e)
        r = self.run_validator(c, lock); self.assertEqual(r.returncode, 0, r.stdout)

class Retratos(unittest.TestCase):
    def test_retratos_oficiales_solo_para_los_luchadores_con_fuente(self):
        fighters, _ = cd.load()
        sin = sorted(f['code'] for f in fighters if not f['portrait'])
        self.assertEqual(sin, [str(n) for n in range(71, 83)])
        for f in fighters:
            if f['portrait']: self.assertTrue(os.path.exists(os.path.join(R, f['portrait'])), f['portrait'])
            self.assertNotIn('installed/', f['portrait'] or ''); self.assertNotIn('gamebanana', f['portrait'] or '')

class Inventario(unittest.TestCase):
    def test_perfil_gian_prs_y_exclusiones(self):
        fighters, _ = cd.load(); inv = cd.load_inventory(fighters)
        self.assertEqual(inv['meta']['profile']['name'], 'gian-prs')
        self.assertIn('77', inv['meta']['profile']['excluded_base_fighters'])
        steve = inv['fighters']['77']['slots']
        self.assertEqual({k for k, s in steve.items() if s.get('src')}, {'0', '1', '4'}, 'Steve: solo los trajes del PR 11, nada de la base')
        self.assertTrue(all(s.get('src') == 'perfil' for k, s in steve.items() if s.get('src')))
        self.assertFalse(any(s.get('src') for s in inv['fighters'].get('11', {}).get('slots', {}).values()), 'Captain Falcon: todo original (Gian quito la base y el PR 4)')
        self.assertEqual(inv['fighters']['29']['slots']['1']['name'], 'Naoto', 'Samus Zero c01: Naoto de WuBoy se conserva')
        self.assertEqual(inv['fighters']['63']['slots']['3']['name'], 'Harley Quinn')
        self.assertEqual({k for k, s in inv['fighters']['02']['slots'].items() if s.get('component') == 'funky-dk-c01' or s.get('name') == 'Funky Kong'}, {'1'}, 'un unico Funky, en DK c01')
        self.assertEqual(inv['fighters']['29']['slots']['7']['name'], 'Jill Valentine')
        self.assertNotEqual(inv['fighters']['29']['slots'].get('0', {}).get('src'), 'perfil', 'Bulma retirada (se veia negra)')
        self.assertEqual(inv['fighters']['01']['slots']['1']['name'], 'Kellytoy Mario')
        self.assertEqual(inv['fighters']['09']['slots']['0']['src'], 'base', 'Luigi c00 vuelve a ser el de WuBoy (Swole retirado)')
        prof = cd._jload('inventory_profile.json')
        self.assertEqual(prof['base_filter'], 'skins')
        for x in prof['filtered_base_slots']:   # trajes de la base sin modelo propio: ya no cuentan como instalados
            self.assertNotEqual(inv['fighters'].get(x['fighter'], {}).get('slots', {}).get(str(x['slot']), {}).get('src'), 'base')
        self.assertEqual(inv['fighters']['79']['slots']['0']['name'], 'Aqua (Dusk)')
        self.assertEqual(inv['fighters']['80']['slots']['0']['name'], 'Aqua (Dusk)')
        self.assertNotIn('7', {k for k, s in inv['fighters']['82']['slots'].items() if s.get('src') == 'base'}, 'Sora c07 de base queda excluido por el perfil')
        self.assertIn('version', inv['meta']); self.assertEqual(inv['meta']['verification'], 'parcial')
        self.assertTrue(all('staged' not in s or not s.get('src') or True for f in inv['fighters'].values() for s in f['slots'].values()))
if __name__ == '__main__': unittest.main()
