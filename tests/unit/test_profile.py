"""Capa «perfil»: herencia, without y base_filter «skins» de tools/scan_profile.py (sin red ni ModPack real)."""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
import scan_profile as sp


class Resolve(unittest.TestCase):
    PROFILES = {'a': {'required': ['x', 'y'], 'exclude_base': ['WB/m/*']},
                'b': {'extends': 'a', 'without': ['y'], 'required': ['z'], 'base_filter': 'skins'},
                'c': {'extends': 'b', 'exclude_base': ['WB/n']}}

    def test_without_and_inherited_base_filter(self):
        self.assertEqual(sp.resolve(self.PROFILES, 'c'), (['x', 'z'], [], ['WB/m/*', 'WB/n'], 'skins'))
        self.assertEqual(sp.resolve(self.PROFILES, 'a')[3], None)

    def test_unknown_base_filter_rejected(self):
        with self.assertRaises(SystemExit):
            sp.resolve({'p': {'base_filter': 'todo'}}, 'p')


class SkinsFilter(unittest.TestCase):
    def test_only_slots_with_own_model_count(self):
        paths = ['WB/fighter/luigi/model/body/c01/a.nutexb', 'WB/ui/replace/chara/chara_0/chara_0_luigi_00.bntx',
                 'WB/fighter/eflame_first/model/body/c05/a.nutexb', 'WB/fighter/kirby/model/copy_mario_cap/c05/a.nutexb',
                 'Opt/fighter/pickel/model/fence/c00/a.nutexb']   # carpeta excluida: no convierte a Steve en skin
        skins = sp.skin_slots(paths, ['Opt/*'])
        self.assertEqual(skins, {('luigi', 1), ('eflame', 5), ('kirby', 5)})
        base = {'09': {'internal': 'luigi', 'slots': [0, 1]}, '77': {'internal': 'pickel', 'slots': [0]}}
        self.assertEqual(sp.filtered_base_slots(base, skins), [('09', 0), ('77', 0)])

    def test_glob_crosses_folders_and_ignores_case(self):
        self.assertTrue(sp.is_excluded('WB/Fighter/Captain/model/body/c00/x', ['*/fighter/captain/*/c00/*']))
        self.assertFalse(sp.is_excluded('WB/fighter/captain/model/body/c01/x', ['*/fighter/captain/*/c00/*']))


class ComponentSlots(unittest.TestCase):
    def test_pr_components_carry_gamebanana_ids(self):
        for comp in ('captain-falcon-pr4', 'steve-alex-pr11', 'luigi-swole-pr10'):
            for entry in sp.COMPONENT_SLOTS[comp]:
                self.assertEqual(len(entry), 4, comp)
                self.assertIsInstance(entry[3], int)


if __name__ == '__main__':
    unittest.main()
