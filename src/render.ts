import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
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
  options: RenderOptions;
  selectors?: string[]
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
    if (formats.png || formats.jpg) {
      await fitViewportToContent(page, ctx.options.page.viewport.width)
    }
    const shot = {
      ...ctx.options.screenshot,
      fullPage: Boolean(ctx.selectors?.length),
    }
    if (formats.html) {
      const out = path.join(ctx.outDir, `${ctx.stem}.html`)
      fs.writeFileSync(out, await page.content(), 'utf8')
    }
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

async function fitViewportToContent(page: Page, width: number): Promise<void> {
  const height = await page.evaluate(() => {
    const main = document.querySelector('main')
    if (!(main instanceof HTMLElement)) {
      throw new Error('export shell has no main')
    }
    const rect = main.getBoundingClientRect()
    return Math.ceil(rect.bottom + window.scrollY)
  })
  await page.setViewportSize({ width, height })
}

/** A-series page height at a given width (same proportions as A4, not a fixed paper format). */
const PDF_SHEET_HEIGHT_RATIO = 297 / 210

function preparePdfLayout(opts: {
  widthPx: number;
  sheetRatio: number
}): {
  paginate: boolean;
  scrollHeight: number;
  sheetHeightPx: number
} {
  const { widthPx, sheetRatio } = opts
  for (const el of document.querySelectorAll<HTMLElement>('[style]')) {
    if (el.style.minHeight.includes('vh')) {
      el.style.minHeight = '0'
    }
  }
  const scrollHeight = Math.ceil(
    document.documentElement.getBoundingClientRect().height,
  )
  let paginate = false
  for (const el of document.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) {
      continue
    }
    const s = getComputedStyle(el)
    if (
      s.breakBefore === 'page'
      || s.breakAfter === 'page'
      || s.pageBreakBefore === 'always'
      || s.pageBreakAfter === 'always'
    ) {
      paginate = true
      break
    }
  }
  const defaultSheet = Math.round(widthPx * sheetRatio)
  if (!paginate) {
    return { paginate, scrollHeight, sheetHeightPx: scrollHeight }
  }
  const breakTops: number[] = []
  for (const el of document.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) {
      continue
    }
    const s = getComputedStyle(el)
    const isBreak =
      s.breakBefore === 'page'
      || s.breakAfter === 'page'
      || s.pageBreakBefore === 'always'
      || s.pageBreakAfter === 'always'
    if (!isBreak) {
      continue
    }
    breakTops.push(
      Math.round(el.getBoundingClientRect().top + window.scrollY),
    )
  }
  breakTops.sort((a, b) => a - b)
  const bounds = [0, ...breakTops, scrollHeight]
  let maxSeg = 0
  for (let i = 0; i < bounds.length - 1; i++) {
    maxSeg = Math.max(maxSeg, bounds[i + 1] - bounds[i])
  }
  const sheetHeightPx = Math.max(defaultSheet, maxSeg)
  return { paginate, scrollHeight, sheetHeightPx }
}

async function writePdf(
  page: Page,
  ctx: RenderContext,
  outPath: string,
): Promise<void> {
  const widthPx = ctx.options.page.viewport.width
  await page.emulateMedia({ media: 'print' })
  const layout = await page.evaluate(preparePdfLayout, {
    widthPx,
    sheetRatio: PDF_SHEET_HEIGHT_RATIO,
  })
  const pdf = { ...ctx.options.pdf }
  if (!pdf.width) {
    pdf.width = `${widthPx}px`
  }
  if (!pdf.height) {
    pdf.height = `${layout.sheetHeightPx}px`
  }
  await page.pdf({ ...pdf, path: outPath })
}

function htmlPath(ctx: RenderContext): string {
  return path.join(ctx.outDir, '_build', 'index.html')
}

async function isolateSelectors(
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

export const forTests = {
  isolateSelectors,
  writePdf,
}
