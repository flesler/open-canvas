---
name: shim-rollout
description: Read when fixing cursor-canvas-web shim and open-canvas together.
---

# Shim rollout (maintainer only)

Not shipped to npm users. **`cursor-canvas-web`** implements `cursor/canvas`; **open-canvas** bundles it for CLI export.

User canvases are free-form — fix **shim/components**, not “the one true layout”. Repo examples (`showcase`, fork `demo`) are smoke/verify fixtures and README art only.

## Classify the defect

| Symptom | Owner | Fix |
| --- | --- | --- |
| Component renders wrong in IDE-like export (charts, theme, API) | Shim | `src/shim/` |
| CLI, verify, pack, Playwright | open-canvas | `src/` |
| One-off JSX in an example | Example | only after shim + fork Vite demo look correct |

Grid stretch beside a much taller sibling is an **author layout** issue in examples; shim still must size charts correctly for any parent.

## SDK contract

`cursor-canvas-web` `test:contract` builds the lib and prints missing SDK names. It does **not** fail on a new type or export. `pnpm run test:contract:strict` is the optional full `tsc` check. It does **not** copy `~/.cursor/skills-cursor/canvas/sdk` on CI or pre-push.

- Refresh the snapshot only on purpose: `pnpm run sync:sdk` in the shim repo, review the diff, commit it with the shim changes.
- Before that bump, `pnpm run check:sdk-live` (no writes). The shim must export every name the live skill has **and** every name the committed snapshot has — a superset, so older and newer Cursor skills both typecheck.

## Fix order

1. Reproduce with fork `pnpm dev` and `open-canvas generate` on a minimal canvas if possible.
2. Shim + `pnpm ci:local` in fork.
3. `./.cursor/skills/shim-rollout/scripts/sync-local-shim.sh`
4. `npm run ci:local` in open-canvas.
5. **Visual:** `scripts/verify-showcase-visual.sh` → Read `.cache/showcase-charts-verify.jpg`.
6. **README / Pages:** `npm run example:screenshot`; `npm run build:pages` → <https://flesler.github.io/open-canvas/>. Fork demo: `pnpm demo:screenshot` → <https://flesler.github.io/cursor-canvas-web/>.
7. **Publish order:** `npm publish` shim **1.0.1+** first → in open-canvas `npm install @flesler/cursor-canvas-web@^1.0.1` (registry lock; no `file:` sibling in lock) → then publish open-canvas.

## Charts (shim)

- Bar/Line: `height` (default 240). Pie: `size` (default 200). Different SDK props — shim wraps pie in `height/minHeight: size` for Recharts.
- Do not change global `Grid` defaults to force user layouts.

## Demo canvas

Canonical example: open-canvas **`example/showcase.canvas.tsx`** (`./data/*` imports). Fork demo: **`pnpm sync:demo`** — runs `open-canvas generate --formats cursor` on showcase (same inliner users get) → `.cursor/canvases/demo.canvas.tsx`.

## Scripts

| Script | Role |
| --- | --- |
| `scripts/sync-local-shim.sh` | Fork `dist` → open-canvas `node_modules` |
| `scripts/verify-showcase-visual.sh` | Cropped JPG for agent visual check |

Fork: `pnpm sync:demo`, `pnpm demo:screenshot`. `OPEN_CANVAS_ROOT` overrides sibling path.
