import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { Page } from 'playwright'
import { pkgRoot } from './pkg.js'
import type { CanvasStateSidecar } from './canvas-state-sidecar.js'
import type { RenderOptions } from './render-options.js'

const require = createRequire(path.join(pkgRoot, 'package.json'))
let chromiumReady = false

function ensureChromium(): void {
	if (chromiumReady) {
		return
	}
	const { chromium } = require('playwright') as {
		chromium: { executablePath: () => string }
	}
	const exe = chromium.executablePath()
	if (fs.existsSync(exe)) {
		chromiumReady = true
		return
	}
	const playwrightPkg = require.resolve('playwright/package.json')
	const cli = path.join(path.dirname(playwrightPkg), 'cli.js')
	const install = spawnSync(process.execPath, [cli, 'install', 'chromium'], {
		cwd: pkgRoot,
		stdio: 'inherit',
		env: process.env,
	})
	if (install.status !== 0) {
		throw new Error(
			'playwright install chromium failed (required for png/pdf/jpg)',
		)
	}
	chromiumReady = true
}

export type RenderContext = {
	outDir: string;
	stem: string;
	options: RenderOptions;
	selectors?: string[];
	initialCanvasState?: CanvasStateSidecar
}

/** Match shim `useCanvasState`: `localStorage['canvas:' + key] = JSON.stringify(value)`. */
export async function seedCanvasState(
	page: Page,
	state: CanvasStateSidecar,
): Promise<void> {
	await page.addInitScript((record) => {
		for (const [key, value] of Object.entries(record)) {
			localStorage.setItem(`canvas:${key}`, JSON.stringify(value))
		}
	}, state)
}

export type RenderFormats = {
	png?: boolean;
	pdf?: boolean;
	jpg?: boolean;
	html?: boolean
}

export async function render(
	ctx: RenderContext,
	formats: RenderFormats,
): Promise<void> {
	if (!formats.png && !formats.pdf && !formats.jpg && !formats.html) {
		return
	}
	const html = htmlPath(ctx)
	if (!fs.existsSync(html)) {
		throw new Error(
			`HTML artifact missing: ${html} (run generate with html, png, pdf, or jpg)`,
		)
	}
	ensureChromium()
	const { chromium } = await import('playwright')
	const errors: string[] = []
	const browser = await chromium.launch(ctx.options.launch ?? {})
	try {
		const page = await browser.newPage(ctx.options.page)
		page.on('pageerror', e => errors.push(e.message))
		if (ctx.initialCanvasState) {
			await seedCanvasState(page, ctx.initialCanvasState)
		}
		await page.goto(`file://${html}`, { waitUntil: 'networkidle' })
		await page.waitForFunction(
			() => (document.getElementById('root')?.childElementCount ?? 0) > 0,
			{ timeout: 15_000 },
		)
		if (errors.length) {
			throw new Error(errors.join('\n'))
		}
		if (ctx.selectors?.length) {
			await isolateSelectors(page, ctx.selectors)
		}
		if (formats.html) {
			const out = path.join(ctx.outDir, `${ctx.stem}.html`)
			fs.writeFileSync(out, await page.content(), 'utf8')
		}
		const shot = ctx.selectors?.length
			? { ...ctx.options.screenshot, fullPage: true }
			: ctx.options.screenshot
		if (formats.png) {
			await page.screenshot({
				...shot,
				path: path.join(ctx.outDir, `${ctx.stem}.png`),
			})
		}
		if (formats.jpg) {
			await page.screenshot({
				...shot,
				path: path.join(ctx.outDir, `${ctx.stem}.jpg`),
				type: 'jpeg',
				quality: ctx.options.screenshot.quality ?? 90,
			})
		}
		if (formats.pdf) {
			await writePdf(page, ctx, path.join(ctx.outDir, `${ctx.stem}.pdf`))
		}
	} finally {
		await browser.close()
	}
}

async function writePdf(
	page: Page,
	ctx: RenderContext,
	outPath: string,
): Promise<void> {
	const widthPx = ctx.options.page.viewport.width
	const height = await page.evaluate(
		() => document.documentElement.scrollHeight,
	)
	const pdf = { ...ctx.options.pdf }
	if (!pdf.width) {
		pdf.width = `${widthPx}px`
	}
	if (!pdf.height) {
		pdf.height = `${height}px`
	}
	await page.pdf({ ...pdf, path: outPath })
}

function htmlPath(ctx: RenderContext): string {
	return path.join(ctx.outDir, '_build', 'index.html')
}

export async function isolateSelectors(
	page: Page,
	selectors: string[],
): Promise<void> {
	const found = await page.evaluate((sels) => {
		const seen = new Set<Element>()
		const nodes: HTMLElement[] = []
		for (const sel of sels) {
			for (const el of document.querySelectorAll(sel)) {
				if (el instanceof HTMLElement && !seen.has(el)) {
					seen.add(el)
					nodes.push(el)
				}
			}
		}
		if (nodes.length === 0) {
			return false
		}
		nodes.sort((a, b) => {
			const pos = a.compareDocumentPosition(b)
			if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
				return -1
			}
			if (pos & Node.DOCUMENT_POSITION_PRECEDING) {
				return 1
			}
			return 0
		})
		for (const node of nodes) {
			node.remove()
		}
		const root = document.createElement('div')
		root.style.display = 'flex'
		root.style.flexDirection = 'column'
		root.style.gap = '16px'
		for (const node of nodes) {
			root.appendChild(node)
		}
		document.body.replaceChildren(root)
		document.body.style.margin = '0'
		document.body.style.padding = '16px'
		document.body.style.boxSizing = 'border-box'
		document.documentElement.style.height = 'auto'
		return true
	}, selectors)
	if (!found) {
		throw new Error(`selector not matched: ${selectors.join(', ')}`)
	}
}
