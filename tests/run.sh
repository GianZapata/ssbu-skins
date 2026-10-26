#!/usr/bin/env bash
# Todas las pruebas, sobre lo mismo que se publica (_site):  tests/run.sh [--sin-webkit]
# Requisitos: Python 3.12+ con Pillow y google-cloud-firestore (pip install -r tests/requirements.txt), Node 20+, Java 17+ (emuladores).
# Para WebKit además: apt install webkit2gtk-driver xvfb libwebkit2gtk-4.1-0  y  pip install selenium (incluido en requirements.txt).
set -u
cd "$(dirname "$0")/.."
RC=0
echo "== catálogo y generación"; python3 tools/validate_catalog.py || exit 1
if [ ! -x node_modules/.bin/vite ]; then npm ci --no-audit --no-fund || exit 1; fi
npm run build && python3 tools/make_site.py || exit 1
echo "== dominio"; node --test tests/unit/test_domain.mjs tests/unit/sync_ordering.js || exit 1
echo "== dependencias de las pruebas"; (cd tests && npm ci --no-audit --no-fund >/dev/null && node build-fb-bundle.mjs) || exit 1
echo "== emuladores de Firebase (Auth + Firestore, reglas de firestore.rules)"
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:--Xmx3g}"
tests/node_modules/.bin/firebase emulators:start --only auth,firestore --project demo-ssbu >/tmp/ssbu-emulators.log 2>&1 & EMU=$!
trap 'kill $EMU 2>/dev/null; pkill -f cloud-firestore-emulator 2>/dev/null; true' EXIT
for i in $(seq 1 60); do curl -s localhost:8080 >/dev/null && break; sleep 2; done
curl -s localhost:8080 >/dev/null || { echo "los emuladores no arrancaron (ver /tmp/ssbu-emulators.log)"; exit 1; }
echo "== pruebas de datos y sincronización (Python)"; python3 -W ignore -m unittest discover -s tests/unit -v || RC=1
echo "== recorridos en Chromium (emulación móvil y escritorio) + emuladores"; node tests/e2e/run-all.js || RC=1
if [ "${VISUAL_EN_DOCKER:-}" = "1" ]; then
  echo "== capturas de referencia en el paso de la imagen de Playwright"
elif [ "$(uname -s)" = "Linux" ]; then
  echo "== capturas de referencia (Chromium en Linux)"; (cd tests && npx playwright test e2e/visual.spec.js) || RC=1
else echo "== capturas de referencia omitidas fuera de Linux (la línea base es ubuntu)"; fi
if [ "${1:-}" != "--sin-webkit" ] && command -v WebKitWebDriver >/dev/null; then
  echo "== dimensiones en WebKit (barra inferior, menú, contenido)"; bash tests/webkit/run.sh _site tests/.shots/webkit || RC=1
else echo "== WebKit omitido (sin WebKitWebDriver o --sin-webkit)"; fi
exit $RC
