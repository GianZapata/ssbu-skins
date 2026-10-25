#!/usr/bin/env bash
# Ejecuta la auditoría de WebKit sobre una carpeta publicada. Requiere: apt install webkit2gtk-driver xvfb libwebkit2gtk-4.1-0 ; pip install selenium
# Uso: tests/webkit/run.sh <carpeta con index.html (por defecto _site)> <salida de capturas>      (PY=ruta al python con selenium)
set -u
SITE="$(cd "${1:-_site}" && pwd)"; OUT="${2:-tests/.shots/webkit}"; PORT=$((8700 + RANDOM % 200)); HERE="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
cp "$HERE/harness.html" "$SITE/harness.html"
python3 -m http.server "$PORT" --directory "$SITE" >/dev/null 2>&1 & HP=$!
trap 'kill $HP 2>/dev/null; rm -f "$SITE/harness.html"; pkill -x MiniBrowser 2>/dev/null; true' EXIT
sleep 1
export PORT OUT HERE PYBIN="${PY:-python3}"
xvfb-run -a -s "-screen 0 1400x1100x24" bash -c 'WebKitWebDriver --port=4444 >/tmp/wkdriver.log 2>&1 & DP=$!; sleep 3; "$PYBIN" "$HERE/audit.py" "http://127.0.0.1:$PORT/index.html" "$OUT" --json "$OUT/audit.json"; R=$?; kill $DP 2>/dev/null; exit $R'
