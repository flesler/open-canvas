# open-canvas

Export Cursor-style `.canvas.tsx` dashboards to HTML, PNG, PDF, and IDE-ready canvases.

## Before you write UI

Follow Cursor’s native canvas skill end-to-end for **layout, components, design, and plot labeling**:

- Skill file: `~/.cursor/skills-cursor/canvas/SKILL.md`
- SDK types: `~/.cursor/skills-cursor/canvas/sdk/index.d.ts`

This skill only adds what differs when authoring via `open-canvas` CLI.

## Authoring overrides (repo / export lane)

The only difference is that you can import data files beside the canvas. Example:

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

Map imported data in JSX with `.map()` — no fetch, no extra npm imports in the canvas.

## CLI

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

Outputs: `out/<stem>.html`, `.png`, `.pdf` by default; with `cursor` → `out/<stem>.canvas.tsx` (only `cursor/canvas` imports, data inlined). Copy that file into the workspace managed folder:

`cp out/<stem>.canvas.tsx ~/.cursor/projects/<workspace>/canvases/`

## Install this skill

```bash
open-canvas skill # print to stdout
open-canvas skill ~/.cursor/skills/open-canvas
```
Reference example in the repo: `example/build-plane.canvas.tsx` + `example/data/`.
