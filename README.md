# open-canvas

Export Cursor-style `.canvas.tsx` files to HTML, PNG, PDF, or IDE-ready `.canvas.tsx`. No Cursor app or API required.

**Live example:** <https://flesler.github.io/open-canvas/>

<p>
  <img src="docs/showcase-light.png" alt="Showcase export (light)" width="49%" />
  <img src="docs/showcase-dark.png" alt="Showcase export (dark)" width="49%" />
</p>

## Install

```bash
npm install -g @flesler/open-canvas
```

PNG, PDF, and JPG use headless Chromium (installed automatically on first export).

## Write a canvas

Use `cursor/canvas` components the same way as in Cursor. See Cursor’s canvas skill (`~/.cursor/skills-cursor/canvas/SKILL.md`) and `sdk/index.d.ts` for layout and APIs.

Import data from files next to your canvas (JSON, YAML, TSV, CSV, JSONL):

```tsx
import { Stack, H1, BarChart } from "cursor/canvas";
import report from "./data/report.json";
```

## CLI

```bash
open-canvas generate path/to/report.canvas.tsx
open-canvas verify path/to/report.canvas.tsx
```

| Command | Purpose |
| --- | --- |
| `generate <canvas>` | Build artifacts (default: `html`, `png`, `pdf` in `./out`) |
| `verify <canvas>` | Typecheck imports and `cursor/canvas` usage |
| `skill [path]` | Print or install agent `SKILL.md` |

Common flags:

| Flag | Default |
| --- | --- |
| `--out` | `./out` beside the canvas |
| `--theme` | `light` or `dark` |
| `--formats` | `html,png,pdf` — also `jpg`, `cursor` |
| `--width` / `--height` | Viewport `1280`×`900` |
| `--selector` | Export only matching nodes (`id`, class, or `data-*` on your JSX) |

`--formats cursor` writes a single `.canvas.tsx` with data inlined for the IDE.

## License

MIT — [LICENSE](LICENSE).
