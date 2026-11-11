---
name: shim-visual
description: Read when matching IDE canvas to open-canvas export visuals.
---

# Shim visual parity

Same `.canvas.tsx` in the IDE and in `open-canvas generate`. Classify the diff before coding.

|Symptom|Where|
|---|---|
|Chart, card, todo, DAG look wrong|`cursor-canvas-web` `src/shim/`|
|Wrapper inset, page bg, fonts, scheme|`open-canvas` `src/shell/` · IDE HTML is source of truth|
|PNG docs stale|this repo `npm run example:screenshot`|

**NEVER** restyle `example/showcase.canvas.tsx` (or any canvas) to hide a render gap. Layout math the canvas already passes (`padding`, `rankGap`, `viewBox`) stays.

**Prefer Mantine props** (`legendProps`, `textColor`, `curveType`, `startAngle`, `thickness`, `chartLabel`, `valueFormatter`, `withBarValueLabel`) over custom DOM.

## Chrome vs export shell

`cursor/canvas` has no built-in page padding; export shell mirrors **published** Cursor: `main` `py={24} px={32}` (`src/shell/main.tsx`). Authors adjust in-canvas; no CLI gutter flag.

1. **Probe** — `$HOME/.cursor/projects/<workspace-slug>/canvases/chrome-probe.canvas.tsx`: outlined `[data-chrome-probe="content"]`, theme kind/brand only.
2. **User** — DevTools → document `outerHTML`. Panel capture is **tighter** than publish; use a **published URL** when comparing to export. **Stop** until provided.
3. **Export HTML** — same path and theme:

```bash
npm run build:cli && node dist/cli.js generate \
  "$HOME/.cursor/projects/<workspace-slug>/canvases/chrome-probe.canvas.tsx" \
  --formats html --theme light
```

4. **Assess** — [references/chrome-compare.md](references/chrome-compare.md). PDF margins: `src/render.ts` after HTML shell aligns.

**NEVER** tune shell padding from IDE guesswork without both HTML snapshots. Do not duplicate the probe under `example/`.

## After shim (component) fixes

```bash
.cursor/skills/shim-rollout/scripts/sync-local-shim.sh
npm run example:screenshot
```

Then `npm test` in `cursor-canvas-web`. Confirm both `docs/showcase-light.png` and `docs/showcase-dark.png`.

Component mappings: [references/parity.md](references/parity.md).

Release / publish order: [shim-rollout](../shim-rollout/SKILL.md).
