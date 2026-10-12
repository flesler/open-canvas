# open-canvas

Export [Cursor canvas](https://cursor.com) `.canvas.tsx` to HTML, PNG, PDF, and IDE-ready `.canvas.tsx` (`--formats cursor`).

**Agents:** install the skill — `open-canvas skill ~/.cursor/skills/open-canvas` — then read `SKILL.md` (links Cursor’s native `/canvas` skill + repo overrides).

## Install

```bash
npm install && npm run build:cli
npm link   # optional: global `open-canvas`
```

## Example

```bash
open-canvas --canvas example/pushflow.canvas.tsx --formats html,png,pdf,cursor
```

Outputs in `example/out/`. Authoring uses `cursor/canvas` plus `import … from './data/*.{json,csv,tsv}'` (see `example/`).

## CLI

| Command | Description |
|---------|-------------|
| `open-canvas --canvas …` | Export (default; `export` subcommand optional) |
| `open-canvas skill [path]` | Print or install agent `SKILL.md` |

Flags: `--out` (default `./out` beside canvas), `--theme light|dark`, `--formats html,png,pdf,jpg,cursor`, `--title`.

Details: [docs/spec.md](docs/spec.md).

## License

MIT
