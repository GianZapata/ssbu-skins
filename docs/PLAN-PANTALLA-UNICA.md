# Pantalla única para elegir y proponer skins (`ssbu-skins`)

Clasificación: Feature grande → policy → brainstorming + grill (hecho) → writing-plans → Build.
Superficie: producto operativo → principal `interface-design`, con `impeccable`; apoyo único `accessibility`.

## Contexto

Con las Etapas 1–3 (#46–#48), la ficha del luchador ya junta trajes, comparación y skins, pero la app sigue organizada
como inventario: lista de Luchadores con 8 miniaturas por luchador, ficha con los mismos 8 trajes más grandes, panel
Actual/Nueva fijo, Catálogo como página aparte y varias capas de texto en cada traje (Perfil, Pack base, Plan de Gian,
Sin nombre, «8 en tu perfil…»). Gian quiere centrarla en la tarea principal: **ver las skins descargadas, previsualizarlas
con su variante, elegir el traje destino y proponer el reemplazo**, en una sola pantalla mobile-first, con atajos de
navegación y solo «Original» y «Mod» como texto de estado. Las variantes existen pero viven sin fusionar en
`feat/variant-inspector`. La web no conoce las familias de colores. Las propuestas no dicen quién las hizo.

## Decisiones de Gian (grill del 2026-11-07)

| Tema | Decisión |
|---|---|
| «Reemplazar» | Guarda una **propuesta** en `changes` (no instala; la SD sigue con su flujo) |
| «Descargar» | Las skins del Drive salen primero, listas para elegir; las demás llevan enlace a la página del mod |
| Variantes | PR previo que rescata de `feat/variant-inspector` solo herramienta + datos + contrato; la UI de variantes se hace nueva |
| «Otro color» | Mover la misma skin a otro traje (`user_destination`) |
| Familias | La web solo ofrece trajes de la misma familia que el slot nativo de la variante; los demás, deshabilitados |
| Pantalla | Un luchador a la vez: barra fija + fila de 8 trajes fija + rejilla de skins. Se quitan Luchadores y Catálogo |
| Preview | Hoja inferior en móvil, panel lateral en escritorio |
| Estados | Texto visible solo «Original» / «Mod». Propuesta y plan: borde violeta + miniatura, sin rótulo (con nombre accesible) |
| Atajos | Volver arriba, ◀ ▶ entre luchadores (y ← → en escritorio), selector con búsqueda y caras (`/`), deslizar entre luchadores |
| Autor | Al entrar sin nombre guardado, elegir **Gian, Alan, Ches o Samu** (localStorage) |
| Choques | **Una propuesta por persona y traje**; Gian ve todas y decide |
| Alcance | Incluye la vista de propuestas de amigos dentro de la hoja «Cambios» |

## Entregas (una rama y un PR por fase, en este orden)

### Fase 1: Variantes (datos y contrato)

Rescatar de `feat/variant-inspector` sobre `master` actual: `tools/inspect_variants.py`, `data/variants/*.json`,
`tools/board_public.py` y `public/drive-alts.json` si los consume la web, propuesta con `variant` en
`src/features/plan/services/sync.ts`, `usePlan.ts`, `shared/helpers/domain.ts`, `ssbu.ts`, `review_plan.py`, `db.py`,
`firestore.rules` (`okVariant`, formato `<vid>:<md5 corto>:<cNN>`), `docs/SELECTION_CONTRACT.md` y sus tests.
Se descartan `BoardPage.vue`, `useBoard.ts` y `tests/e2e/journeys.js`, que ya no existen en `master`. Se rehacen
a mano los conflictos de `SummarySheet.vue`, `domain.ts` y `local.spec.js`.

### Fase 2: Familias de colores

- Nuevo `tools/export_families.py` (stdlib): lee el `dir_info_with_files_trimmed.json` del juego
  (`~/Documents/smash-mod-assets/tools-data/reslotter/a853c3d09181/`, pasado como `--vanilla-files`) y agrupa los
  `cNN` de cada luchador por conjunto igual de archivos de `model/body`. Sigue la idea de `model_slot_files` en
  `Gian-Ultimate-Modpack-private/tools/gianpack.py:780`. Escribe `data/families.json`, que se versiona porque es
  pequeño.
- `tools/export_boot.py` lo incluye en `boot.js`. Helper `sameFamily(code, from, to)` en `shared/helpers/ssbu.ts`.
- `review_plan.py`: ⛔ si el destino cruza de familia respecto del slot nativo de la variante.
- Tests: familias conocidas (Cloud pares/impares, Sephiroth c00–c05/c06–c07, Bowser Jr. por Koopaling, ZSS c07,
  Sora c01/c05).

### Fase 3: Propuestas por persona

- `src/features/plan/` y un composable `usePerson`: nombre de la persona en localStorage (`try/catch`). Sin nombre,
  una hoja inicial con los 4 botones antes de poder proponer.
- `changes/{code}_{slot}_{name}` con campo `name`. `history` también guarda `name`. En `firestore.rules`, el id debe
  coincidir con `code`, `slot` y `name`, y `name` debe ser uno de los 4. No se abre escritura a otras colecciones.
- `sync.ts`: `mergeChanges` y la cola sin conexión pasan a usar el id completo. El estado de un traje junta las
  propuestas de todas las personas.
- Las propuestas viejas sin `name` se siguen leyendo y salen como «otros» de solo lectura. No hay migración automática.
- `review_plan.py --source changes` agrupa por traje y lista cada persona. `docs/SELECTION_CONTRACT.md` se actualiza
  (sigue siendo exportación de propuestas, no la orden de instalación).
- Aviso: el nombre se elige, no se autentica. Es una lista cerrada entre amigos.

### Fase 4: Pantalla única

Rutas: `#/luchador/<code>[/<n>][?skin=<vid>]`. `#/luchadores`, `#/catalogo` y `#/` redirigen al último luchador visto
(localStorage), o al primero del roster si no hay ninguno. `#/notas` sigue en el menú ⋮.

Composición en móvil, de arriba abajo:
1. **Barra fija:** ◀ · cara + nombre ▾ (abre el selector) · ▶ · «Cambios · N».
2. **Fila de 8 trajes, fija bajo la barra:** miniatura, número y la marca «Original» o «Mod» (Perfil y Pack base
   se muestran como «Mod»). Una propuesta pendiente se ve con borde violeta y la miniatura de la nueva en la esquina.
   Tocar un traje lo marca como destino; tocar el ya marcado abre el visor (PhotoSwipe, `features/gallery`).
   Gutter de 12 px y separación de 2 px para mantener objetivos de unos 44 px a 390 px.
3. **Rejilla de skins** del luchador (reutiliza `SkinGrid`): buscador, chip «Descargadas» y las descargadas primero,
   como hoy en `useFighterPage.ts:148-181`.
4. **Hoja de preview** (`SkinSheet` nuevo, `QDialog` posición bottom; en ≥1024 px panel lateral):
   - la skin grande y la actual del traje en pequeño;
   - nombre;
   - chips de variante si hay más de una (imagen de esa variante o «Sin retrato», nunca una ajena);
   - chips «Traje N» de su familia, con el marcado preseleccionado si es compatible y los demás deshabilitados;
   - propuestas de otras personas para ese traje (nombre + miniatura);
   - botón «Reemplazar»;
   - enlace a la página del mod si no está descargada.
   Al guardar, la hoja se cierra, el traje pulsa y sale el aviso con «Deshacer» de `usePlan`.
5. **Volver arriba:** botón flotante al pasar de una pantalla de scroll (reutiliza `useOutOfView`).
6. **Selector de luchador** (`FighterPickSheet` reutilizado): rejilla de caras, buscador de luchador o skin
   (elegir una skin salta a su luchador con `?skin=`), medidor y punto si tiene propuestas. Tecla `/`.
7. **Deslizar** horizontal solo sobre la rejilla, con umbral, desactivado con la hoja abierta y sin animación si
   `prefers-reduced-motion`. ← → en escritorio fuera de los campos de texto.

En escritorio (≥1024 px): barra y fila de trajes arriba, rejilla a la izquierda y panel de preview a la derecha.

Texto que se retira: «Perfil», «Pack base», «Plan de Gian», «Sin nombre», «Traje N de 8», «8 en tu perfil · …»,
«Plan actualizado el…», «Elige un traje para compararlo…», «Sin guardar», «Propuesta».

Se borran si quedan sin uso: `RosterPage`, `CatalogPage`, `useRosterPage`, `useCatalogPage`, `RosterRow`,
`Destinations`, `CompareCards`, `CompareBar`, `PlacingBand` y los estilos de `app.css` que dejen de usarse.
Se reutilizan `AppImg`, `CostumeMeter`, `SkinGrid`, `FighterPickSheet`, `SummarySheet`, `useGridDensity`,
`useFocusLoop`, `useOutOfView`, `usePlan`, `sync.ts` y los tokens actuales de `app.css` (Schibsted Grotesk,
colores de B).

### Fase 5: Hoja «Cambios» por persona

`SummarySheet` con pestañas «Mías» (con deshacer) y una por cada otra persona con propuestas (solo lectura): luchador,
traje, miniatura actual → nueva, variante y fecha. Tocar una fila lleva a ese luchador y traje.

## Reglas que siguen

- No se toca la SD, `ultimate/`, `catalog/` ni los assets. Firestore: solo `changes`, `history` y `requests` desde el
  cliente. Desplegar las reglas nuevas y fusionar en `master` (que publica) requiere el OK de Gian.
- Gian numera desde 1 (Traje 1 = `c00`). No se afirma nada «probado en consola».
- El `AGENTS.md` de `ssbu-skins` tiene cambios sin commitear que no son de esta tarea: no se tocan.
- TS/Vue: `gian-how-i-code` (Fase 0 + references de la matriz) y `gian-ts-style` en WRITE, con self-check.

## Verificación (cada fase)

- `npm run typecheck`, `python3 -m unittest discover -s tests/unit -p 'test_*.py'` y los `.mjs` de `tests/unit`.
- e2e: `tests/run.sh --sin-webkit` con emuladores (`demo-ssbu`, sin credenciales); si falla en local, la Action
  «Pruebas». En las fases 3 y 4 se actualizan `tests/e2e/local.spec.js`, `recorridos.js` e `identity.js` a los
  selectores nuevos, sin bajar cobertura. Capturas de `visual.spec.js` regeneradas con `snapshots.yml`.
- Fase 4: abrir la UI con Playwright a 375, 768 y 1440 px. Revisar la barra y la fila fijas al hacer scroll, la hoja
  abierta con variantes y trajes deshabilitados, el selector, volver arriba, el deslizar, los estados de carga,
  vacío, error y sin conexión, y el foco por teclado. Lighthouse móvil antes y después (LCP < 2.5 s).
- Cierre con `node <gian-ts-style>/assets/self-check.mjs` → `Self-check TS: 0 pendientes`.

## Siguiente paso tras aprobar

Guardar este diseño en `ssbu-skins/docs/PLAN-PANTALLA-UNICA.md`, marcar como superadas las secciones 4–7 de
`docs/PLAN-REDISENO.md` y pasar a `writing-plans` para la Fase 1.
