# Pruebas

Todo se ejecuta contra **`_site`**, la carpeta que genera `tools/make_site.py` y que publica la Action (`index.html`, `installed/`, `assets/`): lo
que se prueba es lo que se sirve. Solo se sustituyen los CDN externos (SDK de Firebase 10.14.1 de gstatic y PhotoSwipe 5.4.4 de jsdelivr) por copias locales
de **las mismas versiones fijadas** (`tests/package.json`).

```bash
pip install -r tests/requirements.txt
tests/run.sh                 # valida el catálogo, genera la web, levanta los emuladores y lanza todo
tests/run.sh --sin-webkit    # sin la auditoría de WebKit
```

| Capa | Dónde | Qué comprueba |
|---|---|---|
| Datos | `tests/unit/test_catalog.py` | recuentos derivados de registros y contrastados con counts/coverage; activas y retiradas separadas; identificadores históricos, roles y campos conservados, original_refs y procedencia de retratos, inventario del perfil |
| Orden de eventos | `tests/unit/sync_ordering.js`, `tests/e2e/ack-transition.js` | commit antes/después del listener, snapshots antiguas/intermedias, edición remota más reciente, retirada de PEND y continuidad de Actual/Propuesta; la prueba E2E usa transacciones reales y retrasa solo la entrega de snapshots |
| Sincronización | `tests/unit/test_seed.py` (emulador) | `seed --only catalog` e `--only installed` son independientes; ningún `seed` toca `changes`, `history` ni `status`; los campos de investigación llegan a Firestore |
| Recorridos | `tests/e2e/*.js` (Playwright + emuladores) | buscar luchador, «Cambiar», elegir, ver desde otra sesión, deshacer, choques y cola sin conexión, reglas de seguridad, retratos de luchadores, inventario, galería, Atrás/filtros/desplazamiento, accesibilidad, imágenes caídas, selecciones antiguas, exportación, errores de configuración/autenticación/permisos frente a red |
| Interacción WebKit | `tests/e2e/webkit-journeys.js` | recorridos reales de reconocimiento, elegir/recargar/deshacer, Atrás de cabecera y navegador, búsqueda rápida, filtros con render en vivo, foco visible, miniaturas, fallback de originales y galería durante apertura; Firebase bloqueado |
| Dimensiones WebKit | `tests/webkit/` (Selenium + WebKitWebDriver) | auditoría adicional de dimensiones en 8 configuraciones; no sustituye la suite de interacción |

## Qué es y qué no es cada prueba
- **Emulado:** Chromium con emulación de móvil (no es un teléfono), emuladores locales de Auth y Firestore (no el proyecto `ssbu-441b1`).
- **WebKit:** es el motor WebKit real (WebKitGTK), **no Safari de iOS**. No reproduce la barra de herramientas dinámica, el teclado ni las áreas seguras reales de iOS: se simulan con un `<iframe>` del tamaño visible, las variables `--sat/--sab/--sal/--sar` y el escalado del tamaño de fuente. Sirve para detectar recortes y solapes por dimensiones; no sustituye una revisión en un iPhone.
- **Firebase real:** nada de esto toca el proyecto real. Ver `docs/FIREBASE.md` para lo que falta configurar y cómo comprobarlo.

La candidata combina la cadena de Grok hasta #6 (blob de catálogo `43ad4bdcbadfffbdb03443fae21f88cfc1e964ad`): **1235 activas = 696 principales + 539 alternativas**, **15 retiradas**, **1250 IDs**. Son los resultados de esta revisión, no constantes que futuras actualizaciones deban conservar. `data/ids.lock.json` conserva la historia: una retirada debe seguir resolviendo su ID.

CI instala Chromium y WebKit de la versión fijada y ejecuta ambas suites de interacción. Para correr solo la de WebKit sobre `_site`: `node tests/e2e/webkit-journeys.js`. En entornos con navegadores del sistema se admiten `CHROMIUM_EXECUTABLE_PATH` y `WEBKIT_EXECUTABLE_PATH`; no desactivan TLS. Los fixtures de imágenes comprueban proporciones, carga/error/reintento y contrato de URL/procedencia; no prueban el contenido ni la disponibilidad actual de Nintendo o GameBanana. Los 12 retratos DLC sin archivo local usan las URLs oficiales verificadas de original_refs, conservadas con su fuente; consultar `assets/fighters/README.md`.

La suite rechaza reutilizar un servicio ya presente en8080 y detiene solo el emulador que inició. Las pruebas de seed usan el proyecto de emulador separado `ssbu-seed-tests`. Ningún valor secreto es necesario.
