---
name: shim-rollout
description: Read when the shim is updated and how to roll it out.
---

# Shim rollout

|Symptom|Repo|
|---|---|
|`cursor/canvas` render/API|`cursor-canvas-web` `src/shim/`|
|verify, generate, pack, skill|`open-canvas` `src/`|

**SDK + `/canvas` skill:** `npm run sync:sdk` (shim repo, needs Mac IDE tree) or `npm run patch:vendor-paths` (path rewrites + manifest hash only). Agents: `VENDOR=$(open-canvas vendor-path)`.

**Order:** shim `ci:local` → `.cursor/skills/shim-rollout/scripts/sync-local-shim.sh` → open-canvas `ci:local` → publish shim → open-canvas `^` shim version → publish open-canvas.

**Charts:** Bar/Line `height`; Pie `size` (shim maps to Recharts). Visual gaps vs the IDE: [shim-visual](../shim-visual/SKILL.md).

**Scripts:** `sync-local-shim.sh`, `verify-showcase-visual.sh` (`.cache/showcase-charts-verify.jpg`).

**npm release (this repo):** `.cursor/skills/release/SKILL.md`.
