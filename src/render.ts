import fs from 'node:fs'
import path from 'node:path'
import type { Page } from 'playwright'

export type RenderContext = {
	outDir: string;
	stem: string;
	theme: 'light' | 'dark'
}

export type RasterFormats = {
	png?: boolean;
	pdf?: boolean;
	jpg?: boolean
}

export async function renderRaster(ctx: RenderContext, formats: RasterFormats): Promise<void> {
	if (!formats.png && !formats.pdf && !formats.jpg) {
		return
	}
	const html = htmlPath(ctx)
	if (!fs.existsSync(html)) {
		throw new Error('HTML artifact missing; run vite build first')
	}
	const { chromium } = await import('playwright')
	const errors: string[] = []
	const browser = await chromium.launch()
	try {
		const page = await browser.newPage({
			viewport: { width: 1280, height: 900 },
			colorScheme: ctx.theme,
		})
		page.on('pageerror', e => errors.push(e.message))
		await page.goto(`file://${html}`, { waitUntil: 'networkidle' })
		await page.waitForSelector('#root', { timeout: 15_000 })
		if (errors.length) {
			throw new Error(errors.join('\n'))
		}
		if (formats.png) {
			await page.screenshot({
				path: path.join(ctx.outDir, `${ctx.stem}.png`),
				fullPage: true,
				animations: 'disabled',
			})
		}
		if (formats.jpg) {
			await page.screenshot({
				path: path.join(ctx.outDir, `${ctx.stem}.jpg`),
				fullPage: true,
				type: 'jpeg',
				quality: 90,
				animations: 'disabled',
			})
		}
		if (formats.pdf) {
			await writePdf(page, path.join(ctx.outDir, `${ctx.stem}.pdf`))
		}
	} finally {
		await browser.close()
	}
}

async function writePdf(page: Page, outPath: string): Promise<void> {
	const height = await page.evaluate(() => document.documentElement.scrollHeight)
	await page.pdf({
		path: outPath,
		printBackground: true,
		width: '1280px',
		height: `${height}px`,
		margin: { top: 0, right: 0, bottom: 0, left: 0 },
	})
}

function htmlPath(ctx: RenderContext): string {
	return path.join(ctx.outDir, `${ctx.stem}.html`)
}
