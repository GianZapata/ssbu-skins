# El Drive de mods y su historial

Los archivos de los mods (`.zip`, `.rar`, `.7z`) viven en el Drive, en `My Drive/SSBU_mods`. No se suben a git: son de terceros, pesan cientos de MB y el historial no se puede aligerar sin reescribirlo. Lo que sí entra a git es `data/drive.json`, un manifiesto con cada archivo, su tamaño, su MD5 y los slots que trae. Cada commit de ese archivo es el historial del Drive: cuándo entró un mod, qué archivo exacto era y qué cambió.

## Estructura del Drive

```
SSBU_mods/
  <luchador>/<id de GameBanana>_<nombre>/
    LINK.txt        enlace a la página del mod
    NOTA.txt        opcional: qué archivo se eligió y por qué
    original/       los archivos tal como se descargaron
    modificado/     opcional: versiones recortadas o reslotteadas, con su CAMBIOS.txt
  _plugins/<id>_<nombre>/...   plugins (One Slot Effects, etc.)
  _ui/<id>_<nombre>/...        UI/CSS (banners, pantalla de selección)
  _musica/<id>_<nombre>/...    packs de música (bgm)
  _respaldos/       copias de Firestore (no entran al manifiesto)
```

La carpeta del luchador va en inglés y en `snake_case` (`zero_suit_samus`, `captain_falcon`, `dr_mario`). La lista completa está en `FOLDERS` de `tools/scan_drive.py`; una carpeta desconocida se escanea igual, con un aviso y sin luchador.

## Agregar una skin

1. Descarga el mod a `SSBU_mods/<luchador>/<id>_<nombre>/original/` y crea su `LINK.txt`.
2. Regenera el manifiesto: `python3 tools/scan_drive.py "<ruta a SSBU_mods>"`. Solo calcula el MD5 de los archivos nuevos o con otro tamaño (`--rehash` recalcula todo).
3. Revisa el diff de `data/drive.json`: slots (`slots`, `touches_c00`), archivos sin listar (`listed: false` y su motivo) y si el mod ya está en el catálogo (`catalog`).
4. Commit y PR. Al fusionar en `master`, la Action *Sincronizar Firestore* corre `db.py seed --only drive` y la web lo puede leer.

Los slots de los `.zip` se leen con `zipfile` y los de los `.rar` y `.7z` con `7zz l` (sevenzip: `brew install sevenzip`); solo lista, nunca extrae. Cada archivo listado lleva `files_count` y `non_slot`: rutas de efectos, `motion`, `param`, `.prc`, `config.json`, `ui_chara_db.prcxml`, `msg_name.xmsbt` o música que no llevan slot `cNN`, o sea, candidatos a archivos globales. Si no hay `7zz` o falla, el archivo queda como `listed: false` con su motivo (`rar/7z sin herramienta para listar` o `rar/7z no se pudo listar`), igual que los zip partidos (`.zip.part01`).

## Escribir en Firestore a mano

Antes de cualquier `seed` manual, mira qué cambiaría:

```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.secrets/ssbu-441b1.json ~/.venvs/ssbu/bin/python tools/db.py seed --only drive --dry-run
```

`seed` borra los documentos de la colección que ya no existen en local; `--dry-run` lista los que se crean, cambian y borran sin escribir nada. `--only all` no incluye el Drive.

## Respaldo del plan

El catálogo, el inventario y el Drive salen del repositorio: si se pierden en Firestore, se vuelven a sembrar. El plan compartido (`changes`), su historial (`history`) y los resultados de instalación (`status`) **solo existen en Firestore**. Para guardarlos:

```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.secrets/ssbu-441b1.json ~/.venvs/ssbu/bin/python tools/db.py backup
```

Escribe un JSON por colección en `data/plan_backup/` (solo lee Firestore). Haz commit del resultado para tenerlo en el historial, y copia la carpeta a `SSBU_mods/_respaldos/firestore/` si quieres otra copia en el Drive.

## Copia de los archivos

El Drive es la copia principal de los binarios. Para una segunda copia (disco externo o la propia microSD), el MD5 de `data/drive.json` permite comprobar que cada archivo copiado es el mismo.

## Reportes

Los reportes de triage del Drive están en `docs/drive/` (`PENDIENTES_SLOTS.md`, `REPORT_DBZ.md`, `SLOT_BASE_C00.md`, `C00_EXCLUIR_WUBOY.txt`). La regla de `SLOT_BASE_C00.md` quedó descartada; se conserva como referencia de qué mods tocan c00.

## Plan de slots

`data/slot_plan.json` guarda las decisiones de Gian: qué mod va en cada slot de cada luchador, y el orden de prioridad (`priority`; un grupo `["79", "80"]` comparte posición). Cada slot decidido lleva `state` (`mod`, `wuboy` o `vanilla`), `source` (`drive`, `profile`, `wuboy` o `vanilla`), `mod_id`, `file` (ruta dentro del Drive), `reslot_from` (slot nativo, si se mueve), `approved` (`false` = propuesta) y una `nota` opcional. Se edita a mano; un slot que no aparece cuenta como «sin decidir».

```bash
python3 tools/slot_plan.py            # regenera docs/SLOTS.md (no editarlo a mano)
python3 tools/slot_plan.py --check    # además valida las decisiones
python3 tools/db.py seed --only slots --dry-run   # qué cambiaría en Firestore (colección slot_plan)
```

`docs/SLOTS.md` cruza lo que hay hoy (WuBoy, componentes del perfil, skin original) con las decisiones y lista, por luchador y en orden de prioridad, los slots resueltos y los abiertos, más los mods del Drive sin asignar. `--check` falla (exit 1) si un mod no está en `drive.json`, si `reslot_from` no coincide con los slots que trae el archivo, si falta `reslot_from` en un mod fuera de su slot nativo, si una decisión `wuboy` o `profile` no existe en el inventario, si hay un slot fuera de 0–7 o repetido. Avisa (exit 0) de archivos sin listar, de skins de WuBoy que se reemplazan y de mods del Drive sin asignar en luchadores con decisiones aprobadas.
