# open-canvas — spec

**Repo:** [github.com/flesler/open-canvas](https://github.com/flesler/open-canvas)

## Layout

```
example/
  pushflow.canvas.tsx
  data/
    report.json
    daily.tsv
    outliers.csv
  out/          # gitignored
```

## Authoring (superset)

- `cursor/canvas` components only, plus **relative** data imports.
- CSV/TSV: [`@rollup/plugin-dsv`](https://github.com/rollup/plugins/tree/master/packages/dsv) (same `d3-dsv` as Rollup ecosystem).
- JSON: Vite native.

## CLI

Default subcommand: **`export`**.

```bash
open-canvas --canvas example/pushflow.canvas.tsx --formats html,png,pdf,cursor
```

| Flag | Rule |
|--------|------|
| `--canvas` | Required `*.canvas.tsx` |
| `--out` | Default `./out` beside canvas |
| `--theme` | `light` \| `dark`, default `light` |
| `--formats` | `html`, `png`, `pdf`, `jpg`, `cursor` |

### `--formats cursor`

Writes `{out}/{stem}.canvas.tsx` with data imports inlined as `const` ( [`ts-morph`](https://github.com/dsherret/ts-morph) AST + shared `loadDataFile` / `d3-dsv` ). Only `cursor/canvas` imports remain.

Build uses alias `@open-canvas/user-canvas` — no absolute paths in generated `host/entry.tsx`.

## `inject`

Optional in-place `const DATA =` replace — not required when using data imports + `cursor` format.
