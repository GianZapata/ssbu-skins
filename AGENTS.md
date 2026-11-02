# AGENTS.md — ssbu-skins

Web del plan de skins de Gian (https://ssbu-skins.vercel.app), el plan de slots y el espejo en Firestore (proyecto `ssbu-441b1`). Idioma: español.

**Si vas a instalar, quitar o mover una skin en la SD, lee primero `AGENTS.md` del repo `Gian-Ultimate-Modpack-private`** (en la Mac: `~/Desktop/ssbu/Gian-Ultimate-Modpack-private/AGENTS.md`). La SD solo cambia desde el perfil `gian-prs` de ese repo, con commit. Nunca a mano.

## Qué vive aquí

| Qué | Dónde |
|---|---|
| Plan de slots (lo que Gian aprobó por color) | `data/slot_plan.json`; informe en `docs/SLOTS.md` (`tools/slot_plan.py --check`: 0 errores) |
| Manifiesto del Drive | `data/drive.json`, de `tools/scan_drive.py "<My Drive/SSBU_mods>"` |
| Inventario instalado | `data/inventory_profile.json`, de `tools/scan_profile.py <ModPack>` contra `claude/vigilant-keller-6i5s1d` |

## Firestore

- El catálogo, el Drive y el plan de slots se copian solos al fusionar en `master` (`publish.yml`).
- El inventario no: después de revisarlo, `publish.yml` por `workflow_dispatch` con `sync_inventory=true`.
- Antes de escribir a mano, `python3 tools/db.py seed --only <x> --dry-run`. El seed borra documentos que ya no están en el repo.
- `seed` nunca toca `changes`, `history` ni `status`: son las propuestas de la web.

## Al terminar

- El inventario debe coincidir con la SD: si la SD cambió, vuelve a escanear el perfil y sincroniza.
- Un cambio sin PR fusionado no existe para la siguiente sesión.
