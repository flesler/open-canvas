import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import type { Page } from 'playwright'
import { pkgRoot } from './pkg.js'
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
	options: RenderOptions
}

export type RenderFormats = {
	png?: boolean;
	pdf?: boolean;
	jpg?: boolean
}

export async function render(ctx: RenderContext, formats: RenderFormats): Promise<void> {
	if (!formats.png && !formats.pdf && !formats.jpg) {
		return
	}
	const html = htmlPath(ctx)
	if (!fs.existsSync(html)) {
		throw new Error(`HTML artifact missing: ${html} (run generate with html, png, pdf, or jpg)`)
	}
	ensureChromium()
	const { chromium } = await import('playwright')
	const errors: string[] = []
	const browser = await chromium.launch(ctx.options.launch ?? {})
	try {
		const page = await browser.newPage(ctx.options.page)
		page.on('pageerror', e => errors.push(e.message))
		await page.goto(`file://${html}`, { waitUntil: 'networkidle' })
		await page.waitForFunction(
			() => (document.getElementById('root')?.childElementCount ?? 0) > 0,
			{ timeout: 15_000 },
		)
		if (errors.length) {
			throw new Error(errors.join('\n'))
		}
		if (formats.png) {
			await page.screenshot({
				...ctx.options.screenshot,
				path: path.join(ctx.outDir, `${ctx.stem}.png`),
			})
		}
		if (formats.jpg) {
			await page.screenshot({
				...ctx.options.screenshot,
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

async function writePdf(page: Page, ctx: RenderContext, outPath: string): Promise<void> {
	const widthPx = ctx.options.page.viewport.width
	const height = await page.evaluate(() => document.documentElement.scrollHeight)
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
	return path.join(ctx.outDir, `${ctx.stem}.html`)
}
