"""Las descargadas del Drive entran al catálogo sin auditar, sin inventar datos."""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools'))
import board_public as bp
import drive_to_catalog as dc

def mod(mod_id, link, folder='x/1_a', slots=(0, 1)):
    return {'mod_id': mod_id, 'slug': 'cool_skin', 'folder': folder, 'code': '01', 'kind': 'skin', 'plugin': False,
            'link': link, 'files': [{'path': 'original/a.zip', 'slots': list(slots)}]}

CATALOG = {'entries': [{'roster_no': '01', 'fighter': 'Mario', 'mod_id': 5, 'look_id': '01:5', 'audit_status': 'verified'}],
           'withdrawn': [{'roster_no': '01', 'mod_id': 9, 'look_id': '01:9'}]}

class DriveToCatalog(unittest.TestCase):
    def test_builds_entry_from_link_and_marks_pending(self):
        link = 'URL: https://gamebanana.com/mods/7\nNombre: Cool Skin\nAutor: Ana\n'
        [entry] = dc.missing_entries({'mods': [mod(7, link)]}, CATALOG)
        self.assertEqual((entry['look_id'], entry['look_name'], entry['author'], entry['audit_status']), ('01:7', 'Cool Skin', 'Ana', 'pending'))
        self.assertEqual((entry['url'], entry['fighter'], entry['native_slots']), ('https://gamebanana.com/mods/7', 'Mario', [0, 1]))

    def test_missing_data_stays_pending(self):
        [entry] = dc.missing_entries({'mods': [mod(7, None)]}, CATALOG)
        self.assertEqual((entry['author'], entry['url'], entry['look_name']), ('pending', 'pending', 'Cool Skin'))

    def test_skips_known_withdrawn_and_duplicate_folders(self):
        drive = {'mods': [mod(5, None), mod(9, None), mod(7, None, 'x/7_a (1)'), mod(7, None, 'x/7_a')]}
        self.assertEqual([e['look_id'] for e in dc.missing_entries(drive, CATALOG)], ['01:7'])

    def test_board_flags_unaudited_and_links_vid(self):
        catalog = {'entries': CATALOG['entries'] + dc.missing_entries({'mods': [mod(7, None)]}, CATALOG)}
        rows = bp.drive_alts({'mods': [mod(7, None)]}, bp.vids_by_mod(catalog), bp.unaudited_mods(catalog), {'7': 'ssbu/previews/7'})
        self.assertEqual((rows[0]['vid'], rows[0]['unaudited'], rows[0]['img']), ('01:7', True, 'ssbu/previews/7'))

if __name__ == '__main__':
    unittest.main()
