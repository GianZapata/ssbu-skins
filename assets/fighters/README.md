# Procedencia de los retratos

Los 77 archivos WebP locales existentes se generaron con `tools/build_portraits.py`
a partir de `smash-ultimate-assets` 0.1.1. `sources.json` conserva su origen y el
SHA-256 de cada archivo local; las imágenes son arte de Nintendo distribuido en
ese paquete comunitario.

Cuando falta un retrato local, el proyector usa exclusivamente `image_url` de una
referencia oficial verificada de `data/catalog.json.original_refs`. Así se cubren
también los doce DLC 71–82. La URL debe pertenecer a
`https://www.smashbros.com/assets_v2/img/fighter/`; no se construyen URLs nuevas.
La procedencia completa de la referencia se conserva en `portrait_source`.

El retrato identifica al luchador. `original_ref` es una referencia separada,
limitada al `costume` que documenta: una referencia c00 no verifica c01–c07.
Pyra y Mythra comparten la imagen oficial del dúo, tal como indica su `scope`.

Los retratos remotos requieren conexión al sitio oficial. Los intentos de guardar
copias locales de los DLC durante esta revisión recibieron un rechazo del proxy
antes de la conexión TLS; no se desactivó su verificación ni se sustituyeron por
imágenes de mods.
