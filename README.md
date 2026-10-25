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

Inventario de lo instalado: `python3 tools/scan_installed.py <ruta del ModPack>` (rama principal) y `python3 tools/scan_branches.py <ruta del ModPack>` (ramas sin fusionar) escriben `data/installed.json`, `data/inventory_staged.json` y los retratos en `installed/*.webp`; `data/inventory_profile.json` es la capa curada del perfil. La página muestra cada nivel con su verificación (nunca como confirmado en la consola).

## Base de datos y amigos (Firebase)

La página tiene tres secciones —**Luchadores**, **Catálogo** y **Cambios**— y un único plan compartido: cualquiera que abra el enlace puede elegir otra apariencia para uno de los 8 trajes de un luchador y se guarda para todos (sesión anónima automática, historial y «Deshacer»). El inventario y el estado de instalación no se pueden editar desde la web. Configuración y reglas: `docs/FIREBASE.md`; lectura del plan para instalar: `python3 tools/db.py plan` (contrato en `docs/SELECTION_CONTRACT.md`).
