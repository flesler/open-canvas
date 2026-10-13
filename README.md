# open-canvas

Generate [Cursor canvas](https://cursor.com) `.canvas.tsx` artifacts: HTML, PNG, PDF, IDE-ready `.canvas.tsx` (`--formats cursor`).

**Agents:** `open-canvas skill ~/.cursor/skills/open-canvas` — see `src/md/SKILL.md` (links Cursor’s `/canvas` skill + repo overrides).

## Install

```bash
npm install && npm run build:cli
npm link   # optional; bin → dist/cli.js
```

## Example

```bash
open-canvas --canvas example/pushflow.canvas.tsx --formats html,png,pdf,cursor
```

## CLI

| Command | Description |
|---------|-------------|
| `open-canvas --canvas …` | **generate** (default) |
| `open-canvas skill [path]` | Print or install `SKILL.md` |

`src/shell/` — fixed Vite entry that mounts your canvas via build-time alias (not your report source).

Details: [docs/spec.md](docs/spec.md).

## License

MIT
