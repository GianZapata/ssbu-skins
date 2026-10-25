# ssbu-skins

Catálogo de uso personal de candidatos de skins para Super Smash Bros. Ultimate (Smash 13.0.5 / ARCropolis 4.1.1).

Los estados Wi-Fi safe son los estados de evidencia registrados en el catálogo, no afirmaciones probadas en consola. Cada mod enlaza a su página original en GameBanana y a su autor.

## Regenerar

```bash
python3 tools/build_viewer.py
```

Sin dependencias de red ni de Node: solo Python 3 (Pillow únicamente si existe `thumbs/`). Lee `data/catalog.json` y `tools/template.html`; escribe `index.html` en la raíz. El CSS y el JS van dentro de esa página, así que GitHub Pages no necesita CDN ni compilación.

Antes de generar, `python3 tools/validate_catalog.py` comprueba que el catálogo cumple `docs/AUDIT_CONTRACT.md`. `python3 tools/db.py seed` copia el catálogo y lo instalado a Firestore (lo hace la Action con el secreto `FIREBASE_SERVICE_ACCOUNT`).

No subir `node_modules/`, binarios ni CSS compilado al repo: el historial no se puede aligerar sin reescribirlo.

Slots ya instalados: `python3 tools/scan_installed.py <ruta del repo del ModPack>` escribe `data/installed.json` y los retratos en `installed/*.webp` (Pillow; decodifica los `.bntx` con `tools/bntx.py`). La página los muestra en la pestaña **Instalado** y los cuenta dentro del máximo por luchador.

## Base de datos y amigos (Firebase)

Todo lo que muestra la página sale de Firestore (con la copia incrustada como respaldo): catálogo, lo instalado, tu selección, las recomendaciones de tus amigos y el estado de cada instalación. Tú entras una vez con Google (🔒) y tu selección se guarda sola; cualquiera que abra la página ve lo que eliges en vivo y puede recomendar. Activación y modelo de seguridad: `docs/FIREBASE.md`. El instalador lee con `python3 tools/db.py selection` y anota con `python3 tools/db.py status …` (contrato en `docs/SELECTION_CONTRACT.md`).
