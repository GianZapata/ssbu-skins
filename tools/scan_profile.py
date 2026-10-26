# Capa «perfil» del inventario: la composición efectiva de un perfil del ModPack (herencia, `without`, `exclude_base`,
# `base_filter`).
#   python3 tools/scan_profile.py <ruta del ModPack> [--ref origin/claude/vigilant-keller-6i5s1d] [--profile gian-prs]
# Lee catalog/profiles.json y catalog/mods.json con `git show` y la lista de archivos de la base con `git ls-tree` (no
# necesita extraer la rama). Escribe data/inventory_profile.json.
# Qué es automático: qué componentes entran en el perfil (extends + without), sus versiones/autores/URL, qué archivos de
# base excluye (`exclude_base`) → slots de base retirados, y con `base_filter: "skins"` qué trajes de la base no tienen modelo
# propio → también retirados (misma regla que skin_slots de tools/gianpack.py del ModPack). Qué NO es automático: a qué
# slots va cada componente (en mods.json es texto libre) → COMPONENT_SLOTS, transcrito del ModPack y comprobado contra
# target_slots. Nada de esto prueba que esté instalado en la consola.
import argparse, fnmatch, json, os, re, subprocess, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scan_installed as si
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# componente → [(código del luchador del catálogo, slot, nombre que se muestra[, id de GameBanana])]. El id solo hace falta
# cuando source_url no es de GameBanana (componentes extraídos de un PR del ModPack).
COMPONENT_SLOTS = {
    'ventus-sora': [('82', 4, 'Ventus (Dusk)')],
    'roxas-sora-reslot': [('82', 5, 'Roxas · Organización XIII'), ('82', 7, 'Roxas · Villa Crepúsculo')],
    'terra-ike': [('32', 0, 'Terra'), ('32', 2, 'Terranort')],
    'funky-dk': [('02', n, 'Funky Kong') for n in (1, 3, 5, 7)],
    'aqua-pyra-reslot': [('79', 0, 'Aqua (Dusk)'), ('80', 0, 'Aqua (Dusk)')],   # el par c00 de Pyra/Mythra; Rex (element/diver) comparte modelo y no es un luchador del catálogo
    'funky-dk-c01': [('02', 1, 'Funky Kong')],   # un único Funky desde el 2026-10-25
    'szerosuit-jill': [('29', 7, 'Jill Valentine', 637464)],   # Bulma y Spider-Gwen retiradas (se veían negras)
    'captain-falcon-pr4': [('11', 2, 'Dark Falcon', 386982)],   # retirado de gian-prs el 2026-10-25 (todo Captain Falcon original)
    'ganon-pr12': [('23', 0, 'Otis', 392436), ('23', 3, 'Jiren', 320899), ('23', 6, 'Broly', 324864)],   # Pain c02 fuera (incompleto)
    'szerosuit-pr6': [('29', 0, 'Bulma', 724190), ('29', 2, 'Spider-Gwen', 174461), ('29', 7, 'Jill Valentine', 637464)],
    'bayonetta-harley-pr7': [('63', 3, 'Harley Quinn', 360738)],
    'steve-alex-pr11': [('77', 0, 'Red Steve', 175905), ('77', 1, 'White Alex', 296845), ('77', 4, 'Shaved Steve', 296834)],
    'mario-kellytoy': [('01', 1, 'Kellytoy Mario')],
    'luigi-swole-pr10': [('09', 0, 'Swole Luigi Remastered', 174132)],   # retirado de gian-prs el 2026-10-25; se conserva para perfiles que lo pidan
}
BASE_FILTERS = (None, 'skins')
# Mismos alias que _CHARA_ALIASES de tools/gianpack.py (ModPack): varios internos comparten un luchador.
SKIN_ALIASES = {'eflame_first': 'eflame', 'eflame_only': 'eflame', 'elight_first': 'elight', 'elight_only': 'elight',
                'ice_climber': 'popo', 'nana': 'popo', 'pzenigame': 'ptrainer', 'pfushigisou': 'ptrainer', 'plizardon': 'ptrainer'}
