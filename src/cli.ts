import { Command } from 'commander'
import { runGenerate } from './commands/generate.js'
import { runSkill } from './commands/skill.js'

const program = new Command()
	.name('open-canvas')
	.description('Generate HTML, PNG, PDF, and IDE-ready canvas from .canvas.tsx')

program
	.command('skill')
	.description('Print or install agent SKILL.md')
	.argument('[path]', 'directory or file (writes SKILL.md)')
	.action((path?: string) => {
		runSkill(path)
	})

program
	.command('generate', { isDefault: true })
	.description('Build artifacts from a canvas file')
	.requiredOption('--canvas <path>', 'path to *.canvas.tsx')
	.option('--out <dir>', 'output directory (default: ./out next to canvas)', 'out')
	.option('--title <text>', 'HTML document title')
	.option('--theme <mode>', 'light or dark', 'light')
	.option('--formats <list>', 'comma-separated: html,png,pdf,jpg,cursor', 'html,png,pdf')
	.action(async (opts) => {
		try {
			await runGenerate({
				canvas: opts.canvas,
				out: opts.out,
				title: opts.title,
				theme: opts.theme as 'light' | 'dark',
				formats: opts.formats,
			})
		} catch (e) {
			console.error(e instanceof Error ? e.message : e)
			process.exit(1)
		}
	})

program.parse()
