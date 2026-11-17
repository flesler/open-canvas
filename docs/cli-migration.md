# CLI migration — goals, rules, spike results

Decision doc for replacing raw Commander on `open-canvas` and for other CLIs.

## Decision

**Adopt `trpc-cli` + `zod`** (`t.router`, `createCli`, `prompts: false`). Other spikes remain on branches `zod-opts`, `cli-silvery`, `cli-trpc-cli`, `cli-optique`. On `main`: no implicit `generate` shortcut; `generateFieldsSchema` / `outlineFieldsSchema` are CLI + programmatic SSOT; flag fields use `width` and `selector`.

## Goals (non‑negotiable)

1. **One Zod definition** drives CLI flags and programmatic entry (`runGenerate(raw)`), not parallel `.option()` strings.
2. **Full Zod** on that path: `.default()`, `.describe()`, `.coerce`, `.enum` / `z.nativeEnum`, `.preprocess`, `.transform`, `.refine`, arrays, optional — not a custom mini-type system. Extra `.meta({ … })` for CLI-only hints (alias, positional, repeatable) is fine.
3. **Commander-like UX** where it matters: subcommands, kebab flags, defaults and choices in `--help`.
4. **Minimal glue**; reusable kit only if it shrinks every CLI.
5. **Same handler** whether argv or import: ideally `runGenerate(raw)` with `raw` typed as `z.input<typeof generateSchema>` and **one** `.parse()` (or trpc passes validated input straight through).

### Allowed to drop

- **Default generate** (`open-canvas foo.canvas.tsx` without the `generate` token). Spikes used `rewriteArgv` / custom routers for this; removing it avoids that class of glue. Agents can pass `generate` explicitly.

### Avoid

- Renaming flags in app code (`width` in schema and in handlers — not `viewportWidth` + remap).
- Two schemas for the same command (CLI shape vs runtime shape) unless the library truly cannot represent the field on argv (document the exception).

## Baseline: Commander only (main today)

```ts
import { Command, Option } from 'commander'

program
  .command('generate')
  .argument('<canvas>')
  .option('-o, --out <dir>', 'output dir', 'out')
  .option('-t, --theme <mode>', 'light or dark', 'light')
  .option('-w, --width <px>', 'viewport width', Number, 1280)
  .action((canvas, opts) => {
    runGenerate({ canvas, ...opts }) // opts untyped; theme/brand often cast by hand
  })
```

|Criterion|Grade|Notes|
|---|---|---|
|Zod SSOT|**F**|No Zod; duplicate defaults in `.option()` and handler|
|Full Zod on CLI path|**F**||
|Programmatic + CLI same schema|**F**||
|Glue LOC|**0**|But hidden cost in casts and drift|
|Help|**A**|Reference UX|

**Verdict:** Fine parser; fails the migration goals unless you add a second Zod layer (rejected).

## Zod fidelity (what “full Zod” means per library)

|Capability|Commander+parse|@silvery/commander|trpc-cli|zod-opts|Optique|
|---|---|---|---|---|---|
|Pass arbitrary `ZodType` per flag|N/A|**Yes** — 3rd arg to `.option()`|**Mostly** — `.input(z.object({…}))`; **not** as sole `.input()` if top-level is `ZodEffects` / `.transform()`|**Per-option** `type:` in options map; **object must be uniform** (no mixed unions in one options blob)|**Per-flag** via `@optique/zod(schema)`|
|`.default()` / `.describe()` in help|Manual mirror|**Yes**|**Yes**|**Yes**|Split: Zod + `message` text|
|`.preprocess` / unions on argv|In parse schema only|In parse schema / per-option|**Preprocess on fields OK**; **procedure `.input()` must be `ZodObject`**, not transformed whole-object export for argv builder|Often **blocked** on CLI registration → runtime-only fields|In Zod branch of each option|
|CLI `.meta()` (alias, positional)|N/A|Commander + Silvery typings|**trpc-cli reads Zod `.meta()`**|**No** — separate `alias` / `argumentName` in zod-opts config|Optique `option()` API|
|Repeatable `--selector`|`.option()` variadic|variadic + helper meta|array fields + meta|array + meta|`multiple()`|
|`--no-warn`|`.option('--no-warn')`|negated meta / boolean|boolean + negatable meta|`warn` boolean + default|`negatableFlag`|

**Takeaway:** No library “runs arbitrary Zod” as a black box for the whole argv string. **trpc-cli** and **silvery** accept normal field-level Zod (including preprocess on a field). **zod-opts** forces a parallel options registry (aliases, renames) beside the schema. **Optique** is parser-first, Zod second.

