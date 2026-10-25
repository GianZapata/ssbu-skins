# Capa «perfil» del inventario: la composición efectiva de un perfil del ModPack (herencia, `without`, `exclude_base`).
#   python3 tools/scan_profile.py <ruta del ModPack> [--ref origin/claude/vigilant-keller-6i5s1d] [--profile default]
# Lee catalog/profiles.json y catalog/mods.json con `git show` (no necesita extraer la rama). Escribe data/inventory_profile.json.
# Qué es automático: qué componentes entran en el perfil (extends + without), sus versiones/autores/URL y qué archivos de
# base excluye (`exclude_base`) → los traslada a slots de base retirados. Qué NO es automático: a qué slots va cada componente
# (en mods.json es texto libre) → COMPONENT_SLOTS, transcrito del informe del ModPack y comprobado contra target_slots.
# Nada de esto prueba que esté instalado en la consola.
import argparse, fnmatch, json, os, re, subprocess, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scan_installed as si
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# componente → [(código del luchador del catálogo, slot, nombre que se muestra)]
COMPONENT_SLOTS = {
    'ventus-sora': [('82', 4, 'Ventus (Dusk)')],
    'roxas-sora-reslot': [('82', 5, 'Roxas · Organización XIII'), ('82', 7, 'Roxas · Villa Crepúsculo')],
    'terra-ike': [('32', 0, 'Terra'), ('32', 2, 'Terranort')],
    'funky-dk': [('02', n, 'Funky Kong') for n in (1, 3, 5, 7)],
}
def git(mp, *a): return subprocess.run(['git', '-C', mp, *a], check=True, capture_output=True, text=True).stdout
def resolve(profiles, name, seen=()):
    p = profiles[name]; req, opt, exc = [], [], []
    if p.get('extends'):
        req, opt, exc = resolve(profiles, p['extends'], seen + (name,))
    wo = set(p.get('without') or [])
    req = [c for c in req if c not in wo] + [c for c in p.get('required', []) if c not in req]
    opt = [c for c in opt if c not in wo] + [c for c in p.get('optional', []) if c not in opt]
    return req, opt, exc + [g for g in p.get('exclude_base', []) if g not in exc]
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
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('modpack'); ap.add_argument('--ref', default='origin/claude/vigilant-keller-6i5s1d'); ap.add_argument('--profile', default='default')
    a = ap.parse_args()
    sha = git(a.modpack, 'rev-parse', '--short', a.ref).strip()
    profiles = json.loads(git(a.modpack, 'show', f'{a.ref}:catalog/profiles.json'))['profiles']
    mods = {m['id']: m for m in json.loads(git(a.modpack, 'show', f'{a.ref}:catalog/mods.json'))['mods']}
    req, opt, globs = resolve(profiles, a.profile)
    internal = si.INTERNAL  # nombre interno → código del catálogo
    ex = sorted((internal[i], n) for i, n in excluded_slots(globs) if i in internal)
    slots, comps, unmapped = [], [], []
    for c in req:
        m = mods.get(c, {}); comps.append({'id': c, 'version': m.get('version'), 'target': m.get('target_slots'), 'url': m.get('source_url')})
        if c not in COMPONENT_SLOTS:
            if m.get('fighter') not in ('-', None) and c not in ('roxas-victory-pack',): unmapped.append(c)
            continue
        for code, n, name in COMPONENT_SLOTS[c]:
            slots.append({'fighter': code, 'slot': n, 'name': name, 'component': c, 'mod_id': int(re.search(r'mods/(\d+)', m['source_url']).group(1)),
                          'author': m.get('author'), 'url': m.get('source_url'), 'version': m.get('version')})
    out = {'_nota': 'Capa «perfil»: composición efectiva calculada por tools/scan_profile.py (extends + without + exclude_base) a partir de catalog/profiles.json y mods.json del ModPack. La asignación componente→slot está transcrita (COMPONENT_SLOTS). El informe del ModPack dice que se armó y verificó a nivel de archivos en local y NO se probó en la Switch.',
           'id': 'perfil', 'label': f'Perfil local «{a.profile}»', 'profile': a.profile, 'ref': f'{a.ref.split("origin/")[-1]}@{sha}',
           'document': 'catalog/profiles.json + catalog/mods.json', 'scanned_at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
           'verification': 'Archivos verificados en local; no probado en la Switch', 'components': comps,
           'other_profiles': sorted(set(profiles) - {a.profile}), 'excluded_base_slots': [{'fighter': c, 'slot': n} for c, n in ex],
           'exclude_base_total': len(globs), 'unmapped_components': unmapped, 'slots': slots}
    json.dump(out, open(os.path.join(R, 'data', 'inventory_profile.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('ok · perfil', a.profile, '·', len(comps), 'componentes ·', len(slots), 'slots ·', len(ex), 'slots de base retirados', ex, '· sin asignar a slots:', unmapped)
main()
