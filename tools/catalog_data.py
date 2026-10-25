# Datos del catálogo tal como los usan la página y la base de datos (Firestore).
# Lo comparten tools/build_viewer.py (index.html) y tools/db.py (sincronización con Firestore).
import json,base64,io,os,re,unicodedata
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
F={};order=[];_used=set()
def slug(t,n=24):
    t=unicodedata.normalize('NFKD',t or '').encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',t).strip('-')[:n] or 'x'
def make_vid(e):
    lid=e.get('look_id')
    if lid and lid not in _used:
        _used.add(lid); return lid
    """Identificador estable de una apariencia: «luchador:mod». Si un paquete trae varios diseños para el mismo luchador,
    el segundo y siguientes llevan «~nombre» (el mod por sí solo no distingue las variantes)."""
    base=f"{e['roster_no']}:{e['mod_id']}"
    v=base
    if v in _used: v=f"{base}~{slug(e['look_name'])}"
    n=2
    while v in _used: v=f"{base}~{slug(e['look_name'])}-{n}";n+=1
    _used.add(v);return v
SC={}   # textos de alcance repetidos (auditoría, descargas, imágenes) → índice; evita incrustarlos en cada apariencia
def intern(t):
    if not t: return None
    return SC.setdefault(t,len(SC))
def native(e):
    v=e.get('native_slots')
    return [int(x) for x in v if isinstance(x,int) or str(x).isdigit()] if isinstance(v,list) else []
def add(e,withdrawn=False):
    k=e['roster_no']
    if k not in F: F[k]={'code':k,'name':e['fighter'],'dlc':e.get('dlc_required'),'picks':[]}; order.append(k)
    aud=e.get('audit_status')=='verified'
    img,srcset=cover(e)
    F[k]['picks'].append({'vid':make_vid(e),'role':'alt' if e.get('role')=='alternativa' else 'main','alt':e.get('alt_index'),'variant':e.get('variant'),'native':native(e),'dl':e.get('downloads'),'rank':e.get('rank_in_category_most_downloaded'),'dlshared':bool(e.get('shared_download_counter')),'depkind':e.get('dependency_kind'),'wcode':e.get('wifi_state_code'),'dkind':e.get('design_kind'),'sc':[intern(e.get('audit_scope')),intern(re.sub(r'; puesto \d+','',e.get('downloads_scope') or '')),intern(e.get('images_scope'))],'legacy':f"{e['roster_no']}:{e['mod_id']}",'id':e['mod_id'],'name':e['look_name'],'author':e['author'],'url':e['url'],'img':img,'srcset':srcset,'g':gallery(e),
      'audited':aud,'withdrawn':withdrawn,'wifi_status':WK.get(e.get('wifi_state'),e.get('wifi_state')) if aud else None,
      'wifi_quote':e.get('wifi_quote'),'wifi_source':e.get('wifi_source'),'wifi_source_url':e.get('wifi_evidence_url'),
      'conditions':J(e.get('conditions')),'design':e.get('design_check'),'slots_orig':e.get('native_slots_raw'),
      'dest':'c%02d'%e['proposed_destination'] if isinstance(e.get('proposed_destination'),int) else e.get('proposed_destination'),
      'mii':'Mii' in (e.get('primary_slot_status') or ''),'assignment':e.get('primary_slot_status'),'deps':J(e.get('dependencies')),'conflicts':J(e.get('conflicts')),
      'compat':e.get('compatibility_13_0_5'),'file_note':e.get('file_inspection'),
      'console_test':e.get('console_test'),'status':e.get('audit_status'),'notes':e.get('notes') or '',
      'quote_prev':e.get('wifi_quote_auto'),'new':bool(e.get('is_replacement'))})

def load():
    """(luchadores, meta) del catálogo. Cada luchador: {code,name,dlc,picks:[...]}."""
    global F,order,_used,SC
    c=json.load(open(os.path.join(R,'data','catalog.json'),encoding='utf-8'))
    F={};order=[];_used=set();SC={}
    for e in c['entries']: add(e)
    for e in c.get('withdrawn',[]):
        if 'roster_no' in e: add(e,True)
    # paquetes: un mismo mod que sirve a varios luchadores (o diseños); sus fotos muestran todo el paquete
    packs={}
    for f in F.values():
        for p in f['picks']:
            if not p['withdrawn']: packs.setdefault(p['id'],[]).append((f['name'],p))
    for lst in packs.values():
        for fname,p in lst:
            p['pack']={'n':len(lst),'with':sorted({n for n,_ in lst if n!=fname})} if len(lst)>1 else None
    for f in F.values():
        for p in f['picks']: p.setdefault('pack',None)
        main=[p for p in f['picks'] if p['role']=='main' and not p['withdrawn']]
        f['mii']=bool(main) and all(p['mii'] for p in main)
        if f['mii']:
            for p in f['picks']: p['mii']=True
    meta={'generated':c.get('generated'),'timezone':c.get('timezone'),'counts':c.get('counts'),'base':BASE,'scopes':[t for t,_ in sorted(SC.items(),key=lambda x:x[1])]}
    return [F[k] for k in order],meta
