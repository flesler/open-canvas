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
|Layout map|`open-canvas outline <file>` — stdout (path to [outline](references/outline.md) on line 2 if needed)|
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

PDF breaks, `--min-height`, print-only UI: [pdf](references/pdf.md).

`--selector` export subset; `--render-options` Playwright JSON. `jpg`/`pdf` need not list `html`; `html` artifact kept only when `html` in `--formats`. Cursor IDE file: `--formats cursor` (inlines `./data/*`; `--inline-state` embeds `.canvas.data.json`).

## outline
