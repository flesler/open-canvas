#!/usr/bin/env bash
# open-canvas verify on fixtures (showcase + optional shim demo when sibling repo exists).
# Shim SDK export parity lives in cursor-canvas-web CI, not here.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHIM_ROOT="${CURSOR_CANVAS_WEB_ROOT:-$ROOT/../cursor-canvas-web}"
DEFAULT_FIXTURES="$ROOT/example/showcase.canvas.tsx"
DEMO_CANVAS="$SHIM_ROOT/.cursor/canvases/demo.canvas.tsx"
if [[ -f "$DEMO_CANVAS" ]]; then
	DEFAULT_FIXTURES="$DEFAULT_FIXTURES $DEMO_CANVAS"
fi
FIXTURES="${CANVAS_CONTRACT_FIXTURES:-$DEFAULT_FIXTURES}"

for canvas in $FIXTURES; do
	if [[ ! -f "$canvas" ]]; then
		echo "contract: missing fixture $canvas" >&2
		exit 1
	fi
	echo "contract: verify $canvas"
	node "$ROOT/bin/open-canvas.js" verify "$canvas"
done

echo "contract: OK"
