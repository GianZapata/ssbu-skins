#!/usr/bin/env python3
"""Un solo comando para dejar la web igual que la SD, después de una instalación con MATCH.

  python3 tools/sync_sd.py --package <paquete>/ultimate/mods            prepara todo en local y enseña qué se publicaría
  python3 tools/sync_sd.py --package <paquete>/ultimate/mods --apply    además sube retratos a Cloudinary y siembra Firestore

Sin --apply solo se escriben archivos de este repo (data/, docs/SLOTS.md): se revisan con `git diff` y se commitean.
Con --apply también se escribe fuera: Cloudinary (retratos, idempotente por hash) y Firestore (`installed`, `drive`,
`slot_plan`, `catalog`; nunca `changes`, `history` ni `status`).

Pasos, en orden; el primero que falla detiene todo:
  1. Guardas: ningún sd_sync/gianpack corriendo, SD montada, ModPack en `main` y limpio.
  2. `sd_sync.py verify <paquete> <SD>/ultimate/mods` tiene que decir MATCH. Sin MATCH no se publica nada.
  3. Plan de slots: añade los slots que el perfil `gian-prs` ocupa y el plan no tiene como `mod`. No toca decisiones
     de Gian (`source: drive`): un slot que dan a otro mod, o un `mod` del perfil que ya no está, solo se avisa. Los espejos
     de la SD (`source: profile`) sí se actualizan.
  4. scan_profile (perfil en `main`), scan_branches y, con --drive, scan_drive.
  5. slot_plan --check y validate_catalog: 0 errores.
  6. sd_publish (retratos a Cloudinary) y db.py seed (dry-run salvo --apply).
Credenciales: Cloudinary en el .env.local del ModPack (lo lee sd_publish); Firestore con GOOGLE_APPLICATION_CREDENTIALS
o ~/.secrets/ssbu-441b1.json. No se leen ni se imprimen aquí."""
import argparse, copy, datetime, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
import scan_profile as sp

MODPACK = os.path.abspath(os.path.join(R, '..', 'Gian-Ultimate-Modpack-private'))
SD = '/Volumes/SWITCH SD'
KEY = os.path.expanduser('~/.secrets/ssbu-441b1.json')
DRIVE = os.path.expanduser('~/Library/CloudStorage/GoogleDrive-giancarlozapata13@gmail.com/My Drive/SSBU/SSBU_mods')
SEEDS = ('catalog', 'installed', 'drive', 'slots')


