# Plan de rediseño: la web de `ssbu-skins` con el diseño del tablero «En la tarjeta»

> **Superado en parte (2026-11-07):** las secciones 4 a 7 (diseño, variantes, pasos) las reemplaza
> [`PLAN-PANTALLA-UNICA.md`](PLAN-PANTALLA-UNICA.md). Las reglas (sección 3) y los comandos (sección 9) siguen vigentes.

Documento para entregar a otro modelo. Es autocontenido: léelo entero, luego `AGENTS.md` de este repo y el del ModPack
(`../Gian-Ultimate-Modpack-private/AGENTS.md`). Idioma de código visible y textos: español. Escrito el 2026-11-06.

## 1. Objetivo

Gian hizo dos webs para sus skins de Smash Ultimate:

- **A, esta app** (`ssbu-skins`: Vue 3 + Quasar + Vite, datos en Firestore, desplegada en Vercel, https://ssbu-skins.vercel.app).
  Su propósito: que **amigos** (sesión anónima) elijan skins o propongan cambios y que **Gian** las vea después.
- **B, el tablero de la SD** (`../Gian-Ultimate-Modpack-private/tools/sd_board.py` + `tools/sd_board_ui/`, «En la tarjeta»).
  Servidor Python local con una UI en JS plano + Tailwind. **Es el diseño que a Gian le gusta** para ver luchadores y
  acciones.

**Tarea:** llevar a la app Vue (A) el diseño y la funcionalidad de visualización de B, y conservar de A lo que ya
resuelve (Firestore, propuestas de amigos, componentes buenos). Al final hay **una sola web**, la de Vercel, que lee
Firestore. B queda como respaldo local, no como segunda UI a mantener.

No es un rediseño desde cero ni un cambio de arquitectura: los datos ya están al día y el flujo de sincronización ya existe.

## 2. Lo que ya está hecho (no lo rehagas)

- Datos al día con la SD del 2026-11-05 (341 carpetas, `MATCH`): `data/slot_plan.json`, `data/inventory_profile.json`,
  `data/drive.json`, `data/sd_portraits.json`. Firestore (`catalog`, `installed`, `drive`, `slot_plan`) es idéntico al repo.
- Retratos de la SD en Cloudinary (449; `ssbu/portraits/<sha256>`), mapa en `data/sd_portraits.json` y
  `public/sd-portraits.json`. URLs en `src/features/board/portrait.ts` (`portraitUrl(sha)`, `previewUrl(publicId)`).
- **`tools/sync_sd.py`**: un comando que verifica `MATCH`, alinea el plan, reescanea y con `--apply` sube a Cloudinary y
  Firestore. Léelo antes de tocar datos. No lo reemplaces ni lo dupliques.
- `master` pasa «Pruebas» (90 tests unitarios + 100 comprobaciones e2e en CI) y despliega solo en Vercel al hacer push.

## 3. Reglas que no se negocian

Vienen de los `AGENTS.md`; resumidas aquí porque cambian el diseño:

1. **Nunca toques la SD ni `ultimate/mods`.** Esta tarea es solo web. Las skins entran por catálogo/perfil → paquete → SD.
2. **La web no escribe el estado real.** `catalog`, `installed`, `drive`, `slot_plan`, `meta`, `status` son de solo
   lectura para el cliente (`firestore.rules`). El cliente solo escribe `changes`, `requests` e `history`. No cambies
   las reglas para abrir más escritura.
3. **Variantes.** Una publicación (`mod_id`) puede traer varios looks. No des por instaladas todas las variantes porque
   coincida el id. Una elección debe identificar **archivo/origen y destino** (`<vid>:<md5 corto>:<cNN>`, como valida
   `okVariant` en las reglas), no solo el id general. La imagen debe ser la de **esa** variante; si no hay un retrato
   fiable, muestra «sin retrato». **Nunca** sustituyas por una imagen ajena. Si la web aún no puede elegir variante,
   dilo en la UI, no lo simules.
4. **Numeración de Gian:** su color 1 es `c00` y su color 8 es `c07`. En pantalla se muestra «Traje N» (1 a 8) y en
   datos `cNN`/índice 0 a 7. No mezcles.
5. **No declares nada probado en consola.** Esa prueba la hace Gian. Conserva los textos de verificación existentes
   («Perfil armado y verificado en archivos; sin prueba en consola anotada.»).
6. **No cruces familias de colores** ni propongas destinos incompatibles (lista en `AGENTS.md` del ModPack,
   «Lecciones técnicas»). La web no instala, pero no debe sugerirlo.
7. Aplica las instrucciones globales del usuario si tu entorno las trae (flujo de desarrollo, estilo TS/Vue y calidad
   visual). Si no las tienes, sigue el estilo de los archivos vecinos.

## 4. Qué tiene el diseño de B (fuente: `tools/sd_board_ui/`)

Archivos: `index.html` (72 líneas), `app.js` (1297 líneas, sin framework), `src/input.css` (Tailwind v4, `@theme`),
`fonts/` (Schibsted Grotesk variable, latin y latin-ext), `e2e/journey.cjs` y `states.cjs`. El servidor está en
`../Gian-Ultimate-Modpack-private/tools/sd_board.py` (1094 líneas: `scan`, `Board.payload`, `Board.propose`, `/api/*`).

**Tokens (de `src/input.css`, `@theme`):**
`--font-sans` Schibsted Grotesk · `bg #101114` · `surface #181a1f` · `raise #1f2229` · `line #343840` · `edge #666f7e` ·
`stage #24272d` · `ink #f3f4f6` · `mute #b4bbc7` · `dim #8b929e` · `pend #b8a4ff` (sobre `pendbg #292337`) ·
`actual #8fd9b6` (sobre `actualbg #182b24`) · `risk #e08a7a` · easing `cubic-bezier(0.16, 1, 0.3, 1)`.
Tema oscuro. Lee `src/input.css` completo para espaciados, radios, foco y movimiento.

**Funcionalidad a replicar** (nombres de función en `app.js` como pista):
- Búsqueda y filtros (`renderFilters`), contadores (`renderCounts`), densidad Ampliar/Compactar (`#density`).
- Colección en mosaico: por luchador, sus **8 trajes** a la vez (`renderSection`, `renderRail`).
- Elegir variante de un mod antes de elegir el traje (`openSelectionDialog`, `renderVariantsDialog`, `variantTile`,
  `variantName`, `variantNumber`, `chooseInitialVariant`, `findTwinVariant`).
- Comparar lo actual contra lo propuesto («actual» en verde, «pendiente» en violeta).
- Cola «Cambios · N» con deshacer (`renderSummary`, `/api/undo`).
- Estados vacíos y de carga (`e2e/states.cjs` los recorre).
- Accesibilidad: foco visible, diálogos nativos (`<dialog>`), navegación por teclado, objetivos táctiles amplios.

**Para verlo corriendo** (la SD no hace falta montada para ver la UI con datos de cache; con ella se ve lo real):
`cd ../Gian-Ultimate-Modpack-private && python3 tools/sd_board.py` (mira `--help` para puerto y `--no-open`).
Hazle capturas con Playwright antes de empezar y úsalas como referencia visual.

## 5. Qué tiene A y hay que conservar (fuente: `src/`)

- **Datos y sincronización:** `src/features/plan/services/sync.ts` (suscripciones a `catalog`, `installed`, `slot_plan`,
  `status`, `changes`, `history`, `requests`; auth anónima; cola sin conexión; `mergeChanges`, `confirmPlan`),
  `usePlan.ts`, `helpers/lookup.ts`, `saveStatus.ts`. **No cambies este contrato**: los e2e lo ejercitan.
- **Dominio:** `src/shared/helpers/domain.ts`, `skins.ts`, `ssbu.ts` (espejo de `tools/domain.js`). `curOf(code, n)`
  decide `kind` = `original` | `mod` | `pending` | `unknown`.
- **Componentes reutilizables** (revisa cada uno; adáptalos al diseño nuevo en lugar de reescribirlos):
  `features/fighters/components/` (`SkinGrid`, `OutfitStrip`, `CompareCards`, `Destinations`, `SkinSheet`,
  `SummarySheet`), `features/explore/components/` (`ExploreBar`, `FighterPickSheet`) con `useGridDensity`,
  `features/gallery/` (PhotoSwipe), `features/board/` (`useBoard.ts`, `portrait.ts`), `components/AppImg.vue`,
  `layouts/AppShell.vue`.
- Páginas: `FightersPage`, `FighterPage`, `CatalogPage`, `InstalledPage`, `NotesPage`, `BoardPage`.

Hoy A usa Quasar y su `quasar-variables.sass`. Decide en el paso 1 del plan si el diseño nuevo se hace con los tokens de B
sobre Quasar o con Tailwind; **recomendación:** conservar Quasar solo para lo que ya resuelve bien (diálogos, hojas,
foco) y mover color, tipografía y espaciado a variables CSS con los tokens de B. Evita meter dos sistemas de estilos
que peleen.

## 6. Hueco funcional: variantes

La selección de variantes **no está en `master`**. Vive en la rama local `feat/variant-inspector` (9 commits, ~34 000
líneas, nunca subida ni revisada; salió de `master` antes del trabajo de datos). Toca `tools/` (inspección de variantes
en copia local de los archivos del Drive), `src/features/plan` (la propuesta lleva `variant`) y `tools/review_plan.py`.
Antes del paso 3 hay que decidir con Gian:

- **Opción 1 (recomendada):** revisar esa rama, rebasarla sobre `master`, correr tests y e2e, y fusionarla *antes* del
  rediseño, porque la UI de variantes depende de ella.
- **Opción 2:** rediseñar sin selección de variante y mostrarlo así en la UI («Variantes: aún no disponibles»).

No fusiones la rama sin correr los e2e: nunca se probó en CI.

## 7. Pasos

1. **Referencia.** Levanta B, captura cada pantalla y estado (inicio, mosaico, diálogo de variantes, comparar, cola,
   vacío, error, móvil 390 px, tablet, escritorio, `prefers-reduced-motion`, foco por teclado). Levanta A con
   `npm run dev` y captura lo mismo. Haz una tabla «B tiene / A tiene / decisión».
2. **Tokens y base.** Variables CSS con los tokens de B, tipografía Schibsted Grotesk (copia los `.woff2` de
   `sd_board_ui/fonts/` a `public/` y referencia con `@font-face`; sin CDN nuevo), tema oscuro, foco visible,
   `AppShell` nuevo.
3. **Mosaico de luchadores y 8 trajes** (`FightersPage`, `FighterPage`, `SkinGrid`, `OutfitStrip`): densidad
   Ampliar/Compactar, búsqueda, filtros, contadores. Retratos por `portraitUrl(sha)` con la imagen de **esa**
   variante o «sin retrato».
4. **Elegir y comparar** (`SkinSheet`, `CompareCards`, `Destinations`): actual (verde) contra pendiente (violeta);
   variante si la opción 1 de la sección 6 está hecha.
5. **Cola «Cambios · N»** y deshacer sobre `usePlan`/`sync.ts`, sin tocar su contrato.
6. **Vista de Gian para propuestas de amigos.** Hoy `changes` se mezcla con el plan. Añade una sección que las separe:
   autor anónimo (corto), fecha (`at`), luchador, traje, variante y estado (nueva, vista). Solo lectura: aceptar una
   propuesta es trabajo de Gian en catálogo/perfil con commit (flujo del `AGENTS.md`), nunca una escritura de la web
   al estado real.
7. **Limpieza.** Quita estilos y componentes que ya no se usen. No borres `dist/`, `_site/` ni nada de Firestore.
8. **Pruebas.** Actualiza los e2e (`tests/e2e/*.js`) a los selectores nuevos sin bajar su cobertura; los ejemplos que
   usen colores de la SD deben seguir siendo válidos (en `tests/e2e/identity.js` ya se usa Daisy 2 como original y
   Daisy 3 como pendiente). Las capturas de `visual.spec.js` solo se generan en Linux: regenéralas con la Action
   «Capturas» (`snapshots.yml`, `workflow_dispatch`), no en macOS.
9. **Entrega.** Rama aparte → PR → «Pruebas» en verde → fusión en `master` (Vercel despliega solo). Mide Lighthouse
   móvil antes y después.

## 8. Criterios de aceptación

- Paridad visual y de funciones con B (sección 4), comprobada con capturas lado a lado en 390, 768 y 1280 px.
- Las 100 comprobaciones e2e y los 90 tests unitarios pasan. Sin regresión de accesibilidad: contraste AA, foco visible, teclado
  completo, `prefers-reduced-motion` respetado, objetivos táctiles de 44 px.
- Ninguna imagen ajena sustituye a una variante; ninguna afirmación de «probado en consola».
- Firestore sin cambios de esquema ni de reglas. `tools/sync_sd.py` sigue funcionando sin cambios.
- Rendimiento: LCP de la vista de luchador por debajo de 2.5 s en móvil simulado; las imágenes salen de Cloudinary con
  `f_auto,q_auto` y `loading="lazy"` fuera de pantalla.
- La web de Vercel funciona con la SD **desmontada** y sin el servidor Python (todo viene de Firestore).

## 9. Comandos útiles

```bash
cd ~/Desktop/ssbu/ssbu-skins
npm run dev                                   # app Vue en local (regenera public/boot.js antes)
npm run build                                 # lo que corre Vercel
npm run typecheck                             # vue-tsc
python3 -m unittest discover -s tests/unit -p 'test_*.py'    # 90 tests, sin emuladores
tests/run.sh --sin-webkit                     # e2e completos con emuladores locales (sin credenciales; proyecto demo-ssbu)
python3 tools/sync_sd.py --package <paquete>/ultimate/mods   # sincronizar datos (dry-run); --apply para publicar
gh run list --limit 5                          # estado de «Pruebas» y «Sincronizar Firestore» tras un push
```

**Para probar no hace falta ninguna credencial ni cuenta de Firebase.** Los e2e usan los emuladores locales de Auth y
Firestore con el proyecto falso `demo-ssbu` (nunca tocan `ssbu-441b1`). Requisitos que se vieron en la Mac de Gian el
2026-11-06: Node 20+ (hay 24), Java 17 (Zulu 17), `tests/node_modules/.bin/firebase` (firebase-tools 13.35.1, local, no
global), Chromium de Playwright y Pillow. Si falta algo: `cd tests && npm ci && npx playwright install chromium`.
**No se ha confirmado una corrida completa de `tests/run.sh` en local** (el primer intento falló en `npm ci`, ver abajo):
si falla, apóyate en la Action «Pruebas». Los tests de WebKit y las capturas (`visual.spec.js`) solo corren en Linux.
Ojo: `run.sh` ejecuta `npm ci` en `tests/` y en la raíz, que **borra `node_modules` antes de reinstalar**. No lo lances
mientras otro proceso (otro agente, `npm run dev`, Playwright) use esas carpetas.

**Solo hacen falta credenciales para publicar datos** (no para el rediseño, que no debería publicar):
Firestore con `GOOGLE_APPLICATION_CREDENTIALS=~/.secrets/ssbu-441b1.json` y `.venv/bin/python` (tiene
`google-cloud-firestore`); Cloudinary en `../Gian-Ultimate-Modpack-private/.env.local`. No las imprimas ni las commitees.
Si no puedes correr los e2e en local, apóyate en la Action «Pruebas» de GitHub y dilo en el PR.

## 10. Qué no hacer

- No pasar el servidor de B a FastAPI ni añadir dependencias de Python al ModPack (es solo stdlib).
- No portar B tal cual (JS plano de 1300 líneas): se reimplementa sobre los componentes Vue.
- No tocar `ultimate/`, la SD, `catalog/`, `profiles.json` ni los assets de `~/Documents/smash-mod-assets`.
- No escribir en `catalog`, `installed`, `drive`, `slot_plan` desde el cliente ni ampliar las reglas.
- No fusionar `feat/variant-inspector` sin revisión y e2e.
- No borrar `dist/`, `_site/` ni los ZIP o paquetes de Drive.
- No dejar `AGENTS.md` de este repo con los cambios sin commitear que arrastra: pregunta a Gian qué hacer con ellos.

## 11. Decisiones que le tocan a Gian

1. Fusionar o no `feat/variant-inspector` antes del rediseño (sección 6).
2. Quasar + tokens de B, o Tailwind (sección 5).
3. Si el modo claro importa (B es solo oscuro).
4. Qué hacer con el `AGENTS.md` de `ssbu-skins` con cambios sin commitear.
