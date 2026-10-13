import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { runGenerate } from './commands/generate.js'
import { runSkill } from './commands/skill.js'
import { runVerify } from './commands/verify.js'

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), 'package.json'))
const { version } = require('../package.json') as { version: string }

const program = new Command()
	.name('open-canvas')
	.description('Generate HTML, PNG, PDF, and IDE-ready canvas from .canvas.tsx')
	.version(version, '-v, --version', 'print version')

program
	.command('skill')
	.description('Print or install agent SKILL.md')
	.argument('[path]', 'directory or file (writes SKILL.md)')
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
	.option('--out <dir>', 'output directory (default: ./out next to canvas)', 'out')
	.option('--title <text>', 'HTML document title')
	.option('--theme <mode>', 'light or dark', 'light')
	.option('--formats <list>', 'comma-separated: html,png,pdf,jpg,cursor', 'html,png,pdf')
	.option('--width <px>', 'render viewport width', (v: string) => Number(v))
	.option('--height <px>', 'render viewport height', (v: string) => Number(v))
	.option(
		'--render-options <file|json>',
		'Playwright options JSON (launch / page / screenshot / pdf) — https://playwright.dev/docs/api/class-page',
	)
	.action(async (canvas: string, opts) => {
		try {
			await runGenerate({
				canvas,
				out: opts.out,
				title: opts.title,
				theme: opts.theme as 'light' | 'dark',
				formats: opts.formats,
				viewportWidth: opts.width,
				viewportHeight: opts.height,
				renderOptions: opts.renderOptions,
			})
		} catch (e) {
			console.error(e instanceof Error ? e.message : e)
			process.exit(1)
		}
	})

program.parse()
