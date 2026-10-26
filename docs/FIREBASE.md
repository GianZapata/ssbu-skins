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

## Estado comprobado del proyecto real (`ssbu-441b1`)

Lo único que se ha podido comprobar de verdad es lo que dice el historial de la Action *Publicar página*:

- **Comprobado** (ejecución 40238983640, 2026-10-25 22:11 UTC, `workflow_dispatch` sobre `1bd34f5`): el secreto `FIREBASE_SERVICE_ACCOUNT` existe y es válido; el paso «Sincronizar el catálogo con Firestore» **se ejecutó** (no se omitió) y terminó con `ok · Firestore actualizado: 89 luchadores, inventario de 83 luchadores`. Es decir, la base de datos Firestore existe y la cuenta de servicio puede escribir en ella. Esa ejecución usó el `seed` antiguo (catálogo **e** inventario, ambos de la versión publicada de `master`: 697 apariencias y el inventario anterior).
- **No comprobado** desde aquí (hace falta la consola de Firebase o abrir la web publicada): que las **reglas de `firestore.rules` estén publicadas**, que la **autenticación anónima** esté habilitada y que `gianzapata.github.io` esté en los dominios autorizados. Si falta alguno, la web lo muestra como «Servicio no disponible» y deja el detalle en *Más → Estado y diagnóstico* (el cambio no se pierde: queda en el dispositivo).
- Al fusionar esta rama, la Action sincroniza **solo el catálogo** (1225 apariencias). El inventario que hay hoy en Firestore es el anterior (sin el perfil `gian-sin-musica`) hasta que alguien ejecute la sincronización manual del inventario (ver más arriba).

## Pendiente de configurar fuera del repositorio (una sola vez)

Mientras no se haga, la página funciona con la copia incrustada y guarda el plan en el dispositivo («Solo en este dispositivo» / «Sin conexión»).

1. **Authentication → Sign-in method → habilitar «Anónimo»** y, en *Settings → Authorized domains*, añadir `gianzapata.github.io`. 
2. **Firestore Database → Crear base de datos** (modo producción).
3. **Publicar las reglas** de `firestore.rules` (consola → Reglas, o `firebase deploy --only firestore:rules`).
4. **Cuenta de servicio** para sembrar y exportar: *Configuración del proyecto → Cuentas de servicio → Generar clave privada*. Guárdala como secreto `FIREBASE_SERVICE_ACCOUNT` del repositorio (la Action siembra en cada push) o úsala en local con `GOOGLE_APPLICATION_CREDENTIALS`. No subas la clave.
5. Primera carga: `python3 tools/db.py seed --only all` (catálogo + inventario; después el catálogo se sincroniza solo y el inventario solo a mano). El plan nunca se inicializa solo con selecciones antiguas de un navegador; si hace falta pasar la selección antigua de Firestore, ejecuta `python3 tools/db.py migrate` (explícito e idempotente).
6. Recomendado: restringir la clave de API web a `https://gianzapata.github.io/*` y, si se quiere, activar App Check.

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
