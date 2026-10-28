import { Command, Option } from 'commander'
import { runGenerate } from './commands/generate.js'
import { runSkill } from './commands/skill.js'
import { runVendorPath } from './commands/vendor-path.js'
import { runVerify } from './commands/verify.js'
import { cliName, description, version } from './pkg.js'
import { DEFAULT_FORMAT_LIST, DEFAULT_FORMATS } from './util.js'

const program = new Command()
	.name(cliName)
	.description(description)
	.version(version, '-v, --version', 'print version')

program
	.command('vendor-path')
	.description('Print absolute path to shim src/vendor (canvas/SKILL.md, canvas-sdk/)')
	.action(() => {
		try {
			runVendorPath()
		} catch (e) {
			console.error(e instanceof Error ? e.message : e)
			process.exit(1)
		}
	})

program
	.command('skill')
	.description('Print or install agent SKILL.md')
	.argument('[dir]', 'install directory (writes SKILL.md only)')
	.action((path?: string) => {
		runSkill(path)
	})

program
	.command('verify')
	.description('Typecheck a .canvas.tsx (cursor/canvas + data imports)')
	.argument('<canvas>', 'path to *.canvas.tsx')
	.action((canvas: string) => {
		try {
			runVerify(canvas)
		} catch (e) {
			console.error(e instanceof Error ? e.message : e)
			process.exit(1)
		}
	})

program
	.command('generate', { isDefault: true })
	.description('Build artifacts from a canvas file')
	.argument('<canvas>', 'path to *.canvas.tsx')
	.option('--out <dir>', 'output directory relative to canvas', 'out')
	.option('--name <slug>', 'output basename without extension (default: canvas stem, else title slug)')
	.option('--title <text>', 'HTML document title')
	.option('--theme <mode>', 'light or dark', 'light')
	.option('--brand <name>', 'cursor or grok (host theme brand)', 'cursor')
	.addOption(
		new Option('--formats <list>', 'comma-separated: html,png,pdf,jpg,cursor')
			.argParser(v => v.split(',').map(s => s.trim()))
			.default(DEFAULT_FORMAT_LIST, DEFAULT_FORMATS),
	)
	.option('--width <px>', 'Playwright viewport width (default 1280)', Number, 1280)
	.option(
		'--override-height <px>',
		'Playwright viewport height in px (default 900)',
		(v: string) => Number(v),
	)
	.option(
		'--cursor-out <path>',
		'with --formats cursor: write the IDE-ready .canvas.tsx here instead of out/<stem>.canvas.tsx',
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
	.action(async (canvas: string, opts) => {
		try {
			await runGenerate({
				canvas,
				out: opts.out,
				name: opts.name,
				title: opts.title,
				theme: opts.theme as 'light' | 'dark',
				brand: opts.brand as 'cursor' | 'grok',
				formats: opts.formats,
				viewportWidth: opts.width,
				viewportHeight: opts.overrideHeight,
				renderOptions: opts.renderOptions,
				selectors: opts.selector,
				inlineState: Boolean(opts.inlineState),
				cursorOut: opts.cursorOut,
			})
		} catch (e) {
			console.error(e instanceof Error ? e.message : e)
			process.exit(1)
		}
	})

program.parse()
