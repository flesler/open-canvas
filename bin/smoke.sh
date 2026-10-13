#!/usr/bin/env bash
# End-to-end smoke: canvas outside the package tree + prod install (--omit=dev).
#
#   npm run build:cli && npm run test:smoke
#
# Not part of `npm test` (slower, needs full dist + pack).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI=(node "$ROOT/dist/cli.js")

if [[ ! -f "$ROOT/dist/cli.js" ]]; then
	echo "smoke: missing dist/cli.js — run npm run build:cli first" >&2
	exit 1
fi

stage_external() {
	local dest="$1"
	mkdir -p "$dest"
	cp "$ROOT/example/build-plane.canvas.tsx" "$dest/"
	cp -r "$ROOT/example/data" "$dest/data"
}

echo "== smoke: verify + generate (canvas in /tmp) =="
EXTERNAL="$(mktemp -d /tmp/open-canvas-smoke-external-XXXXXX)"
stage_external "$EXTERNAL"
"${CLI[@]}" verify "$EXTERNAL/build-plane.canvas.tsx"
"${CLI[@]}" generate "$EXTERNAL/build-plane.canvas.tsx" --formats html
test -f "$EXTERNAL/out/build-plane.html"
rm -rf "$EXTERNAL"

echo "== smoke: npm pack + install (--omit=dev) =="
TARBALL_DIR="$(mktemp -d /tmp/open-canvas-smoke-pack-XXXXXX)"
npm pack --pack-destination "$TARBALL_DIR" --silent
TARBALL="$(ls "$TARBALL_DIR"/flesler-open-canvas-*.tgz | head -1)"

PACK_DIR="$(mktemp -d /tmp/open-canvas-smoke-install-XXXXXX)"
(
	cd "$PACK_DIR"
	npm init -y >/dev/null
	npm install "$TARBALL" --omit=dev

	printf '%s\n' \
		'import { Stack } from "cursor/canvas"' \
		'export default function T() { return <Stack /> }' \
		> smoke.canvas.tsx
	npx --yes open-canvas verify smoke.canvas.tsx

	EXT="$(mktemp -d /tmp/open-canvas-smoke-pack-ext-XXXXXX)"
	stage_external "$EXT"
	npx --yes open-canvas verify "$EXT/build-plane.canvas.tsx"
	npx --yes open-canvas generate "$EXT/build-plane.canvas.tsx" --formats html
	test -f "$EXT/out/build-plane.html"
)

rm -rf "$TARBALL_DIR" "$PACK_DIR"
echo "smoke OK"
