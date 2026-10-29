# open-canvas

**Charts, tables, and structured visuals agents can one-shot** — from a single `.canvas.tsx` file to HTML, PNG, PDF, JPG, or an IDE-ready canvas. Same `cursor/canvas` primitives as Cursor Canvas; **no Cursor app required** to build or export.

**Live example:** [light](https://flesler.github.io/open-canvas/) · [dark](https://flesler.github.io/open-canvas/dark.html)

<p>
  <img src="docs/showcase-light.png" alt="Showcase (light)" width="49%" />
  <img src="docs/showcase-dark.png" alt="Showcase (dark)" width="49%" />
</p>

## Install

```bash
npm install -g @flesler/open-canvas
```

PNG, PDF, and JPG use headless Chromium (installed on first `generate`).

To develop against a local `@flesler/cursor-canvas-web` checkout without changing `package.json`:

```bash
export CURSOR_CANVAS_WEB_ROOT=/path/to/cursor-canvas-web
open-canvas generate path/to/report.canvas.tsx
```

### Agent skill

```bash
open-canvas skill ~/.cursor/skills/open-canvas   # SKILL.md only — read after open-canvas is on PATH
```

The skill points agents at **`open-canvas vendor-path`** → shim `canvas/SKILL.md` + `canvas-sdk/*.d.ts` (same tree as `verify` / `generate`).

## Author a `.canvas.tsx`

One React file: charts, tables, callouts, forms — import only from `cursor/canvas`. Static data can live in sibling `./data/*` files. Saved toggles and form state can live in `<stem>.canvas.data.json` beside the canvas (same keys as `useCanvasState`).

```tsx
import { Stack, H1, BarChart } from "cursor/canvas";
import report from "./data/report.json";
```

Some components accept an `extra` prop with features beyond the Cursor SDK, such as `<BarChart extra={{ valueAxis: { scale: "log" } }} />`. Cursor ignores `extra`, so the canvas still renders there. See the shim's [superset docs](https://github.com/flesler/cursor-canvas-web/blob/main/COMPAT.md#superset).

## Generate

```bash
open-canvas generate path/to/report.canvas.tsx
open-canvas verify path/to/report.canvas.tsx
```

|Command|Purpose|
|---|---|
|`generate <canvas>`|HTML, PNG, PDF (default) into `./out`|
|`verify <canvas>`|Typecheck `cursor/canvas` and data imports|
|`skill [dir]`|Print or install agent `SKILL.md`|
|`vendor-path`|Print shim `src/vendor` (canvas reference + SDK types)|

|Flag|Default|
|---|---|
|`--out`|`./out` beside the canvas|
|`--theme`|`light` or `dark`|
|`--formats`|`html,png,pdf` — also `jpg`, `cursor`|
|`--name`|Output basename (default: canvas stem)|
|`--width`|Playwright viewport width (default `1280`)|
|`--override-height`|Playwright viewport height in px (default `900`)|
|`--cursor-out`|With `--formats cursor`: write the IDE file here instead of `out/<stem>.canvas.tsx`|
|`--selector`|Export only matched sections|
|`--inline-state`|With `cursor`: embed `.canvas.data.json` in the emitted file|

Exports read `.canvas.data.json` when present. `--formats cursor` inlines `./data/*` into one file for the IDE; add `--inline-state` to include saved UI state too.

Theme in canvas code: **`useHostTheme()`** — same hook and return value in Cursor and in export. Use **`generate --theme`** / **`--brand`** when you need a fixed light/dark or Cursor/Grok look in png/html/pdf.

## License

MIT — [LICENSE](LICENSE).
