#!/usr/bin/env bash
# Contract smoke: shim export parity (fork repo) + open-canvas verify on fixtures.
# Fixtures: showcase (./data imports) + fork demo (cursor emit) when sibling repo exists.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHIM_ROOT="${CURSOR_CANVAS_WEB_ROOT:-$ROOT/../cursor-canvas-web}"
DEFAULT_FIXTURES="$ROOT/example/showcase.canvas.tsx"
DEMO_CANVAS="$SHIM_ROOT/.cursor/canvases/demo.canvas.tsx"
if [[ -f "$DEMO_CANVAS" ]]; then
	DEFAULT_FIXTURES="$DEFAULT_FIXTURES $DEMO_CANVAS"
fi
FIXTURES="${CANVAS_CONTRACT_FIXTURES:-$DEFAULT_FIXTURES}"

if [[ -d "$SHIM_ROOT" ]]; then
	echo "contract: cursor-canvas-web at $SHIM_ROOT"
	if [[ "${OPEN_CANVAS_CONTRACT_FAST:-}" == 1 ]]; then
		(cd "$SHIM_ROOT" && pnpm run check:sdk-exports)
	else
		(cd "$SHIM_ROOT" && pnpm run test:contract)
	fi
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
