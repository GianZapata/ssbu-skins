# Contrato `selection.json`

Puente entre este repo (selector de skins, móvil) y `GianZapata/Gian-Ultimate-Modpack-private` (instalación en la Switch).

- **Quién escribe:** la web (`index.html`) añade/quita ítems con `status: "wanted"`.
- **Quién lee:** los agentes del repo del ModPack, vía `https://raw.githubusercontent.com/GianZapata/ssbu-skins/master/selection.json` (o clonando este repo).
- **Quién actualiza el estado:** el agente que instala. La web conserva cualquier ítem cuyo `status` ya no sea `wanted`.

## Límites (`limits`)

El archivo incluye `limits.per_fighter` (8, o 7 si `keep_original_slot` es `true`) y `limits.keep_original_slot`. La web impide guardar más de ese máximo por luchador (los trajes Mii no cuentan). Con `keep_original_slot: true` el agente **no debe tocar el slot `c00`** del luchador, aunque el catálogo proponga `c00` como destino: en ese caso reubicar la skin en un `c01`–`c07` libre o marcarla `skipped` con el motivo en `result`.

## Ítem

| Campo | Significado |
|---|---|
| `key` | `<roster_no>:<mod_id>`, identificador único |
| `fighter`, `roster_no` | Luchador del catálogo |
| `mod_id`, `name`, `author`, `url` | Mod en GameBanana (`url` es la fuente de descarga) |
| `dest_slot` | Slot de destino propuesto (`c00`…`c07`); `null` si no auditado |
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
