# CLI spike: optique

## Summary (≤5 bullets)

- Migrated **`generate`** and **`outline`** to `@optique/core` + `@optique/run` + `@optique/zod`; kept **`vendor-path`**, **`skill`**, **`verify`** on Commander via a thin hybrid `cli.ts` dispatcher.
- **Runtime SSOT:** `sharedCliExportOptionsSchema` / `exportCliSchemas.ts` (`generateInputSchema`, `outlineInputSchema`) — `runGenerate(raw)` and `runOutline(raw)` call `.parse(raw)` (same pattern as zod-opts reference).
- **CLI SSOT:** Optique parser combinators (`command` + `object` + `option`/`flag`/`negatableFlag`/`multiple`) — each shared export field uses `zod(sharedCliExportOptionsSchema.shape.<field>)` so validation matches Zod; flag names, aliases, and repeatability live only in the parser layer.
- Default **bare canvas path → generate** preserved (`open-canvas foo.canvas.tsx`); repeatable `--selector`, `--no-warn`, comma `--formats`, kebab long flags all work.
- `npm test` green; T1 smoke verify OK on `example/showcase.canvas.tsx`.

## SSOT score (1–5) and evidence

**Score: 3 / 5** — honest split brain, not a single artifact.

| Layer | Authority | Evidence |
|-------|-----------|----------|
| Defaults, enums, coercion, programmatic API | **One Zod object** (`sharedCliExportOptionsSchema` → `exportCliSchemas`) | `generate.ts` / `outline.ts` only accept parsed input |
| CLI surface (kebab, `-w`/`--width`, `--selector`×N, `--no-warn`) | **Optique parser** (`optiqueSharedExport.ts`, `optiqueCommands.ts`) | No Commander `.option()` for export commands |
| Bridge | `zod(shape.out)` etc. | Reuses Zod field schemas; does **not** auto-generate flags from `z.object` |

**Repeated fields (count ~9):** help `description` strings in Optique `message\`...\`` duplicate Zod `.describe()` on shared export fields (parser descriptions are not read from Zod metadata today). Flag aliases are parser-only (expected for Optique).

**Verdict:** Neither “one `z.object` drives everything” nor “parser-only SSOT.” **Dual SSOT:** Zod owns runtime shape; parser owns CLI grammar; `@optique/zod` links value validation.

## Requirements checklist (hard requirements table pass/fail)

| # | Requirement | Result | Notes |
|---|-------------|--------|-------|
| 1 | Single Zod-shaped SSOT for CLI + programmatic | **Partial pass** | Programmatic: full pass. CLI: parser-first; Zod per-value via `zod(shape.*)`. |
| 2 | Strong typing without manual casts after parse | **Pass** | Parser inference + `z.infer<typeof generateInputSchema>` |
| 3 | Help: defaults, enums, sensible placeholders | **Pass** | Defaults shown; theme/brand as `CHOICE`; width as `NUMBER`. `min-height` still `STRING` (not `<value>`). |
| 4 | Full CLI surface (all subcommands + default command) | **Partial pass** | Export commands complete; other subcommands still Commander stubs in root help |
| 5 | Kebab flags without camel↔kebab layer | **Pass** | Native `--min-height`, `--viewport-width` as `--width`, etc. |

## Bridge / helper LOC (estimate; list files)

| File | Lines | Role |
|------|------:|------|
| `src/commands/exportSchemas.ts` | 49 | Shared Zod export fields + preprocess helpers |
| `src/commands/exportCliSchemas.ts` | 46 | Command input schemas + outline transform |
| `src/exportEnums.ts` | 60 | Enums + format normalization |
| `src/cli/optiqueSharedExport.ts` | 59 | Shared Optique options wired to `shape.*` |
| `src/cli/optiqueCommands.ts` | 159 | Generate/outline parsers, help, dispatch |
| `src/cli.ts` | ~150 | Hybrid routing (Optique vs Commander) |

**Optique-specific bridge (excl. enums/schemas):** ~220 LOC (`optiqueSharedExport` + `optiqueCommands` + dispatcher delta vs baseline).

## Help samples (paste generate + outline --help)

### `open-canvas generate --help`

