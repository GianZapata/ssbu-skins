# AGENTS.md — ssbu-skins

Web del plan de skins de Gian (https://ssbu-skins.vercel.app), el plan de slots y el espejo en Firestore (proyecto `ssbu-441b1`). Idioma: español.

**Si vas a instalar, quitar o mover una skin en la SD, lee primero `AGENTS.md` del repo `Gian-Ultimate-Modpack-private`** (en la Mac: `~/Desktop/ssbu/Gian-Ultimate-Modpack-private/AGENTS.md`). La SD solo cambia desde el perfil `gian-prs` de ese repo, con commit. Nunca a mano.

## Qué vive aquí

| Qué | Dónde |
|---|---|
| Plan de slots (lo que Gian aprobó por color) | `data/slot_plan.json`; informe en `docs/SLOTS.md` (`tools/slot_plan.py --check`: 0 errores) |
| Manifiesto del Drive | `data/drive.json`, de `tools/scan_drive.py "<My Drive/SSBU_mods>"` |
| Inventario instalado | `data/inventory_profile.json`, de `tools/scan_profile.py <ModPack>` contra `claude/vigilant-keller-6i5s1d` |

## Actualización obligatoria de los datos

- Al trabajar en descargas, instalaciones o sincronización, comprobar siempre la coherencia entre Drive, perfil instalado, plan y exportaciones. No esperar a que Gian detecte diferencias.
- En una auditoría de solo lectura, comprobar y señalar desfases; **no ejecutar generadores, builds ni sincronizaciones que escriban archivos o datos**. Los pasos siguientes corresponden a trabajo de actualización autorizado.
- Después de nuevas descargas o de instalar, retirar o mover skins, refrescar los datos afectados antes de dar el trabajo por terminado. No cambiar decisiones de slots solo para hacer pasar una validación.
- Resolver `SSBU_DRIVE` (carpeta local `SSBU_mods`), `MODPACK` (repo del modpack) y `MODPACK_REF` (ref local o commit que representa el último `MATCH`). No depender del valor por defecto `origin/claude/vigilant-keller-6i5s1d`, que puede estar atrasado. No cambiar el checkout de otra sesión.

Desde la raíz de este repo, con esas variables verificadas:

```sh
set -e
git -C "$MODPACK" rev-parse --verify "$MODPACK_REF^{commit}"
python3 tools/scan_drive.py "$SSBU_DRIVE"
# Actualizar data/slot_plan.json con los cambios aprobados e instalados antes de continuar.
# --check también regenera docs/SLOTS.md; no es una comprobación de solo lectura.
python3 tools/slot_plan.py --check
python3 tools/scan_profile.py "$MODPACK" --profile gian-prs --ref "$MODPACK_REF"
python3 tools/validate_catalog.py
npm run build
```

- No usar `--rehash` ni instalar dependencias por rutina. Ejecutar los generadores correspondientes a los datos afectados; si falta una ruta, dependencia o prueba, declarar el paso pendiente, no inventar éxito.
- Antes de escanear Drive, comprobar que la ruta contiene las carpetas de luchadores y archivos esperados; `isdir` no basta si el montaje quedó vacío. Si está inaccesible, vacío o incompleto, **no regenerar un manifiesto vacío o parcial**. Si la SD está desconectada, usar el último informe `MATCH` y su ref como evidencia histórica, sin afirmar que se revisó la tarjeta en vivo.
- Detenerse si cualquier comando devuelve un código distinto de 0; no continuar con exportaciones o publicación tras una comprobación fallida.
- Revisar `data/inventory_profile.json`: ref correcta, componentes y colores actuales, sin duplicados ni `unmapped_components`. Cruzar identificadores de GameBanana, componente, luchador, color y variante; contar carpetas o mirar fechas no basta.
- Comprobar que las descargas nuevas aparecen en `data/drive.json` y en las exportaciones/vistas previas que consume la web. Una descarga no instalada debe seguir diferenciada de una skin instalada; registrar archivos partidos o sin slots reconocidos, sin ocultar el desfase como si fuera solo una imagen ausente.

Antes de publicar, y **solo con autorización para usar el acceso administrativo al proyecto `ssbu-441b1`**, revisar los cambios remotos de las colecciones afectadas:

```sh
set -e
python3 tools/db.py seed --only catalog --dry-run
python3 tools/db.py seed --only drive --dry-run
python3 tools/db.py seed --only slots --dry-run
python3 tools/db.py seed --only installed --dry-run
```

- `db.py` usa credenciales administrativas: una autorización para consultar la web pública no autoriza este acceso. No descubrir ni reutilizar cuentas o credenciales guardadas sin permiso.
- No publicar con errores, componentes sin mapear, datos de origen incompletos o borrados inesperados en el dry-run. `seed` sin `--dry-run` reemplaza documentos y puede borrar datos: no ejecutarlo ni lanzar el workflow sin autorización de publicación. Fusionar y enviar cambios de catálogo, Drive o slots a `master` dispara ese workflow automáticamente: también requiere autorización de publicación.
- Tras una publicación autorizada, comprobar en Firestore las colecciones y metadatos publicados contra los archivos revisados, no solo `updatedAt`. Para el inventario, el workflow requiere `sync_inventory=true`. Preservar `changes`, `history` y `status`.
- Si la publicación no está autorizada o falta alguna comprobación, cerrar indicando **«datos locales actualizados; Firebase pendiente»** solo cuando los datos locales realmente se hayan regenerado y validado. No afirmar que web, Firebase y SD están sincronizados sin comprobarlo.

## Publicación en Firestore

- El catálogo, el Drive y el plan de slots se copian solos al fusionar en `master` (`publish.yml`).
- El inventario no: después de revisarlo, `publish.yml` por `workflow_dispatch` con `sync_inventory=true`.
- Antes de escribir a mano, y con acceso administrativo autorizado, `python3 tools/db.py seed --only <x> --dry-run`. El seed borra documentos que ya no están en el repo.
- `seed` nunca toca `changes`, `history` ni `status`: son las propuestas de la web.

## Al terminar

- El inventario debe coincidir con la SD: si la SD cambió, actualiza el plan y vuelve a escanear el perfil con la ref verificada. Sincroniza solo con autorización; si falta, informa que Firebase queda pendiente.
- Un cambio sin PR fusionado no existe para la siguiente sesión. Esto no autoriza a fusionar, enviar ni publicar sin permiso.
