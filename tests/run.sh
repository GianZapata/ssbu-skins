#!/usr/bin/env bash
# Todas las pruebas, sobre lo mismo que se publica (_site):  tests/run.sh [--sin-webkit]
# Requisitos: Python 3.12+ con Pillow y google-cloud-firestore (pip install -r tests/requirements.txt), Node 20+, Java 17+ (emuladores).
# Para WebKit además: apt install webkit2gtk-driver xvfb libwebkit2gtk-4.1-0  y  pip install selenium (incluido en requirements.txt).
set -u
cd "$(dirname "$0")/.."
RC=0
echo "== catálogo y generación"; python3 tools/validate_catalog.py && python3 tools/build_viewer.py && python3 tools/make_site.py || exit 1
echo '== orden de confirmaciones y snapshots'; node --test tests/unit/sync_ordering.js || exit 1
echo "== dependencias de las pruebas"; (cd tests && npm ci --no-audit --no-fund >/dev/null && node build-fb-bundle.mjs) || exit 1
echo "== emuladores de Firebase (Auth + Firestore, reglas de firestore.rules)"
if curl --fail --silent http://127.0.0.1:8080 >/dev/null; then
  echo 'El puerto 8080 ya tiene un servicio. Detén tu emulador antes de ejecutar esta suite aislada.'; exit 1
fi
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:--Xmx3g}"
tests/node_modules/.bin/firebase emulators:start --only auth,firestore --project demo-ssbu >/tmp/ssbu-emulators.log 2>&1 & EMU=$!
trap 'kill -INT "$EMU" 2>/dev/null; wait "$EMU" 2>/dev/null; true' EXIT
for i in $(seq 1 60); do curl -s localhost:8080 >/dev/null && break; sleep 2; done
curl -s localhost:8080 >/dev/null || { echo "los emuladores no arrancaron (ver /tmp/ssbu-emulators.log)"; exit 1; }
echo "== pruebas de datos y sincronización (Python)"; python3 -W ignore -m unittest discover -s tests/unit -v || RC=1
echo "== recorridos en Chromium (emulación móvil y escritorio) + emuladores"; node tests/e2e/run-all.js || RC=1
if [ "${1:-}" != "--sin-webkit" ] && command -v WebKitWebDriver >/dev/null; then
  echo "== dimensiones en WebKit (barra inferior, menú, contenido)"; bash tests/webkit/run.sh _site tests/.shots/webkit || RC=1
else echo "== WebKit omitido (sin WebKitWebDriver o --sin-webkit)"; fi
if [ "${1:-}" != "--sin-webkit" ]; then
  echo '== recorridos de interacción en WebKit'; node tests/e2e/webkit-journeys.js || RC=1
fi
exit $RC
