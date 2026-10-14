import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathInPkg, viteCliPath } from '../paths.js'
import { pkgRoot } from '../pkg.js'
import { resolveRenderOptions } from '../render-options.js'
import { render } from '../render.js'
import { canvasStem, DEFAULT_FORMAT_LIST, emitCursorCanvas, outputSlug, parseFormats, parseSelectors, titleCaseFromStem } from '../util.js'

function generateDebug(): boolean {
	const v = process.env.OPEN_CANVAS_DEBUG
	return v === '1' || v === 'true'
}

export type GenerateOptions = {
	canvas: string;
	out?: string;
	name?: string;
	title?: string;
	theme?: 'light' | 'dark';
	brand?: 'cursor' | 'grok';
	formats?: string[];
	viewportWidth?: number;
	viewportHeight?: number;
	renderOptions?: string;
	selectors?: string | string[]
}

export async function runGenerate(opts: GenerateOptions): Promise<void> {
	const canvasPath = path.resolve(opts.canvas)
	if (!fs.existsSync(canvasPath)) {
		throw new Error(`canvas not found: ${canvasPath}`)
	}

	const canvasDir = path.dirname(canvasPath)
	const fileStem = canvasStem(canvasPath)
	const title = opts.title ?? titleCaseFromStem(fileStem)
	const outDir = path.resolve(canvasDir, opts.out ?? 'out')
	const stem = outputSlug({
		name: opts.name,
		canvasStem: fileStem,
		title,
	})
	const theme = opts.theme ?? 'light'
	if (theme !== 'light' && theme !== 'dark') {
		throw new Error(`--theme must be light or dark (got ${theme})`)
	}
	const brand = opts.brand ?? 'cursor'
	if (brand !== 'cursor' && brand !== 'grok') {
		throw new Error(`--brand must be cursor or grok (got ${brand})`)
	}

	const formats = parseFormats(opts.formats ?? DEFAULT_FORMAT_LIST)
	const needsHtml = formats.some(
		f => f === 'html' || f === 'png' || f === 'pdf' || f === 'jpg',
	)
	const needsRender = formats.some(
		f => f === 'png' || f === 'pdf' || f === 'jpg',
	)
	const selectors = parseSelectors(opts.selectors)
	const needsBrowser =
		needsRender || (Boolean(selectors) && formats.includes('html'))

	fs.mkdirSync(outDir, { recursive: true })

	const env: NodeJS.ProcessEnv = {
		...process.env,
		OPEN_CANVAS_STEM: stem,
		OPEN_CANVAS_OUT_DIR: outDir,
		OPEN_CANVAS_THEME: theme,
		OPEN_CANVAS_BRAND: brand,
		OPEN_CANVAS_TITLE: title,
		OPEN_CANVAS_CANVAS_PATH: canvasPath,
	}

	const options = resolveRenderOptions({
		theme,
		viewportWidth: opts.viewportWidth,
		viewportHeight: opts.viewportHeight,
		renderOptions: opts.renderOptions,
	})
	const renderCtx = { outDir, stem, options, selectors }

	if (formats.includes('cursor')) {
		const cursorOut = path.join(outDir, `${stem}.canvas.tsx`)
		emitCursorCanvas(canvasPath, cursorOut)
		console.log(`→ ${cursorOut}`)
	}

	const viteBuildDir = path.join(outDir, '_build')
	const stagedHtml = path.join(viteBuildDir, 'index.html')
	const deliveredHtml = path.join(outDir, `${stem}.html`)
	let viteExit: number | null = null

	try {
		if (needsHtml) {
			const viteCli = viteCliPath()
			const debug = generateDebug()
			const vite = spawnSync(
				process.execPath,
				[
					viteCli,
					'build',
					'--config',
					pathInPkg('vite.config.ts'),
					'--logLevel',
					debug ? 'info' : 'silent',
				],
				{
					cwd: pkgRoot,
					stdio: debug ? 'inherit' : ['ignore', 'pipe', 'pipe'],
					env,
				},
			)
			if (!debug && vite.status !== 0) {
				if (vite.stdout?.length) {
					process.stderr.write(vite.stdout)
				}
				if (vite.stderr?.length) {
					process.stderr.write(vite.stderr)
				}
			}
			viteExit = vite.status ?? 1
		}

		if (viteExit === null || viteExit === 0) {
			if (needsBrowser) {
				await render(renderCtx, {
					png: formats.includes('png'),
					pdf: formats.includes('pdf'),
					jpg: formats.includes('jpg'),
					html: Boolean(selectors) && formats.includes('html'),
				})
			}
			if (formats.includes('html') && !selectors && fs.existsSync(stagedHtml)) {
				fs.renameSync(stagedHtml, deliveredHtml)
			}
		}
	} finally {
		fs.rmSync(viteBuildDir, { recursive: true, force: true })
	}

	if (viteExit !== null && viteExit !== 0) {
		process.exit(viteExit)
	}

	for (const f of formats) {
		if (f === 'html') {
			console.log(`→ ${path.join(outDir, `${stem}.html`)}`)
		}
		if (f === 'png') {
			console.log(`→ ${path.join(outDir, `${stem}.png`)}`)
		}
		if (f === 'pdf') {
			console.log(`→ ${path.join(outDir, `${stem}.pdf`)}`)
		}
		if (f === 'jpg') {
			console.log(`→ ${path.join(outDir, `${stem}.jpg`)}`)
		}
	}
}