## Programmatic invoke (library vs our glue)

Ideal:

```ts
export const generateSchema = z.object({
  canvas: z.string(),
  width: z.coerce.number().default(1280),
  theme: z.enum(['light', 'dark']).default('light'),
})

export type GenerateOptions = z.input<typeof generateSchema>

export async function runGenerate(raw: GenerateOptions) {
  const opts = generateSchema.parse(raw)
  // ...
}
```

CLI should call the **same** `generateSchema` (or pass validated output into `runGenerate` without a second parse).

|Approach|Programmatic path|Extra parse / duplicate schema|
|---|---|---|
|**trpc-cli**|Handler gets validated `input`; can call `runGenerate(input)` if shapes match|Spike used `generateInputSchema.transform` **only when** renaming fields — drop renames → **one schema**|
|**silvery**|`.action` → `generateInputSchema.parse({ canvas, ...opts })`|Spike: `generateCommandOptionsSchema` vs `generateInputSchema` for formats/preprocess — shrinkable if one object suffices|
|**zod-opts**|`defineCommand` → handler; `runGenerate` parses `generateInputSchema`|CLI registry schemas + runtime schemas|
|**Commander**|`runGenerate({ ...opts, canvas })` manual|Everything|

## Spike results (worktrees, Nov 2025)

Branches: `zod-opts`, `cli-silvery`, `cli-trpc-cli`, `cli-optique`. Reports retained on those branches only.

|Contender|SSOT (1–5)|Our glue (est.)|T0 tests|Default generate|Recommendation|
|---|---|---|---|---|---|
|**Commander** (baseline)|1|0|pass|yes|**Reject** (goal fail)|
|**trpc-cli**|4|~180 LOC router + cli|94|rewriteArgv|**Chosen**|
|**@silvery/commander**|4|~210 (`applyZodObjectToCommand`, `cliFlags`, remap)|94|`isDefault`|Strong **#2**|
|**zod-opts**|3|~300 (`defineCommand`, dual parser, cli router)|98|custom cli.ts|Viable, most glue|
|**Optique**|3|parser + Zod duplicate text|94|cli hack|Skip for “mostly Zod”|

### Chosen stack: **trpc-cli**

- Closest to **“mostly Zod”**: one `z.object({ … })` on `.input()`, flags and help generated; handler can be `runGenerate(input)` with no second schema.
- Drop default-generate + `rewriteArgv`; use `width` not `viewportWidth` in the schema to kill rename transforms.
- Keep `prompts: false` for agents.
- Accept router/procedure syntax instead of chained `new Command()` (or use experimental `fn()` export style later for flatter modules).

### @silvery/commander — why it’s #2

Library is already Commander + Zod per flag. `applyZodObjectToCommand` exists because we refused to hand-copy `.option()` for every field on two commands — it’s **our** loop, not shipped by Silvery. Without it, each command is readable but SSOT duplicates. `new Command()` chains stay ugly at scale; the helper only hides repetition.

### zod-opts — why alias / `argumentName`

zod-opts maps **schema object keys** to option names. Keys are **camelCase**; CLI wants **kebab** and **short flags**. The library does **not** infer `-t` from `theme` or `--width` from `viewportWidth` — you pass:

```ts
.options({
  theme: { type: z.enum(...), alias: 't', argumentName: 'mode' },
  width: { type: z.shape.viewportWidth, alias: 'w', argumentName: 'px' },
})
```

So either rename schema fields to match CLI (`width` in Zod) or keep `OPTION_CLI_FLAG_NAMES` + `optionMeta`. That’s by design in zod-opts, not misuse.

## Migration rules (when landing on main)

1. Dependencies: `trpc-cli`, `zod`; remove direct `commander` (bundled via trpc-cli).
2. Shared export flags: one `z.object` extended by `generate` / `outline`; field names = CLI long-option stems (`width`, `minHeight`, `selector` as array).
3. `runGenerate` / `runOutline`: `z.input<typeof schema>` + single `.parse()` at top (or trust trpc-cli validation and use input as-is).
4. No default-implied `generate` subcommand unless cost is trivial.
5. Enums via `exportThemeSchema` etc. — stay on Zod nativeEnum / enum, not string casts in handlers.

## Layout on `main`

- `src/cli.ts` — `createCli` entry, `prompts: false`
- `src/cli.ts` — `t.router` / `t.procedure` per subcommand, `.input()` schemas
- `src/commands/generate.ts` — `sharedCliExportOptionsSchema` (outline imports the same)
- `src/commands/generate.ts` / `outline.ts` — `*FieldsSchema` + `run*` (one `.parse()` when called outside CLI)