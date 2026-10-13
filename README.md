# opencanvas

Generate [Cursor canvas](https://cursor.com) `.canvas.tsx` artifacts: HTML, PNG, PDF, IDE-ready `.canvas.tsx` (`--formats cursor`).

**Agents:** `opencanvas skill ~/.cursor/skills/opencanvas` — see `src/md/SKILL.md` (links Cursor’s `/canvas` skill + repo overrides).

## Install

```bash
npm install -g opencanvas
```

From a git checkout: `npm install && npm run build:cli`, then `npm link` or `node dist/cli.js`.

**Raster formats (png, pdf, jpg):** first run downloads Chromium via Playwright (`npx playwright install chromium` if the browser is missing).

**Install size:** `generate` pulls Vite, React, and Mantine to render canvases faithfully (~100MB+ `node_modules`); browsers are additional (~hundreds of MB, on demand).

## Example

```bash
opencanvas --canvas example/build-plane.canvas.tsx --formats html,png,pdf,cursor
opencanvas verify --canvas example/build-plane.canvas.tsx
```

## CLI

| Command | Description |
|---------|-------------|
| `opencanvas --canvas …` | **generate** (default) |
| `opencanvas verify --canvas …` | Typecheck a canvas |
| `opencanvas skill [path]` | Print or install `SKILL.md` |

`src/shell/` — fixed Vite entry that mounts your canvas via build-time alias (not your report source).

Details: [docs/spec.md](docs/spec.md).

## License

MIT — see [LICENSE](LICENSE).
