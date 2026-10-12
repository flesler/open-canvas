# open-canvas

Export [Cursor canvas](https://cursor.com) `.canvas.tsx` files to HTML, PNG, PDF, and IDE-ready `.canvas.tsx` (`--formats cursor`).

Authoring superset: `cursor/canvas` plus `import … from './data/*.{json,csv,tsv}'` ([`@rollup/plugin-dsv`](https://github.com/rollup/plugins/tree/master/packages/dsv)). Cursor emit inlines data with [`ts-morph`](https://github.com/dsherret/ts-morph) + the same `d3-dsv` loaders.

## Install

```bash
npm install && npm run build:cli
npm link   # optional global `open-canvas`
```

## Example

```bash
open-canvas --canvas example/pushflow.canvas.tsx --formats html,png,pdf,cursor
```

Outputs under `example/out/` (`pushflow.html`, `.png`, `.pdf`, `.canvas.tsx` for `cp` into Cursor `canvases/`).

## Usage

```bash
open-canvas --canvas path/to/report.canvas.tsx [--out ./out] [--theme light|dark] [--formats html,png,pdf,jpg,cursor]
```

`export` is optional (default subcommand). See [docs/spec.md](docs/spec.md).

## License

MIT
