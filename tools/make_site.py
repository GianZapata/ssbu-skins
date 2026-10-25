# Arma la carpeta que se publica en GitHub Pages (_site): exactamente lo que sirven la Action y las pruebas end-to-end.
#   python3 tools/make_site.py [destino]      (por defecto _site)
import os, shutil, sys
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
dst = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(R, '_site'))
if os.path.exists(dst): shutil.rmtree(dst)
os.makedirs(dst)
for f in ('index.html', '.nojekyll'):
    shutil.copy(os.path.join(R, f), dst)
for d in ('installed', 'assets'):
    if os.path.isdir(os.path.join(R, d)): shutil.copytree(os.path.join(R, d), os.path.join(dst, d))
n = sum(len(fs) for _, _, fs in os.walk(dst))
print(f'ok · {dst} · {n} archivos')
