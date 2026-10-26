# Contrato del plan (Firestore → instalador)

La página guarda **un plan global**: una propuesta por traje (`changes/{luchador}_{traje}`). El agente que instala (`GianZapata/Gian-Ultimate-Modpack-private`) o quien revisa a mano lo lee así:

```bash
python3 tools/db.py plan                                   # JSON del plan actual
python3 tools/db.py status <vid> installed|failed|skipped --result "<ruta o motivo>"   # anota el resultado
python3 tools/db.py migrate                                # pasa selection/main (modelo anterior) al plan, sin pisar nada
```

La misma estructura sale de **Exportar plan** en la página (`schema: 3`). Una propuesta guardada en el plan no está instalada en la consola: `current.confirmed` sigue en `false`.

## Qué contiene

```json
{ "schema": 3, "generated_at": "...", "catalog": "<fecha del catálogo>",
  "inventory": { "version": "156bae20", "profile": { "name": "default", "ref": "...@sha", "excluded_base_slots": [] }, "verification": "parcial", "scanned_at": "...", "sources": [ ... ] },
  "target": { "game": "Super Smash Bros. Ultimate", "version": "13.0.5", "loader": "ARCropolis 4.1.1" },
  "changes": [ {
    "fighter": "Sora", "roster_no": "82", "traje": 1, "slot": "c00",
    "user_destination": { "traje": 1, "slot": "c00", "priority": "el destino elegido manda sobre dest_hint" },
    "replaces": { "kind": "original|mod|unknown", "name": "...", "vid": null },
    "relocation": { "native_slots": ["c00","c02"], "needs_move": true, "checked": false },
    "current":  { "kind": "original|mod|unknown", "name": "...", "source": "base|perfil|null", "confirmed": false },
    "proposal": { "vid": "82:330053", "role": "recomendada|alternativa", "variant": null, "mod_id": 330053, "name": "...", "author": "...", "url": "...", "online": "Online: lo declara el autor",
                  "conditions": null, "dependencies": null, "conflicts": null, "native_slots": "1,4", "dest_hint": "c01", "pack": null, "withdrawn": false },
    "missing_in_catalog": false, "vid": "82:330053", "status": "wanted", "result": null } ],
  "history": [ { "at": "...", "roster_no": "82", "traje": 1, "from": null, "to": "82:330053", "kind": "set" } ] }
```

- **`user_destination` manda sobre `dest_hint`** (la sugerencia del auditor), siempre que sea técnicamente viable. `relocation.needs_move` indica que el traje elegido no está entre los slots originales del mod; `checked: false` significa que **nadie ha comprobado** que ese mod se pueda reubicar: hay que verlo al instalar.
- **`traje` (1–8) y `slot` (`c00`–`c07`)** son el destino: la skin debe quedar en ese slot, reubicando los archivos del mod si sus `native_slots` son otros. `dest_hint` solo es orientativo.
- **`current` nunca está confirmado en consola** (`confirmed: false`). `kind: original` significa «sin mod en el inventario revisado», `unknown` «hay un mod pero no se pudo identificar».
- **`vid`** identifica la variante exacta (`<luchador>:<id del mod>`; si un mismo mod trae varias variantes para un luchador, la variante añade un sufijo estable).
- `online` es lo que declara el autor, no una prueba en consola. Respeta `conditions`, `dependencies` y `conflicts`.
- Un `pack` no nulo indica un mod compartido con otros luchadores.

## Inventario y su verificación

El inventario de lo instalado (`installed/*`, `data/inventory_*.json`) se compone de tres capas, cada una con su origen:

