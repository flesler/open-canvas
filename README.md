# open-canvas

Generate [Cursor canvas](https://cursor.com) `.canvas.tsx` artifacts: HTML, PNG, PDF, and optional JPG or IDE-ready `.canvas.tsx` (`--formats cursor`).

**Agents:** `open-canvas skill ~/.cursor/skills/open-canvas` — see `src/md/SKILL.md` (links Cursor’s `/canvas` skill + repo overrides).

## Install

```bash
npm install -g @flesler/open-canvas
```

From a git checkout: `npm install && npm run build:cli`, then `npm link` or `bin/open-canvas.js`. Sample canvas: [example/](example/) in the repo (not shipped on npm). E2E: `npm run test:smoke` (local dist + pack); `npm run test:smoke:global` hits `@flesler/open-canvas@latest`; `npm run test:smoke:both` runs all.

**Render formats (png, pdf, jpg):** first run downloads Chromium via Playwright (`npx playwright install chromium` if the browser is missing).

**Install size:** `generate` pulls Vite, React, and Mantine to render canvases faithfully (~100MB+ `node_modules`); browsers are additional (~hundreds of MB, on demand).

## Example

```bash
open-canvas generate path/to/report.canvas.tsx
```

Default `--formats` is `html,png,pdf`. Add `jpg` or `cursor` when needed.

## CLI

| Command | Description |
|---------|-------------|
| `open-canvas generate <canvas.canvas.tsx>` | Build artifacts (recommended) |
| `open-canvas verify <canvas.canvas.tsx>` | Typecheck a canvas |
| `open-canvas skill [path]` | Print or install `SKILL.md` |

Omitting `generate` runs the same command (default subcommand); prefer the explicit form above.

`src/shell/` — fixed Vite entry that mounts your canvas via build-time alias (not your report source).

Details: [docs/spec.md](docs/spec.md).

## License

MIT — see [LICENSE](LICENSE).
