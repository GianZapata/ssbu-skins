"""Plan de slots (tools/slot_plan.py) sobre datos falsos: resumen, orden de prioridad, «Otros», WuBoy excluido y las comprobaciones de --check."""
import json, os, subprocess, sys, tempfile, unittest
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def f(path, slots, listed=True): return {'path': path, 'kind': 'original', 'bytes': 1, 'md5': 'x', 'listed': listed, 'slots': slots, 'touches_c00': (0 in slots) if listed else None}
def d(name, slot_state='mod', source='drive', mod_id=None, file=None, reslot=None, approved=True):
    return {'state': slot_state, 'name': name, 'mod_id': mod_id, 'source': source, 'reslot_from': reslot, 'file': file, 'approved': approved}

class SlotPlan(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.dir = self.tmp.name; self.out = os.path.join(self.dir, 'SLOTS.md')
        self.write('catalog.json', {'counts': {'coverage': {'01': {'fighter': 'Mario'}, '03': {'fighter': 'Link'}, '10': {'fighter': 'Ness'}, '74': {'fighter': 'Terry'}}},
                                    'entries': [{'roster_no': '03', 'mod_id': 100, 'wifi_state': 'Declaración explícita del autor sin condiciones conocidas'}]})
        self.write('installed.json', {'fighters': {'01': {'internal': 'mario', 'slots': [1, 2, 3], 'info': {'2': {'n': 'Mario Rojo'}}}, '03': {'internal': 'link', 'slots': [1, 2]},
                                                   '74': {'internal': 'dolly', 'slots': [1, 2]}}})
        self.write('inventory_profile.json', {'excluded_base_fighters': ['74'], 'excluded_base_slots': [{'fighter': '01', 'slot': 3}],
                                              'slots': [{'fighter': '01', 'slot': 1, 'name': 'Kellytoy'}]})
        self.write('drive.json', {'mods': [
            {'mod_id': 100, 'slug': 'skin_link', 'folder': 'link/100_skin_link', 'code': '03', 'plugin': False, 'kind': 'skin', 'origin': 'búsqueda', 'files': [f('original/a.zip', [4]), f('original/b.rar', [], False)]},
            {'mod_id': 101, 'slug': 'skin_link_usuario', 'folder': 'link/101_skin_link_usuario', 'code': '03', 'plugin': False, 'kind': 'skin', 'origin': 'enlace del usuario', 'files': [f('original/c.zip', [5])]},
            {'mod_id': 200, 'slug': 'ness_mod', 'folder': 'ness/200_ness_mod', 'code': '10', 'plugin': False, 'kind': 'skin', 'origin': 'desconocido', 'files': [f('original/n.zip', [3])]},
            {'mod_id': 200, 'slug': 'ness_mod', 'folder': 'ness/200_ness_mod (1)', 'code': '10', 'plugin': False, 'kind': 'skin', 'origin': 'desconocido', 'files': []},
            {'mod_id': 300, 'slug': 'terry_mod', 'folder': 'terry/300_terry_mod', 'code': '74', 'plugin': False, 'files': [f('original/t.zip', [5])]},   # versión antigua del manifiesto: sin kind ni origin
            {'mod_id': 400, 'slug': 'banner_ui', 'folder': '_ui/400_banner_ui', 'code': '03', 'plugin': False, 'kind': 'ui', 'origin': 'enlace del usuario', 'files': [f('original/u.zip', [])]}]})   # kind ui con código: igual no es una skin
        self.plan({'1': d('Kellytoy', source='profile')})

    def tearDown(self): self.tmp.cleanup()
    def write(self, name, data): json.dump(data, open(os.path.join(self.dir, name), 'w', encoding='utf-8'), ensure_ascii=False)
    def plan(self, mario=None, extra=None, priority=None):
        fighters = {'01': {'slots': mario or {}}, **(extra or {})}
        self.write('slot_plan.json', {'priority': priority or ['03', '01'], 'fighters': fighters})
    def run_tool(self, *a): return subprocess.run([sys.executable, os.path.join(R, 'tools', 'slot_plan.py'), '--data', self.dir, '--out', self.out, *a], capture_output=True, text=True)
    def md(self): return open(self.out, encoding='utf-8').read()

    def test_resumen_orden_y_otros(self):
        self.plan({'1': d('Kellytoy', source='profile'), '2': d('Mario Rojo', 'wuboy', 'wuboy', approved=False)})
        r = self.run_tool(); self.assertEqual(r.returncode, 0, r.stderr)
        m = self.md(); self.assertIn('**4 luchadores · 1 slots aprobados · 1 propuestos · 30 sin decidir (de 32)**', m)
        self.assertLess(m.index('## 1. Link (03)'), m.index('## 2. Mario (01)'))   # el orden es el de priority
        self.assertLess(m.index('## 2. Mario (01)'), m.index('## Otros'))
        self.assertIn('### Ness (10)', m); self.assertIn('### Terry (74)', m)       # con mods en el Drive y fuera de priority
        self.assertIn('| c01 | perfil · Kellytoy | perfil · Kellytoy | aprobado |', m)
        self.assertIn('| c02 | WuBoy «Mario Rojo» | WuBoy «Mario Rojo» | propuesto |', m)
        self.assertIn('| c00 | original | original | sin decidir |', m)

    def test_wuboy_excluido_y_mods_sin_asignar(self):
        self.run_tool(); m = self.md()
        self.assertIn('| c03 | original | original | sin decidir |', m.split('## 2. Mario (01)')[1].split('##')[0])   # slot excluido del perfil
        link = m.split('## 1. Link (03)')[1].split('## 2.')[0]
        self.assertIn('| 100 | skin_link | búsqueda | c04 | explícita | ? |', link)   # un archivo sin listar: no se sabe si toca c00
        self.assertEqual(m.count('| 200 | ness_mod |'), 1)     # mod repetido en dos carpetas: una sola fila
        terry = m.split('### Terry (74)')[1]
        self.assertIn('| c01 | original | original | sin decidir |', terry)   # luchador excluido de WuBoy

    def test_origen_orden_y_resumen(self):
        self.run_tool(); m = self.md(); link = m.split('## 1. Link (03)')[1].split('## 2.')[0]
        self.assertIn('| 101 | skin_link_usuario | usuario | c05 | — | no |', link)
        self.assertLess(link.index('| 101 |'), link.index('| 100 |'))   # los que mandó Gian, primero aunque tengan id mayor
        self.assertNotIn('banner_ui', m)                               # kind ui: no es una skin sin asignar
        self.assertIn('| 1 | Link (03) | 0/8 | 0 | 8 | 2 | 1 |', m)     # Drive sin asignar 2, del usuario 1
        self.assertIn('| 2 | Mario (01) | 1/8 | 0 | 7 | 0 | 0 |', m)         # sin mods en el Drive: ceros
        self.assertIn('Orígenes de los mods del Drive: usuario 2 · búsqueda 1 · auditoría/previo 2 · sin registro 1.', m)
        self.assertIn('auditoría/previo = ya estaba en el Drive', m)
        self.assertIn('| 300 | terry_mod | — | c05 |', m)               # sin origen: «—»

    def test_determinista(self):
        self.run_tool(); a = self.md(); self.run_tool(); self.assertEqual(a, self.md())

    def test_check_correcto_y_avisos(self):
        self.plan(extra={'03': {'slots': {'4': d('Skin Link', mod_id=100, file='link/100_skin_link/original/a.zip'), '1': d('Skin', mod_id=100, file='link/100_skin_link/original/b.rar', reslot=4)}}})
        r = self.run_tool('--check'); self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('archivo sin listar', r.stderr); self.assertIn('reemplaza la skin de WuBoy', r.stderr)

    def test_check_errores(self):
        casos = {
            'mod que no existe': ({'03': {'slots': {'4': d('X', mod_id=999, file='x')}}}, 'no está en drive.json'),
            'reslot incoherente': ({'03': {'slots': {'1': d('X', mod_id=100, file='link/100_skin_link/original/a.zip', reslot=2)}}}, 'reslot_from c02'),
            'sin reslot': ({'03': {'slots': {'1': d('X', mod_id=100, file='link/100_skin_link/original/a.zip')}}}, 'falta reslot_from'),
            'slot fuera de rango': ({'03': {'slots': {'9': d('X', 'vanilla', 'vanilla')}}}, 'fuera de 0–7'),
            'wuboy inexistente': ({'74': {'slots': {'2': d('X', 'wuboy', 'wuboy')}}}, 'no hay skin de WuBoy'),
            'perfil inexistente': ({'03': {'slots': {'2': d('X', source='profile')}}}, 'no está en el perfil'),
            'archivo ausente': ({'03': {'slots': {'4': d('X', mod_id=100, file='link/100_skin_link/original/z.zip')}}}, 'no está en drive.json')}
        for nombre, (extra, msg) in casos.items():
            with self.subTest(nombre):
                self.plan(extra=extra); r = self.run_tool('--check'); self.assertEqual(r.returncode, 1, r.stderr); self.assertIn(msg, r.stderr)

    def test_check_slot_repetido(self):
        raw = '{"priority": ["03"], "fighters": {"03": {"slots": {"4": {"state": "vanilla", "name": "a", "mod_id": null, "source": "vanilla", "approved": true}, "4": {"state": "vanilla", "name": "b", "mod_id": null, "source": "vanilla", "approved": true}}}}}'
        open(os.path.join(self.dir, 'slot_plan.json'), 'w', encoding='utf-8').write(raw)
        r = self.run_tool('--check'); self.assertEqual(r.returncode, 1); self.assertIn('clave repetida', r.stderr)

    def test_aviso_de_mod_sin_asignar_solo_con_decisiones_aprobadas(self):
        r = self.run_tool('--check'); self.assertNotIn('sin asignar', r.stderr)   # Link no tiene decisiones aprobadas
        self.plan(extra={'03': {'slots': {'0': d('Original', 'vanilla', 'vanilla')}}})
        self.assertIn('mod 100 skin_link del Drive sin asignar', self.run_tool('--check').stderr)

    def test_docs_para_firestore(self):
        self.plan({'1': d('Kellytoy', source='profile'), '2': d('Mario Rojo', 'wuboy', 'wuboy', approved=False)})
        sys.path.insert(0, os.path.join(R, 'tools')); import slot_plan
        docs = slot_plan.Plan(self.dir).docs()
        self.assertEqual(list(docs), ['03', '01', '10', '74'])   # orden de prioridad y luego «Otros»
        self.assertTrue(all(len(v['slots']) == 8 for v in docs.values()))
        m = docs['01']['slots']
        self.assertEqual((m[1]['estado'], m[1]['source'], m[2]['estado'], m[2]['state'], m[0]['estado']), ('aprobado', 'profile', 'propuesto', 'wuboy', 'sin decidir'))
        self.assertNotIn('state', m[0])   # sin decisión no hay campos de decisión
        self.assertEqual([u['mod_id'] for u in docs['03']['unassigned']], [101, 100])   # lo del usuario primero; la ui no cuenta
        self.assertEqual((docs['03']['priority'], docs['74']['priority']), (1, None))

if __name__ == '__main__': unittest.main()
