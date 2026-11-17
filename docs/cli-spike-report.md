# CLI spike: trpc-cli

## Summary (≤5 bullets)

- Standalone `t.router` + `createCli` replaces Commander in `src/cli.ts`; `generate` / `outline` use Zod on procedure `.input()` and the same schemas feed `runGenerate` / `runOutline`.
- Shared `sharedCliExportOptionsSchema` in `exportSchemas.ts` backs both export commands; stub-level wiring for `vendor-path`, `skill`, `verify` as procedures (no duplicate flag tables).
- `prompts: false` always; canvas path shorthand preserved via `rewriteArgv` + `generate` meta `default: true`.
- `npm test` green (94 unit tests); T1 verify smoke passes; `--width`, repeatable `--selector`, `--no-warn`, comma-separated `-f html,png` verified after `normalizeFormatInput` array fix.
- Help shows enums/defaults but trpc-cli adds noisy `Alias:` / `Type:` lines and models `formats` as an array flag.

## SSOT score (1–5) and evidence

**4 / 5**

| Area | Evidence |
|------|----------|
| Single Zod object per command | `generateFieldsSchema` + `outlineFieldsSchema` are the CLI SSOT; `generateInputSchema` / `outlineInputSchema` add transforms (`width`→`viewportWidth`, `selector`→`selectors`, runtime `minHeight` preprocess) used only at parse time in `runGenerate` / `runOutline`. |
| No parallel Commander `.option()` | Removed from `cli.ts`; flags come from Zod via trpc-cli only. |
| SSOT gap | Procedures must `.input(*FieldsSchema)` — trpc-cli does not derive argv from `ZodEffects` (`.transform()`), so field + transformed schemas are two exports of the same shape (not a second manual flag list). |
| Runtime vs CLI names | `width` / `selector` in shared schema (CLI-native kebab) mapped in transform to `viewportWidth` / `selectors` for render code — one describe per flag, small rename in transform only. |

## Requirements checklist (hard requirements table pass/fail)

| # | Requirement | Result | Notes |
|---|-------------|--------|-------|
| 1 | Single source of truth | **Pass** (with caveat) | No Commander duplication; caveat = `*FieldsSchema` vs `*InputSchema` transform split for CLI builder. |
| 2 | Strong typing from schema | **Pass** | `GenerateOptions` / `OutlineOptions` from `z.input<typeof *FieldsSchema>`. |
| 3 | Help quality | **Partial** | Defaults, choices, negated `--no-warn` present; `Alias: o` noise; `formats` help says `array`; `min-height` appends `type: string or number`. |
| 4 | CLI surface | **Pass** | All five subcommands; default generate; shared export flags; repeatable selector; negated warn; enums; comma formats (with preprocess fix). |
| 5 | Kebab flags | **Pass** | Native trpc-cli mapping; `--min-height`, `--inline-state`, `--width` without a project-wide remap layer. |

## Bridge / helper LOC (estimate; list files)

| File | ~LOC | Role |
|------|------|------|
| `src/cli.ts` | 31 | `createCli`, `rewriteArgv`, `prompts: false`, error formatting |
| `src/commands/cliRouter.ts` | 97 | `t.router` procedures, I/O in handlers, default command meta |
| `src/commands/exportSchemas.ts` | 54 | Shared Zod flags + `minHeight` preprocess |
| **Total bridge** | **~182** | Excludes `exportEnums.ts` (product enums, shared with programmatic API) |

Transforms in `generate.ts` / `outline.ts` (~15 LOC each) are schema-owned, not flag-mapping glue.

## Help samples (paste generate + outline --help)

### `open-canvas generate --help`

```
Usage: open-canvas generate [options] <canvas>
       open-canvas generate  --formats <list>   comma-separated (default html,png,pdf)

Build artifacts from a canvas file

Arguments:
  canvas                     path to *.canvas.tsx (required)

Options:
  -o, --out [string]         output directory relative to canvas; Alias: o
                             (default: "out")
  --title [string]           HTML document title
  -t, --theme [string]       light or dark; Alias: t (choices: "light", "dark",
                             default: "light")
  --brand [string]           cursor or grok (host theme brand) (choices:
                             "cursor", "grok", default: "cursor")
  -w, --width [number]       Playwright viewport width (default 1280); Alias: w
                             (default: 1280)
  --render-options [string]  Playwright options JSON (launch / page / screenshot
                             / pdf)
  --selector [values...]     Type: string export matched nodes only (repeatable;
                             comma-separated ok) array (default: [])
  -n, --name [string]        output basename without extension; Alias: n
  -f, --formats [values...]  Type: string comma-separated:
                             html,png,pdf,jpg,cursor (default html,png,pdf);
                             Alias: f array (choices: "html", "png", "pdf",
                             "jpg", "cursor", default: ["html","png","pdf"])
  --inline-state [boolean]   with --formats cursor: inline .canvas.data.json and
                             seed localStorage (default: false)
  -q, --quiet [boolean]      no stdout on success; Alias: q (default: false)
  --min-height [value]       minimum page height: px, width ratio (<= 10, e.g.
                             1.5), a4, or max (PDF pages all match the tallest);
                             type: string or number
  -h, --help                 display help for command
```

