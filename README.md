# open-canvas

Build `.canvas.tsx` → HTML, PNG, PDF; optional JPG or `--formats cursor` (IDE `.canvas.tsx`).

## Install

```bash
npm install -g @flesler/open-canvas
```

Checkout: `npm install && npm run build:cli`. Example: [example/](example/). PNG/PDF/JPG need Playwright (Chromium).

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

## License

MIT — [LICENSE](LICENSE).
