"""Inspector de variantes (tools/inspect_variants.py) sobre un Drive falso: colores reales, duplicados, BNTX mayor, ._*, archivos sin abrir y MD5 distinto."""
import hashlib, os, struct, sys, tempfile, unittest, zipfile

R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(R, 'tools'))
import inspect_variants as iv


def make_zip(path, files):
    with zipfile.ZipFile(path, 'w') as z:
        for name, data in files.items():
            z.writestr(name, data)


def fake_bntx(width, height):
    head = b'BNTX' + b'\x00' * 12 + b'BRTI' + b'\x00' * (0x24 - 4)
    return head + struct.pack('<II', width, height) + b'\x00' * 16


def md5_of(path):
    with open(path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()


class Tree(unittest.TestCase):
    def tree(self, files):
        root = tempfile.mkdtemp()
        for rel, data in files.items():
            full = os.path.join(root, rel)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, 'wb') as f:
                f.write(data)
        return root

    def test_color_tokens(self):
        self.assertEqual(iv.color_of('fighter/mario/model/body/c03/a.nutexb'), (3, 'fighter/mario/model/body/cXX/a.nutexb'))
        self.assertEqual(iv.color_of('sound/bank/fighter/se_mario_c05.nus3audio')[0], 5)
        self.assertEqual(iv.color_of('ui/replace/chara/chara_0/chara_0_mario_02.bntx')[0], 2)
        self.assertEqual(iv.color_of('config.json')[0], None)
        self.assertEqual(iv.color_of('fighter/mario/model/body/c09/a.nutexb')[0], None)

    def test_variants_duplicates_shared_and_junk(self):
        root = self.tree({
            'fighter/mario/model/body/c00/a.nutexb': b'A',
            'fighter/mario/model/body/c01/a.nutexb': b'B',
            'fighter/mario/model/body/c02/a.nutexb': b'A',
            'fighter/mario/model/body/c03/._a.nutexb': b'junk',
            'ui/replace/chara/chara_0/chara_0_mario_01.bntx': b'P',
            'config.json': b'{}',
            '__MACOSX/fighter/mario/model/body/c06/a.nutexb': b'x',
        })
        found, shared = iv.variants_in(root)
        by = {v['slot']: v for v in found}
        self.assertEqual(sorted(by), ['c00', 'c01', 'c02'])
        self.assertIsNone(by['c00']['duplicate_of'])
        self.assertEqual(by['c02']['duplicate_of'], 'c00')
        self.assertIsNone(by['c01']['duplicate_of'])
        self.assertEqual(by['c01']['portrait_source'], 'ui/replace/chara/chara_0/chara_0_mario_01.bntx')
        self.assertIsNone(by['c00']['portrait_source'])
        self.assertEqual(shared, ['config.json'])
        self.assertTrue(by['c00']['has_model'])

    def test_prefers_largest_bntx_portrait(self):
        root = self.tree({
            'fighter/mario/model/body/c00/a.nutexb': b'A',
            'ui/replace/chara/chara_0/chara_0_mario_00.bntx': fake_bntx(128, 128),
            'ui/replace/chara/chara_3/chara_3_mario_00.bntx': fake_bntx(512, 512),
        })
        found, _ = iv.variants_in(root)
        self.assertEqual(found[0]['portrait_source'], 'ui/replace/chara/chara_3/chara_3_mario_00.bntx')


class Inspect(unittest.TestCase):
    def setUp(self):
        self.drive = tempfile.mkdtemp()
        self.work = tempfile.mkdtemp()
        d = os.path.join(self.drive, 'mario', '1_x', 'original')
        os.makedirs(d)
        make_zip(os.path.join(d, 'ok.zip'), {'fighter/mario/model/body/c01/a.nutexb': b'B', 'fighter/mario/model/body/c04/a.nutexb': b'C'})
        for name, data in (('partido.z01', b'x'), ('viejo.rar', b'not a rar')):
            with open(os.path.join(d, name), 'wb') as f:
                f.write(data)
        self.mod = {'mod_id': 1, 'code': '01', 'folder': 'mario/1_x', 'files': [
            {'path': 'original/ok.zip', 'md5': md5_of(os.path.join(d, 'ok.zip')), 'kind': 'original'},
            {'path': 'original/partido.z01', 'md5': None, 'kind': 'original'},
            {'path': 'original/viejo.rar', 'md5': None, 'kind': 'original'},
            {'path': 'original/falta.zip', 'md5': None, 'kind': 'original'},
        ]}

    def test_inspect(self):
        out = iv.inspect_mod(self.mod, self.drive, self.work)
        ok, parts, rar, missing = out['archives']
        self.assertTrue(ok['inspected'])
        self.assertEqual([v['slot'] for v in ok['variants']], ['c01', 'c04'])
        self.assertTrue(ok['variants'][0]['variant_id'].startswith('01:1:' + ok['md5'][:8]))
        self.assertEqual(parts['reason'], 'archivo partido')
        self.assertFalse(rar['inspected'])
        self.assertEqual(missing['reason'], 'archivo ausente del Drive')

    def test_md5_mismatch_is_not_inspected(self):
        self.mod['files'][0]['md5'] = '0' * 32
        a = iv.inspect_mod(self.mod, self.drive, self.work)['archives'][0]
        self.assertFalse(a['inspected'])
        self.assertIn('MD5 distinto', a['reason'])

    def test_zip_slip_rejected(self):
        d = os.path.join(self.drive, 'mario', '1_x', 'original')
        make_zip(os.path.join(d, 'mal.zip'), {'../../escape.txt': b'x'})
        self.mod['files'] = [{'path': 'original/mal.zip', 'md5': None, 'kind': 'original'}]
        a = iv.inspect_mod(self.mod, self.drive, self.work)['archives'][0]
        self.assertFalse(a['inspected'])


class Fallback(unittest.TestCase):
    def test_unar_runs_when_7zz_fails(self):
        from unittest import mock
        calls = []

        def run(cmd, **kw):
            calls.append(cmd[0])
            return mock.Mock(returncode=1 if cmd[0] == '7zz' else 0, stdout='Unsupported Method', stderr='')

        dest = os.path.join(tempfile.mkdtemp(), 'out')
        with mock.patch.object(iv.shutil, 'which', lambda n: '/bin/' + n), mock.patch.object(iv.subprocess, 'run', run):
            self.assertIsNone(iv.extract('x.rar', dest))
        self.assertEqual(calls, ['7zz', 'unar'])

    def test_reason_names_every_tool_that_failed(self):
        from unittest import mock
        dest = os.path.join(tempfile.mkdtemp(), 'out')
        run = lambda cmd, **kw: mock.Mock(returncode=1, stdout='', stderr='boom')
        with mock.patch.object(iv.shutil, 'which', lambda n: '/bin/' + n), mock.patch.object(iv.subprocess, 'run', run):
            self.assertEqual(iv.extract('x.rar', dest), '7zz falló; unar falló')


if __name__ == '__main__':
    unittest.main()
