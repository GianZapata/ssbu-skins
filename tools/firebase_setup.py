#!/usr/bin/env python3
"""Deja Firebase listo para la web (Vercel) y comprueba desde fuera que funciona.

  python3 tools/firebase_setup.py check    # sin credenciales: ¿se puede iniciar sesión anónima? ¿se lee el plan? (lo que verá un visitante)
  python3 tools/firebase_setup.py apply    # con cuenta de servicio (GOOGLE_APPLICATION_CREDENTIALS): activa el acceso anónimo,
                                           # autoriza los dominios de data/firebase_setup.json y publica firestore.rules
  python3 tools/firebase_setup.py apply --dry-run   # solo muestra lo que haría

`apply` necesita que la cuenta de servicio tenga permisos sobre Authentication (p. ej. «Administrador de Firebase Authentication») y sobre las reglas
(«Administrador de reglas de seguridad de Firebase»); con el rol «Administrador de Firebase» basta. Si falta alguno, el informe lo dice y ese paso
se hace a mano en la consola (docs/FIREBASE.md). Nunca borra dominios ni datos."""
import argparse, json, os, sys, urllib.error, urllib.request
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
CFG = json.load(open(os.path.join(R, 'data', 'firebase.json'), encoding='utf-8'))
SETUP = json.load(open(os.path.join(R, 'data', 'firebase_setup.json'), encoding='utf-8'))
PID = CFG['projectId']
IDT = f'https://identitytoolkit.googleapis.com/admin/v2/projects/{PID}/config'
RULES = f'https://firebaserules.googleapis.com/v1/projects/{PID}'
FIRESTORE = f'https://firestore.googleapis.com/v1/projects/{PID}/databases/(default)/documents'
ROLE_HINT = {'identitytoolkit': 'Administrador de Firebase Authentication (roles/firebaseauth.admin)', 'firebaserules': 'Administrador de reglas de seguridad de Firebase (roles/firebaserules.admin)'}

