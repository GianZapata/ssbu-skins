"""Revisión del plan antes de instalar (tools/review_plan.py): solo analiza; detecta lo que puede salir mal."""
import json, os, subprocess, sys, tempfile, unittest, urllib.request
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(R, 'tools'))
import catalog_data as cd, review_plan as rp

F, META = cd.load(); INV = cd.load_inventory(F)
PICKS = [(f, p) for f in F for p in f['picks']]
def msgs(items, F_, sev=None):
    return [x['msg'] for it in items for x in it['notes'] if sev in (None, x['sev'])] + [x['msg'] for x in F_ if sev in (None, x['sev'])]
def run(changes, hist=()): return rp.review([{'code': c, 'slot': n, 'vid': v} for c, n, v in changes], list(hist), F, INV)

class Revision(unittest.TestCase):
    def test_plan_vacio(self):
        it, g = run([]); self.assertEqual(it, []); self.assertTrue(any('vacío' in m for m in msgs(it, g)))
    def test_id_desconocido_y_retirada_son_errores(self):
        wd = next((f, p) for f, p in PICKS if p['withdrawn'])
        it, g = run([('01', 0, '01:no-existe'), (wd[0]['code'], 1, wd[1]['vid'])])
        e = msgs(it, g, 'ERROR'); self.assertTrue(any('ya no existe' in m for m in e)); self.assertTrue(any('RETIRADA' in m for m in e))
    def test_mii_es_error(self):
        f = next(f for f in F if f['mii']); p = next(p for p in f['picks'] if not p['withdrawn'])
        self.assertTrue(any('Mii' in m for m in msgs(*run([(f['code'], 0, p['vid'])]), 'ERROR')))
    def test_reemplazar_un_favorito_del_perfil_avisa(self):
        p = next(p for p in next(f for f in F if f['code'] == '82')['picks'] if not p['withdrawn'] and not p['mii'])
        m = msgs(*run([('82', 4, p['vid'])]), 'AVISO'); self.assertTrue(any('Ventus' in x and 'favorito' in x for x in m), m)
    def test_original_no_avisa_de_reemplazo(self):
        f, n, p = next((f, int(k), p) for f in F for k, s in INV['fighters'].get(f['code'], {}).get('slots', {}).items() if s.get('default') for p in f['picks'] if not p['withdrawn'] and p['native'] == list(range(8)))
        self.assertFalse(any('favorito' in x for x in msgs(*run([(f['code'], n, p['vid'])]))))
    def test_mover_de_slot_avisa(self):
        f, p = next((f, p) for f, p in PICKS if not p['withdrawn'] and not f['mii'] and p['native'] and len(p['native']) < 8)
        n = next(k for k in range(8) if k not in p['native'])
        self.assertTrue(any('moverlo de slot' in x for x in msgs(*run([(f['code'], n, p['vid'])]), 'AVISO')))
    def test_pyra_sin_mythra_avisa_el_par(self):
        p = next(p for p in next(f for f in F if f['code'] == '79')['picks'] if not p['withdrawn'])
        self.assertTrue(any('Pyra y Mythra' in x for x in msgs(*run([('79', 3, p['vid'])]), 'AVISO')))
    def test_mismo_mod_dos_veces_en_un_luchador(self):
        p = next(p for p in next(f for f in F if f['code'] == '01')['picks'] if not p['withdrawn'])
        self.assertTrue(any('está en 2 trajes' in x for x in msgs(*run([('01', 1, p['vid']), ('01', 2, p['vid'])]), 'AVISO')))
    def test_dos_variantes_distintas_del_mismo_mod_es_info_no_aviso(self):
        p = next(p for p in next(f for f in F if f['code'] == '01')['picks'] if not p['withdrawn'])
        rows = [
            {'code': '01', 'slot': 1, 'vid': p['vid'], 'variant': f"{p['vid']}:aaeedf35:c00"},
            {'code': '01', 'slot': 2, 'vid': p['vid'], 'variant': f"{p['vid']}:aaeedf35:c03"},
        ]
        it, g = rp.review(rows, [], F, INV)
        self.assertFalse(any('está en 2 trajes' in x for x in msgs(it, g, 'AVISO')))
        self.assertTrue(any('2 variantes distintas' in x for x in msgs(it, g, 'INFO')))
        self.assertTrue(any('apariencia elegida:' in x for x in msgs(it, g, 'INFO')))
    def test_misma_variante_en_dos_trajes_avisa(self):
        p = next(p for p in next(f for f in F if f['code'] == '01')['picks'] if not p['withdrawn'])
        v = f"{p['vid']}:aaeedf35:c00"
        it, g = rp.review([{'code': '01', 'slot': s, 'vid': p['vid'], 'variant': v} for s in (1, 2)], [], F, INV)
        self.assertTrue(any('está en 2 trajes' in x for x in msgs(it, g, 'AVISO')))
    def test_una_fila_con_variante_y_otra_sin_avisa(self):
        p = next(p for p in next(f for f in F if f['code'] == '01')['picks'] if not p['withdrawn'])
        it, g = rp.review([{'code': '01', 'slot': 1, 'vid': p['vid'], 'variant': f"{p['vid']}:aaeedf35:c00"}, {'code': '01', 'slot': 2, 'vid': p['vid']}], [], F, INV)
        self.assertTrue(any('está en 2 trajes' in x for x in msgs(it, g, 'AVISO')))
    def test_variante_de_otro_vid_es_error_y_no_se_anuncia(self):
        p = next(p for p in next(f for f in F if f['code'] == '01')['picks'] if not p['withdrawn'])
        it, g = rp.review([{'code': '01', 'slot': 1, 'vid': p['vid'], 'variant': '82:330053:aaeedf35:c03'}], [], F, INV)
        self.assertTrue(any('no corresponde a esta apariencia' in x for x in msgs(it, g, 'ERROR')))
        self.assertFalse(any('apariencia elegida' in x for x in msgs(it, g, 'INFO')))
    def test_read_file_toma_la_variante_de_la_propuesta_o_tolera_sin_propuesta(self):
        base = {'roster_no': '01', 'traje': 2, 'vid': '01:1'}
        data = {'inventory': {'version': 'v'}, 'history': [], 'changes': [
            {**base, 'proposal': {'chosen_variant': {'id': '01:1:aaeedf35:c03'}}},
            {**base, 'traje': 3, 'proposal': None},
            {**base, 'traje': 4, 'variant': '01:1:bbbbbbbb:c01', 'proposal': None}]}
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            json.dump(data, f)
        try: ch, _, _ = rp.read_file(f.name)
        finally: os.unlink(f.name)
        self.assertEqual([c['variant'] for c in ch], ['01:1:aaeedf35:c03', None, '01:1:bbbbbbbb:c01'])
    def test_dependencia_condicion_y_online_se_muestran(self):
        f, p = next((f, p) for f, p in PICKS if not p['withdrawn'] and not f['mii'] and p['conditions'] and p['wifi_status'] == 'autor_condicionado')
        self.assertTrue(any('condiciones' in x for x in msgs(*run([(f['code'], 0, p['vid'])]), 'AVISO')))
    def test_inventario_distinto_y_vaivenes(self):
        p = next(p for p in F[0]['picks'] if not p['withdrawn'])
        it, g = rp.review([{'code': F[0]['code'], 'slot': 0, 'vid': p['vid']}], [{'code': F[0]['code'], 'slot': 0, 'kind': 'set'}] * 5, F, INV, 'otra-version')
        m = msgs(it, g); self.assertTrue(any('otra versión del inventario' in x for x in m)); self.assertTrue(any('desacuerdo' in x for x in m))
    def test_exportacion_de_la_web_como_fuente(self):
        p = next(p for p in F[0]['picks'] if not p['withdrawn'] and not isinstance(p['mii'], str))
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            json.dump({'inventory': {'version': INV['meta']['version']}, 'changes': [{'roster_no': F[0]['code'], 'traje': 3, 'vid': p['vid']}], 'history': []}, f)
        r = subprocess.run([sys.executable, os.path.join(R, 'tools', 'review_plan.py'), '--source', 'file', f.name, '--strict'], capture_output=True, text=True)
        os.unlink(f.name); self.assertEqual(r.returncode, 0, r.stderr); self.assertIn('Revisión del plan', r.stdout); self.assertIn('Traje 3', r.stdout)

    def test_cruzar_de_familia_es_error_por_native_y_por_variante(self):
        cloud = next(f for f in F if f['code'] == '61')
        cloud_even = next(p for p in cloud['picks'] if not p['withdrawn'] and p['native'] and set(p['native']) <= {0, 2, 4, 6} and len(p['native']) < 4)
        it_err, g_err = rp.review([{'code': '61', 'slot': 1, 'vid': cloud_even['vid']}], [], F, INV)
        self.assertTrue(any('cruza de familia de colores' in m for m in msgs(it_err, g_err, 'ERROR')))
        self.assertFalse(any('moverlo de slot' in m for m in msgs(it_err, g_err, 'AVISO')))
        target_same = next(s for s in (0, 2, 4, 6) if s not in cloud_even['native'])
        it_warn, g_warn = rp.review([{'code': '61', 'slot': target_same, 'vid': cloud_even['vid']}], [], F, INV)
        self.assertFalse(any('cruza de familia' in m for m in msgs(it_warn, g_warn, 'ERROR')))
        self.assertTrue(any('moverlo de slot' in m for m in msgs(it_warn, g_warn, 'AVISO')))
        any_cloud = next(p for p in cloud['picks'] if not p['withdrawn'])
        it_var, g_var = rp.review([{'code': '61', 'slot': 2, 'vid': any_cloud['vid'], 'variant': f"{any_cloud['vid']}:aaeedf35:c01"}], [], F, INV)
        self.assertTrue(any('cruza de familia de colores' in m for m in msgs(it_var, g_var, 'ERROR')))
        it_ok, g_ok = rp.review([{'code': '61', 'slot': 3, 'vid': any_cloud['vid'], 'variant': f"{any_cloud['vid']}:aaeedf35:c01"}], [], F, INV)
        self.assertFalse(any('cruza de familia' in m for m in msgs(it_ok, g_ok, 'ERROR')))
        self.assertTrue(any('dentro de su familia' in m for m in msgs(it_ok, g_ok, 'AVISO')))
        self.assertEqual(len([m for m in msgs(it_var, g_var, 'ERROR') if 'no corresponde' in m]), 0)
    def test_origen_fuera_de_todo_grupo_cae_a_los_8_slots(self):
        self.assertEqual(rp.compatible_slots('61', [9], {'61': [[0, 2, 4, 6], [1, 3, 5, 7]]}), list(range(8)))
        self.assertEqual(rp.compatible_slots('61', [1], {'61': [[0, 2, 4, 6], [1, 3, 5, 7]]}), [1, 3, 5, 7])
    def test_sin_slots_nativos_es_info_y_no_bloquea_por_familia(self):
        f, p = next((f, p) for f, p in PICKS if not p['withdrawn'] and not f['mii'] and not p['native'] and p['slots_orig'] in (None, '', 'sin especificar'))
        it, g = rp.review([{'code': f['code'], 'slot': 1, 'vid': p['vid']}], [], F, INV)
        self.assertFalse(any('cruza de familia' in m for m in msgs(it, g, 'ERROR')))
        self.assertTrue(any('no indica sus slots originales' in m for m in msgs(it, g, 'INFO')))
    def test_cli_source_file_conserva_variant_y_detecta_cruce_de_familia(self):
        any_cloud = next(p for p in next(f for f in F if f['code'] == '61')['picks'] if not p['withdrawn'] and p['wifi_status'] != 'incompatible')
        payload = {'inventory': {'version': INV['meta']['version']}, 'history': [], 'changes': [
            {'roster_no': '61', 'traje': 2, 'vid': any_cloud['vid'], 'variant': f"{any_cloud['vid']}:aaeedf35:c01"},
            {'roster_no': '61', 'traje': 4, 'vid': any_cloud['vid'], 'variant': f"{any_cloud['vid']}:aaeedf35:c03"}]}
        cmd = lambda path: [sys.executable, os.path.join(R, 'tools', 'review_plan.py'), '--source', 'file', path, '--strict']
        with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
            json.dump(payload, f)
        try:
            ok_run = subprocess.run(cmd(f.name), capture_output=True, text=True)
            payload['changes'][0]['traje'] = 3
            with open(f.name, 'w', encoding='utf-8') as f2:
                json.dump(payload, f2)
            bad_run = subprocess.run(cmd(f.name), capture_output=True, text=True)
        finally:
            os.unlink(f.name)
        self.assertEqual(ok_run.returncode, 0, ok_run.stdout + ok_run.stderr)
        self.assertIn('2 variantes distintas', ok_run.stdout)
        self.assertEqual(bad_run.returncode, 1)
        self.assertIn('cruza de familia de colores', bad_run.stdout)

    def test_sin_argumentos_revisa_el_plan_de_git(self):
        r = subprocess.run([sys.executable, os.path.join(R, 'tools', 'review_plan.py')], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('Pikadorf', r.stdout)
        self.assertNotIn('changes', r.stdout)

def up():
    try: urllib.request.urlopen('http://127.0.0.1:8080', timeout=2); return True
    except Exception: return False
class ReviewByPersonTests(unittest.TestCase):
    def _pick(self):
        return next(p for p in next(f for f in F if f['code'] == '01')['picks'] if not p['withdrawn'])
    def test_propuestas_del_mismo_traje_se_agrupan_por_persona(self):
        p = self._pick(); v = p['vid']
        rows = [{'code': '01', 'slot': 0, 'vid': v, 'person': 'Otros'}, {'code': '01', 'slot': 0, 'vid': v, 'person': 'Alan'}, {'code': '01', 'slot': 0, 'vid': v, 'person': 'Gian'}]
        it, g = rp.review(rows, [], F, INV)
        self.assertEqual([x['person'] for x in it], ['Gian', 'Alan', 'Otros'])
        md = rp.render(it, g, {'generated': 'x'})
        self.assertEqual(sum(1 for l in md.splitlines() if l.startswith('### ') and 'Traje 1 (c00)' in l), 1)
        pos = [md.index(f'{n} →') for n in ('Gian', 'Alan', 'Otros')]
        self.assertEqual(pos, sorted(pos))
        for n in ('Gian', 'Alan', 'Otros'): self.assertRegex(md, rf'#### \S+ {n} →')
    def test_mismo_mod_en_trajes_distintos_de_dos_personas_no_avisa(self):
        v = self._pick()['vid']
        it, g = rp.review([{'code': '01', 'slot': 0, 'vid': v, 'person': 'Gian'}, {'code': '01', 'slot': 2, 'vid': v, 'person': 'Alan'}], [], F, INV)
        self.assertFalse(any('está en 2 trajes' in x for x in msgs(it, g, 'AVISO')))
    def test_la_misma_persona_con_el_mismo_mod_en_dos_trajes_avisa(self):
        v = self._pick()['vid']
        it, g = rp.review([{'code': '01', 'slot': 0, 'vid': v, 'person': 'Gian'}, {'code': '01', 'slot': 2, 'vid': v, 'person': 'Gian'}], [], F, INV)
        self.assertTrue(any('(Gian)' in x and 'está en 2 trajes' in x for x in msgs(it, g, 'AVISO')))
    def test_persona_desde_el_id_y_otros_para_documentos_sin_name(self):
        self.assertEqual(rp._person_of({'_id': '01_0_Ches'}), 'Ches')
        self.assertEqual(rp._person_of({'_id': '01_0'}, default_other=True), 'Otros')
        self.assertIsNone(rp._person_of({'_id': '01_0'}))

@unittest.skipUnless(up(), 'emulador de Firestore no disponible')
class DesdeFirestore(unittest.TestCase):
    def test_rest_y_admin_leen_el_mismo_plan(self):
        env = {**os.environ, 'FIRESTORE_EMULATOR_HOST': '127.0.0.1:8080', 'GOOGLE_CLOUD_PROJECT': 'ssbu-441b1'}
        from google.cloud import firestore
        os.environ.update(env); c = firestore.Client(project='ssbu-441b1')
        for d in c.collection('changes').stream(): d.reference.delete()
        p = next(p for p in next(f for f in F if f['code'] == '01')['picks'] if not p['withdrawn'])
        c.collection('changes').document('01_2').set({'code': '01', 'slot': 2, 'vid': p['vid'], 'by': 'x'})
        base = 'http://127.0.0.1:8080/v1/projects/ssbu-441b1/databases/(default)/documents'
        ch, _ = rp.read_rest('ssbu-441b1', base); ch2, _ = rp.read_admin()
        self.assertEqual([(x['code'], x['slot'], x['vid']) for x in ch], [(x['code'], x['slot'], x['vid']) for x in ch2])
        r = subprocess.run([sys.executable, os.path.join(R, 'tools', 'review_plan.py'), '--source', 'changes', '--rest-base', base], capture_output=True, text=True, env=env)
        self.assertEqual(r.returncode, 0, r.stderr); self.assertIn('Traje 3', r.stdout)
if __name__ == '__main__': unittest.main()
