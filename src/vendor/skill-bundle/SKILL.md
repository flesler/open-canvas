---
name: open-canvas
description: Read when generating canvas visuals from .canvas.tsx files.
---

# open-canvas

```bash
VENDOR=$(open-canvas vendor-path)
ls "$VENDOR/canvas-sdk"
```

Read **`$VENDOR/canvas/SKILL.md`** in full — workflow, design, pre-delivery checks. Read **`$VENDOR/canvas-sdk/index.d.ts`** and sibling **`.d.ts`** files when you need exact exports or prop shapes. Do not duplicate that guidance here.

## Where open-canvas differs from the vendor reference

|Topic|open-canvas|
|---|---|
|Canvas file path|Any `*.canvas.tsx` — not only IDE `…/canvases/`|
|Data|Sibling `./data/*` imports (json, yaml, tsv, csv); optional `<stem>.canvas.data.json` beside the canvas|
|Typecheck|`open-canvas verify <file>`|
|Export / preview|`open-canvas generate <file>` → `./out` (flags below)|

When not in the Cursor IDE, skip **Location**, **Introducing the canvas**, and **Troubleshooting** (managed `canvases/` path) in `$VENDOR/canvas/SKILL.md`.

```bash
open-canvas verify path/to/x.canvas.tsx
open-canvas generate path/to/x.canvas.tsx --formats html,png,pdf --theme light
```

|Flag|Default|
|---|---|
|`--out`|`./out` next to canvas|
|`--name`|Output basename without extension (default: canvas stem, else slug of `--title`)|
|`--formats`|`html,png,pdf` (+ `jpg`, `cursor`)|
|`--theme`|`light`|
|`--width`|Playwright viewport width (default `1280`)|
|`--override-height`|Playwright viewport height in px (default `900`)|
|`--cursor-out`|With `--formats cursor`, write the IDE file here instead of `out/<stem>.canvas.tsx`|
|`--render-options`|Playwright options JSON (`launch` / `page` / `screenshot` / `pdf`)|
|`--selector`|Export matched nodes only|

`jpg` / `pdf` do not require `html` in `--formats`; `out/<stem>.html` is kept only when `html` is listed. `--formats cursor` inlines `./data/*`; add `--inline-state` to embed `.canvas.data.json`.
