#!/usr/bin/env node
/** Playwright full-page PNG for a local HTML file (same viewport fit as open-canvas render). */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const [htmlArg, pngArg, widthArg] = process.argv.slice(2)
if (!htmlArg || !pngArg) {
  console.error('usage: screenshot-html.mjs <input.html> <output.png> [width=1280]')
  process.exit(2)
}
const html = path.resolve(htmlArg)
const png = path.resolve(pngArg)
const width = Number(widthArg ?? 1280)
if (!fs.existsSync(html)) {
  console.error(`missing: ${html}`)
  process.exit(1)
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(pathToFileURL(html).href, { waitUntil: 'networkidle' })
  await page.waitForFunction(
    () => (document.getElementById('root')?.childElementCount ?? 0) > 0,
    { timeout: 15_000 },
  )
  if (errors.length) {
    throw new Error(errors.join('\n'))
  }
  const height = await page.evaluate(() => {
    const root = document.getElementById('root')
    const doc = document.documentElement.scrollHeight
    const body = document.body?.scrollHeight ?? 0
    const rootH = root?.scrollHeight ?? 0
    return Math.ceil(Math.max(doc, body, rootH))
  })
  await page.setViewportSize({ width, height })
  await page.screenshot({ path: png, fullPage: false })
  console.error(`→ ${png} (${width}×${height})`)
} finally {
  await browser.close()
}
