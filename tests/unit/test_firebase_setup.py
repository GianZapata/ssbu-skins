"""firebase_setup.py: la lógica de configuración y comprobación, con respuestas simuladas (no toca Firebase)."""
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'tools'))
import firebase_setup as fs

def fake(routes):
    calls = []
    def h(method, url, body=None, headers=None, session=None):
        calls.append((method, url.split('?')[0].rsplit('/', 1)[-1], body))
        for (m, frag), resp in routes.items():
            if m == method and frag in url: return resp(body) if callable(resp) else resp
        return 404, {}
    h.calls = calls; return h

class Apply(unittest.TestCase):
    def test_activa_anonimo_suma_dominios_y_publica_reglas(self):
        h = fake({('GET', 'config'): (200, {'authorizedDomains': ['localhost', 'ssbu-441b1.firebaseapp.com'], 'signIn': {'anonymous': {'enabled': False}}}),
                  ('PATCH', 'config'): (200, {}), ('POST', 'rulesets'): (200, {'name': 'projects/p/rulesets/abc'}), ('PATCH', 'cloud.firestore'): (200, {})})
        out = fs.apply(object(), False, h)
        self.assertEqual([k for k, _, _ in out], ['ok', 'ok'])
        patch = next(c for c in h.calls if c[0] == 'PATCH' and c[1] == 'config')[2]
        self.assertTrue(patch['signIn']['anonymous']['enabled'])
        self.assertIn('ssbu-skins.vercel.app', patch['authorizedDomains']); self.assertIn('ssbu-441b1.firebaseapp.com', patch['authorizedDomains'])   # suma, no quita
    def test_si_ya_esta_todo_no_escribe_la_autenticacion(self):
        h = fake({('GET', 'config'): (200, {'authorizedDomains': ['localhost', 'ssbu-skins.vercel.app'], 'signIn': {'anonymous': {'enabled': True}}}),
                  ('POST', 'rulesets'): (200, {'name': 'projects/p/rulesets/x'}), ('PATCH', 'cloud.firestore'): (200, {})})
        out = fs.apply(object(), False, h); self.assertIn('ya estaba', out[0][2]); self.assertFalse(any(c[0] == 'PATCH' and c[1] == 'config' for c in h.calls))
    def test_permiso_denegado_dice_que_rol_falta(self):
        h = fake({('GET', 'config'): (403, {'error': {'message': 'denied'}}), ('POST', 'rulesets'): (403, {'error': {'message': 'denied'}})})
        out = fs.apply(object(), False, h); self.assertTrue(all(k == 'falta' for k, _, _ in out)); self.assertIn('firebaseauth.admin', out[0][2]); self.assertIn('firebaserules.admin', out[1][2])
    def test_crea_la_publicacion_si_no_existia(self):
        h = fake({('GET', 'config'): (200, {'authorizedDomains': ['ssbu-skins.vercel.app', 'localhost'], 'signIn': {'anonymous': {'enabled': True}}}),
                  ('POST', 'rulesets'): (200, {'name': 'projects/p/rulesets/n'}), ('PATCH', 'cloud.firestore'): (404, {}), ('POST', 'releases'): (200, {})})
        self.assertEqual(fs.apply(object(), False, h)[1][0], 'ok')
    def test_dry_run_no_escribe(self):
        h = fake({('GET', 'config'): (200, {'authorizedDomains': [], 'signIn': {}})}); out = fs.apply(None, True, h)
        self.assertTrue(all(k == 'plan' for k, _, _ in out)); self.assertTrue(all(c[0] == 'GET' for c in h.calls))

class Check(unittest.TestCase):
    def test_todo_bien(self):
        h = fake({('POST', 'signUp'): (200, {'idToken': 't'}), ('GET', 'meta/catalog'): (200, {})}); self.assertTrue(all(k == 'ok' for k, _, _ in fs.check(h)))
    def test_anonimo_desactivado_y_reglas_sin_publicar(self):
        h = fake({('POST', 'signUp'): (400, {'error': {'message': 'OPERATION_NOT_ALLOWED'}}), ('GET', 'meta/catalog'): (403, {})}); r = fs.check(h)
        self.assertIn('Sign-in method', r[0][2]); self.assertIn('no están publicadas', r[1][2])
if __name__ == '__main__': unittest.main()
