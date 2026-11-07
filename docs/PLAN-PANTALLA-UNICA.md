# Pantalla única para elegir y proponer skins (`ssbu-skins`)

Clasificación: Feature grande → policy → brainstorming + grill (hecho) → writing-plans → Build.
Superficie: producto operativo → principal `interface-design`, con `impeccable`; apoyo único `accessibility`.

## Contexto

Con las Etapas 1–3 (#46–#48), la ficha del luchador ya junta trajes, comparación y skins, pero la app sigue organizada
como inventario: lista de Luchadores con 8 miniaturas por luchador, ficha con los mismos 8 trajes más grandes, panel
Actual/Nueva fijo, Catálogo como página aparte y varias capas de texto en cada traje (Perfil, Pack base, Plan de Gian,
Sin nombre, «8 en tu perfil…»). Gian quiere centrarla en la tarea principal: **ver las skins descargadas, previsualizarlas
con su variante, elegir el traje destino y proponer el reemplazo**, en una sola pantalla mobile-first, fluida y táctil,
con atajos de navegación y solo «Original» y «Mod» como texto de estado en los trajes. Las variantes existen pero viven
sin fusionar en `feat/variant-inspector` (sin retratos publicados para variantes no instaladas). La web aún no conoce las
familias de colores ni quién hizo cada propuesta.

## Decisiones de Gian (grill y revisión del 2026-11-07)

| Tema | Decisión |
|---|---|
| «Reemplazar» | Guarda una **propuesta** en `changes` (no instala; la SD sigue con su flujo) |
| «Descargar» | Las skins del Drive salen primero, listas para elegir; las demás llevan enlace a la página del mod |
| Variantes | PR previo que rescata de `feat/variant-inspector` herramienta + datos + contrato + cruce de retratos; la UI de variantes se hace nueva |
| «Otro color» y mod actual | Cinta compacta de 1 línea bajo los 8 trajes con el nombre actual del traje marcado, zoom y acción «Otro color» (`user_destination`) |
| Familias | La web ofrece trajes compatibles según las texturas `.nutexb` de `model/body` del slot nativo; los demás quedan deshabilitados |
| Pantalla | Un luchador a la vez: barra fija + fila de 8 trajes fija + cinta del traje activo + rejilla de skins. Se quitan Luchadores y Catálogo |
| Preview y hojas | Hojas inferiores arrastrables (`vaul-vue`) en móvil; panel lateral fijo para preview en escritorio (`≥1024 px`) |
| Animaciones y UX | Librerías dedicadas antes que carpintería manual: `motion-v` (springs y `layoutId`), `vaul-vue` (bottom sheets), `@vueuse/core` (swipe, teclado, storage) y View Transitions API direccional nativa |
| Estados | En las celdas de traje, texto visible solo «Original» / «Mod». Propuesta propia: borde violeta + miniatura en esquina; de amigos: indicador/punto violeta discreto (todo con `aria-label` completo) |
| Atajos | Volver arriba, ◀ ▶ entre luchadores (y `←` `→` en escritorio), selector con búsqueda y caras (`/`), deslizar entre luchadores |
| Autor | Gate perezoso: se navega libremente y, al intentar proponer sin nombre guardado, se elige **Gian, Alan, Ches o Samu** (`localStorage`); opción «Cambiar persona» en el menú ⋮ |
| Choques | **Una propuesta por persona y traje**; `assignBlock` y deshacer aplican solo a las propuestas de la persona activa; Gian ve todas y decide |
| Alcance | Incluye la vista de propuestas de amigos por pestañas dentro de la hoja «Cambios» |

## Entregas (una rama y un PR por fase, en este orden)

### Fase 1: Variantes (datos, retratos y contrato)

- Rescatar de `feat/variant-inspector` sobre `master` actual: `tools/inspect_variants.py`, `data/variants/*.json`,
  `tools/board_public.py` y `public/drive-alts.json`, propuesta con `variant` en `src/features/plan/services/sync.ts`,
  `src/features/plan/composables/usePlan.ts`, `src/shared/helpers/domain.ts`, `src/shared/helpers/ssbu.ts`,
  `tools/review_plan.py`, `tools/db.py`, `firestore.rules` (`okVariant`, formato `<vid>:<md5 corto>:<cNN>`),
  `docs/SELECTION_CONTRACT.md` y sus tests.
- **Retratos de variantes:** restaurar un helper compartido `portraitUrl(sha)` (Cloudinary `ssbu/portraits/<sha256>` con
  `f_auto,q_auto`) y actualizar `tools/board_public.py` para aceptar retratos presentes en la unión de
  `data/sd_portraits.json` y `data/variant_portraits.json` (con soporte de extracción/subida de `.bntx` para variantes del
  Drive cuando haya credenciales autorizadas; cualquier SHA aún no publicado devuelve `portrait: null` y muestra
  «Sin retrato», nunca una imagen ajena).
- Se descartan `BoardPage.vue`, `useBoard.ts` y `tests/e2e/journeys.js`, que ya no existen en `master`. Se rehacen a mano
  los conflictos de `SummarySheet.vue`, `domain.ts` y `local.spec.js`.
- **Orden de despliegue:** publicar `firestore.rules` (donde `variant` es opcional y retrocompatible) **antes** de
  fusionar el PR en `master`.

### Fase 2: Familias de colores

- Nuevo `tools/export_families.py` (stdlib): lee `dir_info_with_files_trimmed.json` del juego
  (`~/Documents/smash-mod-assets/tools-data/reslotter/a853c3d09181/`, pasado como `--vanilla-files`) y agrupa los `c00–c07`
  de cada luchador comparando únicamente las texturas **`fighter/<interno>/model/body/c0[0-7]/*.nutexb`**:
  - Excluye archivos de animación, adyacencia y LOD (`.nuanmb`, `.adjb`, `.xmb`), evitando falsos cortes en Cloud,
    Isabelle, Captain Falcon, Samus, Peach, Lucina, Chrom, Ryu, Wolf o Young Link.
  - Cruza los nombres internos con `INTERNAL` de `tools/scan_installed.py` (uniendo `popo` + `nana` en Ice Climbers `15`).
  - Ignora texturas de accesorios numerados por slot (`def_(pikachu|pichu|purin)parts_`, `alp_(pichu|purin)parts_`,
    `def_sonic_00[2-8]_`) y aplica las 3 normalizaciones documentadas en el ModPack: Little Mac (`49`: `0–5` y `6–7`),
    Mythra (`80`: `0–7`) y Kazuya (`81`: pares `0,2,4,6` e impares `1,3,5,7`).
  - Escribe `data/families.json` (versionado) y `tools/export_boot.py` lo expone en `boot.js`.
- Helpers `sameFamily(code, from, to)` y `compatibleSlots(code, sourceSlots)` en `src/shared/helpers/ssbu.ts`:
  - Con `variant` elegida (`...:cNN`), el origen es `[NN]` y solo se habilitan los trajes de su familia.
  - Sin `variant` (mods del Drive aún no inspeccionados en `data/variants/` o entradas del catálogo), usa la **unión** de
    familias de `driveAlts.slots` (`any: true` → los 8) o `skin.native`. Si `native` está vacío (`[]`), habilita los 8
    trajes sin bloqueo ciego.
- `tools/review_plan.py`: `ERROR` (⛔) si el destino cruza de familia respecto del origen conocido; `INFO` cuando el mod
  no declara slots nativos en datos locales.
- Tests unitarios: Cloud (`61`), Isabelle (`68`), Ike (`32`) y Kazuya (`81`) pares/impares; Sephiroth (`78`) y Little Mac
  (`49`) `c00–c05`/`c06–c07`; Bowser Jr. (`58`) 8 Koopalings; ZSS (`29`) `c00–c05` / `c06` / `c07`; Sora (`82`)
  `c00` / `c01,c05` / `c02,c06` / `c03,c07` / `c04`; Captain Falcon (`11`) y Sonic (`38`) los 8 juntos; Ice Climbers
  (`15`) `c00–c03`/`c04–c07`.

### Fase 3: Propuestas por persona

- Instalar `@vueuse/core` (se reutiliza también en Fase 4) y crear `usePerson` en `src/features/plan/` sobre `useStorage`
  con fallback seguro si `localStorage` falla.
- **Gate perezoso (`PersonSheet`):** entrar sin nombre guardado **no** bloquea la carga ni la navegación (protege LCP y
  lectura de enlaces). La hoja con los 4 botones (**Gian, Alan, Ches, Samu**) se abre al intentar guardar la primera
  propuesta; el menú ⋮ incluye «Cambiar persona».
- Esquema en Firestore: `changes/{code}_{slot}_{name}` con campo `name`, e `history` con `name`.
  - **Transición sin caída en `firestore.rules`:** fusionar primero el PR y esperar a que Vercel marque «Ready»; **después** publicar las reglas (el cliente nuevo, rechazado por las reglas viejas, conserva sus operaciones en la cola y las reintenta; al revés se perderían las escrituras del cliente viejo, y las pestañas viejas no podrán escribir hasta recargar). En escritura/borrado,
    `id` debe coincidir con `code + '_' + string(slot) + '_' + name` y `name in ['Gian', 'Alan', 'Ches', 'Samu']`. En
    `delete`, exigir que `resource.data` tenga `name` válido para que las propuestas legacy `{code}_{slot}` sin `name`
    queden protegidas como **solo lectura** («Otros»). No se abre escritura a ninguna otra colección.
- `sync.ts` y `usePlan.ts`:
  - `mergeChanges`, `confirmPlan` y la cola sin conexión (`PEND`) usan el id completo `{code}_{slot}_{name}`.
  - `SSBU.assignBlock` (evitar el mismo `vid` en dos trajes del luchador) y `clearAt` filtran **únicamente las propuestas
    de la persona activa**, de modo que la propuesta de un amigo no bloquee ni borre la de otro.
  - Para mantener operativa la UI mientras llega la Fase 4, `planVid(code, n)` devuelve primero la propuesta de la persona
    activa (y, si no tiene, la más reciente de otros en lectura), además de exponer `proposalsAt(code, n)` con todas.
- `tools/review_plan.py --source changes` agrupa por traje y lista cada persona. `docs/SELECTION_CONTRACT.md` se actualiza
  (sigue siendo exportación de propuestas, no orden de instalación).
- Aviso: el nombre se elige, no se autentica; es una lista cerrada entre amigos.

### Fase 4: Pantalla única, gestos y animaciones

Dependencias UI/UX instaladas para evitar carpintería manual:
- **`motion-v`**: resortes (`spring`), transiciones de layout compartido (`layoutId`), `AnimatePresence`, `whilePress` y
  `<MotionConfig reducedMotion="user">`.
- **`vaul-vue`**: hojas inferiores móviles (sobre Reka UI) con arrastre táctil real del tirador, cierre por velocidad,
  coordinación con scroll interno, bloqueo del fondo y trampa de foco accesible (`role="dialog"`).
- **`@vueuse/core`** (ya añadido en Fase 3): `usePointerSwipe`, `onKeyStroke` y `useStorage`.

Rutas: `#/luchador/<code>[/<n>][?skin=<vid>]`. Si no viene `/<n>`, preselecciona `Traje 1` (`n = 0`). `#/luchadores`,
`#/catalogo` y `#/` redirigen al último luchador visto (`localStorage`), o al primero del roster si no hay ninguno.
`#/notas` y «Cambiar persona» viven en el menú ⋮.

Composición en móvil, de arriba abajo:
1. **Barra fija:** ◀ · cara + nombre ▾ (abre el selector) · ▶ · menú ⋮ · «Cambios · N» (total de propuestas activas).
2. **Fila de 8 trajes, fija bajo la barra:** miniatura, número y el texto visible «Original» o «Mod» (Perfil y Pack base
   se muestran como «Mod»).
   - **Geometría:** `padding-inline: 4px` y `gap: 2px` → **`44.1 px` por celda a `375 px`** (`≥ 44 px` en 375 y 390 px).
     Con `@media (max-width: 23.4rem)` pasa automáticamente a **2 filas de 4**, cubriendo `320 px` y zoom de texto al
     `170 %` sin truncar «Original».
   - **Precedencia de propuestas en el traje:** si la persona activa tiene propuesta en ese traje, muestra borde violeta
     sólido + miniatura de la nueva en la esquina; si solo hay propuestas de amigos, muestra un punto/indicador violeta
     discreto sin apropiarse de la esquina (el `aria-label` anuncia ambos casos con detalle).
   - Tocar un traje mueve el marco activo (`layoutId`) y lo marca como destino; tocar el ya marcado abre el visor
     (PhotoSwipe, `features/gallery`).
3. **Cinta compacta del traje activo (1 línea bajo la fila):** muestra `Traje N · <nombre actual u Original>`, botón para
   ampliar foto actual y, cuando hay un mod instalado con origen/catálogo conocido, la acción **«Otro color»**, que abre
   `SkinSheet` precargado con esa skin para proponer moverla a otro traje compatible de su familia (`user_destination`).
4. **Rejilla de skins** del luchador (reutiliza `SkinGrid`): buscador, chip «Descargadas» y las descargadas primero,
   como hoy en `useFighterPage.ts:148-181`.
5. **Preview (`SkinSheet`):** hoja inferior arrastrable con `vaul-vue` en `< 1024 px`; panel lateral fijo a la derecha en
   `≥ 1024 px`:
   - skin candidata grande y actual del traje en pequeño (tocables para abrir PhotoSwipe);
   - nombre y autor (si está auditado);
   - chips de variante si hay más de una (con indicador `layoutId` e imagen de **esa** variante o «Sin retrato», nunca
     ajena);
   - chips «Traje N» filtrados por `compatibleSlots`: el traje marcado sale preseleccionado si es compatible (o el primer
     traje compatible si no lo es) y los de otra familia quedan deshabilitados con motivo accesible;
   - propuestas de otras personas para ese traje (nombre + miniatura);
   - botón primario «Reemplazar» (si no hay persona elegida aún, abre `PersonSheet` y completa el guardado al elegir);
   - enlace a la página del mod si no está descargada.
   Al guardar, en móvil la hoja se cierra, la miniatura entra con resorte («slot-in») en el traje destino, `Cambios · N`
   anima el conteo y sale el aviso con «Deshacer» de `usePlan`.
6. **Volver arriba:** botón flotante con entrada/salida suave (`AnimatePresence`) al pasar de una pantalla de scroll
   (reutiliza `useOutOfView`).
7. **Selector de luchador** (`FighterPickSheet` migrado a `vaul-vue` en móvil / diálogo en escritorio): rejilla de caras,
   buscador de luchador o skin (elegir una skin salta a su luchador con `?skin=`), medidor y punto si tiene propuestas.
   Atajo `/`.

Sistema de movimiento, gestos y rendimiento:
- **Cambio de luchador direccional (View Transitions API nativa):** helper progresivo con detección
  `if (!document.startViewTransition)` y `types: ['forward' | 'backward']` (`:active-view-transition-type(...)`) que
  desliza en el hilo compositor (`transform` + `opacity`) únicamente el contenedor del luchador mientras la barra fija
  permanece estable, y tras `transition.finished.finally(...)` dirige el foco a `#ttl` (`tabindex="-1"`).
- **Gestos y teclado (`@vueuse/core`):** `usePointerSwipe` horizontal solo sobre la rejilla (con umbral de distancia y
  bloqueo si predomina el eje vertical, desactivado con cualquier hoja o PhotoSwipe abiertos) y `onKeyStroke` para `←`,
  `→` y `/` fuera de campos de texto.
- **Presupuesto LCP (`< 2.5 s`) y accesibilidad:** `initial={false}` en el primer pintado para no animar ni retrasar la
  imagen LCP; animaciones restringidas a `transform` y `opacity`; `<MotionConfig reducedMotion="user">` en la raíz de Vue
  más `@media (prefers-reduced-motion: reduce)` para desactivar View Transitions y desplazamientos cuando el sistema pide
  reducir movimiento.

En escritorio (`≥ 1024 px`): barra, fila de 8 trajes y cinta arriba; rejilla a la izquierda y panel de preview fijo a la
derecha.

Texto que se retira de las celdas y cabeceras: «Perfil», «Pack base», «Plan de Gian», «Sin nombre», «Traje N de 8»,
«8 en tu perfil · …», «Plan actualizado el…», «Elige un traje para compararlo…», «Sin guardar», «Propuesta».

Se borran si quedan sin uso: `RosterPage`, `CatalogPage`, `useRosterPage`, `useCatalogPage`, `RosterRow`, `Destinations`,
`CompareCards`, `CompareBar`, `PlacingBand`, `useFocusLoop` (si todas las hojas pasan a `vaul-vue` / diálogo accesible) y
los estilos de `app.css` que dejen de usarse. Se reutilizan `AppImg`, `CostumeMeter`, `SkinGrid`, `FighterPickSheet`,
`SummarySheet`, `useGridDensity`, `useOutOfView`, `usePlan`, `sync.ts` y los tokens actuales de `app.css` (Schibsted
Grotesk, paleta de B).

### Fase 5: Hoja «Cambios» por persona

`SummarySheet` (sobre `vaul-vue` en móvil y diálogo en escritorio) con pestañas e indicador compartido (`layoutId` de
`motion-v`): «Mías» (con deshacer) y una pestaña por cada otra persona con propuestas (más «Otros» si existen propuestas
legacy sin `name`, todas de solo lectura): luchador, traje, miniatura actual → nueva, variante y fecha. Tocar una fila
cierra la hoja y lleva a ese luchador y traje.

## Reglas que siguen

- No se toca la SD, `ultimate/`, `catalog/` ni los assets. Firestore: solo `changes`, `history` y `requests` desde el
  cliente. Desplegar las reglas nuevas y fusionar en `master` (que publica) requiere el OK de Gian.
- Gian numera desde 1 (Traje 1 = `c00`). No se afirma nada «probado en consola».
- El `AGENTS.md` de `ssbu-skins` tiene cambios sin commitear que no son de esta tarea: no se tocan.
- TS/Vue: `gian-how-i-code` (Fase 0 + references de la matriz) y `gian-ts-style` en WRITE, con self-check.

## Verificación (cada fase)

- `npm run typecheck`, `python3 -m unittest discover -s tests/unit -p 'test_*.py'` y los `.mjs`/`.js` de `tests/unit`.
- e2e: `tests/run.sh --sin-webkit` con emuladores (`demo-ssbu`, sin credenciales); si falla en local, la Action
  «Pruebas». En las fases 3, 4 y 5 se actualizan `tests/e2e/local.spec.js`, `recorridos.js` e `identity.js` a los
  selectores nuevos, sin bajar cobertura (incluyendo `localStorage` para persona en flujos de escritura). Capturas de
  `visual.spec.js` regeneradas en Linux con `snapshots.yml`.
- Fase 4: abrir la UI con Playwright a `320`, `375`, `768` y `1440 px`, más texto al `170 %`. Revisar:
  - objetivos táctiles `≥ 44 px` en `375 px` y salto limpio a `4×2` en `320 px` / `170 %`;
  - barra y fila fijas al hacer scroll, cinta del traje activo y flujo «Otro color»;
  - `SkinSheet` arrastrable en móvil y fijo en escritorio, con variantes, retratos/«Sin retrato» y trajes deshabilitados;
  - View Transitions direccionales, swipe horizontal, atajos `←`/`→`/`/`, foco en `#ttl` tras navegar y
    `prefers-reduced-motion: reduce`;
  - estados de carga, vacío, error y sin conexión.
  - Lighthouse móvil antes y después (`LCP < 2.5 s`, sin bloqueo por animaciones de entrada).
- Cierre con `node <gian-ts-style>/assets/self-check.mjs` → `Self-check TS: 0 pendientes`.

## Siguiente paso tras aprobar

Pasar a `writing-plans` para la **Fase 1** (`Variantes: datos, retratos y contrato`).
