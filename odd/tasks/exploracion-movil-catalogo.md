# Exploración móvil del catálogo

Locator: `odd/tasks/exploracion-movil-catalogo.md`

## Objective

Catálogo e Instaladas se exploran con pocas acciones: más skins reconocibles por pantalla, personaje en un toque y regreso al mismo contexto. El historial, la página de fondo de las hojas y la candidata dejan de perder ese contexto.

## Problem

La cuadrícula de dos columnas y las bandas de navegación retrasan la exploración. Atrás desde un enlace directo sale de la app. Abrir Elegidas cambia la página de fondo y borra la candidata. Mirar una ficha la deja elegida, y el catálogo ofrece Traje 1 sin haberlo elegido. La cabecera no se oculta y tapa el buscador fijo. Sin Firebase, recargar pierde el plan.

## Why

El usuario pidió implementar el plan aprobado usando ODD. La prioridad es exploración rápida y volver al mismo contexto.

## Scope

- Historial con profundidad en `history.state`.
- Página de fondo para la ficha y Elegidas.
- Mirar no elige. Desde el catálogo, «Elegir traje» deja una candidata que acompaña al traje.
- Cabecera que se oculta al bajar y buscador fijo debajo de ella.
- Sync sin reescribir el DOM. El plan local se guarda al vaciar pendientes.
- Catálogo e Instaladas: 3 columnas, tamaño ampliado, personaje en la ruta, búsqueda, contador, limpiar y hoja de personajes.

## Out of scope

Pie de la ficha a 320 px, filas de Elegidas, nombres y carga en Luchadores, recorte de la cuadrícula del luchador, peso de «Quitar», Notas en la cabecera, sync de notas, escaneo del ModPack.

## Constraints

- No escribe el plan ni el inventario al cambiar vista, filtro o tamaño.
- Objetivos táctiles de 48 px. Imágenes con `fit="contain"`.
- Vue 3 + Quasar. Script de un `.vue` nuevo: imports y composable.
- Enums de string para conjuntos cerrados de la app.
- Tests con el cambio. Playwright local en 390, 360 y 320.
- No Pint. No push ni PR hasta que se elija la cadena.

## Delivery

- `delivery_strategy`: `ask-on-risk`
- `chain_strategy`: `feature-branch-chain` (elegida por el usuario).
- El tracker sale de `test/firestore-ack-race`, no de `master`: el catálogo actual vive en esa rama.
- Un solo hijo. `useApp.ts` y `tests/e2e/local.spec.js` mezclan historial, hojas y exploración; partirlos dejaría commits que no pasan. Recomendación: `size:exception`.
- Conteo corrido: 1224 (1033 altas, 191 bajas) en `93a3ae5`. Supera 400. `size:exception`.

## Tasks

### T1. Historial con profundidad

- Route: directo. Una máquina de estado en `useApp.ts` más su test. El diseño ya está cerrado en el plan.
- Riesgo: alto (navegación). Verificación del autor y el test de Playwright.
- [x] La carga inicial deja `history.state.depth` en 0 y no suma `S.nav`.
- [x] Atrás desde `#/catalogo` abierto directo lleva a Luchadores sin `history.back()`.
- [x] Ir a Instaladas y volver regresa al Catálogo. Adelante vuelve a Instaladas.
- [ ] `replace` (swap) no incrementa la profundidad.
- Checks: `tests/e2e/local.spec.js` del historial. RED observado antes del cambio.

### T2. Página de fondo de las hojas

- Route: directo, mismo módulo de rutas que T1.
- Riesgo: alto. La ficha y Elegidas comparten el historial.
- [x] Abrir Elegidas desde un luchador no desmonta esa página ni borra la candidata.
- [ ] La ficha abierta desde el catálogo mantiene el catálogo debajo.
- [ ] Un enlace directo a la ficha o a Elegidas tiene un fondo de respaldo.
- Checks: Playwright. `underCatalog` deja de decidir la página.

### T3. Mirar no elige

- Route: delegado si toca más de un módulo de comportamiento. Superficies: `candidate.ts`, `stage.ts`, `useSkinSheet.ts`, `useFighterPage.ts`, `useCatalogPage.ts`, ficha.
- Riesgo: alto (escribe el plan si se equivoca).
- [x] Abrir el detalle desde el luchador no cambia la candidata.
- [x] La ficha del catálogo no ofrece «Usar en Traje 1». Ofrece «Elegir traje» y la candidata acompaña al traje tocado.
- [x] El plan solo cambia con el botón del traje.
- Checks: unitarios de dominio si la elección es pura; si no, Playwright. Comparar el plan completo, no solo su cantidad.

### T4. Cabecera y buscador fijo

