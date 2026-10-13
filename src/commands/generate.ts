import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathInPkg, pkgRoot, viteCliPath } from '../pkg.js'
import { resolveRenderOptions } from '../render-options.js'
import { render } from '../render.js'
import { canvasStem, emitCursorCanvas, parseFormats, titleCaseFromStem } from '../util.js'

export type GenerateOptions = {
	canvas: string;
	out?: string;
	title?: string;
	theme?: 'light' | 'dark';
	formats?: string;
	viewportWidth?: number;
	viewportHeight?: number;
	renderOptions?: string
}

export async function runGenerate(opts: GenerateOptions): Promise<void> {
	const canvasPath = path.resolve(opts.canvas)
	if (!fs.existsSync(canvasPath)) {
		throw new Error(`canvas not found: ${canvasPath}`)
	}

	const stem = canvasStem(canvasPath)
	const canvasDir = path.dirname(canvasPath)
	const outDir = path.resolve(canvasDir, opts.out ?? 'out')
	const title = opts.title ?? titleCaseFromStem(stem)
	const theme = opts.theme ?? 'light'
	if (theme !== 'light' && theme !== 'dark') {
		throw new Error(`--theme must be light or dark (got ${theme})`)
	}

	const formats = parseFormats(opts.formats ?? 'html,png,pdf')
	const needsHtml = formats.some(f => f === 'html' || f === 'png' || f === 'pdf' || f === 'jpg')
	const needsRender = formats.some(f => f === 'png' || f === 'pdf' || f === 'jpg')

	fs.mkdirSync(outDir, { recursive: true })

	const env: NodeJS.ProcessEnv = {
		...process.env,
		OPEN_CANVAS_STEM: stem,
		OPEN_CANVAS_OUT_DIR: outDir,
		OPEN_CANVAS_THEME: theme,
		OPEN_CANVAS_TITLE: title,
		OPEN_CANVAS_CANVAS_PATH: canvasPath,
	}

	const options = resolveRenderOptions({
		theme,
		viewportWidth: opts.viewportWidth,
		viewportHeight: opts.viewportHeight,
		renderOptions: opts.renderOptions,
	})
	const renderCtx = { outDir, stem, options }

	if (formats.includes('cursor')) {
		const cursorOut = path.join(outDir, `${stem}.canvas.tsx`)
		emitCursorCanvas(canvasPath, cursorOut)
		console.log(`→ ${cursorOut}`)
	}

	if (needsHtml) {
		const viteCli = viteCliPath()
		const vite = spawnSync(process.execPath, [viteCli, 'build', '--config', pathInPkg('vite.config.ts')], {
			cwd: pkgRoot,
			stdio: 'inherit',
			env,
		})
		if (vite.status !== 0) {
			process.exit(vite.status ?? 1)
		}
	}

	if (needsRender) {
		await render(renderCtx, {
			png: formats.includes('png'),
			pdf: formats.includes('pdf'),
			jpg: formats.includes('jpg'),
		})
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
