import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { isolateSelectors } from './render.js'

describe('isolateSelectors', () => {
	let browser: Awaited<ReturnType<typeof chromium.launch>>

	beforeAll(async () => {
		browser = await chromium.launch()
	})

	afterAll(async () => {
		await browser?.close()
	})

	it('leaves only the matched subtree on body', async () => {
		const page = await browser.newPage()
		await page.setContent(`
			<head><style>body { font-family: sans-serif; }</style></head>
			<body>
				<div id="root">
					<header>nav</header>
					<main id="target"><p>keep</p></main>
					<footer>foot</footer>
				</div>
			</body>
		`)
		await isolateSelectors(page, ['#target'])
		const bodyHtml = await page.evaluate(() => document.body.innerHTML)
		expect(bodyHtml).toContain('keep')
		expect(bodyHtml).not.toContain('nav')
		expect(bodyHtml).not.toContain('foot')
		await page.close()
	})

	it('includes every match for a class selector', async () => {
		const page = await browser.newPage()
		await page.setContent(`
			<body>
				<div id="root">
					<p class="bit">one</p>
					<p class="bit">two</p>
					<p>three</p>
				</div>
			</body>
		`)
		await isolateSelectors(page, ['.bit'])
		const text = await page.evaluate(() => document.body.innerText)
		expect(text).toContain('one')
		expect(text).toContain('two')
		expect(text).not.toContain('three')
		await page.close()
	})

	it('merges multiple selectors in document order', async () => {
		const page = await browser.newPage()
		await page.setContent(`
			<body>
				<div id="root">
					<div id="a">A</div>
					<div id="b">B</div>
					<div id="c">C</div>
				</div>
			</body>
		`)
		await isolateSelectors(page, ['#c', '#a'])
		const order = await page.evaluate(() =>
			Array.from(document.body.querySelectorAll('#a,#b,#c')).map(
				el => el.id,
			),
		)
		expect(order).toEqual(['a', 'c'])
		await page.close()
	})

	it('throws when nothing matches', async () => {
		const page = await browser.newPage()
		await page.setContent('<body><div id="root">x</div></body>')
		await expect(isolateSelectors(page, ['#missing'])).rejects.toThrow(
			/selector not matched/,
		)
		await page.close()
	})
})
