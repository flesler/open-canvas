# open-canvas

Export `.canvas.tsx` to HTML, PNG, PDF, or IDE-ready `.canvas.tsx`. No Cursor app or API required.

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
|`--title`|Title case of canvas stem|
|`--theme`|`light` (`light` or `dark` only)|
|`--formats`|`html,png,pdf` — also `jpg`, `cursor`|
|`--width` / `--height`|Render viewport (default `1280`×`900`)|
|`--render-options`|Optional JSON file; Playwright `launch` / `page` / `screenshot` / `pdf` — [API](https://playwright.dev/docs/api/class-page)|

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
