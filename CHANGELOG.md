### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

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
- npm package **`@flesler/open-canvas`**; CLI **`open-canvas`**; repo `flesler/open-canvas`.
- Positional canvas path (no `--canvas`); bin `bin/open-canvas.js`.
- PDF via Playwright `page.pdf()`; centralized render options in `render-options.ts`.
- Vite resolve for canvases outside the package (`src/pkg.ts`).
- Example canvas: `example/build-plane.canvas.tsx`.

##### Removed
- `export` subcommand name (use `generate`).
- Separate `load-data-file` module (merged into `util`).
