# Escanea el repo del ModPack y escribe data/installed.json: slots ocupados por luchador.
# Uso: python3 tools/scan_installed.py /ruta/al/Gian-Ultimate-Modpack-private
# Un slot cNN cuenta como ocupado si existe ultimate/mods/<mod>/fighter/<interno>/model/body/cNN
# (si el luchador no tiene carpeta "body", se usa cualquier model/*/cNN). Es ocupación de slots,
# no identifica de qué skin se trata por sí mismo. Para cada slot ocupado intenta además:
#  - nombre: entrada nam_chr1_<slot>_<interno> de ui/message/msg_name.xmsbt (cuando el pack renombra el costume);
#  - retrato: ui/replace*/chara/chara_0/chara_0_<interno>_<slot>.bntx, decodificado a installed/<interno>_<slot>.webp.
# Un slot con retrato propio es una skin completa; sin retrato puede ser solo un ajuste de modelo.
import json, os, re, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bntx
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# nombre interno del juego -> roster_no del catálogo
INTERNAL = {
 'mario':'01','donkey':'02','link':'03','samus':'04','samusd':'04ε','yoshi':'05','kirby':'06','fox':'07','pikachu':'08','luigi':'09','ness':'10',
 'captain':'11','purin':'12','peach':'13','daisy':'13ε','koopa':'14','popo':'15','nana':'15','sheik':'16','zelda':'17','mariod':'18','pichu':'19','falco':'20',
 'marth':'21','lucina':'21ε','younglink':'22','ganon':'23','mewtwo':'24','roy':'25','chrom':'25ε','gamewatch':'26','metaknight':'27','pit':'28','pitb':'28ε',
 'szerosuit':'29','wario':'30','snake':'31','ike':'32','pzenigame':'33','pfushigisou':'34','plizardon':'35','diddy':'36','lucas':'37','sonic':'38','dedede':'39',
 'pikmin':'40','lucario':'41','robot':'42','toonlink':'43','wolf':'44','murabito':'45','rockman':'46','wiifit':'47','rosetta':'48','littlemac':'49','gekkouga':'50',
 'miifighter':'51','miiswordsman':'52','miigunner':'53','palutena':'54','pacman':'55','reflet':'56','shulk':'57','koopajr':'58','duckhunt':'59','ryu':'60','ken':'60ε',
 'cloud':'61','kamui':'62','bayonetta':'63','inkling':'64','ridley':'65','simon':'66','richter':'66ε','krool':'67','shizue':'68','gaogaen':'69','packun':'70',
 'jack':'71','brave':'72','buddy':'73','dolly':'74','master':'75','tantan':'76','pickel':'77','edge':'78','eflame':'79','elight':'80','demon':'81','trail':'82'}
IGNORED = {'koopag', 'element', 'ptrainer'}  # Giga Bowser, modelo compartido de Pyra/Mythra y el Entrenador Pokémon: no son luchadores del catálogo
SLOT = re.compile(r'^c(\d{2})$')
NAME = re.compile(r'<entry label="nam_chr1_(\d\d)_(\w+)">\s*<text>(.*?)</text>', re.S)
def read_names(mods, scanned):
    names = {}
    for mod in scanned:
        f = os.path.join(mods, mod, 'ui', 'message', 'msg_name.xmsbt')
        if not os.path.isfile(f): continue
        raw = open(f, 'rb').read()
        try: t = raw.decode('utf-16')
        except UnicodeError: t = raw.decode('utf-8', 'ignore')
        for slot, internal, text in NAME.findall(t): names[(internal, int(slot))] = ' '.join(text.split())
    return names
KINDS = (0, 1, 4, 2, 6, 3, 5, 7)  # chara_0 (128 px) primero; si falta, el siguiente tamaño disponible
def portraits(mods, mod, internal, slot):
    for k in KINDS:
        for base in ('replace', 'replace_patch'):
            f = os.path.join(mods, mod, 'ui', base, 'chara', f'chara_{k}', f'chara_{k}_{internal}_{slot:02d}.bntx')
            if os.path.isfile(f): yield f
def main(mp):
    mods = os.path.join(mp, 'ultimate', 'mods')
    fighters, unknown, scanned = {}, set(), []
    for mod in sorted(os.listdir(mods)):
        fd = os.path.join(mods, mod, 'fighter')
        if not os.path.isdir(fd): continue
        scanned.append(mod)
        for name in sorted(os.listdir(fd)):
            md = os.path.join(fd, name, 'model')
            if not os.path.isdir(md): continue
            if name in IGNORED: continue
            if name not in INTERNAL: unknown.add(name); continue
            body = os.path.join(md, 'body')
            parts = ['body'] if os.path.isdir(body) else [p for p in os.listdir(md) if os.path.isdir(os.path.join(md, p))]
            slots = {int(m.group(1)) for p in parts for d in os.listdir(os.path.join(md, p)) if (m := SLOT.match(d))}
            if not slots: continue
            e = fighters.setdefault(INTERNAL[name], {'internal': name, 'slots': set(), 'mods': set()})
            e['slots'] |= slots; e['mods'].add(mod)
    names = read_names(mods, scanned)
    imgdir = os.path.join(R, 'installed'); os.makedirs(imgdir, exist_ok=True)
    keep, nimg = set(), 0
    for code, v in fighters.items():
        v['info'] = {}
        for sl in sorted(v['slots']):
            e = {}
            nm = names.get((v['internal'], sl))
            if nm: e['n'] = nm
            for mod in sorted(v['mods']):
                for pf in portraits(mods, mod, v['internal'], sl):
                    e['skin'] = True
                    try:
                        im = bntx.decode(pf).convert('RGB'); im.thumbnail((128, 128))
                        fn = f"{v['internal']}_{sl:02d}.webp"
                        im.save(os.path.join(imgdir, fn), 'WEBP', quality=72, method=4)
                        e['i'] = fn; keep.add(fn); nimg += 1
                    except Exception as ex:
                        print('  sin imagen', os.path.basename(pf), ex); continue
                    break
                if e.get('i') or e.get('skin'): break
            v['info'][str(sl)] = e
    for f in os.listdir(imgdir):
        if f.endswith('.webp') and f not in keep: os.remove(os.path.join(imgdir, f))
    out = {'source': 'GianZapata/Gian-Ultimate-Modpack-private', 'scanned_at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
           'note': 'Slots ocupados en el ModPack. info[slot]: n=nombre del costume (si el pack lo renombra), skin=tiene retrato propio, i=imagen en installed/.',
           'mods_scanned': scanned,
           'fighters': {k: {'internal': v['internal'], 'slots': sorted(v['slots']), 'mods': sorted(v['mods']), 'info': v['info']} for k, v in sorted(fighters.items())}}
    json.dump(out, open(os.path.join(R, 'data', 'installed.json'), 'w'), ensure_ascii=False, indent=1)
    n = sum(len(v['slots']) for v in out['fighters'].values())
    nn = sum(1 for v in out['fighters'].values() for e in v['info'].values() if e.get('n'))
    print(f"ok · {len(out['fighters'])} luchadores · {n} slots ocupados · {nimg} retratos · {nn} nombres · mods: {', '.join(scanned)}" + (f" · sin emparejar: {sorted(unknown)}" if unknown else ''))
if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(sys.argv[1])
