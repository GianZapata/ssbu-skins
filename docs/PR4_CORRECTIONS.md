# Correcciones de la segunda revisión de #4

Base: `aec97314351c30c28a0288678a9e0329fed17c74`. La ejecución [40243678084](https://github.com/GianZapata/ssbu-skins/actions/runs/40243678084) ocurrió y falló: 15 unitarias correctas y 119 comprobaciones de Chromium correctas, con un fallo en «A: con candidata aparece Actual/Propuesta».

Durante esta corrección apareció el commit remoto `07e9d5c754f137b7142f81097c6d0db6d8c8da38`. Se incorpora su ascendencia y se conserva `include-hidden-files` para las capturas de CI. Su retención temporal de ocho segundos queda sustituida por la reconciliación por marcas de datos descrita abajo: no debe ocultarse durante ese intervalo una edición remota posterior.

## Diagnóstico de Actual/Propuesta

Es una carrera del producto, no una comprobación que deba eliminarse. `runTransaction` puede confirmar antes de entregar `onSnapshot(changes)`. Antes, `flush` retiraba la operación de `PEND` cuando `PLAN` todavía tenía la versión anterior: desaparecía la propuesta o reaparecía tras deshacer. El siguiente snapshot lo reparaba, haciendo el fallo intermitente.

La prueba `tests/e2e/ack-transition.js` retrasa únicamente callbacks de snapshots del SDK real, mantiene las transacciones del emulador y comprueba la base con `db.py plan`. Sobre la versión anterior reproduce tres fallos: propuesta visible, Actual/Propuesta y deshacer. Conserva las tres comprobaciones después de la corrección.

Los resultados confirmados se conservan hasta que el listener alcanza la frontera de la última lectura de la transacción. Se usa la marca `at` del documento, no el orden de callbacks: una snapshot antigua no puede retirar esa protección y una edición remota más reciente sí prevalece. `tests/unit/sync_ordering.js` ejecuta las funciones reales con 12 calendarios controlados, incluidos snapshots intermedios, el mismo VID antiguo, bajas y volver a elegir tras deshacer. El origen falla nueve calendarios; el código corregido pasa los doce.

## Catálogos y referencias

La rama incorpora la cadena #2 → #3 → #5 → #6 y conserva exactamente el blob de catálogo `43ad4bdcbadfffbdb03443fae21f88cfc1e964ad`: **1235 activas = 696 principales + 539 alternativas**, **15 retiradas**, **1250 IDs únicos**, **89 luchadores**. El lock crece con los 12 IDs nuevos; no elimina los anteriores.

Las pruebas derivan recuentos desde registros y los contrastan con `counts`, roles, cobertura, estados Wi-Fi y retiradas. No fijan 1225/697/528. Reordenar o renombrar una apariencia no cambia su ID; borrar o renombrar un ID histórico sigue siendo un error.

`catalog_data.load` conserva `original_ref` completo por luchador; `db.py seed --only catalog` lo lleva al documento de Firestore. La interfaz usa el render verificado de c00 solo en c00 si no hay un mod documentado. No lo atribuye a c01–c07 y muestra fuente y alcance en Procedencia. Se prueban también referencias sin verificar o con otro costume.

Los 77 retratos locales conservan URL de origen, transformación y hash de archivo en `assets/fighters/sources.json`. Los 12 DLC usan como alternativa la URL oficial exacta de `original_refs`, con toda su procedencia. La política de red del entorno impidió descargar esos renders: no se inventaron archivos locales ni se desactivó TLS. Los fixtures de transporte verifican fuente, carga y encuadre; no prueban disponibilidad actual ni contenido de los servidores externos.

## Estado de los hallazgos de interacción

| Hallazgo | Corrección y comprobación reproducible |
| --- | --- |
| Búsqueda rápida al cambiar de ruta | Cancelación de timers y comprobación del nodo vigente; recorridos en ambos sentidos sin excepciones. |
| Atrás pierde búsqueda/filtros | Conservación del contexto del catálogo/traje; cabecera y navegador restauran resultados, filtros y scroll. |
| Filtro editado se reinicia durante un render en vivo | Contexto de entrada separado del filtro editable; `render(true)` conserva el luchador y la consulta. |
| Atrás tras cargar más de 40 tarjetas | Cantidad cargada conservada por ruta antes de reconstruir el DOM; tarjeta 76 y render en vivo mantienen la posición. |
| Preview recortada | Wrapper ajustado al hero; imágenes controladas anchas, verticales y cuadradas quedan completas. |
| Derivados 404 con original disponible | Fallback al original en hero y miniaturas, también las del visor; conserva reintento si todas las fuentes fallan. |
| Destino/miniatura pierde el foco | Restauración al control seleccionado; Tab avanza al siguiente. |
| Foco debajo de la barra | Scroll padding y desplazamiento de foco reservan cabecera y barra, incluyendo alturas reducidas y horizontal. |
| Atrás durante apertura de galería | Cierre encolado hasta terminar la apertura, sin perder el handle; pruebas a 0/50/150 ms. |
| Miniaturas tapan la foto ampliada | Padding del área de ajuste del visor según la franja de miniaturas. |
| Cierre de galería pierde foco | Devolución al hero después de destruir el visor, conservando la foto actual. |
| Trampa de foco omite JSON | Incluye elementos con tabindex no negativo; teclado alcanza y desplaza el JSON exportado. |

Estos recorridos se ejecutan en Chromium y WebKit de Playwright. La auditoría de dimensiones WebKitGTK sigue siendo adicional. Ninguna de las dos sustituye Safari/iPhone real, VoiceOver ni teclado virtual del sistema.

## Cómo repetir y entregar la verificación

```bash
pip install -r tests/requirements.txt
cd tests && npm ci --no-audit --no-fund && npx playwright install --with-deps chromium webkit
cd ..
tests/run.sh --sin-webkit
node tests/e2e/webkit-journeys.js
```

CI ejecuta ambos comandos sobre `_site`, la misma carpeta que se publica. La suite principal arranca sus propios emuladores y rechaza un servicio previo en8080; no mata otros emuladores. Las pruebas de seed usan un proyecto de emulador separado. Todas las escrituras de las pruebas son locales, sin secretos ni escrituras en Firebase de producción.

Los calendarios de sincronización también pueden repetirse solos con `node --test tests/unit/sync_ordering.js`; los recorridos de regresión con `node tests/e2e/webkit-journeys.js`. Los resultados por comprobación se guardan en `tests/.shots/results.json` y las capturas/JSON de WebKit en el artefacto correspondiente de CI.

El comentario de entrega del PR identifica el SHA final y su ejecución de CI para la comprobación independiente posterior de Codex. Esta corrección no fusiona #4 en master ni publica la web.

Validación local final: **21 unitarias/Firestore**, **12 calendarios de sincronización**, **131 comprobaciones E2E con emuladores en Chromium**, y **69 recorridos de regresión en cada uno de Chromium y WebKit**, todos correctos. La ejecución de CI del SHA entregado se comprueba por separado.
