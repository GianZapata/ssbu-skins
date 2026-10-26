"""Catálogo ampliado, identificadores persistentes y campos conservados (sin red ni emuladores)."""
import copy, hashlib, json, os, random, subprocess, sys, tempfile, unittest
from collections import Counter
from unittest.mock import patch
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(R, 'tools'))
import catalog_data as cd

CAT_PATH = os.environ.get('SSBU_CATALOG') or os.path.join(R, 'data', 'catalog.json')
CAT = json.load(open(CAT_PATH, encoding='utf-8'))
KEEP = {'role': 'role', 'variant': 'variant', 'audit_scope': 'audit_scope', 'downloads_scope': 'downloads_scope', 'images_scope': 'images_scope'}
MARIO_REF = {
    'fighter': 'Mario', 'costume': 'c00', 'verified': True,
    'image_url': 'https://www.smashbros.com/assets_v2/img/fighter/mario/main.png',
    'source_page': 'https://www.smashbros.com/en_US/fighter/01.html',
    'source': 'Sitio oficial de Super Smash Bros. Ultimate',
    'scope': 'Render oficial del traje por defecto, c00',
    'http_check': 'HTTP 200', 'visual_check': 'Traje c00 revisado',
}

def load_from(catalog):
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as f: json.dump(catalog, f)
    previous = os.environ.get('SSBU_CATALOG')
    os.environ['SSBU_CATALOG'] = f.name
    try: return cd.load()
    finally:
        if previous is None: os.environ.pop('SSBU_CATALOG', None)
        else: os.environ['SSBU_CATALOG'] = previous
        os.unlink(f.name)

