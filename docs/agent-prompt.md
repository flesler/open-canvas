# Agent prompt — canvas export

Repo: **open-canvas** ([github.com/flesler/open-canvas](https://github.com/flesler/open-canvas)).

## Edit (example layout)

- `example/pushflow.canvas.tsx` — `cursor/canvas` + `import … from './data/*.{json,csv,tsv}'`
- `example/data/` — `report.json`, `daily.tsv`, `outliers.csv`

## Ship

```bash
open-canvas --canvas example/pushflow.canvas.tsx --formats html,png,pdf,cursor
```

Outputs: `example/out/pushflow.{html,png,pdf,canvas.tsx}`.
