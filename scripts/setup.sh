#!/usr/bin/env bash
set -euo pipefail

# zum Projektwurzel wechseln
dirname="$(dirname "$0")"
cd "$dirname/.."

# Node-Version prüfen
NODE_MAJOR=$(node -v | sed -E 's/^v([0-9]+).*/\1/')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js >=20 erforderlich" >&2
  exit 1
fi

if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-lock.yaml ]; then
  PKG=pnpm
else
  PKG=npm
fi

if [ "$PKG" = pnpm ]; then
  pnpm install
  pnpm exec esbuild lib/gpx/parse.worker.ts --bundle --format=esm --outfile=public/parse.worker.js --platform=browser
else
  npm install
  npx esbuild lib/gpx/parse.worker.ts --bundle --format=esm --outfile=public/parse.worker.js --platform=browser
fi

echo "Setup abgeschlossen. Starte die Entwicklung mit '$PKG run dev'"