class Totals(unittest.TestCase):
    def test_totales_del_catalogo_ampliado(self):
        fighters, meta = cd.load()
        picks = [p for f in fighters for p in f['picks']]
        active = [p for p in picks if not p['withdrawn']]
        self.assertEqual(len(fighters), 89)
        self.assertEqual(len(active), len(CAT['entries']))
        self.assertEqual(Counter(p['role'] for p in active), Counter(e['role'] for e in CAT['entries']))
        self.assertEqual(len(picks) - len(active), len(CAT['withdrawn']))
        self.assertEqual(meta['counts']['looks'], len(active))
        self.assertEqual(len({p['vid'] for p in picks}), len(picks), 'identificadores únicos')

    def test_los_recuentos_declarados_coinciden_con_los_registros(self):
        entries = CAT['entries']; counts = CAT['counts']
        roles = Counter(e['role'] for e in entries)
        expected = {'looks': len(entries), 'unique_mods': len({e['mod_id'] for e in entries}),
                    'main_proposals': roles['propuesta principal'], 'alternatives': roles['alternativa'],
                    'withdrawn': len(CAT['withdrawn']), 'fighters': len({e['roster_no'] for e in entries}),
                    'fighters_with_alternatives': len({e['roster_no'] for e in entries if e['role'] == 'alternativa'}),
                    'with_conditions': sum(bool(e.get('conditions')) for e in entries)}
        for key, total in expected.items():
            self.assertEqual(counts[key], total, key)
        self.assertEqual(counts['by_wifi_state'], dict(Counter(e['wifi_state'] for e in entries)))
        self.assertEqual(set(counts['coverage']), {e['roster_no'] for e in entries})
        for code, coverage in counts['coverage'].items():
            fighter_entries = [e for e in entries if e['roster_no'] == code]
            self.assertEqual(coverage['looks'], len(fighter_entries), code)
            self.assertEqual(coverage['main'], sum(e['role'] == 'propuesta principal' for e in fighter_entries), code)
            self.assertEqual(coverage['alternatives'], sum(e['role'] == 'alternativa' for e in fighter_entries), code)

    def test_los_ids_historicos_y_las_retiradas_siguen_resolviendose(self):
        fighters, _ = cd.load(); by = {p['vid']: p for f in fighters for p in f['picks']}
        lock = json.load(open(os.path.join(R, 'data', 'ids.lock.json')))['ids']
        self.assertFalse(set(lock) - set(by), 'las elecciones publicadas no pueden perder su apariencia')
        for entry in CAT['withdrawn']:
            vid = entry.get('look_id') or entry.get('variant_id') or f"{entry['roster_no']}:{entry['mod_id']}"
            self.assertTrue(by[vid]['withdrawn'], vid)
            self.assertEqual(by[vid]['name'], entry['look_name'], vid)

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
        r = subprocess.run([sys.executable, os.path.join(R, 'tools', 'validate_catalog.py'), '--catalog', CAT_PATH], capture_output=True, text=True, cwd=R)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr); self.assertIn(f"{len(CAT['entries'])} entradas", r.stdout)
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
    def test_todos_los_luchadores_incluidos_los_dlc_tienen_retrato_oficial(self):
        fighters, _ = cd.load()
        for f in fighters:
            self.assertTrue(f['portrait'], f"falta el retrato oficial de {f['name']}")
            if f['portrait'].startswith('https://'):
                self.assertEqual(f['portrait'], CAT['original_refs'][f['code']]['image_url'])
            else:
                self.assertTrue(os.path.exists(os.path.join(R, f['portrait'])), f['portrait'])
            self.assertNotIn('installed/', f['portrait'] or ''); self.assertNotIn('gamebanana', f['portrait'] or '')

    def test_la_fuente_del_retrato_identifica_el_asset_o_la_referencia_oficial(self):
        fighters, _ = cd.load()
        for f in fighters:
            source = f.get('portrait_source')
            self.assertIsInstance(source, dict, f['name'])
            if f['portrait'].startswith('https://'):
                self.assertTrue(source['verified'])
                self.assertEqual(source['costume'], 'c00')
                self.assertTrue(source['image_url'].startswith('https://www.smashbros.com/assets_v2/img/fighter/'))
                self.assertTrue(source['source_page'].startswith('https://www.smashbros.com/en_US/fighter/'))
                self.assertEqual(source, CAT['original_refs'][f['code']])
            else:
                with open(os.path.join(R, f['portrait']), 'rb') as asset:
                    self.assertEqual(source['asset_sha256'], hashlib.sha256(asset.read()).hexdigest())

    def test_un_retrato_ausente_no_usa_una_referencia_sin_verificar_o_ajena(self):
        for image_url, verified in [(MARIO_REF['image_url'], False), ('https://example.com/mario.png', True)]:
            c = copy.deepcopy(CAT)
            c.setdefault('original_refs', {})['71'] = {**MARIO_REF, 'image_url': image_url, 'verified': verified}
            # Caché local vacía, sin depender de qué DLC llegue a tener WebP en el repositorio.
            with tempfile.TemporaryDirectory() as directory, patch.object(cd, 'R', directory):
                fighters, _ = load_from(c)
            joker = next(f for f in fighters if f['code'] == '71')
            self.assertIsNone(joker['portrait'])
            self.assertIsNone(joker.get('portrait_source'))

    def test_la_referencia_original_conserva_alcance_y_procedencia(self):
        c = copy.deepcopy(CAT); c.setdefault('original_refs', {})['01'] = MARIO_REF
        fighters, _ = load_from(c); mario = next(f for f in fighters if f['code'] == '01')
        self.assertEqual(mario.get('original_ref'), MARIO_REF)

    def test_no_se_inventa_una_referencia_original_ausente(self):
        c = copy.deepcopy(CAT); c.pop('original_refs', None)
        fighters, _ = load_from(c)
        for f in fighters:
            self.assertTrue('original_ref' in f, f['code'])
            self.assertIsNone(f['original_ref'])

class Inventario(unittest.TestCase):
    def test_perfil_gian_sin_musica_y_exclusiones(self):
        fighters, _ = cd.load(); inv = cd.load_inventory(fighters)
        self.assertEqual(inv['meta']['profile']['name'], 'gian-sin-musica')
        self.assertIn('77', inv['meta']['profile']['excluded_base_fighters'])
        steve = inv['fighters']['77']['slots']
        self.assertTrue(all(not s.get('src') for s in steve.values()), 'Steve solo tiene ramas en preparación, nada instalado')
        self.assertEqual(inv['fighters']['79']['slots']['0']['name'], 'Aqua (Dusk)')
        self.assertEqual(inv['fighters']['80']['slots']['0']['name'], 'Aqua (Dusk)')
        self.assertNotIn('7', {k for k, s in inv['fighters']['82']['slots'].items() if s.get('src') == 'base'}, 'Sora c07 de base queda excluido por el perfil')
        self.assertIn('version', inv['meta']); self.assertEqual(inv['meta']['verification'], 'parcial')
        staged = json.load(open(os.path.join(R, 'data', 'inventory_staged.json')))['slots']
        for code, slots in staged.items():
            for n, entry in slots.items():
                self.assertEqual(inv['fighters'][code]['slots'][n]['staged']['branch'], entry['branch'])
if __name__ == '__main__': unittest.main()
