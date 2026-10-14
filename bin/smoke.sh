#!/usr/bin/env bash
# End-to-end smoke: canvas outside the package tree + prod install (--omit=dev).
#
#   npm run build:cli && npm run test:smoke              # local dist + npm pack (default)
#   npm run test:smoke:global                            # @flesler/open-canvas@latest (global prefix)
#   bin/smoke.sh --both                                  # all of the above
#
# Not part of `npm test` (slower, needs full dist + pack unless --global only).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE=pack
SHOWCASE=showcase.canvas.tsx

usage() {
	cat <<EOF
Usage: $(basename "$0") [--pack | --global | --both]

  --pack    Local dist/cli.js + npm pack install (default)
  --global  npm install -g @flesler/open-canvas@latest (isolated prefix)
  --both    --pack and --global
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--pack)
			MODE=pack
			shift
			;;
		--global)
			MODE=global
			shift
			;;
		--both)
			MODE=both
			shift
			;;
		-h | --help)
			usage
			exit 0
			;;
		*)
			echo "smoke: unknown option: $1" >&2
			usage >&2
			exit 1
			;;
	esac
done

stage_external() {
	local dest="$1"
	mkdir -p "$dest"
	cp "$ROOT/example/$SHOWCASE" "$dest/"
	cp "$ROOT/example/showcase.canvas.data.json" "$dest/"
	cp -r "$ROOT/example/data" "$dest/data"
}

run_with_open_canvas() {
	local label="$1"
	shift
	local -a OC=("$@")

	echo "== smoke ($label): verify + generate (canvas in /tmp) =="
	local external
	external="$(mktemp -d /tmp/open-canvas-smoke-external-XXXXXX)"
	stage_external "$external"
	"${OC[@]}" verify "$external/$SHOWCASE"
	"${OC[@]}" generate "$external/$SHOWCASE" --formats html --theme light
	test -f "$external/out/showcase.html"
	rm -rf "$external"
}

run_local_dist() {
	if [[ ! -f "$ROOT/dist/cli.js" ]]; then
		echo "smoke: missing dist/cli.js — run npm run build:cli first" >&2
		exit 1
	fi
	run_with_open_canvas "local dist" node "$ROOT/dist/cli.js"
}

run_pack_install() {
	echo "== smoke: npm pack + install (--omit=dev) =="
	local tarball_dir tarball pack_dir
	tarball_dir="$(mktemp -d /tmp/open-canvas-smoke-pack-XXXXXX)"
	npm pack --pack-destination "$tarball_dir" --silent
	tarball="$(ls "$tarball_dir"/flesler-open-canvas-*.tgz | head -1)"

	pack_dir="$(mktemp -d /tmp/open-canvas-smoke-install-XXXXXX)"
	(
		cd "$pack_dir"
		npm init -y >/dev/null
		local shim_root="${CURSOR_CANVAS_WEB_ROOT:-$ROOT/../cursor-canvas-web}"
		local shim_spec
		shim_spec="$(node -e "const v=require('$ROOT/package.json').dependencies['@flesler/cursor-canvas-web'];process.stdout.write(v||'')")"
		if [[ -f "$shim_root/package.json" ]] && [[ "$shim_spec" != file:* ]]; then
			if ! npm view "@flesler/cursor-canvas-web@${shim_spec#^}" version &>/dev/null; then
				local shim_name shim_tgz
				shim_name="$(npm pack "$shim_root" --pack-destination "$tarball_dir" --silent)"
				shim_tgz="$tarball_dir/$shim_name"
				npm install "$shim_tgz" --omit=dev
			fi
		fi
		if [[ "$shim_spec" == file:* ]]; then
			local shim_name shim_tgz
			shim_name="$(npm pack "$shim_root" --pack-destination "$tarball_dir" --silent)"
			shim_tgz="$tarball_dir/$shim_name"
			npm install "$shim_tgz" --omit=dev
		fi
		npm install "$tarball" --omit=dev

		printf '%s\n' \
			'import { Stack } from "cursor/canvas"' \
			'export default function T() { return <Stack /> }' \
			> smoke.canvas.tsx
		npx --yes open-canvas verify smoke.canvas.tsx

		local ext
		ext="$(mktemp -d /tmp/open-canvas-smoke-pack-ext-XXXXXX)"
		stage_external "$ext"
		npx --yes open-canvas verify "$ext/$SHOWCASE"
		npx --yes open-canvas generate "$ext/$SHOWCASE" --formats html --theme light
		test -f "$ext/out/showcase.html"
		rm -rf "$ext"
	)

	rm -rf "$tarball_dir" "$pack_dir"
}

run_global_latest() {
	echo "== smoke: npm install -g @flesler/open-canvas@latest (isolated prefix) =="
	local prefix_dir
	prefix_dir="$(mktemp -d /tmp/open-canvas-smoke-global-XXXXXX)"
	npm install -g @flesler/open-canvas@latest --prefix "$prefix_dir" --silent

	local oc="$prefix_dir/bin/open-canvas"
	if [[ ! -x "$oc" ]]; then
		echo "smoke: expected global bin at $oc" >&2
		rm -rf "$prefix_dir"
		exit 1
	fi

	run_with_open_canvas "npm @latest" "$oc"
	rm -rf "$prefix_dir"
}

case "$MODE" in
	pack)
		run_local_dist
		run_pack_install
		;;
	global)
		run_global_latest
		;;
	both)
		run_local_dist
		run_pack_install
		run_global_latest
		;;
esac

echo "smoke OK"
