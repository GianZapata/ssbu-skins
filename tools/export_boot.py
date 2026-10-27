# Prepara los archivos que Vite copia tal cual: el catálogo y los scripts de la página.
# La seguridad de Firebase sigue en firestore.rules; aquí solo va la config web pública.
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog_data as cd

fighters, meta0 = cd.load()
inv = cd.load_inventory(fighters)
fbc = cd.load_firebase()
embed = not (fbc and fbc.get('embed') is False)
cfg = {k: v for k, v in (fbc or {}).items() if k != 'embed'} or None
meta = {**meta0, 'inventory': inv if embed else None, 'firebase': cfg, 'embed': embed}
data = fighters if embed else []
pub = os.path.join(cd.R, 'public')
os.makedirs(pub, exist_ok=True)
boot = 'var F_EMBED=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\nvar META=' + json.dumps(meta, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(pub, 'boot.js'), 'w', encoding='utf-8').write(boot)
ps = [p for f in fighters for p in f['picks']]
print('ok boot', len(boot) // 1024, 'KB · auditadas', sum(p['audited'] for p in ps), '/', len(ps))