- Route: directo en `AppShell.vue`, `useReveal.ts` y `app.css`.
- Riesgo: medio.
- [x] En móvil la cabecera se oculta al bajar y el buscador fijo queda debajo, no tapado.
- Checks: Playwright a 390. `prefers-reduced-motion` no anima.

### T5. Sync y plan local

- Route: directo en `sync.ts`.
- Riesgo: alto (persistencia).
- [x] `paintSync` no reescribe `#sync`.
- [ ] Sin Firebase, recargar conserva la elección guardada en `ssbu_plan_cache`.
- Checks: prueba aislada del modo local o Playwright con Firebase bloqueado.

### T6. Estado de exploración

- Route: delegado. Superficies: `GridDensity`, `useCatalogPage.ts`, `useInstalledPage.ts`.
- Riesgo: medio. No escribe propuestas.
- [x] `?pj=` filtra. La búsqueda sigue en memoria. El tamaño vive en `localStorage`.
- [ ] Con «Todos», el catálogo agrupa por luchador. Con personaje, una sola cuadrícula.
- [x] Se quita el agrupado por franquicia de la UI.
- Checks: unitario del filtrado si queda puro; si no, Playwright.

### T7. Barra, hoja y tarjetas

- Route: delegado. Superficies: `ExploreBar`, `FighterPickSheet`, páginas, `app.css`, `Destinations`.
- Riesgo: medio. UI.
- [x] Tres columnas por defecto y un botón para ampliar a dos.
- [ ] Hoja con Todos, búsqueda, retratos y conteo. Se cierra con Atrás.
- [x] Contador, limpiar (conserva el tamaño) y nombres en dos líneas.
- [ ] Instaladas leen «Mario · Traje 2» primero.
- [ ] Cambiar el tamaño conserva la tarjeta visible.
- Checks: Playwright 390, 360 y 320. Capturas.

### T8. Cierre de verificación

- Route: directo.
- Riesgo: medio.
- [ ] `vue-tsc`, unitarios y Playwright local en verde.
- [ ] Recorridos y visual actualizados (sin «Agrupar por franquicia»).
- [ ] Métricas antes/después y capturas en `/tmp/ssbu-shots/explore-after/`.
- [ ] Self-check TS de los archivos de esta feature. `impeccable detect` una vez.

## Acceptance

El usuario puede, a 320 px, elegir Mario, combinar una búsqueda, abrir una skin, ampliarla y volver a la misma posición y los mismos filtros. Cambiar el tamaño deja la misma tarjeta a la vista. Nada de eso modifica el plan. Atrás desde un enlace directo no sale de la app. Elegidas no borra la candidata del luchador.

## Progress

- Cadena `feature-branch-chain`. Commit `93a3ae5` en `feat/exploracion-movil-01-exploracion` (1224 líneas, `size:exception`). Tracker `feat/exploracion-movil` en `test/firestore-ack-race`. Sin push.
- T1: RED `depth === null`. Luego PASS del enlace directo y de Volver/Adelante.
- T2: RED, la candidata desaparecía al abrir Elegidas. Luego PASS.
- T3: RED, el catálogo no tenía «Elegir traje». Luego PASS. Mirar el detalle no mueve la candidata.
- T4 y T5: PASS de cabecera oculta y de la clase `sync-word`. El guardado de `ssbu_plan_cache` está en el `flush` local; esta app tiene Firebase configurado, así que esa rama no se ejecutó aquí.
- T6 y T7: PASS de 3 columnas, filtro Mario, búsqueda «Dry», «1 apariencia», limpiar sin tocar el plan ni el tamaño. Playwright local completo: 12 PASS. Unitarios: 10 PASS. `vue-tsc` ok.
- T8 pendiente: capturas, métricas de toques y skins visibles. Siguen abiertos el `replace` de profundidad, el fondo de la ficha, el plan local sin Firebase, el agrupado con «Todos», el cierre de la hoja con Atrás, «Mario · Traje 2» y el ancla al cambiar el tamaño.

## Chain

```text
test/firestore-ack-race
 └── feat/exploracion-movil                 tracker, sin commits de esta feature
      └── feat/exploracion-movil-01-exploracion
```

El hijo no se sube ni abre PR hasta que se pida.

## Next

Capturas de T8. El PR del tracker y el del hijo quedan para cuando se pida subir.

## Log

- 2026-10-28: documento creado antes del primer cambio de código. Estrategia de entrega `ask-on-risk`. Cadena sin elegir.
- 2026-10-28: implementación de T1–T7 en el árbol, sin commit. Espejo Engram `odd/exploracion-movil-catalogo/tasks` (id 7306), actualizado con este estado.
- 2026-10-28: cadena `feature-branch-chain`. Commit `93a3ae5214a9ef5e41b799dd572babedb1317473`.
