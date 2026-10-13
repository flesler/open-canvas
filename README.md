# open-canvas

**Charts, tables, and structured visuals agents can one-shot** — from a single `.canvas.tsx` file to HTML, PNG, PDF, JPG, or an IDE-ready canvas. Built on Cursor’s `cursor/canvas` component set (same primitives agents already use in Canvas), but **you don’t need the Cursor app** to author or render.

**Live example:** [light](https://flesler.github.io/open-canvas/) · [dark](https://flesler.github.io/open-canvas/dark.html)

<p>
  <img src="docs/showcase-light.png" alt="Showcase (light)" width="49%" />
  <img src="docs/showcase-dark.png" alt="Showcase (dark)" width="49%" />
</p>

## Install

```bash
npm install -g @flesler/open-canvas
```

Raster and PDF output uses headless Chromium (installed automatically on first `generate`).

## Author a `.canvas.tsx`

One React file, high-level layout and viz (bar/line/pie charts, tables, callouts, forms). Import data from sibling files — no fetch, no extra deps in the canvas:

```tsx
import { Stack, H1, BarChart } from "cursor/canvas";
import report from "./data/report.json";
```

Component reference: Cursor’s canvas skill (`~/.cursor/skills-cursor/canvas/SKILL.md`) and `sdk/index.d.ts`.

## Generate

```bash
open-canvas generate path/to/report.canvas.tsx
open-canvas verify path/to/report.canvas.tsx
```

| Command | Purpose |
| --- | --- |
| `generate <canvas>` | HTML, PNG, PDF (default) into `./out` |
| `verify <canvas>` | Typecheck `cursor/canvas` and data imports |
| `skill [path]` | Print or install agent `SKILL.md` |

| Flag | Default |
| --- | --- |
| `--out` | `./out` beside the canvas |
| `--theme` | `light` or `dark` |
| `--formats` | `html,png,pdf` — also `jpg`, `cursor` |
| `--name` | Output slug without extension (default: canvas stem) |
| `--width` / `--height` | Playwright viewport (`1280`×`900`); usually omit — exports use full page height |
| `--selector` | Only matched sections (`id`, class, or `data-*` in your JSX) |

`--formats cursor` emits one `.canvas.tsx` with data inlined (handy for Cursor IDE).

## License

MIT — [LICENSE](LICENSE).
