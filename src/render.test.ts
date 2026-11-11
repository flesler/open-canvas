import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { forTests } from './render.js'

const { isolateSelectors, writePdf } = forTests

function pdfPageCount(buf: Buffer): number {
  const match = buf.toString('latin1').match(/\/Count\s+(\d+)/)
  if (!match) {
    throw new Error('PDF page count not found')
  }
  return Number(match[1])
}

function pdfPageMediaBoxHeights(buf: Buffer): number[] {
  const text = buf.toString('latin1')
  const heights: number[] = []
  for (const match of text.matchAll(
    /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g,
  )) {
    heights.push(Number(match[4]))
  }
  if (heights.length === 0) {
    throw new Error('PDF MediaBox heights not found')
  }
  return heights
}

describe('writePdf', () => {
  let browser: Awaited<ReturnType<typeof chromium.launch>>

  beforeAll(async () => {
    browser = await chromium.launch()
  })

  afterAll(async () => {
    await browser?.close()
  })

  it('fits a 100vh root with padding on one page', async () => {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
    await page.setContent(`
			<body style="margin:0">
				<div style="min-height:100vh;padding:28px 32px 40px">
					<div style="height:1500px">tall content</div>
				</div>
			</body>
		`)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-pdf-'))
    const out = path.join(dir, 'out.pdf')
    await writePdf(page, {
      outDir: dir,
      stem: 'out',
      options: {
        page: { viewport: { width: 800, height: 600 } },
        screenshot: {},
        pdf: { printBackground: true },
      },
    }, out)
    expect(pdfPageCount(fs.readFileSync(out))).toBe(1)
    await page.close()
  })

  it('paginates when break-before markers exist', async () => {
    const widthPx = 800
    const page = await browser.newPage({ viewport: { width: widthPx, height: 600 } })
    await page.setContent(`
      <body style="margin:0">
        <section style="height:220px">A</section>
        <div style="break-before:page;height:0"></div>
        <section style="height:480px">B</section>
      </body>
    `)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-pdf-'))
    const out = path.join(dir, 'p.pdf')
    await writePdf(page, {
      outDir: dir,
      stem: 'p',
      options: {
        page: { viewport: { width: widthPx, height: 600 } },
        screenshot: {},
        pdf: { printBackground: true },
      },
    }, out)
    const bytes = fs.readFileSync(out)
    expect(pdfPageCount(bytes)).toBeGreaterThanOrEqual(2)
    const heights = pdfPageMediaBoxHeights(bytes)
    const max = Math.max(...heights)
    const min = Math.min(...heights)
    expect(min / max).toBeGreaterThan(0.99)
    await page.close()
  })

  it('keeps one tall page without break markers', async () => {
    const widthPx = 800
    const page = await browser.newPage({ viewport: { width: widthPx, height: 600 } })
    await page.setContent(`
      <body style="margin:0">
        <section style="height:400px">only</section>
      </body>
    `)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-pdf-'))
    const out = path.join(dir, 'single.pdf')
    await writePdf(page, {
      outDir: dir,
      stem: 'single',
      options: {
        page: { viewport: { width: widthPx, height: 600 } },
        screenshot: {},
        pdf: { printBackground: true },
      },
    }, out)
    expect(pdfPageCount(fs.readFileSync(out))).toBe(1)
    await page.close()
  })
})

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