```
Usage: open-canvas generate [-o/--out STRING] [--title STRING] [-t/--theme CHOICE] [--brand CHOICE] [-w/--width NUMBER] [--min-height STRING] [--render-options STRING] [[--selector STRING...]] [-n/--name STRING] [-f/--formats STRING] [--inline-state] [-q/--quiet] STRING

Build artifacts from a canvas file

  -o, --out STRING         output directory relative to canvas ["out"]
  --title STRING           HTML document title
  -t, --theme CHOICE       light or dark ["light"]
  --brand CHOICE           cursor or grok (host theme brand) ["cursor"]
  -w, --width NUMBER       Playwright viewport width ["1280"]
  --min-height STRING      minimum page height: px, width ratio (<= 10), a4, or max
  --render-options STRING  Playwright options JSON (launch / page / screenshot / pdf)
  --selector STRING        export matched nodes only (repeatable; comma-separated ok)
  -n, --name STRING        output basename without extension
  -f, --formats STRING     comma-separated: html,png,pdf,jpg,cursor ["html,png,pdf"]
  --inline-state           with --formats cursor: inline sidecar + localStorage
  -q, --quiet              no stdout on success
  STRING                   path to *.canvas.tsx
```

### `open-canvas outline --help`

```
Usage: open-canvas outline [-o/--out STRING] [--title STRING] [-t/--theme CHOICE] [--brand CHOICE] [-w/--width NUMBER] [--min-height STRING] [--render-options STRING] [[--selector STRING...]] [-T/--threshold NUMBER] [--warn/--no-warn] [-m/--max-children NUMBER] STRING

Print export layout map for the canvas (stdout; same print prep as generate)

  -o, --out STRING           output directory relative to canvas ["out"]
  --title STRING             HTML document title
  -t, --theme CHOICE         light or dark ["light"]
  --brand CHOICE             cursor or grok (host theme brand) ["cursor"]
  -w, --width NUMBER         Playwright viewport width ["1280"]
  --min-height STRING        minimum page height: px, width ratio (<= 10), a4, or max
  --render-options STRING    Playwright options JSON (launch / page / screenshot / pdf)
  --selector STRING          export matched nodes only (repeatable; comma-separated ok)
  -T, --threshold NUMBER     warn with ! when slack or ib >= px (default "80")
  --warn, --no-warn          warn on layout slack (use --no-warn for metrics only)
  -m, --max-children NUMBER  max tree lines (default "96")
  STRING                     path to *.canvas.tsx
```

## Pros / cons for company-wide CLIs

**Pros**

- Native kebab, aliases, `multiple()`, `negatableFlag` — no `cliFlags.ts` / camel remap layer.
- Excellent help/completion story (`showDefault`, `termWidth: "auto"`, built-in `--help` docs via `getDocPageSync`).
- Typed parser output; Zod re-parse at handler boundary keeps programmatic + CLI paths aligned.
- `sharedExportOptiqueFields` spread avoids drift between generate/outline for export flags.

**Cons**

- **Two authoritative layers** unless you invest in codegen or shared metadata (Zod `.describe()` not propagated to Optique annotations automatically).
- Hybrid migration state: Commander + Optique increases dispatch complexity (`cli.ts`).
- Subcommand argv must include command token (`generate`, `outline`) for `command()` parsers — easy to get wrong (fixed in spike for default-generate).
- Learning curve / combinator API verbosity vs zod-opts “one schema object.”
- New deps (`@optique/*`) + Zod v4; bundle `dist/cli.js` ~39 KB (minified).

## Blockers (if any)

- No first-class “build entire CLI from one `z.object`” — spike does **not** prove single-schema SSOT; `@optique/zod` validates **values**, not flag topology.
- Full repo migration requires porting remaining subcommands to `or(command(...))` tree or `@optique/core/facade` discovery — not attempted.
- Root `open-canvas --help` still Commander skeleton; export help only via `generate --help` / `outline --help`.

## Gate results

- **npm test:** **pass** (types + 94 unit tests)
- **T1 smoke:** **pass** — `node dist/cli.js verify example/showcase.canvas.tsx`; default generate `node dist/cli.js example/showcase.canvas.tsx --formats html -q` produces `example/out/showcase.html`

## Recommendation

**maybe** for open-canvas full migration; **reuse pattern elsewhere** for **new greenfield CLIs** where parser-first SSOT is acceptable and you want best-in-class help/completion without Commander.

Compared to zod-opts reference: Optique eliminates kebab/camel bridging but **does not** reduce conceptual duplication — it moves duplication from `optionMeta`/`cliFlags` to parallel Optique `option()` definitions. Prefer Optique if company standard is combinator CLIs + long-term completion/man-page investment; prefer zod-opts if “one `z.object` per command” is the non-negotiable SSOT test.