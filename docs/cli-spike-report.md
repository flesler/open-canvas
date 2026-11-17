# CLI spike: zod-opts

## Summary (≤5 bullets)

- Full `cli.ts` swap: all five subcommands plus default-`generate` routing live on `zod-opts` via `defineCommand` + `registry.ts`; Commander removed from dependencies.
- Runtime SSOT is real: `runGenerate` / `runOutline` parse `generateInputSchema` / `outlineInputSchema` built from `sharedCliExportOptionsSchema` + `sharedRuntimeExportFields`; CLI handlers call those same entrypoints.
- Honest forks: per-command **CLI schemas** in `registry.ts` diverge from runtime (e.g. `formats` as comma-separated string, simplified `selectors` / `minHeight` shapes) because zod-opts rejects mixed option types and cannot host the same preprocess/union fields.
- Kebab flags work (`--min-height`, `-w/--width`) through a small `cliFlags.ts` remap layer plus explicit renames (`viewportWidth` → `width`, `selectors` → `selector`).
- **Gates green:** `npm test` (98 tests), T1 `verify example/showcase.canvas.tsx`; help quality matches spec (defaults, enums, `<px>` placeholders, `--no-warn` on outline).

## SSOT score (1–5) and evidence

**3 / 5**

| What | Authoritative place | Repeated elsewhere? |
|------|---------------------|---------------------|
| Flag names, defaults, `.describe()` for shared export flags | `sharedCliExportOptionsSchema` | `generateCliOptionsSchema` / `outlineCliOptionsSchema` **extend** the same object (not a second manual list) |
| Aliases, CLI argument placeholders (`<px>`, `<mode>`) | `sharedExportOptionMeta` + per-command meta in `registry.ts` | **Sidecar** — not inferable from Zod alone; required to feed zod-opts `opts[flag].alias` |
| `formats`, `quiet`, `inlineState`, outline-only flags | Defaults/descriptions in `registry.ts` CLI schemas | Again in `generateInputSchema` / `outlineInputSchema` with different Zod types (`formats` string vs `preprocess` → enum list) |
| Union/preprocess (`minHeight`, `selectors`) | `sharedRuntimeExportFields` on **runtime** schemas only | CLI uses `z.string()` / `z.array(z.string())` in `sharedCliExportOptionsSchema` — **documented split**, not hidden |
| Commander-style duplicate strings | — | **None** (baseline pain removed) |

Programmatic and CLI paths converge at `runGenerate` / `runOutline` `.parse()`, so behavioral SSOT for handlers is solid; **definition** SSOT is weakened by the mandatory CLI vs runtime schema pair.

## Requirements checklist (hard requirements table pass/fail)

| # | Requirement | Result | Notes |
|---|-------------|--------|-------|
| 1 | Single source of truth (Zod drives CLI + programmatic) | **Pass (qualified)** | No Commander `.option()` duplication. Qualified because `registry` CLI schemas are siblings of `*InputSchema`, not one identical object. |
| 2 | Strong typing from definition | **Pass** | Handlers typed via `z.infer`; single `as z.infer<T> & z.infer<U>` after remap in `defineCommand` (line 101). |
| 3 | Help quality | **Pass** | Defaults, enum choices, sensible placeholders; repeatable `--selector`; `--no-warn` documented. |
| 4 | CLI surface | **Pass** | All subcommands; default generate for `.canvas.tsx`; shared export flags; comma `formats`; negated `warn`. |
| 5 | Kebab flags without heavy remap | **Pass (qualified)** | ~47 LOC `cliFlags.ts` + 8-entry `OPTION_CLI_FLAG_NAMES` override map (not project-wide string hacking). |

## Bridge / helper LOC (estimate; list files)

| File | LOC | Role |
|------|-----|------|
| `src/util/defineCommand.ts` | 103 | Build zod-opts `parser` + `Command` per subcommand; `cli()` parse + kebab→camel remap |
| `src/util/cliFlags.ts` | 47 | camelCase schema keys → kebab CLI flags; parse remap |
| `src/commands/exportSchemas.ts` | 61 | `sharedCliExportOptionsSchema`, `sharedExportOptionMeta`, `sharedRuntimeExportFields` |
| `src/commands/registry.ts` | 159 | ~half wiring/handlers, ~half CLI-only schema extensions + `optionMeta` |
| `src/cli.ts` | 45 | Custom argv router (default command, help/version) — replaces Commander program |

**Bridge-focused total:** ~150 LOC (`defineCommand` + `cliFlags`) + ~61 LOC export schema split + ~80–100 LOC registry CLI schema/meta ≈ **290–310 LOC** library glue (excluding command business logic).

**Notable mechanism cost:** `buildCli` constructs **two** parsers per command (`createParser()` for execution, `createSubcommand()` for root `CommandParser` help tree) — inherent zod-opts pattern.

## Help samples (paste generate + outline --help)

### `open-canvas generate --help`

