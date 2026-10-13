# open-canvas

Build `.canvas.tsx` → HTML, PNG, PDF; optional JPG or `--formats cursor` (IDE `.canvas.tsx`).

Uses [`@flesler/cursor-canvas-web`](https://github.com/flesler/cursor-canvas-web) to implement `cursor/canvas` at export time (Mantine-backed shim, aligned with the IDE SDK).

**Live showcase:** <https://flesler.github.io/open-canvas/> — built from [`example/showcase.canvas.tsx`](example/showcase.canvas.tsx) on every push to `main` ([`deploy.yml`](.github/workflows/deploy.yml), `BASE_PATH=/open-canvas/`).

<p>
  <img src="docs/showcase-light.png" alt="SDK showcase (light)" width="49%" />
  <img src="docs/showcase-dark.png" alt="SDK showcase (dark)" width="49%" />
</p>

## Install

```bash
npm install -g @flesler/open-canvas
```

Checkout: `npm install && npm run build:cli`. Example: [showcase.canvas.tsx](example/showcase.canvas.tsx) + [data/](example/data/) (illustrative only — your canvases can use any layout). PNG/PDF/JPG need Playwright (Chromium).

## CLI

```bash
open-canvas generate path/to/report.canvas.tsx
```

Default `--formats`: `html,png,pdf`.

| Command | Description |
|---------|-------------|
| `generate <canvas>` | Build artifacts |
| `verify <canvas>` | Typecheck |
| `skill [path]` | Install or print `SKILL.md` |

Regenerate README screenshots (light + dark): `npm run example:screenshot`.

## License

MIT — [LICENSE](LICENSE).
