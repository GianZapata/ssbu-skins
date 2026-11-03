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

if __name__ == '__main__':
    unittest.main()
