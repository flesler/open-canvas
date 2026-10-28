#!/usr/bin/env bash
# Dev-only: export showcase JPG + crop charts band for agent visual check (low token cost).
set -euo pipefail

OPEN_CANVAS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE="$OPEN_CANVAS_ROOT/.cache"
FULL="$CACHE/showcase-verify-full.jpg"
CROP="$CACHE/showcase-charts-verify.jpg"
# 1280×900 viewport, charts tab band (update if showcase layout moves)
CROP_GEOM="${SHOWCASE_CROP_GEOM:-1240x380+20+340}"

SKIP_SYNC=0
DRY_RUN=0

usage() {
	cat <<EOF
Usage: $(basename "$0") [--skip-sync] [--dry-run]

  Writes $CROP (and full JPG). Agent: Read the crop and confirm charts look correct.

  SHOWCASE_CROP_GEOM  ImageMagick crop (default: $CROP_GEOM)
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--skip-sync)
			SKIP_SYNC=1
			shift
			;;
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

if [[ $DRY_RUN -eq 1 ]]; then
	echo "would: sync-local-shim (unless --skip-sync)"
	echo "would: build:cli + generate jpg -> $FULL"
	echo "would: magick -crop $CROP_GEOM -> $CROP"
	exit 0
fi

if [[ $SKIP_SYNC -eq 0 ]]; then
	"$SKILL_DIR/scripts/sync-local-shim.sh"
fi

mkdir -p "$CACHE"
cd "$OPEN_CANVAS_ROOT"
npm run build:cli
node dist/cli.js generate example/showcase.canvas.tsx \
	--title 'Open Canvas — SDK Showcase' \
	--formats jpg \
	--theme light \
	--width 1280 \
	--selector '#section-charts'
cp example/out/showcase.jpg "$FULL"
magick "$FULL" -crop "$CROP_GEOM" +repage -quality 88 "$CROP"
echo "→ $CROP (read this for visual verify)"
