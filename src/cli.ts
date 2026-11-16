import { Command, Option } from 'commander'
import { formatCanvasSdkContractLine } from './canvas-sdk-contract.js'
import { DEFAULT_OUTLINE_MAX_LINES, DEFAULT_OUTLINE_THRESHOLD, runOutline, type OutlineOptions } from './commands/outline.js'
import { runGenerate } from './commands/generate.js'
import { runSkill } from './commands/skill.js'
import { runVendorPath } from './commands/vendor-path.js'
import { runVerify } from './commands/verify.js'
import { cliName, description, version } from './pkg.js'
import { DEFAULT_FORMAT_LIST, DEFAULT_FORMATS } from './util.js'

function cliFail(e: unknown): never {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}

const program = new Command()
  .name(cliName)
  .description(description)
  .version(version, '-v, --version', 'print version')

program
  .command('vendor-path')
  .description('Print absolute path to shim src/vendor (canvas/SKILL.md, canvas-sdk/)')
  .action(() => {
    try {
      console.log(runVendorPath())
      console.error(formatCanvasSdkContractLine())
    } catch (e) {
      cliFail(e)
    }
  })

program
  .command('skill')
  .description('Print or install agent SKILL.md')
  .argument('[dir]', 'install directory (SKILL.md + references/)')
  .action((path?: string) => {
    try {
      const result = runSkill(path)
      if (typeof result === 'string') {
        console.error(
          'Install with `open-canvas skill <dir>`. Vendor docs: `open-canvas vendor-path`.\n',
        )
        process.stdout.write(result)
        return
      }
      console.error(result.status)
      console.error(formatCanvasSdkContractLine())
    } catch (e) {
      cliFail(e)
    }
  })

program
  .command('verify')
  .description('Typecheck a .canvas.tsx (cursor/canvas + data imports)')
  .argument('<canvas>', 'path to *.canvas.tsx')
  .action((canvas: string) => {
    try {
      console.error(runVerify(canvas))
    } catch (e) {
      cliFail(e)
    }
  })

program
  .command('outline')
  .description('Print export layout map for the canvas (stdout; same print prep as generate)')
  .argument('<canvas>', 'path to *.canvas.tsx')
  .option('-o, --out <dir>', 'vite staging directory parent (default ./out beside canvas)', 'out')
  .option('--title <text>', 'HTML document title')
  .option('-t, --theme <mode>', 'light or dark', 'light')
  .option('--brand <name>', 'cursor or grok', 'cursor')
  .option('-w, --width <px>', 'viewport width (default 1280)', Number, 1280)
  .option('--min-height <value>', 'same as generate (px, ratio, a4, max)')
  .option('--render-options <file|json>', 'Playwright options JSON')
  .option(
    '--selector <css>',
    'limit export DOM (repeatable)',
    (value, previous: string[]) => [...previous, value],
    [],
  )
  .option(
    '-T, --threshold <px>',
    `warn with ! when slack or ib >= px (default ${DEFAULT_OUTLINE_THRESHOLD})`,
    (v: string) => Number(v),
  )
  .option('--no-warn', 'metrics only (no ! threshold)')
  .option(
    '-m, --max-children <n>',
    `max tree lines (default ${DEFAULT_OUTLINE_MAX_LINES})`,
    (v: string) => Number(v),
  )
  .action(async (canvas: string, opts) => {
    try {
      const outlineOpts: OutlineOptions = {
        canvas,
        out: opts.out,
        title: opts.title,
        theme: opts.theme as 'light' | 'dark',
        brand: opts.brand as 'cursor' | 'grok',
        viewportWidth: opts.width,
        minHeight: opts.minHeight,
        renderOptions: opts.renderOptions,
        selectors: opts.selector,
        threshold:
          opts.threshold !== undefined && !Number.isNaN(opts.threshold) ? opts.threshold : undefined,
        maxChildren:
          opts.maxChildren !== undefined && !Number.isNaN(opts.maxChildren) && opts.maxChildren > 0
            ? Math.floor(opts.maxChildren)
            : undefined,
        warnSlack: opts.noWarn ? false : undefined,
      }
      process.stdout.write(await runOutline(outlineOpts))
      process.stdout.write('\n')
    } catch (e) {
      cliFail(e)
    }
  })

program
  .command('generate', { isDefault: true })
  .description('Build artifacts from a canvas file')
  .argument('<canvas>', 'path to *.canvas.tsx')
  .option('-o, --out <dir>', 'output directory relative to canvas', 'out')
  .option('-n, --name <slug>', 'output basename without extension (default: canvas stem, else title slug)')
  .option('--title <text>', 'HTML document title')
  .option('-t, --theme <mode>', 'light or dark', 'light')
  .option('--brand <name>', 'cursor or grok (host theme brand)', 'cursor')
  .addOption(
    new Option('-f, --formats <list>', 'comma-separated: html,png,pdf,jpg,cursor')
      .argParser(v => v.split(',').map(s => s.trim()))
      .default(DEFAULT_FORMAT_LIST, DEFAULT_FORMATS),
  )
  .option('-w, --width <px>', 'Playwright viewport width (default 1280)', Number, 1280)
  .option(
    '--min-height <value>',
    'minimum page height: px, width ratio (<= 10, e.g. 1.5), a4, or max (PDF pages all match the tallest)',
  )
  .option(
    '--render-options <file|json>',
    'Playwright options JSON (launch / page / screenshot / pdf) — https://playwright.dev/docs/api/class-page',
  )
  .option(
    '--selector <css>',
    'export matched nodes only (repeatable; comma-separated ok; querySelectorAll per selector)',
    (value, previous: string[]) => [...previous, value],
    [],
  )
  .option(
    '--inline-state',
    'with --formats cursor: inline .canvas.data.json and seed localStorage (html/png/pdf always seed at build)',
  )
  .option('-q, --quiet', 'no stdout on success (artifacts under --out and --name)')
  .action(async (canvas: string, opts) => {
    try {
      const paths = await runGenerate({
        canvas,
        out: opts.out,
        name: opts.name,
        title: opts.title,
        theme: opts.theme as 'light' | 'dark',
        brand: opts.brand as 'cursor' | 'grok',
        formats: opts.formats,
        viewportWidth: opts.width,
        minHeight: opts.minHeight,
        renderOptions: opts.renderOptions,
        selectors: opts.selector,
        inlineState: Boolean(opts.inlineState),
        quiet: Boolean(opts.quiet),
      })
      if (!opts.quiet) {
        for (const p of paths) {
          console.log(`→ ${p}`)
        }
      }
    } catch (e) {
      cliFail(e)
    }
  })

program.parse()