```
Usage: open-canvas generate [options] <canvas>

Build artifacts from a canvas file

Arguments:
  canvas  path to *.canvas.tsx  [required]

Options:
  -h, --help                     Show help                                                                               
  -V, --version                  Show version                                                                            
  -o, --out <string>             output directory relative to canvas (default: "out")                                    
      --title <string>           HTML document title                                                                     
  -t, --theme <mode>             light or dark (choices: "light", "dark") (default: "light")                             
      --brand <name>             cursor or grok (host theme brand) (choices: "cursor", "grok") (default: "cursor")       
  -w, --width <px>               Playwright viewport width (default: 1280)                                               
      --min-height <string>      minimum page height: px, width ratio (<= 10), a4, or max                                
      --render-options <string>  Playwright options JSON (launch / page / screenshot / pdf)                              
      --selector <string ...>    export matched nodes only (repeatable; comma-separated ok) (default: [])                
  -n, --name <slug>              output basename without extension                                                       
  -f, --formats <list>           comma-separated: html,png,pdf,jpg,cursor (default: "html,png,pdf")                      
      --inline-state             with --formats cursor: inline .canvas.data.json and seed localStorage (default: false)  
  -q, --quiet                    no stdout on success (default: false)                                                   
```

### `open-canvas outline --help`

```
Usage: open-canvas outline [options] <canvas>

Print export layout map for the canvas (stdout; same print prep as generate)

Arguments:
  canvas  path to *.canvas.tsx  [required]

Options:
  -h, --help                     Show help                                                                          
  -V, --version                  Show version                                                                       
  -o, --out <string>             output directory relative to canvas (default: "out")                               
      --title <string>           HTML document title                                                                
  -t, --theme <mode>             light or dark (choices: "light", "dark") (default: "light")                        
      --brand <name>             cursor or grok (host theme brand) (choices: "cursor", "grok") (default: "cursor")  
  -w, --width <px>               Playwright viewport width (default: 1280)                                          
      --min-height <string>      minimum page height: px, width ratio (<= 10), a4, or max                           
      --render-options <string>  Playwright options JSON (launch / page / screenshot / pdf)                         
      --selector <string ...>    limit export DOM (repeatable) (default: [])                                        
  -T, --threshold <px>           warn with ! when slack or ib >= px (default 80)                                    
  -m, --max-children <n>         max tree lines (default 96)                                                        
      --warn                     warn on layout slack (use --no-warn for metrics only) (default: true)              
```

## Pros / cons for company-wide CLIs

**Pros**

- Zod-native: options are real `ZodTypeAny` values passed to the parser — validation and help derive from the same shapes.
- No Commander dependency; thin custom `cli.ts` router is easy to reason about and test.
- Help output is strong without custom formatters; enums and defaults show up consistently.
- `defineCommand` is reusable (~100 LOC) across internal CLIs; tests cover kebab remap and parse.
- Full migration proved feasible for a non-trivial CLI (repeatables, negated bools, default subcommand).

**Cons**

- Schema keys must be camelCase; kebab UX requires permanent `cliFlags` + optional rename table — every new CLI likely copies this pattern.
- **CLI vs runtime schema split** is structural (library limitation), not a one-time open-canvas quirk — any command with preprocess/unions/comma-joined flags needs two layers.
- `optionMeta` duplicates information Zod does not express (short flags, value placeholder names).
- Dual `parser` + `subcommand` build per command for root help.
- Dependency: `zod-opts@1.0.0` (single maintainer repo); low churn — fine for spike, watch for bus factor vs Commander ecosystem.

## Blockers (if any)

No hard blockers for open-canvas behavior (tests + smoke pass). **Soft blockers for “perfect” SSOT:**

1. Cannot register union/preprocess fields on the same object used for zod-opts CLI registration → permanent `sharedRuntimeExportFields` fork.
2. Aliases/argument placeholders live outside Zod → drift risk unless conventions are enforced.
3. `formats` as CLI string vs runtime array — extra cognitive load when adding flags.

## Gate results

- **npm test:** **pass** — 14 files, 98 tests, types + vitest green (`2026-11-17` spike run).
- **T1 smoke:** **pass** — `node bin/open-canvas.js verify example/showcase.canvas.tsx` → contract line, exit 0.

## Recommendation

**maybe** for open-canvas — reference implementation is **production-viable** (gates pass, better than baseline Commander duplicate definitions), but SSOT is **3/5** due to CLI/runtime schema fork and `optionMeta` sidecar. Prefer comparing **silvery**, **trpc-cli**, and **optique** spikes before merging; ship zod-opts if rivals need equal-or-worse bridge code or fail T0/T1.

**Reuse pattern elsewhere?** **maybe** — copy `defineCommand` + `cliFlags` as a mini-kit only if teams accept camelCase schema keys and a runtime preprocess layer beside CLI registration; not ideal as the global default without winning the sibling spikes.