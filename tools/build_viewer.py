# Genera index.html desde data/catalog.json (lo mantiene Instalador Skins SSBU).
import json,base64,io,os
from PIL import Image
B=os.path.dirname(os.path.abspath(__file__)); R=os.path.join(B,'..')
c=json.load(open(os.path.join(R,'data','catalog.json')))
WK={"Declaración explícita del autor sin condiciones conocidas":'autor_explicito',"Declaración condicionada del autor":'autor_condicionado',"Afirmación de terceros sin confirmación del autor":'tercero',"Sin evidencia localizada":'sin_evidencia',"Incompatible según la fuente":'incompatible'}
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
J=lambda v:' · '.join(v) if isinstance(v,list) else (v or '')
F={};order=[]
def add(e,withdrawn=False):
    k=e['roster_no']
    if k not in F: F[k]={'code':k,'name':e['fighter'],'dlc':e.get('dlc_required'),'picks':[]}; order.append(k)
    aud=e.get('audit_status')=='verified'
    src,srcset=images(e)
    F[k]['picks'].append({'id':e['mod_id'],'name':e['look_name'],'author':e['author'],'url':e['url'],'img':src,'srcset':srcset,
      'audited':aud,'withdrawn':withdrawn,'wifi_status':WK.get(e.get('wifi_state'),e.get('wifi_state')) if aud else None,
      'wifi_quote':e.get('wifi_quote'),'wifi_source':e.get('wifi_source'),'wifi_source_url':e.get('wifi_evidence_url'),
      'conditions':J(e.get('conditions')),'design':e.get('design_check'),'slots_orig':e.get('native_slots_raw'),
      'dest':'c%02d'%e['proposed_destination'] if isinstance(e.get('proposed_destination'),int) else e.get('proposed_destination'),
      'assignment':e.get('primary_slot_status'),'deps':J(e.get('dependencies')),'conflicts':J(e.get('conflicts')),
      'compat':e.get('compatibility_13_0_5'),'file_inspected':e.get('file_inspection')!='archivo no inspeccionado','file_note':e.get('file_inspection'),
      'console_test':e.get('console_test'),'status':e.get('audit_status'),'notes':e.get('notes') or '',
      'quote_prev':e.get('wifi_quote_auto'),'note_prev':e.get('notes') or '','new':bool(e.get('is_replacement'))})
for e in c['entries']: add(e)
for e in c.get('withdrawn',[]):
    if 'roster_no' in e: add(e,True)
data=json.dumps([F[k] for k in order],ensure_ascii=False)
meta=json.dumps({'generated':c.get('generated'),'timezone':c.get('timezone'),'counts':c.get('counts'),'audited':c.get('audited_fighters')},ensure_ascii=False)
tpl=open(os.path.join(B,'template.html')).read()
stamp=(c.get('generated') or '')[:16].replace('T',' ')
out=tpl.replace('/*DATA*/null',data).replace('/*META*/null',meta).replace('{{STAMP}}',stamp)
open(os.path.join(R,'index.html'),'w').write(out)
ps=[p for f in F.values() for p in f['picks']]
print('ok',len(out)//1024,'KB · auditadas',sum(p['audited'] for p in ps),'/',len(ps),'· retiradas',sum(p['withdrawn'] for p in ps))
