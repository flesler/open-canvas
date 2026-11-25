import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { Page } from 'playwright'
import { pathInPkg } from '../util/paths.js'
import type { RenderOptions } from './options.js'
import { outlineEval } from './outlineEval.js'
import type { CanvasOutline } from './outlineEval.js'

const pkgRoot = path.dirname(pathInPkg('package.json'))
const require = createRequire(pathInPkg('package.json'))
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

export type { CanvasOutline, OutlineNode, TextChecks } from './outlineEval.js'

export type StagedMeasureInput = {
  htmlPath: string;
  options: RenderOptions;
  selectors?: string[];
  minHeightPx?: number;
  uniformPageHeight?: boolean;
  maxNodes?: number;
  slackPx?: number
}

export async function measureStagedExport(input: StagedMeasureInput): Promise<CanvasOutline> {
  if (!fs.existsSync(input.htmlPath)) {
    throw new Error(`HTML artifact missing: ${input.htmlPath}`)
  }
  ensureChromium()
  const { chromium } = await import('playwright')
  const errors: string[] = []
  const browser = await chromium.launch(input.options.launch ?? {})
  try {
    const page = await browser.newPage(input.options.page)
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`file://${input.htmlPath}`, { waitUntil: 'networkidle' })
    await page.waitForFunction(
      () => (document.getElementById('root')?.childElementCount ?? 0) > 0,
      { timeout: 15_000 },
    )
    if (errors.length) {
      throw new Error(errors.join('\n'))
    }
    if (input.selectors?.length) {
      await isolateSelectors(page, input.selectors)
    }
    await page.emulateMedia({ media: 'print' })
    const widthPx = input.options.page.viewport.width
    const layout = await page.evaluate(canvasPrintEval, {
      mode: 'layout' as const,
      widthPx,
      bodyPaddingFallback: 48,
      minHeightPx: input.minHeightPx,
      uniformPageHeight: input.uniformPageHeight,
    }) as PrintLayout
    const measured = await page.evaluate(outlineEval, {
      bounds: layout.bounds,
      maxNodes: input.maxNodes ?? 400,
      slackPx: input.slackPx ?? 80,
    })
    return {
      widthPx,
      scrollHeight: layout.scrollHeight,
      paginate: layout.paginate,
      pageHeightsPx: layout.pageHeightsPx,
      contentHeightsPx: layout.segmentHeightsPx,
      ...measured,
    }
  } finally {
    await browser.close()
  }
}

