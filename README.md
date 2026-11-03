# ssbu-skins

Catálogo de uso personal de candidatos de skins para Super Smash Bros. Ultimate (Smash 13.0.5 / ARCropolis 4.1.1).

Los estados Wi-Fi safe son los estados de evidencia registrados en el catálogo, no afirmaciones probadas en consola. Cada mod enlaza a su página original en GameBanana y a su autor.

## Regenerar

```bash
npm run build
```

Vite y Tailwind arman `dist/` (y `_site/` si después se corre `python3 tools/make_site.py`). Python solo prepara el catálogo (`tools/export_boot.py`; Pillow únicamente si existe `thumbs/`). `npm run dev` abre la página en local. La web se publica en Vercel (`ssbu-skins.vercel.app`): el build es `npm run build` y el directorio publicado es `dist`. GitHub Pages ya no se usa.

Antes de generar, `python3 tools/validate_catalog.py` comprueba que el catálogo cumple `docs/AUDIT_CONTRACT.md`. `python3 tools/db.py seed --only catalog` sincroniza el catálogo con Firestore (lo hace la Action *Sincronizar Firestore* con el secreto `FIREBASE_SERVICE_ACCOUNT`); el inventario solo se sincroniza a mano con `--only installed` (ver `docs/FIREBASE.md`). Los retratos de los luchadores salen de `assets/fighters/` (`tools/build_portraits.py`). Pruebas: `tests/run.sh` (ver `tests/README.md`).

No subir `node_modules/`, binarios ni CSS compilado al repo: el historial no se puede aligerar sin reescribirlo.

Mods descargados en el Drive: `python3 tools/scan_drive.py <ruta de SSBU_mods>` escribe `data/drive.json` (archivos, MD5 y slots; los binarios no se versionan). Flujo y respaldos: `docs/DRIVE.md`.

Inventario de lo instalado: `python3 tools/scan_installed.py <ruta del ModPack>` (rama principal) y `python3 tools/scan_branches.py <ruta del ModPack>` (ramas sin fusionar) escriben `data/installed.json`, `data/inventory_staged.json` y los retratos en `installed/*.webp`; `python3 tools/scan_profile.py <ruta del ModPack>` calcula la capa del perfil (composición efectiva y exclusiones) en `data/inventory_profile.json`. La página muestra cada nivel con su verificación (nunca como confirmado en la consola).

## Base de datos y amigos (Firebase)

La página tiene tres secciones —**Luchadores**, **Catálogo** y **Cambios**. La orden es el plan de slots; `python3 tools/db.py plan` la imprime; las propuestas viven en `changes` y no instalan. En un luchador se elige uno de los ocho trajes, se compara la apariencia del inventario con una propuesta y se agrega al plan (sesión anónima automática, historial y «Deshacer»). Guardar una propuesta no la instala en la consola. El inventario y el estado de instalación no se pueden editar desde la web. Configuración y reglas: `docs/FIREBASE.md` (contrato en `docs/SELECTION_CONTRACT.md`).

Antes de instalar: `python3 tools/review_plan.py` (o la Action *Revisar plan*) revisa la orden de Git y avisa de inconsistencias sin instalar nada; ver `docs/SELECTION_CONTRACT.md`.

Configurar o comprobar Firebase (acceso anónimo, dominio de Vercel, reglas): `python3 tools/firebase_setup.py check|apply` o la Action *Configurar Firebase*; ver `docs/FIREBASE.md`.
