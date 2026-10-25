# Genera index.html desde data/catalog.json (lo mantiene Instalador Skins SSBU).
# Sin dependencias de red ni de Node: solo Pillow (y únicamente si existe thumbs/).
# Con "embed": false en data/firebase.json la página no lleva el catálogo incrustado y lo lee solo de Firestore.
import json,os,datetime
import catalog_data as cd
B=cd.B; R=cd.R
fighters,meta0=cd.load()
inv=cd.load_inventory(fighters); fbc=cd.load_firebase()
embed=not (fbc and fbc.get('embed') is False)
data=json.dumps(fighters if embed else [],ensure_ascii=False,separators=(',',':'))
cfg={k:v for k,v in (fbc or {}).items() if k!='embed'} or None
meta=json.dumps({**meta0,'inventory':inv if embed else None,'firebase':cfg,'embed':embed},ensure_ascii=False,separators=(',',':'))
tpl=open(os.path.join(B,'template.html'),encoding='utf-8').read()
css=open(os.path.join(B,'ui.css'),encoding='utf-8').read(); js=open(os.path.join(B,'ui.js'),encoding='utf-8').read()
out=tpl.replace('/*DATA*/null',data).replace('/*META*/null',meta).replace('/*CSS*/',css).replace('/*JS*/',js)
open(os.path.join(R,'index.html'),'w',encoding='utf-8').write(out)
ps=[p for f in fighters for p in f['picks']]
print('ok',len(out)//1024,'KB · auditadas',sum(p['audited'] for p in ps),'/',len(ps),'· retiradas',sum(p['withdrawn'] for p in ps),'· capturas',sum(len(p['g']) for p in ps),'· instalados',sum(len(v['slots']) for v in (inv or {}).get('fighters',{}).values()),'· incrustado' if embed else '· solo Firestore')
