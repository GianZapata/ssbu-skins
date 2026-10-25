# ssbu-skins

Catálogo de uso personal de candidatos de skins para Super Smash Bros. Ultimate (Smash 13.0.5 / ARCropolis 4.1.1).

Los estados Wi-Fi safe son los estados de evidencia registrados en el catálogo, no afirmaciones probadas en consola. Cada mod enlaza a su página original en GameBanana y a su autor.

## Regenerar

```bash
python3 tools/build_viewer.py
```

Necesita Pillow. Lee `data/catalog.json` y `tools/template.html`. Si existe `thumbs/<mod_id>.jpg`, incrusta esa foto (hasta 1280 px). Si no, la página apunta a GameBanana con `srcset` (220, 530 y el original) para que el navegador elija una imagen nítida. Escribe `index.html` en la raíz. El CSS va en esa página: GitHub Pages no necesita el CDN de Tailwind.
