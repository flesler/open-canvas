# outline reference

The stdout explains itself. This page covers what a finished canvas looks like in it, what it leaves out, and how its checks decide.

## What a finished canvas looks like

|Aim|In the output|
|---|---|
|Lead with the takeaway|Page 1 opens with the `h1` and `stat`s that state the result; detail and appendix tables go on later pages.|
|One idea per page|Each `PAGE` reads as one story: headline, evidence, caveat. Heights within ~15%, so `--min-height max` adds little blank.|
|Readable at print size|`TEXT` is clean; charts show `smallest text` of 11px or more (9px is the floor).|
|No dead space|No `⚠ Npx empty at the bottom`: size cards to their content, pair side-by-side cards of similar height.|
|Every block identifiable|Cards have titles; hand-drawn `<svg role="img">` has an `aria-label` saying what it shows (named here and for screen readers).|
|Every view checked|Rerun with `--state key=value` for each tab or toggle.|

## Not shown

- Colors, fonts, images, chart data points, table cells. Use `generate --formats png` to see those.
- Unnamed wrappers (layout `div`s with no id, heading, or problem), elements hidden with `display:none`, `visibility:hidden` or `opacity:0`, and icon SVGs under 48px with no text.
- Only the current `useCanvasState` view.

## How the checks decide

|Check|Rule|
|---|---|
|`⚠ Npx empty at the bottom`|Distance from the last child's bottom to the container's bottom, at least `--slack` px (default 80). Charts and SVGs are leaves, so their internal padding never counts.|
|Overlapping text|Two painted text boxes (HTML text or SVG `<text>`) intersect by at least 2px wide and a quarter of the shorter one's height.|
|SVG label cut off|SVG `<text>` extends more than 3px past the nearest ancestor that clips (`overflow` not `visible`), starting at its `<svg>`.|
|Content wider than its box|`scrollWidth` exceeds `clientWidth` by more than 3px on an element that clips horizontally. Only the outermost such box is listed.|
|Small text|Smallest SVG `<text>` after viewBox scaling, under 9px.|
|`x=`|Px from the parent block's left edge; under 24px (8px at the top level) counts as padding and is omitted.|

## CLI

|Flag|Default|
|---|---|
|`--slack <px>`|80|
|`--max-lines <n>`|200 block lines across all pages; text problems and page hints are always printed|
|`--width`, `--min-height`, `--state`, `--selector`, `--theme`|Same as `generate`; pass the values you will export with|

`open-canvas skill <dir>` installs this file at `<dir>/references/outline.md`; the path on the last line of the stdout points at the npm bundle.