### `open-canvas outline --help`

```
Usage: open-canvas outline [options] <canvas>

Print export layout map for the canvas (stdout; same print prep as generate)

Arguments:
  canvas                       path to *.canvas.tsx (required)

Options:
  -o, --out [string]           output directory relative to canvas; Alias: o
                               (default: "out")
  --title [string]             HTML document title
  -t, --theme [string]         light or dark; Alias: t (choices: "light",
                               "dark", default: "light")
  --brand [string]             cursor or grok (host theme brand) (choices:
                               "cursor", "grok", default: "cursor")
  -w, --width [number]         Playwright viewport width (default 1280); Alias:
                               w (default: 1280)
  --render-options [string]    Playwright options JSON (launch / page /
                               screenshot / pdf)
  --selector [values...]       Type: string export matched nodes only
                               (repeatable; comma-separated ok) array (default:
                               [])
  -T, --threshold [number]     warn with ! when slack or ib >= px (default 80);
                               Alias: T
  -m, --max-children [number]  max tree lines (default 96); Alias: m
  --warn [boolean]             warn on layout slack (use --no-warn for metrics
                               only); Negatable: true (default: true)
  --no-warn                    Negate `--warn` option.
  --min-height [value]         minimum page height: px, width ratio (<= 10, e.g.
                               1.5), a4, or max (PDF pages all match the
                               tallest); type: string or number
  -h, --help                   display help for command
```

## Pros / cons for company-wide CLIs

**Pros**

- Native kebab + Zod v4 `.meta({ alias, positional, negatable })` without a custom flag registry.
- Shared object schema across subcommands is natural (`sharedCliExportOptionsSchema.extend(...)`).
- Same router could later back HTTP/multimodal if needed (not used here).
- Agent-safe defaults: `prompts: false`; built-in non-TTY behavior documented upstream.

**Cons**

- Standalone `t` API marked experimental; couples CLI to trpc-cli release cadence.
- `ZodEffects` / heavy preprocess not reflected in argv — forces `*FieldsSchema` + `*InputSchema` split.
- Default return-value logger is YAML/table-oriented; handlers must own stdout/stderr (silent or `console` logger tradeoffs).
- Help formatting weaker than zod-opts/silvery for unions and comma-list options (array vs single string).
- Heavier than zod-opts alone (`trpc-cli` + mental model of procedures).

## Blockers (if any)

1. **CLI builder vs `ZodEffects`** — `.input()` cannot be the same export as `runX(raw)` when `.transform()` is present; needs paired schemas or dropping transforms (worse for unions).
2. **Comma `formats` on array-mapped flags** — required `normalizeFormatInput` to split embedded commas in argv arrays (fixed in spike; library maps `formats` as repeatable, not a single comma option).
3. **Help polish** — no hook to suppress `Alias:` / union `type:` suffix without upstream change.

Non-blocking: `ExportTheme` enum makes programmatic callers use enum in tests (one test import updated).

## Gate results

- **npm test:** **pass** — types + 94 unit tests green in worktree.
- **T1 smoke:** **pass** — `node dist/cli.js verify example/showcase.canvas.tsx` → `canvas-sdk contract: …`; canvas shorthand `node dist/cli.js example/showcase.canvas.tsx --formats html --quiet` exit 0.

## Recommendation

**maybe** for open-canvas full migration: behavior and SSOT are good, bridge LOC is moderate, but the `Fields`/`Input` schema split and help noise are ongoing tax versus **zod-opts** reference.

**Reuse pattern elsewhere** when you already use tRPC/oRPC and want CLI + server from one router; for CLI-only internal tools, prefer **zod-opts** or **@silvery/commander** unless multimodal routing is on the roadmap.