#!/usr/bin/env bash
# Verify showcase, shim demo, and optional IDE-managed canvases under ~/.cursor/projects.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI=(node "$ROOT/dist/cli.js")
SHIM_ROOT="${CURSOR_CANVAS_WEB_ROOT:-$ROOT/../cursor-canvas-web}"

if [[ ! -f "$ROOT/dist/cli.js" ]]; then
	echo "verify-canvases: run npm run build:cli first" >&2
	exit 1
fi

verify_one() {
	local canvas="$1"
	local out
	if out="$("${CLI[@]}" verify "$canvas" 2>&1)"; then
		echo "OK  $canvas"
		return 0
	fi
	echo "FAIL $canvas" >&2
	echo "$out" | tail -8 >&2
	return 1
}

required_fail=0
optional_fail=0
optional_ok=0

for canvas in \
	"$ROOT/example/showcase.canvas.tsx" \
	"$SHIM_ROOT/.cursor/canvases/demo.canvas.tsx"; do
	if [[ -f "$canvas" ]]; then
		verify_one "$canvas" || required_fail=$((required_fail + 1))
	fi
done

while IFS= read -r -d '' canvas; do
	verify_one "$canvas" && optional_ok=$((optional_ok + 1)) || optional_fail=$((optional_fail + 1))
done < <(find "$HOME/.cursor/projects" -path '*/canvases/*.canvas.tsx' -print0 2>/dev/null || true)

echo "verify-canvases: required failures=$required_fail, IDE extras ok=$optional_ok fail=$optional_fail" >&2
[[ "$required_fail" -eq 0 ]]
