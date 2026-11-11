---
name: shim-visual
description: Read when matching IDE canvas to open-canvas export visuals.
---

# Shim visual parity

Same `.canvas.tsx` in the IDE and in `open-canvas generate`. Classify the diff before coding.

|Symptom|Where|
|---|---|
|Chart, card, todo, DAG look wrong|`cursor-canvas-web` `src/shim/`|
|Wrapper inset, page bg, fonts, scheme|`open-canvas` `src/shell/` · published iframe HTML is source of truth|
|PNG docs stale|this repo `npm run example:screenshot`|

**NEVER** restyle `example/showcase.canvas.tsx` (or any canvas) to hide a render gap. Layout math the canvas already passes (`padding`, `rankGap`, `viewBox`) stays.

**Prefer Mantine props** (`legendProps`, `textColor`, `curveType`, `startAngle`, `thickness`, `chartLabel`, `valueFormatter`, `withBarValueLabel`) over custom DOM.

## Published vs panel vs export

- **Compare the iframe document** (`html` inside the frame), not Cursor’s parent page above the iframe.
- **IDE panel** uses a **tighter** gutter (16px + `--cursor-canvas-gutter`); **published** uses **body `24px` / `32px`**. Tune export against **published** captures only.
- **Export shell** (`src/shell/index.html`, `main.tsx`, `print-theme.ts`): body gutter **24/32**, `#root` **max-width 72rem**, theme surfaces on `html/body/#root`, scroll-fade + print CSS, host `theme: { kind, brand, editorBackground }`, dark **beforeprint** → light paper. Canvas mounts **directly in `#root`** (no extra wrapper). PDF: `body { box-decoration-break: clone }` — see `src/render.ts`.

## Workflow

1. **User** — DevTools **published** canvas URL, same theme as export; save under `.cache/shim-visual/` (see `.cache/shim-visual/README.md`). **Stop** until provided for chrome work.
2. **Export PNG** — `generate` at **1280** width, same theme:

```bash
npm run build:cli && node dist/cli.js generate example/showcase.canvas.tsx \
  --formats png --theme light --width 1280
```

3. **Screenshot fixture HTML** (saved published outerHTML):

```bash
node bin/screenshot-html.mjs .cache/shim-visual/showcase-published-light.html \
  .cache/shim-visual/showcase-published-light.png 1280
```

4. **Pixel compare**:

```bash
python3 bin/compare-image.py out/showcase.png \
  --against .cache/shim-visual/showcase-published-light.png --tolerance 8
```

5. **HTML chrome** — [references/chrome-compare.md](references/chrome-compare.md). Component rows — [references/parity.md](references/parity.md).

## After shim (component) fixes

```bash
.cursor/skills/shim-rollout/scripts/sync-local-shim.sh
npm run example:screenshot
```

Then `npm test` in `cursor-canvas-web`. Confirm both `docs/showcase-light.png` and `docs/showcase-dark.png`.

Release / publish order: [shim-rollout](../shim-rollout/SKILL.md).
