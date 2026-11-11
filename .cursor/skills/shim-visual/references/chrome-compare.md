# Chrome HTML compare

User paste = **served canvas document** — the **iframe’s** `html` (DevTools on the frame document), not the Cursor parent page with the header above the iframe. Agent opens **export** `*.html` from `open-canvas generate` (standalone top-level doc, same tree as the frame).

## Panel vs published

Cursor’s canvas **template CSS** uses `body { padding: 24px 32px }` (see captured `canvas.html` `<style>`). The **IDE side panel** often adds **inline** `body` padding (`16px` vertical, `--cursor-canvas-gutter` horizontal) — tighter for editing beside chat. A **published / standalone** canvas URL typically keeps the template rule (no panel override). `?preview` in that HTML only gates WebSocket/errors; it does not switch padding.

**Export default:** match **published / shareable** layout (`24` / `32` horizontal), not the embedded panel gutter. Re-capture from a standalone published link when verifying publish parity.

## Capture (user)

- Same theme as export run (`light` / `dark`).
- Full `html` `outerHTML`, or at minimum: `html`, `body`, first Mantine/canvas host ancestors through `[data-chrome-probe="content"]`.

## Diff order

1. **Document** — `color-scheme`, `class` on `html`/`body`, inline `style`, linked stylesheets (names only).
2. **Wrapper chain** — list ancestors of `[data-chrome-probe="content"]` in IDE vs export: tag, `id`, `data-*`, notable classes.
3. **Insets** — computed `padding` / `margin` on each ancestor through probe root; note **first box** where horizontal inset appears in each tree.
4. **Background** — `background-color` on wrappers (editor fill vs host chrome).
5. **Typography** — `font-family`, `font-size`, `line-height` on probe text vs `H3` defaults.
6. **Width** — export may set `--width` / max-width; IDE may be fluid panel width (expected; call out separately from padding).

## Report format

Short table or bullets: `property` · IDE value · export value · file to change (if export-side).

## PDF

HTML parity ≠ PDF margins. After shell padding aligns, validate print with `preparePdfLayout` / `box-decoration-break` on export `main` — do not fold PDF-only fixes into IDE comparison.
