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
| Dominio | `tests/unit/test_domain.mjs` | plan efectivo, filtros, apariencia actual, bloqueo de duplicados y restauración de filtros (`node --test`) |
| Datos | `tests/unit/test_catalog.py` | totales del catálogo ampliado (89 luchadores · 1245 activas = 696 + 549 · 16 retiradas · 1224 mods), identificadores persistentes (no cambian al reordenar ni renombrar; un id publicado no puede desaparecer), campos `role/variant/audit_scope/downloads_scope/images_scope`, retratos, inventario del perfil |
| Sincronización | `tests/unit/test_seed.py` (emulador) | `seed --only catalog` e `--only installed` son independientes; ningún `seed` toca `changes`, `history` ni `status`; los campos de investigación llegan a Firestore |
| Recorridos | `tests/e2e/*.js` (Playwright + emuladores) | selector de ocho trajes, propuesta y reemplazo, foco durante un snapshot, galería, Atrás, exportación, datos incompletos, anchos, choques y cola sin conexión, reglas de seguridad, retratos, inventario, selecciones antiguas y errores de configuración |
| Capturas | `tests/e2e/visual.spec.js` | comparación de píxeles en Chromium sobre Linux. En macOS no se generan. Para actualizar la línea base: la Action «Capturas» (`workflow_dispatch`) |
| WebKit | `tests/webkit/` (Selenium + WebKitWebDriver) | barra inferior, menú, cabecera, aviso y contenido en 8 configuraciones: barras de Safari expandidas/contraídas, pantalla pequeña, horizontal con muesca, texto 130 % y 170 %, teclado abierto, tableta |

## Qué es y qué no es cada prueba
- **Emulado:** Chromium con emulación de móvil (no es un teléfono), emuladores locales de Auth y Firestore (no el proyecto `ssbu-441b1`).
- **WebKit:** es el motor WebKit real (WebKitGTK), **no Safari de iOS**. No reproduce la barra de herramientas dinámica, el teclado ni las áreas seguras reales de iOS: se simulan con un `<iframe>` del tamaño visible, las variables `--sat/--sab/--sal/--sar` y el escalado del tamaño de fuente. Sirve para detectar recortes y solapes por dimensiones; no sustituye una revisión en un iPhone.
- **Firebase real:** nada de esto toca el proyecto real. Ver `docs/FIREBASE.md` para lo que falta configurar y cómo comprobarlo.
