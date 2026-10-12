# open-canvas

Export [Cursor canvas](https://cursor.com) `.canvas.tsx` files to HTML, PNG, PDF, and (planned) IDE-ready `.canvas.tsx`.

Built on [@thisismydesign/cursor-canvas-web](https://github.com/thisismydesign/cursor-canvas-web).

## Install

```bash
npm install -g open-canvas
# or from clone:
npm install && npm run build:cli && npm link
```

## Usage

`export` is the default subcommand — flags only:

```bash
open-canvas \
  --canvas canvases/pushflow-build-olap.canvas.tsx \
  --data data/pushflow-build-olap.json \
  --formats html,png,pdf \
  --theme light
```

Explicit subcommand:

```bash
open-canvas export --canvas …
```

Outputs go to `./out` next to the canvas file: `out/<stem>.html`, `.png`, `.pdf`.

See [docs/spec.md](docs/spec.md).

## Example (this repo)

```bash
npm install
npm run build:cli
node bin/open-canvas.js --canvas canvases/pushflow-build-olap.canvas.tsx --data data/pushflow-build-olap.json
```

## License

MIT
