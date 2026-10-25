# Contrato del plan (Firestore → instalador)

La página guarda **un plan global**: una propuesta por traje (`changes/{luchador}_{traje}`). El agente que instala (`GianZapata/Gian-Ultimate-Modpack-private`) o quien revisa a mano lo lee así:

```bash
python3 tools/db.py plan                                   # JSON del plan actual
python3 tools/db.py status <vid> installed|failed|skipped --result "<ruta o motivo>"   # anota el resultado
python3 tools/db.py migrate                                # pasa selection/main (modelo anterior) al plan, sin pisar nada
```

La misma estructura sale del botón **Más → Exportar el plan** de la página (`schema: 3`).

## Qué contiene

```json
{ "schema": 3, "generated_at": "...", "catalog": "<fecha del catálogo>",
  "inventory": { "verification": "parcial", "scanned_at": "...", "sources": [ ... ] },
  "target": { "game": "Super Smash Bros. Ultimate", "version": "13.0.5", "loader": "ARCropolis 4.1.1" },
  "changes": [ {
    "fighter": "Sora", "roster_no": "82", "traje": 1, "slot": "c00",
    "current":  { "kind": "original|mod|unknown", "name": "...", "source": "base|perfil|null", "confirmed": false },
    "proposal": { "vid": "82:330053", "mod_id": 330053, "name": "...", "author": "...", "url": "...", "online": "Online: lo declara el autor",
                  "conditions": null, "dependencies": null, "conflicts": null, "native_slots": "1,4", "dest_hint": "c01", "pack": null, "withdrawn": false },
    "missing_in_catalog": false, "vid": "82:330053", "status": "wanted", "result": null } ],
  "history": [ { "at": "...", "roster_no": "82", "traje": 1, "from": null, "to": "82:330053", "kind": "set" } ] }
```

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
| `perfil` | `data/inventory_profile.json` (curado a partir de la rama del perfil) | Archivos verificados en local; no probado en la Switch |
| `staged` | `tools/scan_branches.py` sobre ramas sin fusionar | Solo «en preparación»: no se afirma que esté instalado |

`meta/installed.verification` es `parcial` mientras no haya una comprobación en la consola. **Tras cada instalación:** reescanear (`scan_installed.py`, `scan_branches.py`), subir `data/` e `installed/` y ejecutar `python3 tools/db.py seed --only installed` (la Action lo hace en cada push si existe el secreto).

## Flujo del agente

1. `python3 tools/db.py plan` y procesar solo `status == "wanted"`.
2. Descargar desde `proposal.url`, respetar `traje`/`slot`, `dependencies`, `conflicts`, `conditions`.
3. Instalar en `ultimate/mods/...`, quitando lo que ocupaba ese slot si corresponde.
4. `python3 tools/db.py status <vid> installed|failed|skipped --result "..."`.
5. Reescanear el inventario y sembrar.
