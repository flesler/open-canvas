# CLI library evaluation (open-canvas)

Shared spec for parallel spikes. Each candidate gets its own git branch + worktree. Use this file as the contract.

## Paths

| Role | Path | Branch |
|------|------|--------|
| Baseline (Commander, no Zod CLI) | `/home/flesler/Code/open-canvas` | `main` |
| Reference spike (done) | `/home/flesler/Code/open-canvas-zod-opts` | `zod-opts` |
| Candidate spikes | `../open-canvas-<name>` | `cli-<name>` |

Read baseline `src/cli.ts` and handlers under `src/commands/` on **main**. Read the full zod-opts migration on **zod-opts** (registry, `defineCommand`, `exportSchemas`, enum exports).

## North star

Pick a pattern for **all future CLIs**, not only this repo. Optimize for maintainability and honest SSOT, not minimizing diff size.

## Hard requirements (must pass)

1. **Single source of truth** — One Zod-shaped definition (or equivalent) drives CLI flags **and** programmatic entry (`runGenerate(raw)`, `runOutline(raw)`). **Rejected:** Commander `.option()` strings plus a separate `z.object` that repeats names, defaults, and descriptions (parse-at-boundary only).
2. **Strong typing** — Handler/options types inferred from that definition without manual interfaces or `as` casts after parse.
3. **Help quality** — Subcommand help shows defaults, enums/choices, and sensible placeholders (`<px>`, not only `<string>` where possible).
4. **CLI surface** — Must support what open-canvas needs today:
   - Subcommands: `vendor-path`, `skill`, `verify`, `outline`, `generate`
   - Default command: bare `open-canvas foo.canvas.tsx` → `generate`
   - Shared export flags on `generate` / `outline` (theme, brand, width, selectors, etc.)
   - Repeatable `--selector`; comma-separated `--formats`
   - Negated boolean (`--no-warn` on outline)
   - Enums: theme, brand, output formats
5. **Kebab flags** — Long options should be `--min-height`, `--viewport-width` / `--width` without a project-wide camel↔kebab remap layer unless that layer is tiny and reusable across CLIs.

## Soft requirements (score in report)

- Subcommand / default-command ergonomics
- Error messages on validation failure
- Dependency weight and release activity
- Agent-friendly (no interactive prompts on missing args in CI/non-TTY)
- Ability to share one `sharedCliExportOptionsSchema` across commands without drift
- Unions / preprocess (`minHeight`, `selectors`) without splitting “CLI schema” vs “runtime schema”

## Explicitly out of scope / do not trial

- Commander + `schema.parse(program.opts())` (duplicate definition)
- `zod-args-parser` (npm deprecated)
- `argzod`, `@mizchi/zodcli` (tiny / missing)
- cleye, citty, clipanion, yargs without Zod SSOT
- `@commander-js/extra-typings` alone (types only, no validation SSOT)

## Candidates

| ID | Library | Why trial |
|----|---------|-----------|
| `zod-opts` | `zod-opts` + `zod` | Reference implementation on branch `zod-opts` — assess, do not re-implement from scratch |
| `silvery` | `@silvery/commander` | Commander + Zod per `.option()`; native kebab; colorized help |
| `trpc-cli` | `trpc-cli` + `zod` | `z.object` on procedure input; Commander underneath; standalone `t.router` |
| `optique` | `@optique/core`, `@optique/run`, `@optique/zod` | Parser-combinator SSOT; Zod via `@optique/zod` per value |

## What “success” looks like for a library

- **SSOT:** Count places where flag name, default, or description is repeated. Goal: one authoritative definition per option field.
- **Bridge LOC:** Lines in helpers (`defineCommand`, flag maps, option meta) that exist only because of the library. Lower is better.
- **Gate T0:** `npm test` green in the spike worktree after migration (or after partial migration if documented).
- **Gate T1:** `open-canvas generate --help` and `open-canvas outline --help` captured in the report; smoke: `node bin/open-canvas.js verify example/showcase.canvas.tsx` (or equivalent built CLI).
- **Honesty:** Document failures (union options, repeatables, default command) instead of hiding behind hacks.

## Known baseline pain (Commander on `main`)

- Manual coercion (`Number`, casts for theme/brand)
- Defaults/descriptions duplicated between `.option()` and runtime
- No shared schema between CLI and `runGenerate` / `runOutline`

## Known zod-opts pain (reference)

- Schema keys are camelCase; CLI uses kebab → needs `cliFlags.ts` + `optionMeta` for aliases and renamed flags (`viewportWidth` → `--width`)
- zod-opts rejects mixed option types → split `sharedCliExportOptionsSchema` vs `sharedRuntimeExportFields` with preprocess
- Dual parser build per command (`defineCommand`)

## Spike scope (each candidate worktree)

**Minimum:** Migrate CLI wiring for **`generate`** and **`outline`** plus shared export option schema. Keep other subcommands on Commander temporarily **only if** the library makes that hard — but prefer full `cli.ts` swap if feasible.

**Preserve behavior:** Default generate when first arg looks like a canvas path; existing tests should pass or list intentional updates in the report.

**Do not** open PRs or push. Work only inside your worktree.

## Deliverable (each spike)

Create **`docs/cli-spike-report.md`** in **your** worktree root with:

```markdown
# CLI spike: <library>

## Summary (≤5 bullets)

## SSOT score (1–5) and evidence

## Requirements checklist (hard requirements table pass/fail)

## Bridge / helper LOC (estimate; list files)

## Help samples (paste generate + outline --help)

## Pros / cons for company-wide CLIs

## Blockers (if any)

## Gate results
- npm test: pass/fail + notes
- T1 smoke: pass/fail

## Recommendation
ship / maybe / reject for open-canvas; reuse pattern elsewhere? 
```

## Parent merge

Coordinator reads all `docs/cli-spike-report.md` files and recommends trial order for a full migration.