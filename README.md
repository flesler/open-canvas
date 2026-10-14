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

### Agent skill

```bash
open-canvas skill ~/.cursor/skills/open-canvas
```

Installs open-canvas `SKILL.md`, Cursor `/canvas` prose from the shim (`src/vendor/canvas/SKILL.md` → `references/canvas.md`), and `./assets/sdk/` from `@flesler/cursor-canvas-web`.

## Author a `.canvas.tsx`

One React file, high-level layout and viz (bar/line/pie charts, tables, callouts, forms). Import report data from sibling `./data/*` files. Interactive `useCanvasState` values live in a sibling `<stem>.canvas.data.json` (flat object, keys = hook keys); `generate` seeds them before mount. Stale keys are ignored; missing keys use the hook default.

```tsx
import { Stack, H1, BarChart } from "cursor/canvas";
import report from "./data/report.json";
```

## Generate

```bash
open-canvas generate path/to/report.canvas.tsx
open-canvas verify path/to/report.canvas.tsx
```

|Command|Purpose|
|---|---|
|`generate <canvas>`|HTML, PNG, PDF (default) into `./out`|
|`verify <canvas>`|Typecheck `cursor/canvas` and data imports|
|`skill [dir]`|Print `SKILL.md` or install the full skill bundle into `<dir>`|

|Flag|Default|
|---|---|
|`--out`|`./out` beside the canvas|
|`--theme`|`light` or `dark`|
|`--formats`|`html,png,pdf` — also `jpg`, `cursor`|
|`--name`|Output slug without extension (default: canvas stem)|
|`--width` / `--height`|Playwright viewport (`1280`×`900`); usually omit — exports use full page height|
|`--selector`|Only matched sections (`id`, `class`, or `data-*` in your JSX)|

`--formats cursor` emits one `.canvas.tsx` with data inlined (handy for Cursor IDE).

## License

MIT — [LICENSE](LICENSE).