def plan_additions(plan, mods, required, internal, component_slots, stamp):
    """Plan de slots alineado con el perfil. No modifica `plan`: devuelve (plan nuevo, informe).

    Añade como `mod` los slots de destino de cada componente `kind: mods` del perfil que el plan no tiene como `mod`.
    Una entrada `source: profile` es un espejo de lo instalado («Instalada en la SD (<componente>)»): si la SD ya tiene otro
    componente, se actualiza (el anterior queda en la nota). Una entrada de otro origen (`drive`: propuestas y notas de
    Gian) nunca se toca.
    Informe: `added` [(código, slot, componente)], `updated` [(código, slot, componente, nombre anterior)], `conflicts`
    (una decisión de Gian da el slot a otro mod) y `orphans` (el plan tiene un espejo `profile` que ningún componente
    del perfil ocupa)."""
    new = copy.deepcopy(plan)
    report = {'added': [], 'updated': [], 'conflicts': [], 'orphans': []}
    covered = {(c, n) for entries in component_slots.values() for c, n, *_ in entries}
    for cid in required:
        m = mods.get(cid, {})
        if component_slots.get(cid):
            continue
        code = internal.get(m.get('fighter'))
        if not (code and m.get('kind') == 'mods'):
            continue
        target = m.get('target_slots') or ''
        origin = re.search(r'desde (c\d\d)', target)
        found = re.search(r'gamebanana\.com/\w+/(\d+)', m.get('source_url') or '')
        mod_id = int(found.group(1)) if found else None
        for n in sp.target_slot_numbers(target):
            covered.add((code, n))
            cur = plan['fighters'].get(code, {}).get('slots', {}).get(str(n))
            before = None
            if cur and cur.get('state') == 'mod':
                if cur.get('source') == 'profile':
                    mirrored = re.search(r'Instalada en la SD \(([^)]+)\)', cur.get('nota') or '')
                    same = mirrored.group(1) == cid if mirrored else (not (cur.get('mod_id') and mod_id) or cur['mod_id'] == mod_id)
                    if same:
                        continue
                    before = cur.get('name')
                else:
                    if cur.get('mod_id') and mod_id and cur['mod_id'] != mod_id:
                        report['conflicts'].append((code, n, cid, cur.get('name')))
                    continue
            nota = f'Instalada en la SD ({cid}); plan alineado con la SD el {stamp[:10]}' + (f'; antes: {before}' if before else '')
            entry = {'state': 'mod', 'name': re.sub(r'\s+c\d\d$', '', m.get('name') or cid), 'mod_id': mod_id,
                     'source': 'profile', 'reslot_from': int(origin.group(1)[1:]) if origin else None, 'file': None,
                     'approved': True, 'nota': nota}
            new['fighters'].setdefault(code, {'slots': {}})['slots'][str(n)] = entry
            if before:
                report['updated'].append((code, n, cid, before))
            else:
                report['added'].append((code, n, cid))
    for code, fighter in plan['fighters'].items():
        for n, s in fighter['slots'].items():
            if s.get('state') == 'mod' and s.get('source') == 'profile' and (code, int(n)) not in covered:
                report['orphans'].append((code, int(n), s.get('name')))
    for fighter in new['fighters'].values():
        fighter['slots'] = dict(sorted(fighter['slots'].items(), key=lambda kv: int(kv[0])))
    if report['added'] or report['updated']:
        new['updated_at'] = stamp
    return new, report


def git(*args):
    r = subprocess.run(['git', '-C', MODPACK, *args], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"git {' '.join(args)}: {r.stderr.strip()[:200]}")
    return r.stdout


def run(label, cmd, env=None, cwd=R):
    print(f'\n== {label}\n$ {" ".join(cmd)}', flush=True)
    code = subprocess.run(cmd, cwd=cwd, env=env).returncode
    if code:
        raise SystemExit(f'{label}: falló (exit {code}). Nada más se ejecutó.')


def guards(a):
    me = str(os.getpid())
    ps = subprocess.run(['ps', '-eo', 'pid,command'], capture_output=True, text=True).stdout.splitlines()
    busy = [l.strip() for l in ps if re.search(r'sd_sync|gianpack', l) and 'sync_sd' not in l and l.split()[0] != me]
    if busy:
        raise SystemExit('hay otro agente en la SD o en los assets (un solo agente a la vez):\n  ' + '\n  '.join(busy))
    if not os.path.isdir(os.path.join(a.sd, 'ultimate', 'mods')):
        raise SystemExit(f'la SD no está montada en {a.sd}')
    if not os.path.isdir(a.package):
        raise SystemExit(f'no existe el paquete {a.package}: arma el lote con `assemble --profile gian-prs` antes de sincronizar')
    branch = git('rev-parse', '--abbrev-ref', 'HEAD').strip()
    if branch != a.ref:
        raise SystemExit(f'el ModPack está en «{branch}», no en «{a.ref}»: fusiona la instalación y vuelve a correr')
    dirty = [l for l in git('status', '--porcelain', '--untracked-files=no').splitlines() if l.strip()]
    if dirty:
        raise SystemExit('el ModPack tiene cambios sin commit (la web debe reflejar lo commiteado):\n  ' + '\n  '.join(dirty[:8]))


