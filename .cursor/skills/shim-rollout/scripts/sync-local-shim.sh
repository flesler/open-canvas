#!/usr/bin/env bash
# Build @flesler/cursor-canvas-web and copy dist into open-canvas node_modules (local dev).
set -euo pipefail

OPEN_CANVAS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
SHIM_ROOT="${CURSOR_CANVAS_WEB_ROOT:-$OPEN_CANVAS_ROOT/../cursor-canvas-web}"
SHIM_PKG="$OPEN_CANVAS_ROOT/node_modules/@flesler/cursor-canvas-web"
TARGET="$SHIM_PKG/dist"
VENDOR_SRC="$SHIM_ROOT/src/vendor"
VENDOR_DST="$SHIM_PKG/src/vendor"
DRY_RUN=0

usage() {
	cat <<EOF
Usage: $(basename "$0") [--dry-run]

  CURSOR_CANVAS_WEB_ROOT  default: $OPEN_CANVAS_ROOT/../cursor-canvas-web
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--dry-run)
			DRY_RUN=1
			shift
			;;
		-h | --help)
			usage
			exit 0
			;;
		*)
			echo "unknown option: $1" >&2
			usage >&2
			exit 1
			;;
	esac
done

if [[ ! -d "$SHIM_ROOT" ]]; then
	echo "missing shim repo: $SHIM_ROOT" >&2
	exit 1
fi

if [[ $DRY_RUN -eq 1 ]]; then
	echo "would: (cd $SHIM_ROOT && pnpm run build:lib)"
	echo "would: cp -a $SHIM_ROOT/dist/. -> $TARGET/"
	exit 0
fi

if [[ ! -d "$OPEN_CANVAS_ROOT/node_modules/@flesler/cursor-canvas-web" ]]; then
	echo "run npm install in open-canvas first" >&2
	exit 1
fi

(cd "$SHIM_ROOT" && pnpm run build:lib)
mkdir -p "$TARGET"
cp -a "$SHIM_ROOT/dist/." "$TARGET/"
cp "$SHIM_ROOT/package.json" "$SHIM_PKG/package.json"
if [[ -d "$VENDOR_SRC" ]]; then
	rm -rf "$VENDOR_DST"
	cp -a "$VENDOR_SRC" "$VENDOR_DST"
	echo "synced src/vendor -> $VENDOR_DST"
fi
echo "synced shim dist -> $TARGET"
