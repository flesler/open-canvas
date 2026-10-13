#!/usr/bin/env bash
# Contract smoke: shim export parity + open-canvas verify on fixture canvases.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHIM_ROOT="${CURSOR_CANVAS_WEB_ROOT:-$ROOT/../cursor-canvas-web}"
FIXTURES="${CANVAS_CONTRACT_FIXTURES:-$ROOT/example/build-plane.canvas.tsx}"

if [[ -d "$SHIM_ROOT" ]]; then
	echo "contract: cursor-canvas-web at $SHIM_ROOT"
	(cd "$SHIM_ROOT" && pnpm run test:contract)
else
	echo "contract: skip shim (no dir at $SHIM_ROOT); set CURSOR_CANVAS_WEB_ROOT" >&2
fi

for canvas in $FIXTURES; do
	if [[ ! -f "$canvas" ]]; then
		echo "contract: missing fixture $canvas" >&2
		exit 1
	fi
	echo "contract: verify $canvas"
	node "$ROOT/bin/open-canvas.js" verify "$canvas"
done

echo "contract: OK"
