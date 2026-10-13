# open-canvas — spec

**Repo:** [github.com/flesler/open-canvas](https://github.com/flesler/open-canvas)

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
- JSON: Vite native. JSONL → array (one JSON value per line). CSV/TSV/YAML: shared parsers in `util` (CLI + Vite).

## CLI

Use **`open-canvas generate <canvas>`** (default subcommand if omitted; explicit `generate` is recommended).

```bash
open-canvas generate path/to/report.canvas.tsx
```

Default `--formats`: `html`, `png`, `pdf`. Also supported: `jpg`, `cursor`.

| Flag | Rule |
|--------|------|
| `<canvas>` | Required positional `*.canvas.tsx` |
| `--out` | Default `./out` beside canvas |
| `--theme` | `light` \| `dark`, default `light` |
| `--formats` | Default `html,png,pdf`; optional `jpg`, `cursor` |

### `--formats cursor`

Writes `{out}/{stem}.canvas.tsx` with data imports inlined (`ts-morph` + `util.loadDataFile`). Only `cursor/canvas` imports remain.

### `verify <canvas>`

Typechecks the canvas (`cursor/canvas` + relative data imports) via `typescript` + package `tsconfig.json`.

### `skill [path]`

Prints `src/md/SKILL.md` or writes `path/SKILL.md` (directory) / `path` (file).

### Render formats (`png`, `pdf`, `jpg`)

Playwright loads on first use; Chromium is downloaded on first launch (`npx playwright install chromium` if needed).

| Flag | Default |
|------|---------|
| `--width` / `--height` | `1280` × `900` viewport |
| `--theme` | also sets page `colorScheme` |
| `--render-options` | Optional JSON file or inline object (see below) |

`--render-options` is merged on top of defaults. Top-level keys:

| Key | Playwright API |
|-----|----------------|
| `launch` | [BrowserType.launch](https://playwright.dev/docs/api/class-browsertype#browser-type-launch) |
| `page` | [Browser.newPage](https://playwright.dev/docs/api/class-browser#browser-new-page) (viewport, `deviceScaleFactor`, …) |
| `screenshot` | [Page.screenshot](https://playwright.dev/docs/api/class-page#page-screenshot) |
| `pdf` | [Page.pdf](https://playwright.dev/docs/api/class-page#page-pdf) |

```bash
open-canvas generate report.canvas.tsx --formats pdf --render-options '{"pdf":{"format":"A4","landscape":true}}'
```