def http(method, url, body=None, headers=None, session=None):
    """(status, json). Con `session` (google.auth AuthorizedSession) usa credenciales; sin ella, llamada pública."""
    data = json.dumps(body).encode() if body is not None else None
    if session is not None:
        r = session.request(method, url, data=data, headers={'content-type': 'application/json', **(headers or {})}, timeout=30)
        try: return r.status_code, r.json()
        except Exception: return r.status_code, {'raw': r.text[:200]}
    req = urllib.request.Request(url, data=data, method=method, headers={'content-type': 'application/json', **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read() or b'{}')
        except Exception: return e.code, {}
    except Exception as e: return 0, {'error': {'message': str(e)}}

def msg(j): return ((j or {}).get('error') or {}).get('message') or json.dumps(j)[:160]

def check(base_http=http):
    """Lo que ve un visitante: ¿Firebase deja entrar sin cuenta y leer el plan? Sin credenciales."""
    out = []
    key = CFG['apiKey']
    s, j = base_http('POST', f'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={key}', {'returnSecureToken': True})
    if s == 200 and j.get('idToken'):
        out.append(('ok', 'Acceso anónimo', 'activado: un visitante puede entrar sin registrarse'))
    else:
        m = msg(j)
        if 'OPERATION_NOT_ALLOWED' in m or 'ADMIN_ONLY' in m: out.append(('falta', 'Acceso anónimo', 'desactivado en Authentication → Sign-in method → Anónimo'))
        elif 'API_KEY' in m or s in (400, 403) and 'key' in m.lower(): out.append(('falta', 'Clave de API', f'rechazada ({m}); revisa las restricciones de la clave'))
        else: out.append(('falta', 'Acceso anónimo', f'no se pudo comprobar ({s}: {m})'))
    s, j = base_http('GET', f'{FIRESTORE}/meta/catalog')
    if s == 200: out.append(('ok', 'Firestore: lectura pública', 'se puede leer el catálogo sembrado (las reglas permiten leer)'))
    elif s == 404: out.append(('falta', 'Firestore: catálogo', 'la base responde pero no hay catálogo sembrado: ejecuta «Sincronizar Firestore»'))
    elif s == 403: out.append(('falta', 'Firestore: reglas', 'lectura denegada: las reglas de firestore.rules no están publicadas (o Firestore no está creado)'))
    else: out.append(('falta', 'Firestore', f'no se pudo comprobar ({s}: {msg(j)})'))
    return out

def apply(session, dry=False, h=http):
    out = []
    # 1) autenticación anónima + dominios autorizados
    s, cur = h('GET', IDT, session=session)
    if s != 200:
        out.append(('falta', 'Authentication', f'no se pudo leer la configuración ({s}): {msg(cur)}. Permiso necesario: {ROLE_HINT["identitytoolkit"]}'))
    else:
        have = cur.get('authorizedDomains') or []
        want = [d for d in SETUP['authorized_domains'] if d not in have]
        anon = ((cur.get('signIn') or {}).get('anonymous') or {}).get('enabled', False)
        patch = {}
        if SETUP.get('anonymous_auth') and not anon: patch['signIn'] = {'anonymous': {'enabled': True}}
        if want: patch['authorizedDomains'] = have + want
        if not patch: out.append(('ok', 'Authentication', 'ya estaba: acceso anónimo activo y dominios autorizados'))
        elif dry: out.append(('plan', 'Authentication', f'activaría anónimo={bool(patch.get("signIn"))} y añadiría dominios {want}'))
        else:
            mask = ','.join(k if k != 'signIn' else 'signIn.anonymous.enabled' for k in patch)
            s2, j2 = h('PATCH', f'{IDT}?updateMask={mask}', patch, session=session)
            out.append(('ok', 'Authentication', f'actualizado: anónimo {"activado" if patch.get("signIn") else "ya activo"}, dominios añadidos {want}') if s2 == 200
                       else ('falta', 'Authentication', f'no se pudo actualizar ({s2}): {msg(j2)}. Permiso necesario: {ROLE_HINT["identitytoolkit"]}'))
    # 2) reglas de Firestore
    src = open(os.path.join(R, SETUP['rules_file']), encoding='utf-8').read()
    if dry: out.append(('plan', 'Reglas', f'publicaría {SETUP["rules_file"]} ({len(src)} caracteres) como versión activa de cloud.firestore'))
    else:
        s, rs = h('POST', f'{RULES}/rulesets', {'source': {'files': [{'name': SETUP['rules_file'], 'content': src}]}}, session=session)
        if s != 200: out.append(('falta', 'Reglas', f'no se pudo crear el conjunto de reglas ({s}): {msg(rs)}. Permiso necesario: {ROLE_HINT["firebaserules"]}'))
        else:
            name = rs['name']; rel = f'projects/{PID}/releases/cloud.firestore'
            s2, j2 = h('PATCH', f'{RULES}/releases/cloud.firestore', {'release': {'name': rel, 'rulesetName': name}}, session=session)
            if s2 == 404: s2, j2 = h('POST', f'{RULES}/releases', {'name': rel, 'rulesetName': name}, session=session)
            out.append(('ok', 'Reglas', f'publicadas ({name.rsplit("/", 1)[-1]})') if s2 == 200 else ('falta', 'Reglas', f'creadas pero no publicadas ({s2}): {msg(j2)}. Permiso necesario: {ROLE_HINT["firebaserules"]}'))
    return out

def report(title, rows):
    icon = {'ok': '✅', 'falta': '⚠️', 'plan': '📝'}
    return f'## {title}\n\n' + '\n'.join(f'- {icon[k]} **{a}:** {b}' for k, a, b in rows) + '\n'

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['check', 'apply']); ap.add_argument('--dry-run', action='store_true'); ap.add_argument('--out')
    a = ap.parse_args(); md = f'# Firebase `{PID}`\n\n'; bad = 0
    if a.cmd == 'apply':
        session = None
        try:
            import google.auth
            from google.auth.transport.requests import AuthorizedSession
            creds, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
            session = AuthorizedSession(creds)
        except Exception as e:
            if not a.dry_run: sys.exit(f'sin credenciales (GOOGLE_APPLICATION_CREDENTIALS): {e}')
        rows = apply(session, a.dry_run); md += report('Configuración' + (' (simulada)' if a.dry_run else ''), rows); bad += sum(k == 'falta' for k, _, _ in rows)
    if not (a.cmd == 'apply' and a.dry_run):
        rows = check(); md += report('Comprobación desde fuera (lo que ve un visitante)', rows); bad += sum(k == 'falta' for k, _, _ in rows)
    print(md)
    if a.out: open(a.out, 'w', encoding='utf-8').write(md)
    sys.exit(1 if bad else 0)
if __name__ == '__main__': main()
