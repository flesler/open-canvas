# outline reference

Only if stdout is not enough. **Legend**, **MAJOR BLOCKS**, and **STRUCTURE** headers define the tokens; this file covers limits and CLI.

## What stdout cannot show

- Colors, typography, images, chart data, table cells, form values, selected tab.
- DOM hidden by `display:none` or below the outline noise threshold (anonymous Mantine wrappers, tiny nodes).

## Often misread

|Situation|Meaning|
|---|---|
|`shallow outline` on a section|Few nodes matched export rules; height is mostly unlisted content — run `generate` (html/png) to inspect.|
|`!` + large `empty-inside` on `chart-host`|Slack below measured child boxes; chart may still render (SVG/canvas).|
|`duplicate button layouts`|Same label at two widths — usually two columns, not duplicate bugs.|
|`overlap-sibling`|Shared bounding-box area (px²) with a sibling; common in grid/flex rows.|
|`(no outline nodes inside)`|Section non-empty in browser but no landmark matched — text, components, or filtered DOM.|

## CLI

|Flag|Default|
|---|---|
|`--max-children`|96 STRUCTURE lines (collects up to 180 nodes)|
|`--no-warn`|no `!` slack marks|
|`-T <px>`|slack threshold (default 80)|

Same build and **print** pass as `generate` (not the IDE panel).

## Skill copy

`open-canvas skill <dir>` installs the same text at `<dir>/references/outline.md`. The absolute path at the top of `outline` stdout points at the npm bundle (works without installing the skill).