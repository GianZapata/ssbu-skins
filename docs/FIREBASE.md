# Firebase: el plan compartido

Proyecto: `ssbu-441b1`. La página es estática; todo lo que se comparte vive en Firestore. Hay **un solo plan global**: cualquiera que abra el enlace puede proponer, cambiar o deshacer, sin cuenta, sin nombre y sin salas. La página abre una sesión anónima automática solo para poder escribir.

| Colección | Qué guarda | Quién escribe | Quién lee |
|---|---|---|---|
| `catalog/{luchador}` + `meta/catalog` | Catálogo (con la lista `vids` de variantes válidas) | `tools/db.py seed` (cuenta de servicio) | todos |
| `installed/{luchador}` + `meta/installed` | Inventario por traje (con su nivel de verificación) | `tools/db.py seed` | todos |
| `changes/{luchador}_{traje}` | **El borrador compartido**: una propuesta por traje (`vid`, `by`, `at`) | cualquiera (reglas) | todos |
| `history/{id}` | Registro inmutable de cada cambio (`from`, `to`, `kind`) | cualquiera (solo crear) | todos |
| `status/{vid}` | Resultado de cada instalación | `tools/db.py status` | todos |
| `selection/main` | Modelo anterior (solo lectura; se migra con `db.py migrate`) | nadie | todos |

El inventario y el estado de instalación **no** los puede tocar la web: la edición pública está limitada a `changes` e `history`.

## Pendiente de configurar fuera del repositorio (una sola vez)

Mientras no se haga, la página funciona con la copia incrustada y guarda el plan en el dispositivo («Solo en este dispositivo» / «Sin conexión»).

1. **Authentication → Sign-in method → habilitar «Anónimo»** y, en *Settings → Authorized domains*, añadir `gianzapata.github.io`. (Estado al escribir esto: Auth y la API de Firestore **no** están habilitados en `ssbu-441b1`.)
2. **Firestore Database → Crear base de datos** (modo producción).
3. **Publicar las reglas** de `firestore.rules` (consola → Reglas, o `firebase deploy --only firestore:rules`).
4. **Cuenta de servicio** para sembrar y exportar: *Configuración del proyecto → Cuentas de servicio → Generar clave privada*. Guárdala como secreto `FIREBASE_SERVICE_ACCOUNT` del repositorio (la Action siembra en cada push) o úsala en local con `GOOGLE_APPLICATION_CREDENTIALS`. No subas la clave.
5. Primera carga: `python3 tools/db.py seed`. El plan nunca se inicializa solo con selecciones antiguas de un navegador; si hace falta pasar la selección antigua de Firestore, ejecuta `python3 tools/db.py migrate` (explícito e idempotente).
6. Recomendado: restringir la clave de API web a `https://gianzapata.github.io/*` y, si se quiere, activar App Check.

## Reglas (resumen)

- `changes/{código}_{traje}`: el id debe coincidir con `code` y `slot` (0–7); `vid` debe existir en `catalog/{código}.vids`; solo los campos `code, slot, vid, by, at`; `by` es el uid de quien escribe y `at` la hora del servidor. Borrar = «volver a lo actual».
- `history`: solo crear (kind `set|clear|undo`), nunca editar ni borrar.
- `catalog`, `installed`, `meta`, `status`, `selection`: solo lectura para la web.
- Límite honesto: al ser público, cualquiera con el enlace puede proponer cualquier apariencia válida; el historial permite revisar y deshacer. Los cambios no instalan nada: el plan se revisa y se instala a mano.

## Cómo evita pisar a otros

Cada traje es un documento aparte, así que editar trajes distintos nunca choca. Para el mismo traje, la web escribe con una transacción que comprueba lo que veía («esperaba X»). Si otra persona cambió ese traje antes, se conserva su opción, se avisa («alguien eligió …») y se ofrece «Usar la mía». Sin conexión, los cambios quedan en una cola local («Pendiente») y se envían al volver la red.

## Probar en local (emuladores)

```bash
npm i -g firebase-tools
JAVA_TOOL_OPTIONS=-Xmx1500m firebase emulators:start --only auth,firestore --project demo-ssbu
pip install google-cloud-firestore
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GOOGLE_CLOUD_PROJECT=ssbu-441b1 python3 tools/db.py seed
python3 -m http.server 8765        # http://localhost:8765/index.html?fbemu  (fbemu solo funciona en localhost)
```
