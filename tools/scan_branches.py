# Escanea las ramas del repo del ModPack que añaden skins SIN estar fusionadas en main y escribe
# data/inventory_staged.json (+ retratos en installed/rama_<luchador>_<NN>.webp).
# Uso: python3 tools/scan_branches.py /ruta/al/Gian-Ultimate-Modpack-private [--integration RAMA]
# Es la capa «en preparación»: nombres de trajes (nam_chr1_* de msg_name.xmsbt frente a main, o el asunto del
# commit) y retrato. NO es lo instalado: son cambios en ramas sin fusionar y sin confirmar en la consola.
import json, os, re, subprocess, sys, tempfile, datetime, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bntx
from scan_installed import INTERNAL, NAME, KINDS
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BODY = re.compile(r'^ultimate/mods/([^/]+)/fighter/([^/]+)/model/body/c(\d\d)/')
CHARA = re.compile(r'^ultimate/mods/([^/]+)/ui/replace[^/]*/chara/chara_(\d)/chara_\d_(\w+?)_(\d\d)\.bntx$')
MSG = 'ultimate/mods/The WuBoy Ultimate Modpack/ui/message/msg_name.xmsbt'
PAIR = re.compile(r'(?:^|[,:–-]\s*)(?:Install\s+)?([^,:()–]+?)\s+c(\d\d)\b')

def git(mp, *a, check=True, raw=False):
    r = subprocess.run(['git', '-C', mp, *a], capture_output=True)
    if check and r.returncode: raise RuntimeError(f"git {' '.join(a)}: {r.stderr.decode()[:200]}")
    return r.stdout if raw else r.stdout.decode('utf-8', 'replace')

def names_of(raw):
    if not raw: return {}
    t = raw.decode('utf-16', 'ignore')
    return {(i, int(s)): ' '.join(x.split()) for s, i, x in NAME.findall(t)}

def main(mp, integration):
    heads = {}
    for l in git(mp, 'ls-remote', '--heads', 'origin').splitlines():
        sha, ref = l.split('\t'); heads[ref.replace('refs/heads/', '')] = sha
    main_sha = heads['main']
    base_names = names_of(git(mp, 'show', f'{main_sha}:{MSG}', check=False, raw=True))
    branches, slots, subj_names = [], {}, {}
    order = sorted((b for b in heads if b != 'main'), key=lambda b: (b != integration, b))
    imgdir = os.path.join(R, 'installed'); os.makedirs(imgdir, exist_ok=True)
    keep = set()
    def pass_one(b):
        sha = heads[b]
        if subprocess.run(['git', '-C', mp, 'cat-file', '-e', sha], capture_output=True).returncode: git(mp, 'fetch', '--depth=1', 'origin', b)
        t = {}
        for l in git(mp, 'diff', '--name-status', main_sha, sha).splitlines():
            st, _, p = l.partition('\t'); m = BODY.match(p.split('\t')[-1])
            if m and st[0] in 'AMR' and m.group(2) in INTERNAL: t.setdefault(m.group(2), set()).add(int(m.group(3)))
        if len(t) == 1:
            i0 = git(mp, 'log', '-1', '--format=%s', sha).strip()
            for n_, s_ in PAIR.findall(i0): subj_names.setdefault((next(iter(t)), int(s_)), re.sub(r'^Install\s+', '', n_.strip()))
    for b in order: pass_one(b)
    for b in order:
        sha = heads[b]
        if subprocess.run(['git', '-C', mp, 'cat-file', '-e', sha], capture_output=True).returncode:
            git(mp, 'fetch', '--depth=1', 'origin', b)
        diff = git(mp, 'diff', '--name-status', main_sha, sha).splitlines()
        touched, charas = {}, {}
        for l in diff:
            st, _, p = l.partition('\t'); p = p.split('\t')[-1]
            m = BODY.match(p)
            if m and st[0] in 'AMR' and m.group(2) in INTERNAL: touched.setdefault(m.group(2), set()).add(int(m.group(3)))
            c = CHARA.match(p)
            if c and st[0] in 'AMR': charas[(c.group(3), int(c.group(4)), int(c.group(2)))] = p
        info = git(mp, 'log', '-1', '--format=%an|%ad|%s', '--date=short', sha).strip().split('|', 2)
        branches.append({'name': b, 'sha': sha[:7], 'author': info[0], 'date': info[1], 'subject': info[2], 'slots': {k: sorted(v) for k, v in sorted(touched.items())}})
        if not touched: continue
        bn = names_of(git(mp, 'show', f'{sha}:{MSG}', check=False, raw=True))
        for internal, sl in touched.items():
            code = INTERNAL[internal]
            for n in sorted(sl):
                if str(n) in slots.get(code, {}): continue      # la primera rama (la de integración) manda
                nm = bn.get((internal, n)) if bn.get((internal, n)) != base_names.get((internal, n)) else None
                src = 'msg_name' if nm else None
                if not nm and (internal, n) in subj_names: nm, src = subj_names[(internal, n)], 'commit'
                e = {'name': nm, 'name_src': src, 'branch': b, 'subject': info[2]}
                for k in KINDS:
                    p = charas.get((internal, n, k))
                    if not p: continue
                    try:
                        raw = git(mp, 'show', f'{sha}:{p}', raw=True)
                        with tempfile.NamedTemporaryFile(suffix='.bntx', delete=False) as t: t.write(raw); tp = t.name
                        im = bntx.decode(tp).convert('RGB'); os.unlink(tp); im.thumbnail((128, 128))
                        fn = f'rama_{internal}_{n:02d}.webp'; im.save(os.path.join(imgdir, fn), 'WEBP', quality=72, method=4)
                        e['img'] = fn; keep.add(fn); break
                    except Exception as ex: print('  sin imagen', internal, n, ex)
                slots.setdefault(code, {})[str(n)] = e
    for f in os.listdir(imgdir):
        if f.startswith('rama_') and f not in keep: os.remove(os.path.join(imgdir, f))
    out = {'scanned_at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'base': f'main@{main_sha[:7]}', 'integration': integration,
           'note': 'Cambios en ramas sin fusionar en main: skins preparadas por agentes, sin confirmar en la consola.', 'branches': branches, 'slots': slots}
    json.dump(out, open(os.path.join(R, 'data', 'inventory_staged.json'), 'w'), ensure_ascii=False, indent=1)
    print(f"ok · {len(branches)} ramas · {sum(len(v) for v in slots.values())} trajes en preparación · {len(keep)} retratos")

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('modpack'); ap.add_argument('--integration', default='cursor/gamebanana-skin-additions-0ddb')
    a = ap.parse_args(); main(a.modpack, a.integration)
