---
name: shim-visual
description: Read when matching shim render to the Cursor IDE canvas.
---

# Shim visual parity

Same `.canvas.tsx` in the IDE and in `open-canvas generate`. Diffs are shim bugs.

|Symptom|Where|
|---|---|
|Chart, card, todo, DAG look wrong|`cursor-canvas-web` `src/shim/`|
|PNG docs stale|this repo `npm run example:screenshot`|

**NEVER** restyle `example/showcase.canvas.tsx` (or any canvas) to hide a render gap. Layout math the canvas already passes (`padding`, `rankGap`, `viewBox`) stays.

**Prefer Mantine props** (`legendProps`, `textColor`, `curveType`, `startAngle`, `thickness`, `chartLabel`, `valueFormatter`, `withBarValueLabel`) over custom DOM.

**After each visual fix:**

```bash
.cursor/skills/shim-rollout/scripts/sync-local-shim.sh
npm run example:screenshot
```

Then `pnpm test` in `cursor-canvas-web`. Confirm both `docs/showcase-light.png` and `docs/showcase-dark.png`.

Known mappings: [references/parity.md](references/parity.md).

Release / publish order: [shim-rollout](../shim-rollout/SKILL.md).
