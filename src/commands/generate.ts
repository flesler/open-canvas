import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { renderRaster } from '../render.js'
import { canvasStem, emitCursorCanvas, parseFormats, titleCaseFromStem } from '../util.js'
import { pkgRoot, viteCliPath } from '../vite-bin.js'

export type GenerateOptions = {
	canvas: string;
	out?: string;
	title?: string;
	theme?: 'light' | 'dark';
	formats?: string
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
	const needsRaster = formats.some(f => f === 'png' || f === 'pdf' || f === 'jpg')

	fs.mkdirSync(outDir, { recursive: true })

	const env: NodeJS.ProcessEnv = {
		...process.env,
		OPENCANVAS_STEM: stem,
		OPENCANVAS_OUT_DIR: outDir,
		OPENCANVAS_THEME: theme,
		OPENCANVAS_TITLE: title,
		OPENCANVAS_CANVAS_PATH: canvasPath,
	}

	const renderCtx = { outDir, stem, theme }

	if (formats.includes('cursor')) {
		const cursorOut = path.join(outDir, `${stem}.canvas.tsx`)
		emitCursorCanvas(canvasPath, cursorOut)
		console.log(`→ ${cursorOut}`)
	}

	if (needsHtml) {
		const viteCli = viteCliPath(pkgRoot)
		const vite = spawnSync(process.execPath, [viteCli, 'build', '--config', path.join(pkgRoot, 'vite.config.ts')], {
			cwd: pkgRoot,
			stdio: 'inherit',
			env,
		})
		if (vite.status !== 0) {
			process.exit(vite.status ?? 1)
		}
	}

	if (needsRaster) {
		await renderRaster(renderCtx, {
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
