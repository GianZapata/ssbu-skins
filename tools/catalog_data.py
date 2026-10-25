# Datos del catálogo tal como los usan la página y la base de datos (Firestore).
# Lo comparten tools/build_viewer.py (index.html) y tools/db.py (sincronización con Firestore).
import json,base64,io,os
B=os.path.dirname(os.path.abspath(__file__)); R=os.path.join(B,'..')
BASE='https://images.gamebanana.com/img/ss/mods'
WK={"Declaración explícita del autor sin condiciones conocidas":'autor_explicito',"Declaración condicionada del autor":'autor_condicionado',"Afirmación de terceros sin confirmación del autor":'tercero',"Sin evidencia localizada":'sin_evidencia',"Incompatible según la fuente":'incompatible'}
def cover(e):
    """(img, srcset) de la portada: miniatura local si existe; si no, GameBanana a 530 px con srcset 220/530/1280."""
    p=os.path.join(R,'thumbs',f"{e['mod_id']}.jpg")
    if os.path.exists(p):
        from PIL import Image
        im=Image.open(p).convert('RGB'); im.thumbnail((1280,720)); b=io.BytesIO(); im.save(b,'JPEG',quality=76,optimize=True)
        return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode(), ''
    for im in e.get('preview_images') or []:
        full,mid,small=im.get('url'),im.get('url530'),im.get('url220')
        if not (full or mid or small): continue
        parts=[f'{u} {w}w' for u,w in ((small,220),(mid,530),(full,1280)) if u]
        return (mid or full or small), ', '.join(parts)
    return '', ''
def gallery(e):
    """Solo el nombre de archivo de cada captura; las URLs 220/530/original se derivan de BASE en el navegador."""
    return [im['file'] for im in e.get('preview_images') or [] if im.get('file') and im.get('base')==BASE]
J=lambda v:' · '.join(v) if isinstance(v,list) else (v or '')
F={};order=[]
def add(e,withdrawn=False):
    k=e['roster_no']
    if k not in F: F[k]={'code':k,'name':e['fighter'],'dlc':e.get('dlc_required'),'picks':[]}; order.append(k)
    aud=e.get('audit_status')=='verified'
    img,srcset=cover(e)
    F[k]['picks'].append({'id':e['mod_id'],'name':e['look_name'],'author':e['author'],'url':e['url'],'img':img,'srcset':srcset,'g':gallery(e),
      'audited':aud,'withdrawn':withdrawn,'wifi_status':WK.get(e.get('wifi_state'),e.get('wifi_state')) if aud else None,
      'wifi_quote':e.get('wifi_quote'),'wifi_source':e.get('wifi_source'),'wifi_source_url':e.get('wifi_evidence_url'),
      'conditions':J(e.get('conditions')),'design':e.get('design_check'),'slots_orig':e.get('native_slots_raw'),
      'dest':'c%02d'%e['proposed_destination'] if isinstance(e.get('proposed_destination'),int) else e.get('proposed_destination'),
      'assignment':e.get('primary_slot_status'),'deps':J(e.get('dependencies')),'conflicts':J(e.get('conflicts')),
      'compat':e.get('compatibility_13_0_5'),'file_note':e.get('file_inspection'),
      'console_test':e.get('console_test'),'status':e.get('audit_status'),'notes':e.get('notes') or '',
      'quote_prev':e.get('wifi_quote_auto'),'new':bool(e.get('is_replacement'))})

def load():
    """(luchadores, meta) del catálogo. Cada luchador: {code,name,dlc,picks:[...]}."""
    global F,order
    c=json.load(open(os.path.join(R,'data','catalog.json'),encoding='utf-8'))
    F={};order=[]
    for e in c['entries']: add(e)
    for e in c.get('withdrawn',[]):
        if 'roster_no' in e: add(e,True)
    meta={'generated':c.get('generated'),'timezone':c.get('timezone'),'counts':c.get('counts'),'base':BASE}
    return [F[k] for k in order],meta
def load_installed():
    """{'scanned_at','source','fighters':{code:slots},'info':{code:{slot:{n,skin,i}}}} o None si falta data/installed.json."""
    ip=os.path.join(R,'data','installed.json')
    if not os.path.exists(ip): return None
    j=json.load(open(ip,encoding='utf-8'))
    return {'scanned_at':j.get('scanned_at'),'source':j.get('source'),'fighters':{k:v['slots'] for k,v in j.get('fighters',{}).items()},
            'info':{k:{str(s):e for s,e in v.get('info',{}).items()} for k,v in j.get('fighters',{}).items()}}
def load_firebase():
    """Configuración web de Firebase (pública por diseño; la seguridad la ponen firestore.rules)."""
    fp=os.path.join(R,'data','firebase.json')
    return json.load(open(fp,encoding='utf-8')) if os.path.exists(fp) else None
