# open-canvas

Export Cursor-style `.canvas.tsx` dashboards to HTML, PNG, PDF, and IDE-ready canvases.

## Before you write UI

Follow Cursor’s native canvas skill end-to-end for **layout, components, design, and plot labeling**:

- Skill file: `~/.cursor/skills-cursor/canvas/SKILL.md`
- SDK types: `~/.cursor/skills-cursor/canvas/sdk/index.d.ts`

Do **not** duplicate those rules here. This skill only adds what differs when authoring **in a repo** and shipping via `open-canvas` CLI.

## Authoring overrides (repo / export lane)

|Cursor IDE skill|open-canvas authoring|
|---|---|
|Import only `cursor/canvas`|Also: `import x from './data/*.{json,csv,tsv}'` (relative paths beside the canvas)|
|Embed all data inline|Data lives in `data/` files; canvas imports them|
|One file, no helpers|Still one `.canvas.tsx`; data files are separate|

Example layout:

```
my-report.canvas.tsx
data/report.json
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

Default command is **generate** (subcommand optional).

```bash
open-canvas --canvas path/to/report.canvas.tsx
open-canvas generate --canvas path/to/report.canvas.tsx
```

|Flag|Default|
|---|---|
|`--out`|`./out` next to the canvas file|
|`--title`|Title case of canvas stem|
|`--theme`|`light` (`light` or `dark` only)|
|`--formats`|`html,png,pdf` — also `jpg`, `cursor`|

```bash
open-canvas --canvas my-report.canvas.tsx --formats html,png,pdf,cursor
```

Outputs: `out/<stem>.html`, `.png`, `.pdf`, and with `cursor` → `out/<stem>.canvas.tsx` (only `cursor/canvas` imports, data inlined). Copy that file into the workspace managed folder:

`~/.cursor/projects/<workspace>/canvases/<stem>.canvas.tsx`

## Install this skill

```bash
open-canvas skill                    # print to stdout
open-canvas skill ~/.cursor/skills/open-canvas
```

Reference example in the repo: `example/pushflow.canvas.tsx` + `example/data/`.
