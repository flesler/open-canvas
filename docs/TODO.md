# TODO

## Shim & deps

- [`@thisismydesign/cursor-canvas-web`](https://www.npmjs.com/package/@thisismydesign/cursor-canvas-web) — bump on releases; `npm run test:smoke` + real `.canvas.tsx`.
- **Recharts 3** — shim peers `^2.15.0`; npm deprecates 2.15.4. Need shim peer `^3` (or fork) before we bump.
- **`verify` / `react` types** — shim imports `react`; we pin `@types/react` here. Upstream could ship or document stubs.
- **Fork** — if shim lags: `@flesler/cursor-canvas-web`, small diff, PR back when possible.