type PrintLayout = {
  paginate: boolean;
  scrollHeight: number;
  sheetHeightPx: number;
  pageHeightsPx: number[];
  segmentHeightsPx: number[];
  bounds: number[]
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
      await fitViewportToContent(
        page,
        ctx.options.page.viewport.width,
        minHeightPx(ctx),
      )
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

function minHeightPx(ctx: RenderContext): number | undefined {
  const { minHeight } = ctx.options.page
  return typeof minHeight === 'number' ? minHeight : undefined
}

async function fitViewportToContent(
  page: Page,
  width: number,
  minHeight?: number,
): Promise<void> {
  let height = await page.evaluate(() => {
    const root = document.getElementById('root')
    const doc = document.documentElement.scrollHeight
    const body = document.body?.scrollHeight ?? 0
    const rootH = root?.scrollHeight ?? 0
    return Math.ceil(Math.max(doc, body, rootH))
  })
  if (minHeight !== undefined) {
    height = Math.max(height, minHeight)
  }
  await page.setViewportSize({ width, height })
}

function canvasPrintEval(opts: {
  mode: 'layout' | 'pdf';
  widthPx: number;
  bodyPaddingFallback: number;
  minHeightPx?: number;
  uniformPageHeight?: boolean;
  namePages?: boolean
}) {
  function namePdfPages(pageHeightsPx: number[]): void {
    const breakTops: number[] = []
    const breakEls: HTMLElement[] = []
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
      breakEls.push(el)
      breakTops.push(Math.round(el.getBoundingClientRect().top + window.scrollY))
    }
    const sheetHeightPx = Math.max(...pageHeightsPx)
    const segmentOf = (el: Element) => {
      const top = Math.round(el.getBoundingClientRect().top + window.scrollY)
      return breakTops.filter(breakTop => breakTop <= top).length
    }
    const assign = (parent: Element) => {
      for (const child of Array.from(parent.children)) {
        if (!(child instanceof HTMLElement || child instanceof SVGElement)) {
          continue
        }
        const spansBreak = breakEls.some(mark => mark !== child && child.contains(mark))
        child.style.setProperty('page', `oc-page-${segmentOf(child)}`)
        if (spansBreak) {
          assign(child)
        }
      }
    }
    document.body.style.setProperty('page', 'oc-page-0')
    assign(document.body)
    const style = document.createElement('style')
    style.textContent = [
      `@page { size: ${opts.widthPx}px ${sheetHeightPx}px; margin: 0 }`,
      ...pageHeightsPx.map(
        (height, i) => `@page oc-page-${i} { size: ${opts.widthPx}px ${height}px; margin: 0 }`,
      ),
    ].join('\n')
    document.head.appendChild(style)
  }
  const { bodyPaddingFallback } = opts
  let padTop = bodyPaddingFallback / 2
  let padBottom = bodyPaddingFallback / 2
  if (document.body instanceof HTMLElement) {
    const pad = getComputedStyle(document.body)
    const top = parseFloat(pad.paddingTop)
    const bottom = parseFloat(pad.paddingBottom)
    padTop = Number.isNaN(top) ? padTop : top
    padBottom = Number.isNaN(bottom) ? padBottom : bottom
  }
  for (const el of document.querySelectorAll<HTMLElement>('[style]')) {
    if (el.style.minHeight.includes('vh')) {
      el.style.minHeight = '0'
    }
  }
  const scrollHeight = Math.ceil(document.documentElement.getBoundingClientRect().height)
  const breakTops: number[] = []
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
      breakTops.push(Math.round(el.getBoundingClientRect().top + window.scrollY))
    }
  }
  const paginate = breakTops.length > 0
  const floor = opts.minHeightPx ?? 0
  const segmentHeightsPx: number[] = []
  let bounds: number[]
  let pageHeightsPx: number[] = []
  if (!paginate) {
    segmentHeightsPx.push(scrollHeight)
    pageHeightsPx.push(Math.max(floor, scrollHeight))
    bounds = [0, scrollHeight]
  } else {
    breakTops.sort((a, b) => a - b)
    const endMarker = document.createElement('div')
    document.body.appendChild(endMarker)
    const contentBottom = Math.ceil(endMarker.getBoundingClientRect().top + window.scrollY + padBottom)
    endMarker.remove()
    bounds = [0, ...breakTops, Math.min(scrollHeight, contentBottom)]
    const pageCount = bounds.length - 1
    for (let i = 0; i < pageCount; i++) {
      const seg = bounds[i + 1] - bounds[i]
      const isFirst = i === 0
      const isLast = i === pageCount - 1
      let extraPad = padTop + padBottom
      if (isFirst) {
        extraPad = padBottom
      } else if (isLast) {
        extraPad = padTop
      }
      segmentHeightsPx.push(Math.ceil(seg + extraPad))
      pageHeightsPx.push(Math.max(floor, Math.ceil(seg + extraPad)))
    }
  }
  if (opts.uniformPageHeight && pageHeightsPx.length) {
    const uniform = Math.max(...pageHeightsPx)
    pageHeightsPx = pageHeightsPx.map(() => uniform)
  }
  const sheetHeightPx = Math.max(...pageHeightsPx)
  if (opts.mode === 'pdf' && opts.namePages && paginate) {
    namePdfPages(pageHeightsPx)
  }
  return { paginate, scrollHeight, sheetHeightPx, pageHeightsPx, segmentHeightsPx, bounds }
}

async function writePdf(
  page: Page,
  ctx: RenderContext,
  outPath: string,
): Promise<void> {
  const widthPx = ctx.options.page.viewport.width
  await page.emulateMedia({ media: 'print' })
  const pdf = { ...ctx.options.pdf }
  const uniform = ctx.options.page.minHeight === 'max'
  const namePages = !uniform && !pdf.width && !pdf.height && !pdf.format
  const layout = await page.evaluate(canvasPrintEval, {
    mode: 'pdf' as const,
    widthPx,
    bodyPaddingFallback: 48,
    minHeightPx: minHeightPx(ctx),
    namePages,
  }) as PrintLayout
  if (namePages && layout.paginate) {
    pdf.preferCSSPageSize = true
  } else {
    if (!pdf.width) {
      pdf.width = `${widthPx}px`
    }
    if (!pdf.height) {
      pdf.height = `${layout.sheetHeightPx}px`
    }
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
