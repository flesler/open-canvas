# opencanvas — spec

**Repo:** [github.com/flesler/opencanvas](https://github.com/flesler/opencanvas)

## Layout

```
example/
  build-plane.canvas.tsx
  data/
    report.json
    phase-rss.yaml
    daily.tsv
    outliers.csv
    deploy-events.jsonl
  out/          # gitignored
```

## Authoring (superset)

- `cursor/canvas` components only, plus **relative** data imports.
- JSON: Vite native. JSONL → array (one JSON value per line). CSV/TSV/YAML: shared `load-data-file` (CLI + Vite).

## CLI

Default subcommand: **`generate`**.

```bash
opencanvas --canvas example/build-plane.canvas.tsx --formats html,png,pdf,cursor
```

| Flag | Rule |
|--------|------|
| `--canvas` | Required `*.canvas.tsx` |
| `--out` | Default `./out` beside canvas |
| `--theme` | `light` \| `dark`, default `light` |
| `--formats` | `html`, `png`, `pdf`, `jpg`, `cursor` |

### `--formats cursor`

Writes `{out}/{stem}.canvas.tsx` with data imports inlined (`ts-morph` + `load-data-file`). Only `cursor/canvas` imports remain.

### `verify --canvas <path>`

Typechecks the canvas (`cursor/canvas` + relative data imports) via `typescript` + package `tsconfig.json`.

### `skill [path]`

Prints `src/md/SKILL.md` or writes `path/SKILL.md` (directory) / `path` (file).

### Raster formats (`png`, `pdf`, `jpg`)

Playwright loads on first use; Chromium is downloaded on first launch (`npx playwright install chromium` if needed).
