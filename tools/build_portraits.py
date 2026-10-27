# Retratos oficiales de los luchadores (identidad del luchador, NO de sus trajes): assets/fighters/<código>.webp
#   npm pack smash-ultimate-assets@0.1.1 && tar xzf smash-ultimate-assets-0.1.1.tgz
#   python3 tools/build_portraits.py package
# Fuente: paquete npm «smash-ultimate-assets» 0.1.1 (https://github.com/marcrd/smash-ultimate-assets, Apache-2.0 en el paquete; las imágenes son arte
# de Nintendo, de uso comunitario). Solo cubre los 78 luchadores del lanzamiento; los 12 DLC posteriores (71–82) no tienen retrato aquí y la web
# muestra una ficha tipográfica (nombre) hasta que se añada assets/fighters/<código>.webp a mano.
# Los 12 DLC se completan con `python3 tools/build_portraits.py dlc`: baja el render oficial (main.png) de data/catalog.json → original_refs
# (smashbros.com, comprobado HTTP 200) y lo deja en 256×256 con fondo transparente. Lo ejecuta la Action «Retratos DLC».
import io, json, os, sys, urllib.request
from PIL import Image
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MAP = {'01':'mario','02':'donkey_kong','03':'link','04':'samus','04ε':'dark_samus','05':'yoshi','06':'kirby','07':'fox','08':'pikachu','09':'luigi','10':'ness',
 '11':'captain_falcon','12':'jigglypuff','13':'peach','13ε':'daisy','14':'bowser','15':'ice_climbers','16':'sheik','17':'zelda','18':'dr_mario','19':'pichu','20':'falco',
 '21':'marth','21ε':'lucina','22':'young_link','23':'ganondorf','24':'mewtwo','25':'roy','25ε':'chrom','26':'mr_game_and_watch','27':'meta_knight','28':'pit','28ε':'dark_pit',
 '29':'zero_suit_samus','30':'wario','31':'snake','32':'ike','33':'squirtle','34':'ivysaur','35':'charizard','36':'diddy_kong','37':'lucas','38':'sonic','39':'king_dedede',
 '40':'olimar','41':'lucario','42':'rob','43':'toon_link','44':'wolf','45':'villager','46':'mega_man','47':'wii_fit_trainer','48':'rosalina_and_luma','49':'little_mac','50':'greninja',
 '51':'mii_brawler','52':'mii_swordfighter','53':'mii_gunner','54':'palutena','55':'pac_man','56':'robin','57':'shulk','58':'bowser_jr','59':'duck_hunt','60':'ryu','60ε':'ken',
 '61':'cloud','62':'corrin','63':'bayonetta','64':'inkling','65':'ridley','66':'simon','66ε':'richter','67':'king_k_rool','68':'isabelle','69':'incineroar','70':'piranha_plant'}
def file_of(code): return code.replace('ε', 'e') + '.webp'
def main(pkg):
    out = os.path.join(R, 'assets', 'fighters'); os.makedirs(out, exist_ok=True)
    done, miss = 0, []
    for code, name in MAP.items():
        full, small = os.path.join(pkg, 'portraits', 'full', name + '.png'), os.path.join(pkg, 'portraits', 'small', name + '.png')
        if os.path.exists(full):
            im = Image.open(full).convert('RGBA'); im.thumbnail((256, 256))
        elif os.path.exists(small):   # Charizard/Ivysaur/Squirtle solo traen la versión pequeña: se recorta a cuadrado
            im = Image.open(small).convert('RGBA'); s = min(im.size); l = (im.width - s) // 2; im = im.crop((l, 0, l + s, s)).resize((256, 256), Image.LANCZOS)
        else: miss.append(code); continue
        im.save(os.path.join(out, file_of(code)), 'WEBP', quality=82, method=6); done += 1
    print(f'ok · {done} retratos · sin fuente: {miss}')
def dlc():
    refs = json.load(open(os.path.join(R, 'data', 'catalog.json'), encoding='utf-8'))['original_refs']
    out = os.path.join(R, 'assets', 'fighters'); os.makedirs(out, exist_ok=True)
    done, fail = 0, []
    for n in range(71, 83):
        code = str(n); ref = refs[code]
        try:
            raw = urllib.request.urlopen(urllib.request.Request(ref['image_url'], headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read()
            im = Image.open(io.BytesIO(raw)).convert('RGBA'); box = im.getchannel('A').getbbox()
            if box: im = im.crop(box)
            side = max(im.size); sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
            sq = sq.resize((256, 256), Image.LANCZOS); sq.save(os.path.join(out, file_of(code)), 'WEBP', quality=82, method=6); done += 1
        except Exception as e: fail.append(f"{code} {ref['fighter']}: {e}")
    print(f'ok · {done} retratos DLC · fallos: {fail}')
    if fail: sys.exit(1)
if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] == 'dlc': dlc()
    elif len(sys.argv) == 2: main(sys.argv[1])
    else: sys.exit(__doc__)
