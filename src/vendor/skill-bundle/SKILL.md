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

`--selector` export subset (repeatable; matches stack into one image). To show part of a canvas in chat, export those sections instead of cropping the full PNG: `generate x.canvas.tsx -f png -o /tmp/oc -n part --selector "section:nth-of-type(6)" --selector "section:nth-of-type(7)"`. `--render-options` Playwright JSON. `jpg`/`pdf` need not list `html`; `html` artifact kept only when `html` in `--formats`. Cursor IDE file: `--formats cursor` (inlines `./data/*`; `--inline-state` embeds `.canvas.data.json`).

## Check the layout before exporting

`outline` prints the same print layout as `generate`, as text. Run it with your export flags (`--width`, `--min-height`, `--state`), fix every `TEXT` line and `⚠`, move blocks with `<div style={{ breakBefore: 'page' }} />` until each `PAGE` is one story of similar height, pick `--min-height` from the `PAGES` hint, then `generate` with the same flags. Targets and limits: [outline](references/outline.md).
