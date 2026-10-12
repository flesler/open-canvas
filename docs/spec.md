# open-canvas — spec

**Repo:** [github.com/flesler/open-canvas](https://github.com/flesler/open-canvas)

**Lane:** Superset of Cursor canvas — author with data imports + export to IDE-safe `.canvas.tsx`, HTML, PNG, PDF.

---

## Two canvas shapes

| | **Authoring** (repo / CLI build) | **Emitted** (Cursor IDE) |
|---|----------------------------------|---------------------------|
| Imports | `cursor/canvas` + `import x from './x.{json,csv,tsv}'` | **`cursor/canvas` only** |
| Data | Files beside canvas; Vite resolves imports in tool | Inlined `const` literals (imports erased) |
| Preview | `open-canvas --formats html,…` | Copy `{out}/{stem}.canvas.tsx` → managed `canvases/` |

Cursor skill applies to **emitted** files only. Authoring is a deliberate superset.

---

## CLI

**Default subcommand is `export`.** These are equivalent:

```bash
open-canvas --canvas path/to/report.canvas.tsx …
open-canvas export --canvas path/to/report.canvas.tsx …
```

```bash
open-canvas \
  --canvas path/to/report.canvas.tsx \
  --data path/to/data.json \
  --out ./out \
  --title "Report" \
  --theme light \
  --formats html,png,pdf,cursor
```

### Flags

| Flag | Rule |
|--------|------|
| **`--canvas`** | Required. `path/to/{stem}.canvas.tsx`. |
| **`--data`** | JSON for `report` prop when canvas is prop-based. Guesses: `<canvas-dir>/data/<stem>.json`, `<canvas-dir>/<stem>.json`, `<pkg>/data/<stem>.json`. |
| **`--title`** | Optional. Default: title case of `{stem}`. HTML `<title>`. |
| **`--out`** | Default: **`./out` relative to the canvas file’s directory** → `{out}/{stem}.*`. |
| **`--theme`** | **`light` \| `dark`**. Default **`light`**. No `auto`. |
| **`--formats`** | Comma list: `html`, `png`, `pdf`, `jpg`, **`cursor`**. Default `html,png,pdf`. |

### `--formats cursor`

Writes **`{out}/{stem}.canvas.tsx`** (format name `cursor`; extension `.canvas.tsx` for IDE). **Not implemented in v0.1.**

### `inject`

In-place `const DATA = …` replace. **Not implemented in v0.1.**

---

## Data loading (target)

| Mechanism | When |
|-----------|------|
| **`import x from './file.{json,csv,tsv}'`** in authoring canvas | Planned — Vite plugin in tool |
| **`--data` file/dir** | Prop-based canvases (v0.1 pushflow example) |
| **Baked `const DATA`** | IDE + optional `--formats cursor` emit |

---

## Recommended workflow

1. Author **`report.canvas.tsx`** + data files.
2. **`open-canvas --canvas report.canvas.tsx --formats html,png,pdf,cursor`**
3. Ship `out/*`; copy emitted `.canvas.tsx` into Cursor when `cursor` format is available.
