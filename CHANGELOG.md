# Changelog

## 1.0.0

### Added

- `generate` (default): HTML, PNG, PDF, JPG, and IDE-ready `.canvas.tsx` (`--formats cursor`).
- `verify --canvas`: typecheck canvases (`cursor/canvas` + data imports).
- `skill`: print or install agent `SKILL.md`.
- Data imports: JSON, JSONL, CSV, TSV, YAML beside the canvas file.

### Changed

- Package and CLI name **`opencanvas`** (npm); repo `flesler/opencanvas`.
- PDF via Playwright `page.pdf()` (removed `pdf-lib`).
- Vite build uses published `dist/load-data-file.js`; runtime deps include Vite stack for `generate`.
- Example canvas: `example/build-plane.canvas.tsx`.

### Removed

- `export` subcommand name (use `generate`).
- `@rollup/plugin-dsv` (shared `load-data-file` for CLI + Vite).
