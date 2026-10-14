#!/usr/bin/env bash
# Static showcase for GitHub Pages only (.cache/github-pages).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/.cache/github-pages"
CANVAS="$ROOT/example/showcase.canvas.tsx"
if [[ ! -f "$ROOT/dist/cli.js" ]]; then
	echo "build-github-pages: run npm run build:cli first" >&2
	exit 1
fi

OC=(node "$ROOT/dist/cli.js")
rm -rf "$OUT"
# --out is relative to the canvas file (example/).
"${OC[@]}" generate "$CANVAS" --formats html --out ../.cache/github-pages --name index --theme light --title 'Open Canvas — SDK Showcase'
"${OC[@]}" generate "$CANVAS" --formats html --out ../.cache/github-pages --name dark --theme dark --title 'Open Canvas — SDK Showcase (dark)'

echo "github-pages: $OUT"
