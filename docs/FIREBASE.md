# Firebase: el plan compartido

Proyecto: `ssbu-441b1`. La página es estática; todo lo que se comparte vive en Firestore. Hay **un solo plan global**: cualquiera que abra el enlace puede proponer, cambiar o deshacer, sin cuenta, sin nombre y sin salas. La página abre una sesión anónima automática solo para poder escribir.

| Colección | Qué guarda | Quién escribe | Quién lee |
|---|---|---|---|
| `catalog/{luchador}` + `meta/catalog` | Catálogo (con la lista `vids` de variantes válidas) | `tools/db.py seed --only catalog` (cuenta de servicio; lo hace la Action en cada push) | todos |
| `installed/{luchador}` + `meta/installed` | Inventario por traje (con su nivel de verificación) | `tools/db.py seed --only installed` (**manual**, tras revisarlo) | todos |
| `changes/{luchador}_{traje}` | **El borrador compartido**: una propuesta por traje (`vid`, `by`, `at`) | cualquiera (reglas) | todos |
| `history/{id}` | Registro inmutable de cada cambio (`from`, `to`, `kind`) | cualquiera (solo crear) | todos |
| `status/{vid}` | Resultado de cada instalación | `tools/db.py status` | todos |
| `selection/main` | Modelo anterior (solo lectura; se migra con `db.py migrate`) | nadie | todos |

El inventario y el estado de instalación **no** los puede tocar la web: la edición pública está limitada a `changes` e `history`.

## Hosting: Vercel (GitHub Pages ya no se usa)

La web se publica en **Vercel** (`ssbu-skins.vercel.app`; build `npm run build`, salida `dist`, ver `vercel.json`). Cada rama o PR genera además un despliegue de prueba (`ssbu-skins-<hash>-….vercel.app`): esos dominios **no se pueden autorizar en Firebase** (no admite comodines), así que en ellos la web funciona pero no guarda el plan compartido («Servicio no disponible»). Solo el dominio de producción guarda.

Las Actions de GitHub ya no publican la página: **Sincronizar Firestore** valida el catálogo y lo copia a Firestore; **Configurar Firebase** y **Revisar plan** son manuales.

## Configuración de Firebase: automática o a mano

Lo que hace falta en `ssbu-441b1` (una sola vez): acceso **anónimo** activado, **`ssbu-skins.vercel.app`** entre los dominios autorizados, **reglas** de `firestore.rules` publicadas y el catálogo sembrado.

- **Comprobar (sin secretos):** *Actions → Configurar Firebase → Run workflow → comprobar* (o `python3 tools/firebase_setup.py check`). Intenta lo mismo que un visitante —entrar sin cuenta y leer el catálogo— y dice qué falta.
- **Aplicar:** *Configurar Firebase → aplicar* (o `python3 tools/firebase_setup.py apply`). Usa la cuenta de servicio del secreto `FIREBASE_SERVICE_ACCOUNT` para activar el acceso anónimo, **sumar** los dominios de `data/firebase_setup.json` (nunca quita ninguno) y publicar las reglas. Para que pueda, a esa cuenta de servicio hay que darle en Google Cloud → IAM el rol **Administrador de Firebase** (o los dos: *Administrador de Firebase Authentication* y *Administrador de reglas de seguridad de Firebase*). Si le falta uno, el informe dice cuál; el paso se hace entonces a mano en la consola.
- **Estado conocido:** el secreto existe y escribe en Firestore (ejecución del 2026-10-25 de la Action: `ok · Firestore actualizado: 89 luchadores…`), así que la base existe. Reglas y acceso anónimo no estaban comprobados.

La clave de API web no es un secreto (identifica el proyecto); si la restringes por dominio, incluye `https://ssbu-skins.vercel.app/*`.

## Reglas (resumen)

