# TODO

- Shim bundle splitting + HTML size (see cursor-canvas-web).
- Web fenced-code highlighting (Sugar High) — not SDK parity.

## `generate --layout` (or env) — agent-readable export metrics

**Problem:** agents cannot see PNG/PDF easily; need text after `generate` to tune breaks and spot collapsed sections.

**Worth printing (short, stderr):**

- Viewport width; `scrollHeight` after same prep as PDF (`vh` strip).
- Direct children of canvas root: index, short label (`id` / first heading / tag), height px.
- If PDF breaks: marker count, segment heights between breaks, `sheetHeightPx`, page count, MediaBox heights (pt).

**Helps:** uneven PDF pages (where to put `break-before`), tiny/huge sections, overall length.

**Does not help:** in-card overlap, colors/charts looking wrong, copy/data, type errors (`verify`).

**Skip:** full DOM, pixels, compare-image parity.

**Shape:** optional flag on `generate` reusing `preparePdfLayout` + one Playwright pass — not a separate heavy `inspect` command unless this proves useful.
