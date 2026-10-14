---
name: shim-rollout
description: Read when the shim is updated and how to roll it out.
---

# Shim rollout

|Symptom|Repo|
|---|---|
|`cursor/canvas` render/API|`cursor-canvas-web` `src/shim/`|
|verify, generate, pack, skill|`open-canvas` `src/`|

**SDK + `/canvas` skill:** `pnpm run sync:sdk` → `src/vendor/canvas-sdk/` + `src/vendor/canvas/SKILL.md`. `open-canvas skill` copies those into the agent skill dir.

**Order:** shim `ci:local` → `.cursor/skills/shim-rollout/scripts/sync-local-shim.sh` → open-canvas `ci:local` → publish shim → open-canvas `^` shim version → publish open-canvas.

**Charts:** Bar/Line `height`; Pie `size` (shim maps to Recharts). Visual gaps vs the IDE: [shim-visual](../shim-visual/SKILL.md).

**Scripts:** `sync-local-shim.sh`, `verify-showcase-visual.sh` (`.cache/showcase-charts-verify.jpg`).

**npm release (this repo):** `.cursor/skills/release/SKILL.md`.