def git(mp, *a): return subprocess.run(['git', '-C', mp, *a], check=True, capture_output=True, text=True).stdout
def resolve(profiles, name, seen=()):
    """→ (required, optional, exclude_base, base_filter); base_filter se hereda si el perfil no lo fija."""
    p = profiles[name]; req, opt, exc, bf = [], [], [], None
    if p.get('extends'):
        req, opt, exc, bf = resolve(profiles, p['extends'], seen + (name,))
    wo = set(p.get('without') or [])
    req = [c for c in req if c not in wo] + [c for c in p.get('required', []) if c not in req]
    opt = [c for c in opt if c not in wo] + [c for c in p.get('optional', []) if c not in opt]
    bf = p.get('base_filter', bf)
    if bf not in BASE_FILTERS: raise SystemExit(f'perfil {name}: base_filter desconocido {bf!r}')
    return req, opt, exc + [g for g in p.get('exclude_base', []) if g not in exc], bf
def is_excluded(rel, globs):
    """exclude_base del ModPack: ruta exacta o glob ('*' cruza '/'), relativo a ultimate/mods, sin distinguir mayúsculas."""
    r = rel.lower()
    return any(r == g.lower() or (('*' in g or '?' in g) and fnmatch.fnmatchcase(r, g.lower())) for g in globs)
def skin_slots(base_paths, globs):
    """base_filter «skins»: {(interno, slot)} con modelo propio en la base (fighter/<f>/model/<pieza>/cNN/...), sin contar
    lo que exclude_base ya retira (p. ej. el vallado de Steve de los Optionals no convierte a Steve en skin)."""
    out = set()
    for rel in base_paths:
        if is_excluded(rel, globs): continue
        p = rel.lower().split('/')[1:]   # sin la carpeta del mod
        if len(p) > 4 and p[0] == 'fighter' and p[2] == 'model':
            s = next((x for x in p[3:-1] if re.fullmatch(r'c\d\d', x)), None)
            if s: out.add((SKIN_ALIASES.get(p[1], p[1]), int(s[1:])))
    return out
def filtered_base_slots(base_fighters, skins):
    """Trajes que la base ocupa (retrato, voz…) sin modelo propio: base_filter «skins» los retira → [(código, slot)]."""
    return sorted((code, n) for code, v in base_fighters.items() for n in v['slots'] if (v.get('internal'), n) not in skins)
SLOT_PATTERNS = [re.compile(r'/fighter/(\w+|\*)/[^/]*/?.*?/?c(\d\d)/'), re.compile(r'chara_[^/]*_(\w+)_(\d\d)\.bntx$')]
def excluded_slots(globs):
    """exclude_base → {(interno, slot)}: solo cuenta lo que quita un traje completo (modelo o retrato); voces, efectos y música no."""
    out = set()
    for g in globs:
        m = re.search(r'fighter/(\w+)/\*?/?(?:[^/]*/)?c(\d\d)/\*$', g) or re.search(r'fighter/(\w+)/[^*]*?/?c(\d\d)/\*$', g)
        if m and m.group(1) != 'element': out.add((m.group(1), int(m.group(2))))
        m = re.search(r'chara_\*_(\w+)_(\d\d)\.bntx$', g)
        if m: out.add((m.group(1), int(m.group(2))))
    return out
