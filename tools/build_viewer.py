# La página la publica Vite. Este comando solo deja el catálogo listo en public/boot.js.
import os, runpy
runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'export_boot.py'), run_name='__main__')
print('la página se arma con npm run build')
