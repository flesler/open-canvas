### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

## [1.5.0]
#### 2026-10-15

##### Added
- `generate --inline-state` with `--formats cursor`: embed `.canvas.data.json` in the emitted file.
- Export Vite pipeline in `buildExportViteConfig` with plugin unit tests; tarball ships `dist/export-vite-config.js` instead of root `vite.config.ts`.

##### Changed
- Html/png/pdf/jpg exports inline sidecar state into the canvas bundle (`__canvasJsonState`); `localStorage` is seeded only for missing keys.
- `generate` calls `vite.build()` in-process (no subprocess / env-driven config file).
- Showcase exercises more SDK patterns (Divider, host brand palette, table tones, env snapshot from sidecar).
- README and skill bundle trimmed for consumers.

## [1.4.0]
#### 2026-10-14

##### Added
- Canvas state sidecar: sibling `<stem>.canvas.data.json` (flat object) hydrates `useCanvasState` before mount during `generate` / render.
- Unit tests for sidecar path resolution and parsing; showcase `showcase.canvas.data.json` example.

##### Changed
- README documents sidecar behavior; skill bundle note; smoke covers sidecar path; refreshed showcase screenshots.

## [1.3.2]
#### 2026-10-14

##### Changed
- `@flesler/cursor-canvas-web@^1.1.2`.
- `generate`: silent Vite builds by default; `OPEN_CANVAS_DEBUG=1` for verbose logs; stderr on failure.
- Vite build: `reportCompressedSize: false`; refreshed showcase screenshots.

## [1.3.1]
#### 2026-10-14

##### Added
- `shim-visual` agent skill and parity notes for chart rendering vs the IDE.

##### Changed
- `@flesler/cursor-canvas-web@^1.1.1`.
- Showcase layout: responsive typography, theme row, DAG scaling, header repo link; refreshed README screenshots.
- CI: `actions/checkout` and `setup-node` v5; drop redundant shim contract job.
- `test:pack` rejects git/file lockfile resolutions for the shim; lockfile uses npm tarball only.
- Lighter pre-push hooks; release skill documents agent boundaries.

## [1.3.0]
#### 2026-10-14

##### Added
- Agent skill bundle (`open-canvas skill`) with pinned `assets/sdk` + `manifest.json` (`contentHash`).
- `open-canvas skill` copies SDK types from `@flesler/cursor-canvas-web`; `npm run test:pack`; contract line on `verify` / `skill`.
- GitHub Pages via `npm run build:github-pages` → `.cache/github-pages`.

##### Changed
- `@flesler/cursor-canvas-web@^1.1.0`.
- Skill bundle is `SKILL.md` only in-repo; types come from the shim dependency.
- npm `files` whitelist (runtime only).

## [1.2.1]
#### 2026-10-13

##### Added
- GitHub Pages live showcase (`npm run build:github-pages`, deploy workflow).

##### Changed
- User-facing README and npm description (agent-ready visuals, not “export from Cursor”).
- CLI `name` / `description` / `version` read from `package.json` via `src/pkg.ts`; path helpers in `src/paths.ts`.

## [1.2.0]
#### 2026-10-13

##### Added
- `generate --selector` (repeatable / comma-separated): isolate matched nodes for `html`, `png`, `pdf`, `jpg` via `querySelectorAll` (head preserved).

##### Changed
- Showcase `Section` supports `id` for export targets; visual verify script uses `#section-charts`.

## [1.1.3]
#### 2026-10-13

##### Changed
- Showcase exercises newer SDK surface (theme categories, React hooks, chart prefixes).
- Pairs with `@flesler/cursor-canvas-web@1.0.2` (manual SDK contract; chart prop tolerance). Bump `^1.0.2` in `package.json` / lock after shim is on npm.

## [1.1.2]
#### 2026-10-13

##### Changed
- `@flesler/cursor-canvas-web@^1.0.1` (shim `PieChart` sizing).
- Example: single `example/showcase.canvas.tsx` (SDK gallery + data imports); README light/dark screenshots and fork link.
- Contract verifies fork `demo.canvas.tsx` when sibling shim repo is present; `npm run example:cursor` for cursor emit.

## [1.1.1]
#### 2026-10-13

##### Changed
- **Recharts 3** (`^3.10.1`), aligned with `@flesler/cursor-canvas-web` peer range (drops deprecated 2.x install warning).
- Runtime deps: Mantine **8.3.18**, React **19.3**, Vite **7.3**, Playwright **1.64**, TypeScript **5.9**, ts-morph **28** (stay on Mantine 8 until shim peers allow 9).

## [1.1.0]
#### 2026-10-13

##### Changed
- Dependency `@flesler/cursor-canvas-web@^1.0.0` (npm fork; SDK contract + Mantine 8).
- Vite resolve dedupes React/Mantine; `ensureChromium` for headless renders.

## [1.0.2]
#### 2026-10-13

##### Added
- CLI `-v` / `--version`.

##### Changed
- `engines.node`: `>=22.12.0` (shim + Vite 7; drop npm 11 pin).
- Docs: `docs/TODO.md`; removed `docs/spec.md`; trimmed README and agent SKILL.

## [1.0.1]
#### 2026-10-13

##### Fixed
- `verify`: pin `@types/react` so canvas JSX matches `cursor/canvas` types.
- PNG screenshots: omit JPEG `quality` (Playwright rejects it for PNG).

## [1.0.0]
#### 2026-10-13

##### Added
- `generate` (default): HTML, PNG, PDF, JPG, and IDE-ready `.canvas.tsx` (`--formats cursor`).
- `verify <canvas>`: typecheck canvases (`cursor/canvas` + data imports).
- `skill`: print or install agent `SKILL.md`.
- Data imports: JSON, JSONL, CSV, TSV, YAML beside the canvas file.
- E2E `npm run test:smoke` (external canvas + prod pack install).

##### Changed
- npm package `@flesler/open-canvas`; CLI `open-canvas`; repo `flesler/open-canvas`.
- Positional canvas path (no `--canvas`); bin `bin/open-canvas.js`.
- PDF via Playwright `page.pdf()`; centralized render options in `render-options.ts`.
- Vite resolve for canvases outside the package (`src/pkg.ts`).
- Example canvas: `example/showcase.canvas.tsx`.

##### Removed
- `export` subcommand name (use `generate`).
- Separate `load-data-file` module (merged into `util`).
