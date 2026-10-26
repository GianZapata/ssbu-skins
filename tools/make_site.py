# Arma la carpeta publicada a partir de la build de Vite.
#   python3 tools/make_site.py [destino]
# Sin destino, copia dist/ a _site. Con destino dist, solo añade retratos e inventario.
import os, shutil, sys
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
built = os.path.join(R, 'dist')
dst = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(R, '_site'))
if not os.path.isfile(os.path.join(built, 'index.html')):
    sys.exit('falta dist/index.html: corre npm run build')
same = os.path.abspath(dst) == os.path.abspath(built)
if not same:
    if os.path.exists(dst): shutil.rmtree(dst)
    shutil.copytree(built, dst)
for d in ('installed', 'assets'):
    src = os.path.join(R, d)
    if os.path.isdir(src):
        shutil.copytree(src, os.path.join(dst, d), dirs_exist_ok=True)
open(os.path.join(dst, '.nojekyll'), 'w').close()
n = sum(len(fs) for _, _, fs in os.walk(dst))
print(f'ok · {dst} · {n} archivos')
