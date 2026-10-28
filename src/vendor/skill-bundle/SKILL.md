---
name: open-canvas
description: Read when generating canvas visuals from .canvas.tsx files.
---

# open-canvas

```bash
npm install -g @flesler/open-canvas
open-canvas skill ~/.cursor/skills/open-canvas
```

**Next:** read **[`./references/canvas.md`](./references/canvas.md)** in full (same as Cursor `/canvas`): when to use a canvas, design, SDK types, intro/troubleshooting.

**open-canvas overrides** (below beat the reference’s **Location** and **File rules** for path, data imports, and verify/generate): use any `.canvas.tsx` path, sibling `./data/*` imports, and the CLI commands in this file. Keep everything else from the reference.

## CLI (not in canvas reference)

|IDE|open-canvas|
|---|---|
|`…/canvases/*.canvas.tsx`|any path|
|data inline only|`import` sibling `./data/*` (json, yaml, tsv, csv)|
|`.canvas.data.json` host state|beside the canvas; `generate` inlines into the bundle; `cursor --inline-state` for one file|
|IDE typecheck|`open-canvas verify <file>`|
|IDE preview|`open-canvas generate <file>` → `out/`|

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
|`--override-height`|Playwright viewport height in px (default `900`). PNG/JPG use `fullPage`; PDF page height is content `scrollHeight`.|
|`--cursor-out`|With `--formats cursor`, write the inlined IDE file here instead of `out/<stem>.canvas.tsx`|
|`--render-options`|Optional JSON file; Playwright `launch` / `page` / `screenshot` / `pdf`|
|`--selector`|CSS selector(s); export matched nodes only|

**Formats:** `jpg` / `pdf` do not require listing `html` — Vite still builds under `out/_build/` for Playwright; `out/<stem>.html` is kept only when `html` is in `--formats`.

**Shim:** npm install includes `@flesler/cursor-canvas-web`. Do not set `CURSOR_CANVAS_WEB_ROOT` unless developing that package locally (overrides npm with a checkout).

`--formats cursor` → IDE-style single file with data inlined (default path under `--out`, or `--cursor-out`).
