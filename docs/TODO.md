# TODO

## Shim & deps

- [`@flesler/cursor-canvas-web`](https://www.npmjs.com/package/@flesler/cursor-canvas-web) — fork of `@thisismydesign/cursor-canvas-web`; SDK policy + snapshot tracking: [COMPAT.md](https://github.com/flesler/cursor-canvas-web/blob/main/COMPAT.md). On shim bumps: `npm run test:contract` + smoke + optional real `.canvas.tsx` (`CANVAS_CONTRACT_FIXTURES`).
- **`verify` / `react` types** — shim imports `react`; we pin `@types/react` here. Fork could ship stubs later.
- **Upstream** — PR chart axis / SDK parity back to `thisismydesign/cursor-canvas-web` when convenient.
