# Escanea el repo del ModPack y escribe data/installed.json: slots ocupados por luchador.
# Uso: python3 tools/scan_installed.py /ruta/al/Gian-Ultimate-Modpack-private
# Un slot cNN cuenta como ocupado si existe ultimate/mods/<mod>/fighter/<interno>/model/body/cNN
# (si el luchador no tiene carpeta "body", se usa cualquier model/*/cNN). Es ocupación de slots,
# no identifica de qué skin se trata ni distingue una skin de un ajuste de modelo.
import json, os, re, sys, datetime
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
    out = {'source': 'GianZapata/Gian-Ultimate-Modpack-private', 'scanned_at': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
           'note': 'Slots ocupados en el ModPack; no identifica la skin ni distingue skins de ajustes de modelo.',
           'mods_scanned': scanned,
           'fighters': {k: {'internal': v['internal'], 'slots': sorted(v['slots']), 'mods': sorted(v['mods'])} for k, v in sorted(fighters.items())}}
    json.dump(out, open(os.path.join(R, 'data', 'installed.json'), 'w'), ensure_ascii=False, indent=1)
    n = sum(len(v['slots']) for v in out['fighters'].values())
    print(f"ok · {len(out['fighters'])} luchadores · {n} slots ocupados · mods: {', '.join(scanned)}" + (f" · sin emparejar: {sorted(unknown)}" if unknown else ''))
if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(sys.argv[1])
