#!/usr/bin/env bash
# Fail if npm pack would ship dev-only paths (bin/*.sh, bin/*.ts, tsconfigs, etc.).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f dist/cli.js ]]; then
	echo "check-npm-pack: run npm run build:cli first" >&2
	exit 1
fi

lock_resolved="$(node -e "
  const lock = require('./package-lock.json');
  const p = lock.packages?.['node_modules/@flesler/cursor-canvas-web']?.resolved ?? '';
  process.stdout.write(p);
")"
case "$lock_resolved" in
	https://registry.npmjs.org/*) ;;
	'')
		echo "check-npm-pack: missing lock entry for @flesler/cursor-canvas-web" >&2
		exit 1
		;;
	*)
		echo "check-npm-pack: @flesler/cursor-canvas-web must resolve from npm registry, not: $lock_resolved" >&2
		exit 1
		;;
esac

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
tgz_name="$(npm pack --pack-destination "$tmpdir" --silent)"
tgz="$tmpdir/$tgz_name"
list="$(tar -tzf "$tgz" | sed 's|^package/||')"

fail=0
while IFS= read -r path; do
	case "$path" in
		bin/*)
			if [[ "$path" != bin/open-canvas.js ]]; then
				echo "check-npm-pack: forbidden in tarball: $path" >&2
				fail=1
			fi
			;;
		scripts/* | example/* | docs/* | .github/* | .cursor/*)
			echo "check-npm-pack: forbidden in tarball: $path" >&2
			fail=1
			;;
		dist/scripts/* | dist/canvas-sdk-hash.js)
			echo "check-npm-pack: forbidden in tarball: $path" >&2
			fail=1
			;;
		src/vendor/skill-bundle/assets/sdk/*)
			echo "check-npm-pack: forbidden in tarball: $path" >&2
			fail=1
			;;
		tsconfig*.json)
			echo "check-npm-pack: forbidden in tarball: $path" >&2
			fail=1
			;;
	esac
done <<< "$list"

required=(
	bin/open-canvas.js
	dist/cli.js
	src/vendor/skill-bundle/SKILL.md
	vite.config.ts
)
for path in "${required[@]}"; do
	if ! grep -qxF "$path" <<< "$list"; then
		echo "check-npm-pack: missing required: $path" >&2
		fail=1
	fi
done

if [[ "$fail" -ne 0 ]]; then
	exit 1
fi
echo "check-npm-pack OK ($(wc -l <<< "$list") files)"
