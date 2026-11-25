---
name: open-canvas
description: Read when generating canvas visuals from .canvas.tsx files.
---

# open-canvas

```bash
VENDOR=$(open-canvas vendor-path)
SUPERSET="$(cd "$(dirname "$VENDOR")/superset" && pwd)"
```

Types and `extra`: [typing](references/typing.md) when authoring props or charts.

## Where open-canvas differs from the vendor reference

|Topic|open-canvas|
|---|---|
|Canvas file path|Any `*.canvas.tsx` — not only IDE `…/canvases/`|
|Data|Sibling `./data/*` (json, yaml, tsv, csv, txt, md); optional `<stem>.canvas.data.json`|
|Typecheck|`open-canvas verify <file>`|
|See the page as text|`open-canvas outline <file>` — what each PDF page holds, sizes, text problems|
|Export|`open-canvas generate <file>` → `./out`|

```bash
open-canvas generate path/to/x.canvas.tsx --verify --formats html,png,pdf --theme light
open-canvas verify path/to/x.canvas.tsx          # typecheck only
open-canvas outline path/to/x.canvas.tsx
```

|Flag|Default|
|---|---|
|`-o`, `--out`|`./out` beside the canvas|
|`-n`, `--name`|Output basename (stem or title slug)|
|`-f`, `--formats`|`html,png,pdf` (+ `jpg`, `cursor`)|
|`-t`, `--theme`|`light`|
|`--brand`|`cursor`|
|`-w`, `--width`|Viewport width (`1280`)|
|`-q`, `--quiet`|No stdout on success|
|`--state key=value`|Override `useCanvasState` (repeatable; also on `outline`)|

PDF breaks, `--min-height`, print-only UI: [pdf](references/pdf.md).

`--selector` export subset; `--render-options` Playwright JSON. `jpg`/`pdf` need not list `html`; `html` artifact kept only when `html` in `--formats`. Cursor IDE file: `--formats cursor` (inlines `./data/*`; `--inline-state` embeds `.canvas.data.json`).

## Check the layout before exporting

`outline` renders the same print layout as `generate` and prints it as text, so you can check a canvas without opening a PNG:

1. `verify`, then `outline` with the flags you will export with (`--width`, `--min-height`, `--state`).
2. Fix every line under `TEXT` (each one names its page, position, and fix). Look for `⚠` on blocks: unreadable SVG text or a container with empty space at the bottom.
3. Check that each `PAGE` holds what you meant. To move a block to the next page, put `<div style={{ breakBefore: 'page' }} />` before it; aim for pages of similar height.
4. Follow the `PAGES` hint to choose `--min-height`: `max` gives every page the same size at the cost of blank space it reports; leave it unset to let each page keep its own height.
5. `generate` with the same flags.

Rerun `outline` with `--state key=value` to check other `useCanvasState` views (tabs, toggles). [outline](references/outline.md) covers what it cannot see.
