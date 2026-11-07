"""Las alternativas del Drive solo se pueden proponer si el catálogo les da un vid."""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools'))
import board_public as bp

class DriveAlts(unittest.TestCase):
    def test_splits_vids_and_keeps_roster_code(self):
        rows = bp.load_rows()
        self.assertGreater(len(rows), 0)
        missing = [row for row in rows if not row['vid']]
        linked = [row for row in rows if row['vid']]
        self.assertGreater(len(missing), 0)
        self.assertGreater(len(linked), 0)
        self.assertTrue(all(len(row['code']) <= 4 and row['name'] for row in rows))
        self.assertTrue(all(':' in row['vid'] for row in linked))


class Variants(unittest.TestCase):
    def manifest(self):
        def v(color, sha, model=True, dup=None, portrait=None):
            return {
                'color': color,
                'slot': f'c0{color}',
                'content_sha256': sha,
                'duplicate_of': dup,
                'has_model': model,
                'portrait': portrait,
                'variant_id': f'01:9:aaaaaaaa:c0{color}',
            }

        full = {'path': 'original/all.zip', 'kind': 'original', 'inspected': True, 'variants': [v(0, 'a'), v(1, 'b'), v(2, 'a', dup='c00'), v(3, 'x', model=False)]}
        single = {'path': 'original/single_c01.zip', 'kind': 'original', 'inspected': True, 'variants': [{**v(1, 'b'), 'variant_id': '01:9:bbbbbbbb:c01'}]}
        broken = {'path': 'original/x.rar', 'kind': 'original', 'inspected': False, 'reason': 'sin 7zz'}
        edited = {'path': 'modificado/m.zip', 'kind': 'modificado', 'inspected': True, 'variants': [v(5, 'z')]}
        return {'archives': [single, full, broken, edited]}

    def test_only_distinct_appearances_with_model(self):
        got = bp.variants_of(self.manifest())
        self.assertEqual([row['slot'] for row in got], [1, 2])
        self.assertEqual(got[1]['source'], 'original/all.zip')

    def test_portrait_only_when_published_in_sd_or_variants(self):
        sha_sd = 'a' * 64
        sha_var = 'b' * 64
        pub = bp.published_portraits({'01': {'0': sha_sd}}, [sha_var, 'corto'])
        self.assertEqual(pub, {sha_sd, sha_var})
        manifest = self.manifest()
        manifest['archives'][1]['variants'][0]['portrait'] = sha_sd
        self.assertIsNone(bp.variants_of(manifest)[0]['portrait'])
        self.assertEqual(bp.variants_of(manifest, pub)[0]['portrait'], sha_sd)

    def test_no_manifest_means_no_variants(self):
        self.assertEqual(bp.variants_of(None), [])


if __name__ == '__main__':
    unittest.main()
