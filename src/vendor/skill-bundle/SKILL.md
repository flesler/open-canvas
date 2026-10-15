---
name: open-canvas
description: >-
  Export `.canvas.tsx` outside Cursor. Read this file, then `./references/canvas.md`
  (Cursor canvas workflow), then types as that doc directs.
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
|`--formats`|`html,png,pdf` (+ `jpg`, `cursor`)|
|`--theme`|`light`|

`--formats cursor` → IDE-style single file with data inlined.