- `changes/{código}_{traje}`: el id debe coincidir con `code` y `slot` (0–7); `vid` debe existir en `catalog/{código}.vids`; solo los campos `code, slot, vid, by, at`; `by` es el uid de quien escribe y `at` la hora del servidor. Borrar = «volver a lo actual».
- `history`: solo crear (kind `set|clear|undo`), nunca editar ni borrar.
- `catalog`, `installed`, `meta`, `status`, `selection`: solo lectura para la web.
- Límite honesto: al ser público, cualquiera con el enlace puede proponer cualquier apariencia válida; el historial permite revisar y deshacer. Los cambios no instalan nada: el plan se revisa y se instala a mano.

## Sincronización: qué es automático y qué es manual

| Qué | Cómo | Cuándo |
|---|---|---|
| Catálogo (investigación de Grok) | `python3 tools/db.py seed --only catalog` | automático en la Action tras cada push a `master` (si existe el secreto) |
| Inventario (lo instalado) | `python3 tools/db.py seed --only installed` o, en GitHub, *Actions → Publicar página → Run workflow → «Sincronizar también el inventario»* | **solo a mano**, después de revisar `data/installed.json`, `data/inventory_profile.json` y `data/inventory_staged.json` |
| Plan (`changes`), `history`, `status` | nunca los toca ningún `seed` | — |

`seed` exige `--only catalog|installed|all`: sin él no hace nada. Una sincronización de investigación no puede cambiar el inventario ni el plan compartido (lo comprueba `tests/unit/test_seed.py`). Si una apariencia desaparece del catálogo, las propuestas guardadas con su id siguen en `changes` y se muestran como «ya no disponible».

## Estados de sincronización y diagnóstico

El visitante ve un estado breve junto al título; el detalle está en **Más → Estado y diagnóstico** (copiable) y en la consola del navegador con el prefijo `[ssbu-sync]`.

| Lo que se ve | Causa | Qué hacer |
|---|---|---|
| Guardado ✓ / Guardando… | todo bien | — |
| Sin conexión · Pendiente (n) | no hay red (`offline`, `unavailable`, `network-request-failed`) | nada: se envía solo al volver la red |
| Servicio no disponible · No se pudo guardar (n) | **configuración**: autenticación anónima desactivada (`auth/operation-not-allowed`), dominio sin autorizar, API de Firestore sin activar o reglas sin publicar (`permission-denied`) | revisar los pasos de arriba; los cambios quedan en el dispositivo |
| Solo en este dispositivo | la web no tiene configuración de Firebase | — |

Un cambio que las reglas rechazan porque la apariencia ya no existe se descarta con un aviso; uno válido nunca se descarta por un fallo de configuración.

## Cómo evita pisar a otros

Cada traje es un documento aparte, así que editar trajes distintos nunca choca. Para el mismo traje, la web escribe con una transacción que comprueba lo que veía («esperaba X»). Si otra persona cambió ese traje antes, se conserva su opción, se avisa («alguien eligió …») y se ofrece «Usar la mía». Sin conexión, los cambios quedan en una cola local («Pendiente») y se envían al volver la red.

## Probar en local (emuladores)

```bash
npm i -g firebase-tools
JAVA_TOOL_OPTIONS=-Xmx1500m firebase emulators:start --only auth,firestore --project demo-ssbu
pip install google-cloud-firestore
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GOOGLE_CLOUD_PROJECT=ssbu-441b1 python3 tools/db.py seed --only all
python3 -m http.server 8765        # http://localhost:8765/index.html?fbemu  (fbemu solo funciona en localhost)
```

Las pruebas automáticas (`tests/run.sh`, ver `tests/README.md`) hacen todo esto contra `_site`, lo mismo que se publica. **Ninguna toca el proyecto real `ssbu-441b1`**: su estado real (Auth/Firestore habilitados, reglas publicadas, secreto cargado) solo se puede comprobar desde la consola de Firebase o con una ejecución de la Action con credenciales.
