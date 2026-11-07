"""db.py legacy y migrate con un cliente falso (sin emulador)."""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')), 'tools'))
import db as dbm

class Snap:
    def __init__(self, store, id): self.store, self.id = store, id; self.reference = self
    @property
    def exists(self): return self.id in self.store
    def to_dict(self): return dict(self.store[self.id])
    def get(self): return self
    def set(self, d): self.store[self.id] = dict(d)
    def delete(self): self.store.pop(self.id, None)
class Coll:
    def __init__(self, store): self.store = store
    def document(self, id): return Snap(self.store, id)
    def stream(self): return [Snap(self.store, i) for i in list(self.store)]
    def add(self, d): self.store['auto%d' % len(self.store)] = dict(d)
class Batch:
    def __init__(self): self.ops = []
    def set(self, ref, d): self.ops.append(lambda: ref.set(d))
    def delete(self, ref): self.ops.append(ref.delete)
    def commit(self): [o() for o in self.ops]
class FakeDb:
    def __init__(self, **colls): self.c = {k: dict(v) for k, v in colls.items()}
    def collection(self, n): return Coll(self.c.setdefault(n, {}))
    def batch(self): return Batch()

def seed():
    return FakeDb(changes={
        '01_0': {'code': '01', 'slot': 0, 'vid': '01:1', 'by': 'u', 'at': 't'},
        '01_1': {'code': '01', 'slot': 1, 'vid': '01:2', 'variant': '01:2:aaeedf35:c00', 'by': 'u', 'at': 't'},
        '02_0': {'code': '02', 'slot': 0, 'vid': '02:1', 'by': 'u', 'at': 't'},
        '01_2_Alan': {'code': '01', 'slot': 2, 'vid': '01:3', 'name': 'Alan', 'by': 'u', 'at': 't'}})

class Legacy(unittest.TestCase):
    def test_lista_sin_escribir(self):
        d = seed(); dbm.legacy(d); self.assertEqual(len(d.c['changes']), 4)
    def test_dry_run_por_defecto(self):
        d = seed(); dbm.legacy(d, assign='Gian'); self.assertIn('01_0', d.c['changes']); self.assertNotIn('01_0_Gian', d.c['changes'])
    def test_assign_copia_campos_y_borra_el_antiguo(self):
        d = seed(); dbm.legacy(d, assign='Gian', apply=True); ch = d.c['changes']
        self.assertNotIn('01_0', ch); self.assertNotIn('01_1', ch)
        self.assertEqual(ch['01_1_Gian'], {'code': '01', 'slot': 1, 'vid': '01:2', 'variant': '01:2:aaeedf35:c00', 'by': 'u', 'at': 't', 'name': 'Gian'})
        self.assertIn('01_2_Alan', ch)
    def test_assign_no_pisa_uno_con_nombre(self):
        d = seed(); d.c['changes']['01_0_Gian'] = {'code': '01', 'slot': 0, 'vid': 'otro', 'name': 'Gian'}
        dbm.legacy(d, assign='Gian', apply=True)
        self.assertEqual(d.c['changes']['01_0_Gian']['vid'], 'otro'); self.assertIn('01_0', d.c['changes'])
    def test_filtros_code_y_slot(self):
        d = seed(); dbm.legacy(d, assign='Ches', code='01', slot=1, apply=True)
        self.assertIn('01_1_Ches', d.c['changes']); self.assertIn('01_0', d.c['changes']); self.assertIn('02_0', d.c['changes'])
    def test_remove_solo_borra_antiguos(self):
        d = seed(); dbm.legacy(d, remove=True, apply=True); self.assertEqual(list(d.c['changes']), ['01_2_Alan'])
if __name__ == '__main__': unittest.main()
