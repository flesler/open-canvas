# CLI spike: @silvery/commander

## Summary (≤5 bullets)

- Migrated full `src/cli.ts` to `@silvery/commander` + Zod v4; `generate` / `outline` options come from shared `exportSchemas.ts` via `applyZodObjectToCommand`.
- `runGenerate` / `runOutline` parse `generateInputSchema` / `outlineInputSchema` (same fields as CLI, plus preprocess for formats/minHeight/selectors).
- Default subcommand preserved: `open-canvas foo.canvas.tsx` routes to `generate` via `{ isDefault: true }`.
- Help shows defaults, enum values, and placeholders (`<px>`, `<mode>`, etc.); colorization is automatic when TTY.
- Bridge: ~108 LOC helper + ~47 LOC flag-name map; `remapCommanderOptsToSchema` maps `--width` / `--selector` to schema keys.

## SSOT score (1–5) and evidence

**Score: 4/5**

- **One authoritative place per flag** for name, default, and `.describe()` text: `sharedCliExportOptionsSchema`, `generateCommandOptionsSchema`, `outlineCommandOptionsSchema` in `src/commands/exportSchemas.ts`.
- Handlers call `generateInputSchema` / `outlineInputSchema` — no parallel Commander-only option strings.
- **−1:** CLI command schemas still use `minHeight: z.string()` and `selectors: z.array()` while runtime uses `sharedRuntimeExportFields` preprocess (same split as zod-opts reference, but two shapes for two fields). `formats` is `z.string()` on CLI and `z.preprocess(normalizeFormatInput, …)` on `generateInputSchema`.
- `ApplyZodOptionMeta` repeats only aliases, placeholder names, `repeatable`, and `negated` — not defaults or descriptions.

## Requirements checklist (hard requirements table pass/fail)

| Requirement | Result |
|-------------|--------|
| Zod SSOT for CLI + programmatic entry | **Pass** (with noted CLI/runtime preprocess split for formats/minHeight/selectors) |
| Strong typing, no manual `as` in CLI handlers | **Pass** |
| Help: defaults, enums, placeholders | **Pass** |
| Subcommands: vendor-path, skill, verify, outline, generate | **Pass** |
| Default generate for bare canvas path | **Pass** |
| Shared export flags on generate/outline | **Pass** |
| Repeatable `--selector`, comma `--formats` | **Pass** |
| `--no-warn` on outline | **Pass** |
| Theme / brand / format enums validated | **Pass** |
| Kebab flags (`--min-height`, `--width`) without custom remap layer | **Pass** (tiny static `cliFlags.ts` map for `viewportWidth`→`width`, `selectors`→`selector` only) |

## Bridge / helper LOC (estimate; list files)

| File | LOC | Role |
|------|-----|------|
| `src/util/applyZodObjectToCommand.ts` | ~108 | Zod object → `.option()`; boolean/repeatable/negated handling |
| `src/util/cliFlags.ts` | 47 | Long-flag names for schema keys |
| `src/commands/exportSchemas.ts` (meta + command schemas) | ~55 | Shared schemas + alias/repeatable meta (not duplicate defaults) |

**Total bridge ~210 LOC.**

## Help samples (paste generate + outline --help)

### `open-canvas generate --help`

```
Usage: open-canvas generate [options] <canvas>

Build artifacts from a canvas file

Arguments:
  canvas                    path to *.canvas.tsx

Options:
  -o, --out <value>         output directory relative to canvas (default: "out")
  --title <value>           HTML document title
  -t, --theme <mode>        light or dark (default: "light")
  --brand <name>            cursor or grok (host theme brand) (default:
                            "cursor")
  -w, --width <px>          Playwright viewport width (default: 1280)
  --min-height <value>      minimum page height: px, width ratio (<= 10), a4, or
                            max
  --render-options <value>  Playwright options JSON (launch / page / screenshot
                            / pdf)
  --selector <value>        export matched nodes only (repeatable;
                            comma-separated ok) (default: [])
  -n, --name <slug>         output basename without extension (default: canvas
                            stem, else title slug)
  -f, --formats <list>      comma-separated: html,png,pdf,jpg,cursor (default:
                            "html,png,pdf")
  --inline-state            with --formats cursor: inline .canvas.data.json and
                            seed localStorage (default: false)
  -q, --quiet               no stdout on success (artifacts under --out and
                            --name) (default: false)
  -h, --help                display help for command
```

### `open-canvas outline --help`

```
Usage: open-canvas outline [options] <canvas>

Print export layout map for the canvas (stdout; same print prep as generate)

Arguments:
  canvas                    path to *.canvas.tsx

Options:
  -o, --out <value>         output directory relative to canvas (default: "out")
  --title <value>           HTML document title
  -t, --theme <mode>        light or dark (default: "light")
  --brand <name>            cursor or grok (host theme brand) (default:
                            "cursor")
  -w, --width <px>          Playwright viewport width (default: 1280)
  --min-height <value>      minimum page height: px, width ratio (<= 10), a4, or
                            max
  --render-options <value>  Playwright options JSON (launch / page / screenshot
                            / pdf)
  --selector <value>        limit export DOM (repeatable) (default: [])
  -T, --threshold <px>      warn with ! when slack or ib >= px (default 80)
  -m, --max-children <n>    max tree lines (default 96)
  --no-warn                 warn on layout slack (use --no-warn for metrics
                            only)
  -h, --help                display help for command
```

## Pros / cons for company-wide CLIs

**Pros**

- Commander.js ergonomics (subcommands, default command, negated flags, collect) with Zod validation at the edge.
- Excellent help output (defaults from Zod) and optional colorized help.
- `applyZodObjectToCommand` pattern reusable across services; per-option Zod accepts preprocess/unions unlike zod-opts monolithic parser.
- Typed `.action()` / option chaining without `@commander-js/extra-typings`.

**Cons**

- **Zod v4 peer** — open-canvas had no Zod; adds dependency and version lock-in with `@silvery/commander`.
- No first-class `z.object()` → command; small in-house bridge required (and boolean flags must skip Zod on `.option()` or undefined fails validation).
- Schema field name vs flag name (`viewportWidth` vs `--width`) needs `cliFlags` + `remapCommanderOptsToSchema`.
- Library declares `engines.node >= 24`; we run on 24.11.1 (fine) but stricter than open-canvas’s `>=22.12`.
- `skipLibCheck: false` consumers hit TS2430 on `Command` extends Commander (documented upstream).

## Blockers (if any)

- None for open-canvas spike scope. Production migration should decide Zod v4 adoption repo-wide and whether CLI/runtime schema split for `formats` can collapse to a single preprocess field now that silvery accepts Zod preprocess per option.

## Gate results

- **npm test:** **pass** — types + 94 unit tests green.
- **T1 smoke:** **pass** — `node dist/cli.js verify example/showcase.canvas.tsx`; default `generate` with `example/showcase.canvas.tsx --formats html --quiet` succeeds after boolean-option fix.

## Recommendation

**maybe → lean ship for open-canvas** if the org accepts **Zod v4** and a ~200 LOC shared bridge. Silvery fits teams already on Commander and wanting Zod validation without replacing the parser. Reuse `applyZodObjectToCommand` + `exportSchemas` pattern company-wide; compare against zod-opts on maintainability of the preprocess split (silvery may allow a single schema per command with less dual-shape drift). Reject only if adding Zod v4 is off the table.