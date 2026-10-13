# open-canvas

Generate multi-format visuals (HTML, PNG, PDF, JPG, IDE canvas) from `.canvas.tsx` — charts, tables, and `cursor/canvas` UI agents can one-shot. No Cursor app or API required to author or render.

## Install

```bash
npm install -g @flesler/open-canvas
```

Layout/components: Cursor’s `~/.cursor/skills-cursor/canvas/SKILL.md` and `sdk/index.d.ts`.

## Data imports

Relative files beside the canvas:

```
report.canvas.tsx
data/report.json
data/phase-rss.yaml
data/series.tsv
data/rows.csv
```

```tsx
import { Stack, H1, BarChart, … } from "cursor/canvas";
import report from "./data/report.json";
import series from "./data/series.tsv";
```

Use `.map()` in JSX; no fetch or extra npm deps in the canvas file.

## Flags

|Flag|Default|
|---|---|
|`--out`|`./out` next to the canvas file|
|`--name`|Output basename without extension (default: canvas stem, else slug of `--title`; `.html`, `.png`, etc. added per format)|
|`--title`|Title case of canvas stem|
|`--theme`|`light` (`light` or `dark` only)|
|`--formats`|`html,png,pdf` — also `jpg`, `cursor`|
|`--width` / `--height`|Playwright viewport (default `1280`×`900`). Usually omit both; PNG/JPG capture the full page, PDF height follows content `scrollHeight`. Set a fixed viewport only when you want a specific frame (e.g. README screenshots).|
|`--render-options`|Optional JSON file; Playwright `launch` / `page` / `screenshot` / `pdf` — [API](https://playwright.dev/docs/api/class-page)|
|`--selector`|CSS selector(s), repeat or comma-separated; each uses `querySelectorAll`; keeps `<head>`, replaces `<body>` with matches in document order|

No auto `id`s — add `id`, `class`, or `data-*` on export targets (e.g. `id="section-charts"` or `class="export-section"`).

```bash
open-canvas generate path/to/report.canvas.tsx
```

Default `--formats` is `html,png,pdf`. Add `,jpg` or `,cursor` when needed.

`cursor` format writes `out/<stem>.canvas.tsx` (`cursor/canvas` only, data inlined).

## Skill path

```bash
open-canvas skill # print to stdout
open-canvas skill ~/.cursor/skills/open-canvas
```
Example: `example/showcase.canvas.tsx` and `example/data/`.
