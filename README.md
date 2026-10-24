# ssbu-skins

Catálogo de uso personal de candidatos de skins para Super Smash Bros. Ultimate (Smash 13.0.5 / ARCropolis 4.1.1).

Los estados Wi-Fi safe son los estados de evidencia registrados en el catálogo, no afirmaciones probadas en consola. Cada mod enlaza a su página original en GameBanana y a su autor.

## Regenerar

```bash
python3 tools/build_viewer.py
```

Necesita Pillow. Lee `data/catalog.json` y `tools/template.html`. Si existe `thumbs/<mod_id>.jpg`, incrusta esa miniatura; si no, usa las URLs remotas de `preview_images`. Escribe `index.html` en la raíz.