def _jload(name):
    fp=os.path.join(R,'data',name)
    return json.load(open(fp,encoding='utf-8')) if os.path.exists(fp) else None
def load_inventory(fighters=None):
    """Inventario por capas, con su nivel de verificación (no es «lo instalado en la consola»):
       base    → pack de WuBoy en la rama main del ModPack (data/installed.json; lo escribe scan_installed.py)
       perfil  → componentes del perfil local «default» (data/inventory_profile.json, transcrito del informe del ModPack)
       staged  → skins en ramas sin fusionar (data/inventory_staged.json; scan_branches.py): «en preparación», sin confirmar
    Devuelve {'meta':{…},'fighters':{código:{'slots':{'0':{src,name,img,skin,vid,author,url,staged}}}}} o None."""
    base=_jload('installed.json'); prof=_jload('inventory_profile.json'); stg=_jload('inventory_staged.json')
    if not (base or prof or stg): return None
    vid_by_mod={}
    for f in (fighters or []):
        for p in f['picks']:
            if not p['withdrawn']: vid_by_mod.setdefault((f['code'],p['id']),p['vid'])
    fs={}
    def slot(code,n): return fs.setdefault(code,{'slots':{}})['slots'].setdefault(str(n),{})
    for code,v in ((base or {}).get('fighters') or {}).items():
        for n in v['slots']:
            i=(v.get('info') or {}).get(str(n),{})
            slot(code,n).update({'src':'base','name':i.get('n'),'img':('installed/'+i['i']) if i.get('i') else None,'skin':bool(i.get('skin'))})
    for x in (prof or {}).get('excluded_base_slots',[]):   # el perfil excluye ese traje del pack base: ya no cuenta como instalado
        fs.get(x['fighter'],{}).get('slots',{}).pop(str(x['slot']),None)
    for e in (prof or {}).get('slots',[]):
        slot(e['fighter'],e['slot']).update({'src':'perfil','name':e['name'],'img':None,'skin':True,'author':e.get('author'),'url':e.get('url'),'version':e.get('version'),'vid':vid_by_mod.get((e['fighter'],e['mod_id']))})
    for code,sl in ((stg or {}).get('slots') or {}).items():
        for n,e in sl.items():
            slot(code,n)['staged']={'name':e.get('name'),'name_src':e.get('name_src'),'img':('installed/'+e['img']) if e.get('img') else None,'branch':e.get('branch'),'subject':e.get('subject')}
    import hashlib
    digest=hashlib.sha1(json.dumps(fs,sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:8]
    meta={'verification':'parcial','version':digest,'scanned_at':(base or {}).get('scanned_at'),
          'profile':{'name':(prof or {}).get('profile'),'ref':(prof or {}).get('ref'),'components':[c['id'] for c in (prof or {}).get('components',[])],'other_profiles':(prof or {}).get('other_profiles'),'excluded_base_slots':(prof or {}).get('excluded_base_slots')},
          'sources':[
            {'id':'base','label':'Pack base de WuBoy','ref':'{branch}@{sha}'.format(**((base or {}).get('ref') or {'branch':'main','sha':'?'})),'verification':'Revisado en el repositorio','scope':(base or {}).get('scope')},
            {'id':'perfil','label':(prof or {}).get('label'),'ref':(prof or {}).get('ref'),'verification':(prof or {}).get('verification')},
            {'id':'staged','label':'Skins en ramas sin fusionar','ref':(stg or {}).get('base'),'verification':'En preparación: sin confirmar en la consola','branches':len((stg or {}).get('branches') or [])}],
          'note':'Esto es lo que se pudo revisar en los repositorios, no un inventario comprobado en la consola.'}
    return {'meta':meta,'fighters':fs}
def load_firebase():
    """Configuración web de Firebase (pública por diseño; la seguridad la ponen firestore.rules)."""
    fp=os.path.join(R,'data','firebase.json')
    return json.load(open(fp,encoding='utf-8')) if os.path.exists(fp) else None