| Capa | Origen | Verificación |
|---|---|---|
| `base` | `tools/scan_installed.py` sobre la rama principal del ModPack | Revisado en el repositorio; no probado en la consola |
| `perfil` | `tools/scan_profile.py` → `data/inventory_profile.json`: composición efectiva del perfil **`gian-prs`** del ModPack (`base_filter: skins`) (`extends` → `opt-aqua` → `default`, menos lo que quita `without`, más todos los `exclude_base` heredados). Lo que el perfil excluye del pack base deja de contar como instalado (Sora c07; el mod «Optionals» entero, y con él los 8 trajes de Steve). Incluye los favoritos del perfil (Roxas, Ventus, Terra, Funky Kong y Aqua en Pyra/Mythra c00) con la prueba en consola que anota el ModPack en `catalog/mods.json` | Pruebas del ModPack del 2026-10-24: emuMMC, Smash 13.0.5, ARCropolis 4.1.1, **sin conexión**; no certifican online |
| `staged` | `tools/scan_branches.py` sobre ramas sin fusionar | Referencia aparte, «en preparación»: nunca cuenta como instalado ni como «Actual» |

`meta/installed.version` es un resumen del contenido (cambia si cambia el inventario) y va en cada exportación. Solo se refleja el perfil indicado en `profile.name`; los demás perfiles del ModPack no. `meta/installed.verification` es `parcial` mientras no haya una comprobación en la consola. **Tras cada instalación comprobada:** reescanear (`scan_installed.py <ModPack>`, `scan_profile.py <ModPack>`, `scan_branches.py <ModPack>`), revisar el resultado y subir `data/` e `installed/`. La sincronización del inventario con Firestore es **manual** (`python3 tools/db.py seed --only installed`, o el botón «Sincronizar también el inventario» al lanzar la Action a mano); el catálogo, en cambio, se sincroniza solo. Elegir una propuesta nunca modifica el inventario. `scan_profile.py` acepta `--profile <nombre>` y `--ref <rama>` para otro perfil u otra versión del ModPack.

## Flujo del agente

1. `python3 tools/db.py plan` y procesar solo `status == "wanted"`.
2. Descargar desde `proposal.url`, respetar `traje`/`slot`, `dependencies`, `conflicts`, `conditions`.
3. Instalar en `ultimate/mods/...`, quitando lo que ocupaba ese slot si corresponde.
4. `python3 tools/db.py status <vid> installed|failed|skipped --result "..."`.
5. Reescanear el inventario y sembrar.

## Selecciones antiguas

Las selecciones del modelo anterior guardadas en un navegador **no se suben solas** al plan: la web las ofrece («Elecciones de antes») y solo se añaden si la persona lo confirma. `db.py migrate` (la selección antigua de Firestore `selection/main`) es una acción explícita del mantenedor, idempotente y que no pisa trajes ya propuestos.

## Reparto de responsabilidades

- **Grok:** solo `data/catalog.json` (investigación). Sus campos nuevos (`role`, `look_id`, `variant`, `audit_scope`, `downloads_scope`, `images_scope`, `alt_index`, `dependency_kind`, …) los lee `tools/catalog_data.py`; `look_id` es el `vid` estable de cada apariencia.
- **Mantenedor del sitio:** interfaz, generador, validador, contratos, inventario, reglas e integración con Firebase.

## Revisión previa a instalar (flujo automático)

Cuando quieras instalar, no hace falta exportar a mano: **pídele a Claude «revisa el plan»**. Lanza la Action *Revisar plan* (o `python3 tools/review_plan.py`), que:

1. lee el plan compartido de Firestore (API REST pública; las reglas permiten leer, no hacen falta secretos),
2. cruza cada cambio con el catálogo y el inventario (perfil `gian-prs`),
3. publica un informe con **⛔ errores** (no instalar: apariencia retirada o inexistente, traje Mii, id de otro luchador, incompatible online), **⚠️ avisos** (reemplaza un favorito del perfil, hay que mover el mod de slot, plugin necesario, online con condiciones o sin confirmar, conflictos anotados, Pyra/Mythra sin coordinar, mismo mod en varios trajes, inventario de otra versión) y **ℹ️ notas** (mod compartido, skin ya preparada en una rama, variante concreta, vaivenes en el historial),
4. no instala ni modifica nada.

Alternativas: `python3 tools/review_plan.py --source admin` (con credenciales o emulador) o `--source file exportacion.json` (la exportación de la web). Con `--strict` termina con código 1 si hay errores. La instalación sigue siendo manual y la hace quien tiene el ModPack, con el informe delante.
