import fs from 'node:fs'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { chromium, type Page } from 'playwright'

export type RenderContext = {
	outDir: string;
	stem: string;
	theme: 'light' | 'dark'
}

export async function renderPng(ctx: RenderContext): Promise<void> {
	const html = htmlPath(ctx)
	if (!fs.existsSync(html)) {
		throw new Error('HTML artifact missing; run vite build first')
	}
	const errors: string[] = []
	await withPage(ctx, async (page) => {
		page.on('pageerror', e => errors.push(e.message))
		await page.goto(`file://${html}`, { waitUntil: 'networkidle' })
		await page.waitForSelector('#root', { timeout: 15_000 })
		if (errors.length) {
			throw new Error(errors.join('\n'))
		}
		await page.screenshot({
			path: path.join(ctx.outDir, `${ctx.stem}.png`),
			fullPage: true,
			animations: 'disabled',
		})
	})
}

export async function renderJpg(ctx: RenderContext): Promise<void> {
	const html = htmlPath(ctx)
	await withPage(ctx, async (page) => {
		await page.goto(`file://${html}`, { waitUntil: 'networkidle' })
		await page.waitForSelector('#root', { timeout: 15_000 })
		await page.screenshot({
			path: path.join(ctx.outDir, `${ctx.stem}.jpg`),
			fullPage: true,
			type: 'jpeg',
			quality: 90,
			animations: 'disabled',
		})
	})
}

export async function renderPdf(ctx: RenderContext): Promise<void> {
	const png = path.join(ctx.outDir, `${ctx.stem}.png`)
	if (!fs.existsSync(png)) {
		throw new Error('PNG missing; render PNG before PDF')
	}
	const doc = await PDFDocument.create()
	const image = await doc.embedPng(fs.readFileSync(png))
	const page = doc.addPage([image.width, image.height])
	page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
	fs.writeFileSync(path.join(ctx.outDir, `${ctx.stem}.pdf`), await doc.save())
}

async function withPage(ctx: RenderContext, fn: (page: Page) => Promise<void>): Promise<void> {
	const browser = await chromium.launch()
	try {
		const page = await browser.newPage({
			viewport: { width: 1280, height: 900 },
			colorScheme: ctx.theme,
		})
		await fn(page)
	} finally {
		await browser.close()
	}
}

function htmlPath(ctx: RenderContext): string {
	return path.join(ctx.outDir, `${ctx.stem}.html`)
}
