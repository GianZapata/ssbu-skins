# ssbu-skins

Catálogo de uso personal de candidatos de skins para Super Smash Bros. Ultimate (Smash 13.0.5 / ARCropolis 4.1.1).

Los estados Wi-Fi safe son los estados de evidencia registrados en el catálogo, no afirmaciones probadas en consola. Cada mod enlaza a su página original en GameBanana y a su autor.

## Regenerar

```bash
python3 tools/build_viewer.py
```

Sin dependencias de red ni de Node: solo Python 3 (Pillow únicamente si existe `thumbs/`). Lee `data/catalog.json` y `tools/template.html`; escribe `index.html` en la raíz. El CSS y el JS van dentro de esa página, así que GitHub Pages no necesita CDN ni compilación.

Antes de generar, `python3 tools/validate_catalog.py` comprueba que el catálogo cumple `docs/AUDIT_CONTRACT.md`. Contrato de la selección: `docs/SELECTION_CONTRACT.md`.

No subir `node_modules/`, binarios ni CSS compilado al repo: el historial no se puede aligerar sin reescribirlo.
