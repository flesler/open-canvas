# Agent prompt — canvas export

Repo: **open-canvas** ([github.com/flesler/open-canvas](https://github.com/flesler/open-canvas)).

## Edit

- `data/<scenario>.json` — KPIs, series, table rows
- `canvases/<scenario>.canvas.tsx` — layout; import **only** `cursor/canvas`; accept `report` prop (host passes JSON)

## Ship

```bash
open-canvas --canvas canvases/<scenario>.canvas.tsx --data data/<scenario>.json
```

Outputs: `canvases/out/<scenario>.{html,png,pdf}` (default `--out ./out` next to canvas).

## Pushflow example

`data/pushflow-build-olap.json` + `canvases/pushflow-build-olap.canvas.tsx`.
