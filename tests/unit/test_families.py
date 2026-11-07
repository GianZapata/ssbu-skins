"""Familias de colores por luchador (tools/export_families.py y data/families.json)."""
import json, os, sys, tempfile, unittest
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(R, 'tools'))
import catalog_data as cd, export_families as ef


class ExportFamiliesUnit(unittest.TestCase):
    def test_ignora_nuanmb_adjb_xmb_y_accesorios_por_slot(self):
        paths = []
        for slot in range(8):
            paths.append(f'fighter/sonic/model/body/c0{slot}/skin_sonic_001_col.nutexb')
            if slot >= 1:
                paths.append(f'fighter/sonic/model/body/c0{slot}/def_sonic_00{slot + 1}_col.nutexb')
            if slot % 2 == 0:
                paths.append(f'fighter/sonic/model/body/c0{slot}/model.adjb')
                paths.append(f'fighter/sonic/model/body/c0{slot}/model.nuanmb')
                paths.append(f'fighter/sonic/model/body/c0{slot}/lod.xmb')
        got = ef.build_families(paths, ['38'], overrides={})
        self.assertEqual(got['38'], [[0, 1, 2, 3, 4, 5, 6, 7]])

    def test_une_popo_y_nana_en_ice_climbers(self):
        paths = []
        for slot in range(8):
            paths.append(f'fighter/popo/model/body/c0{slot}/body_col.nutexb')
            nana_tex = 'parka_a.nutexb' if slot < 4 else 'parka_b.nutexb'
            paths.append(f'fighter/nana/model/body/c0{slot}/{nana_tex}')
        got = ef.build_families(paths, ['15'], overrides={})
        self.assertEqual(got['15'], [[0, 1, 2, 3], [4, 5, 6, 7]])

    def test_load_vanilla_paths_acepta_json_y_txt(self):
        with tempfile.TemporaryDirectory() as tmp:
            jpath = os.path.join(tmp, 'dir_info.json')
            tpath = os.path.join(tmp, 'paths.txt')
            with open(jpath, 'w', encoding='utf-8') as f:
                json.dump({'file_array': ['0xdeadbeef', 'fighter/mario/model/body/c00/a.nutexb'], 'dirs': {}}, f)
            with open(tpath, 'w', encoding='utf-8') as f:
                f.write('0xdeadbeef\nfighter/mario/model/body/c00/a.nutexb\n')
            self.assertEqual(ef.load_vanilla_paths(jpath), ['fighter/mario/model/body/c00/a.nutexb'])
            self.assertEqual(ef.load_vanilla_paths(tpath), ['fighter/mario/model/body/c00/a.nutexb'])


class FamiliesDataContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fighters, _ = cd.load()
        with open(os.path.join(R, 'data', 'families.json'), encoding='utf-8') as f:
            cls.families = json.load(f)

    def test_cubre_todos_los_luchadores_con_particion_exacta_0_a_7(self):
        codes = [f['code'] for f in self.fighters]
        self.assertEqual(sorted(self.families.keys()), sorted(codes))
        for code, groups in self.families.items():
            flat = [slot for group in groups for slot in group]
            self.assertEqual(sorted(flat), list(range(8)), f'{code} no particiona 0..7: {groups}')
            for group in groups:
                self.assertTrue(len(group) >= 1)
                self.assertEqual(group, sorted(group))

    def test_luchadores_de_referencia_del_modpack(self):
        expected = {
            '11': [[0, 1, 2, 3, 4, 5, 6, 7]],
            '15': [[0, 1, 2, 3], [4, 5, 6, 7]],
            '29': [[0, 1, 2, 3, 4, 5], [6], [7]],
            '32': [[0, 2, 4, 6], [1, 3, 5, 7]],
            '38': [[0, 1, 2, 3, 4, 5, 6, 7]],
            '49': [[0, 1, 2, 3, 4, 5], [6, 7]],
            '58': [[0], [1], [2], [3], [4], [5], [6], [7]],
            '61': [[0, 2, 4, 6], [1, 3, 5, 7]],
            '68': [[0, 2, 4, 6], [1, 3, 5, 7]],
            '78': [[0, 1, 2, 3, 4, 5], [6, 7]],
            '81': [[0, 2, 4, 6], [1, 3, 5, 7]],
            '82': [[0], [1, 5], [2, 6], [3, 7], [4]],
        }
        for code, groups in expected.items():
            self.assertEqual(self.families[code], groups, f'familia inesperada en {code}')


if __name__ == '__main__':
    unittest.main()
