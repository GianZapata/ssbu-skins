# Contrato de la selección (Firestore)

Puente entre la página (móvil) y el agente que instala en la Switch (`GianZapata/Gian-Ultimate-Modpack-private`). Todo vive en Firestore (ver `docs/FIREBASE.md`); ya no hay `selection.json` en el repositorio.

- **Quién escribe lo que se elige:** solo el dueño, desde la página (`selection/main`). Se guarda sola, sin token.
- **Quién lo lee:** el instalador, con `python3 tools/db.py selection`, que imprime un JSON con todo lo necesario (abajo).
- **Quién escribe el resultado:** el instalador, con `python3 tools/db.py status <clave> installed|failed|skipped --result "<ruta o motivo>"`. Llega a la página en vivo («Instalada»).
- **Credenciales del instalador:** una cuenta de servicio (`GOOGLE_APPLICATION_CREDENTIALS`). Las reglas no dejan escribir `status` desde la página.

## Qué imprime `db.py selection`

```json
{ "schema": 2, "owner": "Gian", "catalog": "<fecha del catálogo>",
  "target": { "game": "...", "version": "13.0.5", "loader": "ARCropolis 4.1.1", "modpack_repo": "..." },
  "limits": { "per_fighter": 8, "keep_original_slot": false },
  "replace_slots": { "01": [1, 3] },
  "items": [ { "key": "02:12345", "fighter": "Donkey Kong", "roster_no": "02", "mod_id": 12345, "name": "...", "author": "...", "url": "...",
               "assigned_slot": "c03", "order": 2, "dest_slot": "c01", "native_slots": "1,4", "assignment": "...",
               "audited": true, "wifi": "autor_explicito", "dependencies": null, "conflicts": null, "notes": "...",
               "status": "wanted", "result": null, "updated_at": null } ] }
```

## Límites (`limits`)

`limits.per_fighter` es 8, o 7 si `keep_original_slot` es `true`. La página impide guardar más de ese máximo por luchador (los trajes Mii no cuentan). Con `keep_original_slot: true` el agente **no debe tocar el slot `c00`** del luchador, aunque el catálogo proponga `c00` como destino: en ese caso reubicar la skin en un `c01`–`c07` libre o marcarla `skipped` con el motivo en `result`.

## Lo ya instalado y `replace_slots`

`data/installed.json` lista, por luchador, los slots `cNN` ocupados en el ModPack (`ultimate/mods/*/fighter/<luchador>/model/body/cNN`). Lo genera `python3 tools/scan_installed.py <ruta del repo del ModPack>`, que además guarda en `installed/<luchador>_<NN>.webp` el retrato de cada slot (decodificado de `ui/replace*/chara/chara_N`) y, cuando el pack renombra el costume (`nam_chr1_<NN>_<luchador>` en `msg_name.xmsbt`), su nombre. `info[slot]` trae `n` (nombre), `skin` (tiene retrato propio: es una skin completa) e `i` (imagen).

**Tras cada instalación, el instalador debe volver a ejecutar el escáner, subir `data/installed.json` e `installed/` al repositorio y ejecutar `python3 tools/db.py seed --only installed`** (la Action también lo hace al hacer push si existe el secreto). Un slot sin retrato puede ser solo un ajuste de modelo.

La página cuenta esos slots dentro del máximo por luchador. El dueño puede marcar un slot instalado como «se quita»: eso llega en `replace_slots` (`{"<roster_no>": [1, 3]}`). Un slot **solo se puede sobrescribir si aparece ahí**; cualquier otro slot ocupado debe respetarse.

## Campos de cada ítem

| Campo | Significado |
|---|---|
| `key` | `<roster_no>:<mod_id>`, identificador único (también el id del documento de estado) |
| `fighter`, `roster_no` | Luchador del catálogo |
| `mod_id`, `name`, `author`, `url` | Mod en GameBanana (`url` es la fuente de descarga) |
| `assigned_slot` | **Slot elegido por el dueño (o asignado automáticamente) donde debe quedar la skin** (`c00`…`c07`); `null` para trajes Mii. **El instalador debe usar este slot**, reubicando los archivos del mod si sus slots originales (`native_slots`) son otros |
| `order` | Posición de la skin dentro de su luchador, ordenada por `assigned_slot` (1…n) |
| `dest_slot` | Slot propuesto por el auditor (solo orientativo; no manda sobre `assigned_slot`) |
| `native_slots`, `assignment` | Slots originales del mod y estado de la asignación |
| `audited`, `wifi` | Estado de auditoría / evidencia Wi-Fi (no es prueba en consola) |
| `dependencies`, `conflicts`, `notes` | Avisos que el agente debe respetar al instalar |
| `status` | `wanted` → `installed` \| `failed` \| `skipped` (lo escribe el instalador) |
| `result`, `updated_at` | Los rellena el instalador al cambiar `status` |

## Flujo del agente (ModPack)

1. `python3 tools/db.py selection` y procesar solo `status == "wanted"`.
2. Descargar el mod desde `url`, respetar `assigned_slot`, `replace_slots`, `dependencies`, `conflicts` y `notes`.
3. Colocarlo en `ultimate/mods/...` según la estructura del ModPack (y quitar lo instalado en los slots de `replace_slots` que se reutilizan).
4. `python3 tools/db.py status <clave> installed|failed|skipped --result "<ruta o motivo>"`.
5. Volver a escanear lo instalado (ver arriba).
