# Typing (verify / generate)

Read when authoring props or `extra` on charts — not for every export.

After `open-canvas vendor-path`:

1. `$VENDOR/canvas/SKILL.md` — vendor authoring (skip IDE-only paths when exporting).
2. `$VENDOR/canvas-sdk/*.d.ts` — **IDE** contract in the panel.
3. `$SUPERSET/index.d.ts` + `shim-props.d.ts` — **web** contract for `verify` / `generate`.
4. `$SUPERSET/chart-extra.d.ts` — when using `extra` on `BarChart` / `LineChart`.

Superset **replaces** SDK shapes for the same export names (`StackProps`, …). Use **named** types from `$SUPERSET/index.d.ts`, not `import type * as …` namespaces (those can still resolve to SDK).

|Web-only on components|Where|
|---|---|
|Chart knobs beyond IDE|`extra` on `BarChart` / `LineChart` — `chart-extra.d.ts`|
|`aria-*`, `data-*`, `id`, …|`DomForwardProps` in `shim-props.d.ts` (IDE ignores unknown props)|