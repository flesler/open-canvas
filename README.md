# opencanvas

Generate [Cursor canvas](https://cursor.com) `.canvas.tsx` artifacts: HTML, PNG, PDF, and optional JPG or IDE-ready `.canvas.tsx` (`--formats cursor`).

**Agents:** `opencanvas skill ~/.cursor/skills/opencanvas` — see `src/md/SKILL.md` (links Cursor’s `/canvas` skill + repo overrides).

## Install

```bash
npm install -g opencanvas
```

From a git checkout: `npm install && npm run build:cli`, then `npm link` or `bin/opencanvas.js`. Sample canvas: [example/](example/) in the repo (not shipped on npm). E2E: `npm run test:smoke`.

**Render formats (png, pdf, jpg):** first run downloads Chromium via Playwright (`npx playwright install chromium` if the browser is missing).

**Install size:** `generate` pulls Vite, React, and Mantine to render canvases faithfully (~100MB+ `node_modules`); browsers are additional (~hundreds of MB, on demand).

## Example

```bash
opencanvas generate path/to/report.canvas.tsx
```

Default `--formats` is `html,png,pdf`. Add `jpg` or `cursor` when needed.

## CLI

| Command | Description |
|---------|-------------|
| `opencanvas generate <canvas.canvas.tsx>` | Build artifacts (recommended) |
| `opencanvas verify <canvas.canvas.tsx>` | Typecheck a canvas |
| `opencanvas skill [path]` | Print or install `SKILL.md` |

Omitting `generate` runs the same command (default subcommand); prefer the explicit form above.

`src/shell/` — fixed Vite entry that mounts your canvas via build-time alias (not your report source).

Details: [docs/spec.md](docs/spec.md).

## License

MIT — see [LICENSE](LICENSE).
