# PDF export

Read when `generate` includes `pdf` or you add page breaks / print-only UI.

## Margins and color

Export margins match a **published** Cursor canvas (**24px / 32px**), not the tighter IDE panel — not a CLI flag; add inset in the canvas if needed. `--theme` sets print colors (dark PDF keeps dark surfaces).

## Page breaks

Between sections:

```tsx
<div aria-hidden style={{ breakBefore: "page" }} />
```

Use `open-canvas outline` to see vertical **seg-N** slices before generating.

## Minimum page height

`--min-height` on `generate`: px, width ratio up to `10` (e.g. `1.5`), `a4`, or `max` (every PDF page matches the tallest). Default: each page fits its content.

## Hide on paper only

```tsx
<style>{`@media print { .hide-for-pdf { display: none !important; } }`}</style>
<div className="hide-for-pdf">…</div>
```

Wrap screen-only links, toggles, or chrome. `.export-screen-only` in older examples — same idea.