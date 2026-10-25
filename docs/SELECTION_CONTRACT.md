# Contrato `selection.json`

Puente entre este repo (selector de skins, móvil) y `GianZapata/Gian-Ultimate-Modpack-private` (instalación en la Switch).

- **Quién escribe:** la web (`index.html`) añade/quita ítems con `status: "wanted"`.
- **Quién lee:** los agentes del repo del ModPack, vía `https://raw.githubusercontent.com/GianZapata/ssbu-skins/master/selection.json` (o clonando este repo).
- **Quién actualiza el estado:** el agente que instala. La web conserva cualquier ítem cuyo `status` ya no sea `wanted`.

## Límites (`limits`)

El archivo incluye `limits.per_fighter` (8, o 7 si `keep_original_slot` es `true`) y `limits.keep_original_slot`. La web impide guardar más de ese máximo por luchador (los trajes Mii no cuentan). Con `keep_original_slot: true` el agente **no debe tocar el slot `c00`** del luchador, aunque el catálogo proponga `c00` como destino: en ese caso reubicar la skin en un `c01`–`c07` libre o marcarla `skipped` con el motivo en `result`.

## Lo ya instalado (`data/installed.json`) y `replace_slots`

`data/installed.json` lista, por luchador, los slots `cNN` que ya están ocupados en el ModPack (`ultimate/mods/*/fighter/<luchador>/model/body/cNN`). Lo genera `python3 tools/scan_installed.py <ruta del repo del ModPack>`, que además guarda en `installed/<luchador>_<NN>.webp` el retrato de cada slot (decodificado de `ui/replace*/chara/chara_N`) y, cuando el pack renombra el costume (`nam_chr1_<NN>_<luchador>` en `msg_name.xmsbt`), su nombre. `info[slot]` trae `n` (nombre), `skin` (tiene retrato propio: es una skin completa) e `i` (imagen). **El agente instalador debe volver a ejecutar el escáner y subir `data/installed.json` y `installed/` después de cada instalación.** Un slot sin retrato puede ser solo un ajuste de modelo; el escáner no identifica de qué skin se trata más allá del nombre.

La web cuenta esos slots dentro del máximo por luchador y avisa si una skin propone un slot ocupado. El usuario puede marcar un slot instalado como «reemplazar»; eso llega en `replace_slots` (`{"<roster_no>": [1, 3]}`). Un slot **solo se puede sobrescribir si aparece ahí**; cualquier otro slot ocupado debe respetarse.

## Ítem

| Campo | Significado |
|---|---|
| `key` | `<roster_no>:<mod_id>`, identificador único |
| `fighter`, `roster_no` | Luchador del catálogo |
| `mod_id`, `name`, `author`, `url` | Mod en GameBanana (`url` es la fuente de descarga) |
| `assigned_slot` | **Slot elegido por el usuario (o asignado automáticamente) donde debe quedar la skin** (`c00`…`c07`); `null` para trajes Mii. **El instalador debe usar este slot**, reubicando los archivos del mod si sus slots originales (`native_slots`) son otros |
| `order` | Posición de la skin dentro de su luchador, ordenada por `assigned_slot` (1…n) |
| `dest_slot` | Slot propuesto por el auditor (solo orientativo; no manda sobre `assigned_slot`); `null` si no auditado |
| `native_slots`, `assignment` | Slots originales del mod y estado de la asignación |
| `audited`, `wifi` | Estado de auditoría / evidencia Wi-Fi (no es prueba en consola) |
| `dependencies`, `conflicts`, `notes` | Avisos que el agente debe respetar al instalar |
| `status` | `wanted` → `installed` \| `failed` \| `skipped` |
| `selected_at` | Cuándo se eligió |
| `result`, `updated_at` | Solo los rellena el agente al cambiar `status` |

## Flujo del agente (ModPack)

1. Leer `selection.json`, procesar solo `status == "wanted"`.
2. Descargar el mod desde `url`, respetar `dest_slot`, `dependencies`, `conflicts` y `notes`.
3. Colocarlo en `ultimate/mods/...` según la estructura del ModPack.
4. Editar el ítem en `selection.json` de este repo: `status`, `result` (ruta instalada o motivo del fallo), `updated_at`.
