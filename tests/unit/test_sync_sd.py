"""tools/sync_sd.py: alineación del plan de slots con el perfil y guardas del comando, sobre datos falsos."""
import os, subprocess, sys, tempfile, unittest
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(R, 'tools'))
import sync_sd as ss

INTERNAL = {'mario': '01', 'link': '03'}
STAMP = '2026-11-06T10:00:00-06:00'


def slot(name, state='mod', source='profile', mod_id=None, reslot=None):
    return {'state': state, 'name': name, 'mod_id': mod_id, 'source': source, 'reslot_from': reslot, 'file': None, 'approved': True}


def mod(cid, fighter, target, url=None, name=None, kind='mods'):
    return {'id': cid, 'fighter': fighter, 'kind': kind, 'target_slots': target, 'source_url': url, 'name': name or cid + ' c00'}


class PlanAdditions(unittest.TestCase):
    def plan(self, **fighters):
        return {'updated_at': 'antes', 'priority': ['01', '03'], 'fighters': {c: {'slots': s} for c, s in fighters.items()}}

    def run_it(self, plan, mods, required, component_slots=None):
        return ss.plan_additions(plan, {m['id']: m for m in mods}, required, INTERNAL, component_slots or {}, STAMP)

    def test_anade_un_slot_que_el_plan_no_tiene_como_mod(self):
        plan = self.plan(**{'01': {'0': slot('Original', 'vanilla', 'vanilla')}})
        new, rep = self.run_it(plan, [mod('mario-a', 'mario', 'c00', 'https://gamebanana.com/mods/123', 'Mario - A c00')], ['mario-a'])
        s = new['fighters']['01']['slots']['0']
        self.assertEqual((s['state'], s['name'], s['mod_id'], s['source'], s['approved']), ('mod', 'Mario - A', 123, 'profile', True))
        self.assertEqual(rep['added'], [('01', 0, 'mario-a')])
        self.assertEqual(new['updated_at'], STAMP)
        self.assertEqual(plan['fighters']['01']['slots']['0']['state'], 'vanilla', 'no modifica el plan de entrada')

    def test_luchador_nuevo_y_orden_de_slots(self):
        new, rep = self.run_it(self.plan(), [mod('link-a', 'link', 'c05 (color 6)'), mod('link-b', 'link', 'c01')], ['link-a', 'link-b'])
        self.assertEqual(list(new['fighters']['03']['slots']), ['1', '5'])
        self.assertEqual(len(rep['added']), 2)

    def test_origen_del_reslot_no_cuenta_como_destino(self):
        new, rep = self.run_it(self.plan(), [mod('mario-r', 'mario', 'c04 (color 5), desde c00')], ['mario-r'])
        self.assertEqual(list(new['fighters']['01']['slots']), ['4'])
        self.assertEqual(new['fighters']['01']['slots']['4']['reslot_from'], 0)

    def test_modelo_y_movimientos_no_son_destinos(self):
        new, _ = self.run_it(self.plan(), [mod('m', 'mario', 'c03 (color 4), modelo c01 y movimientos c00')], ['m'])
        self.assertEqual(list(new['fighters']['01']['slots']), ['3'])

    def test_no_pisa_una_decision_existente(self):
        plan = self.plan(**{'01': {'0': slot('Otro', source='drive', mod_id=999)}})
        new, rep = self.run_it(plan, [mod('mario-a', 'mario', 'c00', 'https://gamebanana.com/mods/123')], ['mario-a'])
        self.assertEqual(new['fighters']['01']['slots']['0']['name'], 'Otro')
        self.assertEqual(rep['conflicts'], [('01', 0, 'mario-a', 'Otro')])
        self.assertEqual(rep['added'], [])
        self.assertEqual(new['updated_at'], 'antes', 'sin cambios no se toca updated_at')

    def test_espejo_desactualizado_se_actualiza_y_recuerda_el_anterior(self):
        old = slot('Ugandan Knuckles', mod_id=347784); old['nota'] = 'Instalada en la SD (wario-knuckles-c05); plan alineado con la SD el 2026-11-01'
        new, rep = self.run_it(self.plan(**{'01': {'5': old}}), [mod('wario-shaven-c05', 'mario', 'c05', None, 'Wario - Shaven c05')], ['wario-shaven-c05'])
        s = new['fighters']['01']['slots']['5']
        self.assertEqual((s['name'], s['source']), ('Wario - Shaven', 'profile'))
        self.assertIn('wario-shaven-c05', s['nota']); self.assertIn('antes: Ugandan Knuckles', s['nota'])
        self.assertEqual(rep['updated'], [('01', 5, 'wario-shaven-c05', 'Ugandan Knuckles')])
        self.assertEqual((rep['added'], rep['conflicts']), ([], []))
        self.assertEqual(new['updated_at'], STAMP)

    def test_espejo_vigente_no_se_toca(self):
        cur = slot('Mario - A', mod_id=347784); cur['nota'] = 'Instalada en la SD (mario-a); plan alineado con la SD el 2026-11-01'
        plan = self.plan(**{'01': {'0': cur}})
        new, rep = self.run_it(plan, [mod('mario-a', 'mario', 'c00', 'https://gamebanana.com/mods/123')], ['mario-a'])
        self.assertEqual((rep['added'], rep['updated'], rep['conflicts']), ([], [], []))
        self.assertEqual(new, plan)

    def test_propuesta_de_gian_con_otro_mod_se_conserva(self):
        cur = slot('Troll', source='drive', mod_id=296237); cur['nota'] = 'devuelto'
        plan = self.plan(**{'01': {'5': cur}})
        new, rep = self.run_it(plan, [mod('mario-b', 'mario', 'c05', 'https://gamebanana.com/mods/444343')], ['mario-b'])
        self.assertEqual(new, plan); self.assertEqual(rep['conflicts'], [('01', 5, 'mario-b', 'Troll')])

    def test_slot_ya_alineado_no_es_cambio(self):
        plan = self.plan(**{'01': {'0': slot('Mario - A', source='drive', mod_id=123)}})
        new, rep = self.run_it(plan, [mod('mario-a', 'mario', 'c00', 'https://gamebanana.com/mods/123')], ['mario-a'])
        self.assertEqual((rep['added'], rep['conflicts'], rep['orphans']), ([], [], []))
        self.assertEqual(new, plan)

    def test_huerfano_solo_se_avisa(self):
        plan = self.plan(**{'01': {'2': slot('Ya no está')}})
        new, rep = self.run_it(plan, [], [])
        self.assertEqual(rep['orphans'], [('01', 2, 'Ya no está')])
        self.assertEqual(new, plan)

    def test_mod_del_drive_no_es_huerfano(self):
        plan = self.plan(**{'01': {'2': slot('Solo en Drive', source='drive')}})
        self.assertEqual(self.run_it(plan, [], [])[1]['orphans'], [])

    def test_componentes_transcritos_cubren_su_slot(self):
        plan = self.plan(**{'01': {'1': slot('Transcrito')}})
        _, rep = self.run_it(plan, [], [], {'x': [('01', 1, 'Transcrito')]})
        self.assertEqual(rep['orphans'], [])

    def test_ignora_plugins_y_luchadores_desconocidos(self):
        mods = [mod('p', 'mario', 'c00', kind='plugin'), mod('z', 'desconocido', 'c00')]
        new, rep = self.run_it(self.plan(), mods, ['p', 'z'])
        self.assertEqual((rep['added'], new['fighters']), ([], {}))


class Guardas(unittest.TestCase):
    def test_sin_paquete_se_detiene_antes_de_escribir(self):
        with tempfile.TemporaryDirectory() as sd:
            os.makedirs(os.path.join(sd, 'ultimate', 'mods'))
            r = subprocess.run([sys.executable, os.path.join(R, 'tools', 'sync_sd.py'), '--package', os.path.join(sd, 'no-existe'), '--sd', sd],
                               capture_output=True, text=True)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('no existe el paquete', r.stderr)

    def test_sin_sd_montada_se_detiene(self):
        with tempfile.TemporaryDirectory() as d:
            r = subprocess.run([sys.executable, os.path.join(R, 'tools', 'sync_sd.py'), '--package', d, '--sd', os.path.join(d, 'sd')],
                               capture_output=True, text=True)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('no está montada', r.stderr)


if __name__ == '__main__':
    unittest.main()