def excluded_mods(globs):
    """exclude_base «<carpeta del mod>/*» → el mod entero queda fuera del perfil."""
    return sorted({g[:-2] for g in globs if g.endswith('/*') and g.count('/') == 1})
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('modpack'); ap.add_argument('--ref', default='origin/claude/vigilant-keller-6i5s1d'); ap.add_argument('--profile', default='gian-prs')
    a = ap.parse_args()
    sha = git(a.modpack, 'rev-parse', '--short', a.ref).strip()
    profiles = json.loads(git(a.modpack, 'show', f'{a.ref}:catalog/profiles.json'))['profiles']
    mods = {m['id']: m for m in json.loads(git(a.modpack, 'show', f'{a.ref}:catalog/mods.json'))['mods']}
    req, opt, globs, base_filter = resolve(profiles, a.profile)
    internal = si.INTERNAL  # nombre interno → código del catálogo
    ex = {(internal[i], n) for i, n in excluded_slots(globs) if i in internal}
    base = json.load(open(os.path.join(R, 'data', 'installed.json'), encoding='utf-8'))
    filtered = []
    if base_filter == 'skins':
        ls = git(a.modpack, '-c', 'core.quotepath=off', 'ls-tree', '-r', '--name-only', a.ref, '--', 'ultimate/mods')
        skins = skin_slots([p[len('ultimate/mods/'):] for p in ls.splitlines()], globs)
        filtered = [s for s in filtered_base_slots(base['fighters'], skins) if s not in ex]
    ex = sorted(ex | set(filtered))
    em = excluded_mods(globs); drop_f, partial = [], []
    for code, v in base['fighters'].items():
        mset = set(v['mods'])
        if mset & set(em):
            (drop_f if mset <= set(em) else partial).append(code)
    slots, comps, unmapped = [], [], []
    for c in req:
        m = mods.get(c, {}); comps.append({'id': c, 'version': m.get('version'), 'target': m.get('target_slots'), 'url': m.get('source_url'), 'classification': m.get('classification'), 'console_test': m.get('console_test'), 'dlc': m.get('dlc_required')})
        if c not in COMPONENT_SLOTS:
            if m.get('fighter') not in ('-', None) and c not in ('roxas-victory-pack',): unmapped.append(c)
            continue
        for code, n, name, *gb in COMPONENT_SLOTS[c]:
            mod_id = gb[0] if gb else int(re.search(r'gamebanana\.com/mods/(\d+)', m['source_url']).group(1))
            url = f'https://gamebanana.com/mods/{mod_id}' if gb else m.get('source_url')
            slots.append({'fighter': code, 'slot': n, 'name': name, 'component': c, 'mod_id': mod_id,
                          'author': m.get('author'), 'url': url, 'version': m.get('version'), 'console_test': m.get('console_test'), 'classification': m.get('classification')})
    out = {'_nota': 'Capa «perfil»: composición efectiva calculada por tools/scan_profile.py (extends + without + exclude_base + base_filter) a partir de catalog/profiles.json y mods.json del ModPack. La asignación componente→slot está transcrita (COMPONENT_SLOTS). Las pruebas en consola (emuMMC, sin conexión) las anota el ModPack por componente en mods.json; no certifican online.',
           'id': 'perfil', 'label': f'Perfil local «{a.profile}»', 'profile': a.profile, 'ref': f'{a.ref.split("origin/")[-1]}@{sha}',
           'document': 'catalog/profiles.json + catalog/mods.json', 'scanned_at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
           'verification': 'Perfil armado y verificado en archivos; pruebas en consola sin conexión anotadas por componente (no certifican online)', 'components': comps,
           'other_profiles': sorted(set(profiles) - {a.profile}), 'excluded_base_slots': [{'fighter': c, 'slot': n} for c, n in ex],
           'exclude_base_total': len(globs), 'excluded_base_mods': em, 'excluded_base_fighters': drop_f, 'partially_excluded_fighters': partial, 'unmapped_components': unmapped,
           'base_filter': base_filter, 'filtered_base_slots': [{'fighter': c, 'slot': n} for c, n in filtered], 'slots': slots}
    json.dump(out, open(os.path.join(R, 'data', 'inventory_profile.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('mods excluidos:',em,'· luchadores de base retirados:',drop_f,'· parcial:',partial);print('ok · perfil', a.profile, '·', len(comps), 'componentes ·', len(slots), 'slots ·', len(ex), 'slots de base retirados (', len(filtered), 'por base_filter ) · sin asignar a slots:', unmapped)
if __name__ == '__main__':
    main()
