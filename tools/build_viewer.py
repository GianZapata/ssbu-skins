# Genera index.html desde data/catalog.json (lo mantiene Instalador Skins SSBU).
import json,base64,io,os,subprocess,datetime
from PIL import Image
from urllib.request import urlopen
from io import BytesIO

B=os.path.dirname(os.path.abspath(__file__)); R=os.path.join(B,'..')
c=json.load(open(os.path.join(R,'data','catalog.json')))
WK={"Declaración explícita del autor sin condiciones conocidas":'autor_explicito',"Declaración condicionada del autor":'autor_condicionado',"Afirmación de terceros sin confirmación del autor":'tercero',"Sin evidencia localizada":'sin_evidencia',"Incompatible según la fuente":'incompatible'}
# Mapeo de etiquetas honestas
WL={"autor_explicito":("Declarado por el autor","success"),"autor_condicionado":("Con condiciones","warning"),"tercero":("Según terceros","neutral"),"sin_evidencia":("Sin evidencia","neutral"),"incompatible":("Incompatible","error")}
def get_dimensions(url):
    """Obtiene dimensiones de una imagen remotamente (solo para primera de cada skin)."""
    try:
        with urlopen(url, timeout=3) as resp:
            img_data = resp.read(50000)  # Solo primeros 50KB
            img = Image.open(BytesIO(img_data))
            return img.width, img.height
    except:
        return 1280, 720  # Default 16:9

def images(e):
    # La grilla se ve a ~175–260 px CSS. 220 px se ve borroso en retina;
    # 530 px alcanza la tarjeta y el original (descrito como 1280w) el detalle.
    p=os.path.join(R,'thumbs',f"{e['mod_id']}.jpg")
    if os.path.exists(p):
        im=Image.open(p).convert('RGB'); im.thumbnail((1280,720)); b=io.BytesIO(); im.save(b,'JPEG',quality=76,optimize=True)
        return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode(), ''
    for im in e.get('preview_images') or []:
        full,mid,small=im.get('url'),im.get('url530'),im.get('url220')
        if not (full or mid or small): continue
        parts=[]
        if small: parts.append(small+' 220w')
        if mid: parts.append(mid+' 530w')
        if full: parts.append(full+' 1280w')
        return (mid or full or small), ', '.join(parts)
    return '', ''

def all_images(e):
    """Retorna todas las preview_images con dimensiones para PhotoSwipe."""
    result = []
    for idx, im in enumerate(e.get('preview_images') or []):
        url = im.get('url')
        if not url: continue
        # Solo obtener dimensiones de la primera (las demás asumimos 16:9)
        if idx == 0:
            w, h = get_dimensions(url)
        else:
            w, h = 1280, 720
        result.append({
            'url': url,
            'url530': im.get('url530'),
            'url220': im.get('url220'),
            'width': w,
            'height': h
        })
    return result
J=lambda v:' · '.join(v) if isinstance(v,list) else (v or '')
F={};order=[]
def add(e,withdrawn=False):
    k=e['roster_no']
    if k not in F: F[k]={'code':k,'name':e['fighter'],'dlc':e.get('dlc_required'),'skins':[]}; order.append(k)
    aud=e.get('audit_status')=='verified'
    src,srcset=images(e)
    imgs=all_images(e)
    wifi_key=WK.get(e.get('wifi_state'),e.get('wifi_state')) if aud else None
    wifi_info=WL.get(wifi_key,("Auditada","neutral")) if aud else None
    F[k]['skins'].append({'id':e['mod_id'],'name':e['look_name'],'author':e['author'],'url':e['url'],'img':src,'srcset':srcset,
      'preview_images':imgs,'audited':aud,'withdrawn':withdrawn,'wifi_status':wifi_key,
      'wifi_label':wifi_info[0] if wifi_info else None,'wifi_class':wifi_info[1] if wifi_info else None,
      'wifi_quote':e.get('wifi_quote'),'wifi_source':e.get('wifi_source'),'wifi_source_url':e.get('wifi_evidence_url'),
      'conditions':e.get('conditions') if isinstance(e.get('conditions'),list) else ([e.get('conditions')] if e.get('conditions') else []),
      'design':e.get('design_check'),'slots_orig':e.get('native_slots_raw'),
      'roster_no':k,'fighter':e['fighter'],
      'dest_slot':'c%02d'%e['proposed_destination'] if isinstance(e.get('proposed_destination'),int) else e.get('proposed_destination'),
      'assignment':e.get('primary_slot_status'),'dependencies':e.get('dependencies') if isinstance(e.get('dependencies'),list) else ([e.get('dependencies')] if e.get('dependencies') else []),
      'conflicts':e.get('conflicts') if isinstance(e.get('conflicts'),list) else ([e.get('conflicts')] if e.get('conflicts') else []),
      'compat':e.get('compatibility_13_0_5'),'file_inspected':e.get('file_inspection')!='archivo no inspeccionado','file_note':e.get('file_inspection'),
      'console_test':e.get('console_test'),'status':e.get('audit_status'),'notes':e.get('notes') or ''})
print('Procesando catálogo...')
for e in c['entries']: add(e)
for e in c.get('withdrawn',[]):
    if 'roster_no' in e: add(e,True)

fighters_list=[F[k] for k in order]
print(f'Luchadores: {len(fighters_list)}, Total skins: {sum(len(f["skins"]) for f in fighters_list)}')

# Compilar Tailwind CSS
print('Compilando Tailwind CSS...')
subprocess.run([
    os.path.join(R, 'tailwindcss-linux-x64'),
    '-i', os.path.join(R, 'src', 'input.css'),
    '-o', os.path.join(R, 'dist', 'output.css'),
    '--minify'
], cwd=R, check=True, capture_output=True)

with open(os.path.join(R, 'dist', 'output.css')) as f:
    compiled_css = f.read()

data=json.dumps(fighters_list,ensure_ascii=False)
meta=json.dumps({'generated':c.get('generated'),'timezone':c.get('timezone'),'counts':c.get('counts'),'audited':c.get('audited_fighters')},ensure_ascii=False)
tpl=open(os.path.join(B,'template.html')).read()
stamp=datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
out=tpl.replace('/*DATA*/null',data).replace('/*META*/null',meta).replace('{{STAMP}}',stamp).replace('/*CSS_PLACEHOLDER*/',compiled_css)
open(os.path.join(R,'index.html'),'w',encoding='utf-8').write(out)
ps=[p for f in fighters_list for p in f['skins']]
print(f'✓ {len(out)//1024} KB · auditadas {sum(p["audited"] for p in ps)}/{len(ps)} · retiradas {sum(p["withdrawn"] for p in ps)}')