def align_plan(a):
    profiles = json.loads(git('show', f'{a.ref}:catalog/profiles.json'))['profiles']
    mods = {m['id']: m for m in json.loads(git('show', f'{a.ref}:catalog/mods.json'))['mods']}
    required = sp.resolve(profiles, a.profile)[0]
    path = os.path.join(R, 'data', 'slot_plan.json')
    plan = json.load(open(path, encoding='utf-8'))
    stamp = datetime.datetime.now().astimezone().replace(microsecond=0).isoformat()
    new, rep = plan_additions(plan, mods, required, sp.si.INTERNAL, sp.COMPONENT_SLOTS, stamp)
    print(f'\n== Plan de slots: {len(rep["added"])} añadidos · {len(rep["updated"])} actualizados · {len(rep["conflicts"])} conflictos · {len(rep["orphans"])} huérfanos')
    for code, n, cid in rep['added']:
        print(f'  + {code} c{n:02d}  {cid}')
    for code, n, cid, before in rep['updated']:
        print(f'  ~ {code} c{n:02d}  {cid} (el plan decía «{before}»)')
    for code, n, cid, name in rep['conflicts']:
        print(f'  ! {code} c{n:02d}: el perfil pone «{cid}» y el plan dice «{name}» (decisión o nota de Gian, no se toca)')
    for code, n, name in rep['orphans']:
        print(f'  ? {code} c{n:02d}: el plan tiene «{name}» como instalada y ningún componente del perfil la ocupa')
    if rep['added'] or rep['updated']:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(new, ensure_ascii=False, indent=1) + '\n')
    return rep


def main(argv=None):
    global MODPACK
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--package', required=True, help='<paquete>/ultimate/mods contra el que se verifica la SD')
    ap.add_argument('--apply', action='store_true', help='sube retratos y siembra Firestore (sin esto, solo en local)')
    ap.add_argument('--drive', action='store_true', help='reescanea el Drive (lento: abre ZIP/RAR con 7zz)')
    ap.add_argument('--sd', default=SD)
    ap.add_argument('--modpack', default=MODPACK)
    ap.add_argument('--ref', default='main')
    ap.add_argument('--profile', default='gian-prs')
    ap.add_argument('--drive-path', default=DRIVE)
    ap.add_argument('--skip', action='append', default=[], choices=SEEDS + ('publish',), help='omite un paso remoto')
    a = ap.parse_args(argv)
    MODPACK = os.path.abspath(a.modpack)
    py = sys.executable
    venv = os.path.join(R, '.venv', 'bin', 'python')
    env = dict(os.environ)
    if 'GOOGLE_APPLICATION_CREDENTIALS' not in env and os.path.isfile(KEY):
        env['GOOGLE_APPLICATION_CREDENTIALS'] = KEY

    guards(a)
    run('MATCH de la SD', [py, os.path.join(MODPACK, 'tools', 'sd_sync.py'), 'verify', a.package, os.path.join(a.sd, 'ultimate', 'mods')])
    align_plan(a)
    run('Perfil', [py, os.path.join(HERE, 'scan_profile.py'), MODPACK, '--ref', a.ref, '--profile', a.profile])
    run('Ramas en preparación', [py, os.path.join(HERE, 'scan_branches.py'), MODPACK])
    if a.drive:
        run('Drive', [py, os.path.join(HERE, 'scan_drive.py'), a.drive_path])
    run('Plan de slots (check)', [py, os.path.join(HERE, 'slot_plan.py'), '--check'])
    run('Catálogo', [py, os.path.join(HERE, 'validate_catalog.py')])

    if 'publish' not in a.skip:
        pub = [py, os.path.join(MODPACK, 'tools', 'sd_publish.py')] + ([] if a.apply else ['--dry-run'])
        run('Retratos → Cloudinary' + ('' if a.apply else ' (dry-run)'), pub)
    if os.path.isfile(venv):
        for part in (s for s in SEEDS if s not in a.skip):
            run(f'Firestore {part}' + ('' if a.apply else ' (dry-run)'),
                [venv, os.path.join(HERE, 'db.py'), 'seed', '--only', part] + ([] if a.apply else ['--dry-run']), env=env)
    else:
        print('\nsin .venv con google-cloud-firestore: se omite Firestore (python3 -m venv .venv && .venv/bin/pip install google-cloud-firestore)')

    print('\nListo. Revisa `git diff --stat`, commitea en una rama y fusiona en master para que Vercel despliegue.' if a.apply
          else '\nListo en local (nada se subió). Revisa `git diff --stat`; para publicar repite con --apply.')


if __name__ == '__main__':
    main()
