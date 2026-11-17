import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { Page } from 'playwright'
import { pathInPkg } from '../util/paths.js'
import type { RenderOptions } from './options.js'

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

export type CanvasOutlineMeasure = {
  widthPx: number;
  scrollHeight: number;
  paginate: boolean;
  pageHeightsPx: number[];
  segmentHeightsPx: number[];
  tree: Array<{
    depth: number;
    page: number;
    tag: string;
    name: string;
    title: string;
    w: number;
    h: number;
    innerBelow: number;
    position?: 'fixed' | 'sticky';
    overlapSibling?: number;
    sectionScope?: string
  }>;
  treeOmitted: number
}

export type StagedMeasureInput = {
  htmlPath: string;
  options: RenderOptions;
  selectors?: string[];
  minHeightPx?: number;
  uniformPageHeight?: boolean;
  maxTreeNodes?: number;
  outlineThreshold?: number
}

export async function measureStagedExport(input: StagedMeasureInput): Promise<CanvasOutlineMeasure> {
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
    return await page.evaluate(canvasPrintEval, {
      mode: 'outline' as const,
      widthPx,
      bodyPaddingFallback: 48,
      minHeightPx: input.minHeightPx,
      uniformPageHeight: input.uniformPageHeight,
      maxTreeNodes: input.maxTreeNodes,
      outlineThreshold: input.outlineThreshold,
    }) as CanvasOutlineMeasure
  } finally {
    await browser.close()
  }
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
  mode: 'outline' | 'pdf';
  widthPx: number;
  bodyPaddingFallback: number;
  minHeightPx?: number;
  uniformPageHeight?: boolean;
  namePages?: boolean;
  maxTreeNodes?: number;
  outlineThreshold?: number
}) {
  function pageIndexForTop(bounds: number[], top: number): number {
    const last = bounds.length - 2
    for (let i = 0; i <= last; i++) {
      if (top >= bounds[i] && (i === last || top < bounds[i + 1])) {
        return i
      }
    }
    return Math.max(0, last)
  }
  function isNoiseId(id: string): boolean {
    return /^mantine-[a-z0-9]{4,}(?:-(?:title|body|root|label|inner))?$/i.test(id) || /^recharts-/i.test(id)
  }
  function elementTitle(el: HTMLElement, tag: string): string {
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
      return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 56)
    }
    if (tag === 'section') {
      const heading = el.querySelector('h1,h2,h3,h4')?.textContent?.replace(/\s+/g, ' ').trim()
      if (heading) {
        return heading.slice(0, 56)
      }
    }
    const aria = (el.getAttribute('aria-label') || '').trim()
    return aria ? aria.slice(0, 56) : ''
  }
  function isLandmark(el: HTMLElement, tag: string, height: number, width: number): boolean {
    const id = el.id
    if (id && !isNoiseId(id)) {
      return true
    }
    if (
      tag === 'section' || tag === 'main' || tag === 'article' || tag === 'header'
      || tag === 'footer' || tag === 'nav' || tag === 'form' || tag === 'table'
      || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4'
    ) {
      return true
    }
    const role = el.getAttribute('role')
    if (role === 'region' || role === 'main' || role === 'alert' || role === 'dialog') {
      return true
    }
    if ([...el.classList].some(c => c.includes('recharts-responsive-container'))) {
      return true
    }
    if (tag === 'svg' && height >= 48 && width >= 48) {
      return true
    }
    return false
  }
  const INTERACTIVE_LABEL_MAX = 96
  function outlineSectionScope(el: HTMLElement): string | undefined {
    let cur: HTMLElement | null = el
    while (cur) {
      const tag = cur.tagName.toLowerCase()
      if (tag === 'section' && cur.id && !isNoiseId(cur.id)) {
        return `#${cur.id}`
      }
      cur = cur.parentElement
    }
    return undefined
  }
  function elementName(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase()
    if (tag === 'a') {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
      const href = (el.getAttribute('href') || '').trim()
      if (text && href) {
        return `"${text.slice(0, INTERACTIVE_LABEL_MAX)}" → ${href.slice(0, 120)}`
      }
      if (text) {
        return `"${text.slice(0, INTERACTIVE_LABEL_MAX)}"`
      }
      if (href) {
        return `→ ${href.slice(0, 120)}`
      }
    }
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'button' || tag === 'label') {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (text) {
        return `"${text.slice(0, INTERACTIVE_LABEL_MAX)}"`
      }
    }
    const id = el.id
    if (id && !isNoiseId(id)) {
      return `#${id}`
    }
    const role = el.getAttribute('role')
    if (role && role !== 'alert') {
      return `[role=${role}]`
    }
    const cls = [...el.classList]
      .filter(c => !c.startsWith('m_') && !c.startsWith('mantine-'))
      .slice(0, 2)
      .map(c => `.${c}`)
      .join('')
    if (cls) {
      return cls
    }
    const aria = (el.getAttribute('aria-label') || '').trim()
    if (aria) {
      return `"${aria.slice(0, INTERACTIVE_LABEL_MAX)}"`
    }
    return ''
  }
  function skipOutlineSubtree(el: HTMLElement): boolean {
    const style = getComputedStyle(el)
    return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0'
  }
  function skipOutlineRecord(el: HTMLElement): boolean {
    const tag = el.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style' || tag === 'link' || tag === 'meta' || tag === 'noscript') {
      return true
    }
    const r = el.getBoundingClientRect()
    if (r.width < 3 && r.height < 3) {
      return true
    }
    if (el.getAttribute('aria-hidden') === 'true' && r.height < 8 && r.width < 8) {
      return true
    }
    if (!el.id) {
      if (tag === 'div' || tag === 'span') {
        const custom = [...el.classList].filter(c => !c.startsWith('mantine-') && !c.startsWith('m_'))
        if (!custom.length) {
          return true
        }
      }
      if (tag === 'path' || tag === 'g' || tag === 'defs' || tag === 'clippath') {
        return true
      }
    }
    return false
  }
  function rectIntersectArea(a: DOMRect, b: DOMRect): number {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    if (w < 1 || h < 1) {
      return 0
    }
    return Math.round(w * h)
  }
  function measureInnerBelow(el: HTMLElement): number {
    const box = el.getBoundingClientRect()
    let bottom = box.top
    for (const child of el.children) {
      if (!(child instanceof HTMLElement)) {
        continue
      }
      const style = getComputedStyle(child)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        continue
      }
      const r = child.getBoundingClientRect()
      if (r.height >= 1) {
        bottom = Math.max(bottom, r.bottom)
      }
    }
    if (el.children.length === 0 && box.height >= 1) {
      bottom = box.bottom
    }
    return Math.max(0, Math.floor(box.bottom - bottom))
  }
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
  const { widthPx, bodyPaddingFallback } = opts
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
  const floor = opts.minHeightPx ?? 0
  const segmentHeightsPx: number[] = []
  let bounds: number[]
  let pageHeightsPx: number[] = []
  if (!paginate) {
    segmentHeightsPx.push(scrollHeight)
    pageHeightsPx.push(Math.max(floor, scrollHeight))
    bounds = [0, scrollHeight]
  } else {
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
      breakTops.push(Math.round(el.getBoundingClientRect().top + window.scrollY))
    }
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
      const painted = Math.max(floor, Math.ceil(seg + extraPad))
      segmentHeightsPx.push(Math.ceil(seg + extraPad))
      pageHeightsPx.push(painted)
    }
  }
  if (opts.uniformPageHeight && pageHeightsPx.length) {
    const uniform = Math.max(...pageHeightsPx)
    pageHeightsPx = pageHeightsPx.map(() => uniform)
  }
  const host = document.getElementById('root') ?? document.body
  const tree: Array<{
    depth: number;
    page: number;
    tag: string;
    name: string;
    title: string;
    w: number;
    h: number;
    innerBelow: number;
    position?: 'fixed' | 'sticky';
    overlapSibling?: number;
    sectionScope?: string
  }> = []
  let treeOmitted = 0
  const treeLimit = opts.maxTreeNodes ?? 120
  const ibThreshold = opts.outlineThreshold ?? 80
  if (opts.mode === 'outline') {
    const walk = (el: Element, depth: number, parent: Element | null) => {
      if (tree.length >= treeLimit) {
        treeOmitted += 1
        return
      }
      if (depth > 14) {
        return
      }
      if (el instanceof SVGElement && !(el instanceof HTMLElement)) {
        return
      }
      if (!(el instanceof HTMLElement)) {
        return
      }
      if (skipOutlineSubtree(el)) {
        return
      }
      const r = el.getBoundingClientRect()
      const tag = el.tagName.toLowerCase()
      if (skipOutlineRecord(el)) {
        for (const child of el.children) {
          walk(child, depth, el)
        }
        return
      }
      const h = Math.ceil(r.height)
      const w = Math.ceil(r.width)
      const ib = measureInnerBelow(el)
      const landmark = isLandmark(el, tag, h, w)
      const interactive =
        tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || tag === 'a'
      const record =
        landmark
        || ib >= ibThreshold
        || (interactive && h >= 16)
        || ((tag === 'code' || tag === 'pre') && h >= 12)
      const nextDepth = record ? depth + 1 : depth
      if (record) {
        const top = Math.round(r.top + window.scrollY)
        const position = getComputedStyle(el).position
        const posHint = position === 'fixed' || position === 'sticky' ? position : undefined
        let overlapSibling = 0
        if (parent instanceof HTMLElement) {
          for (const sib of parent.children) {
            if (sib === el || !(sib instanceof HTMLElement)) {
              continue
            }
            if (skipOutlineSubtree(sib)) {
              continue
            }
            overlapSibling = Math.max(overlapSibling, rectIntersectArea(r, sib.getBoundingClientRect()))
          }
        }
        tree.push({
          depth,
          page: pageIndexForTop(bounds, top) + 1,
          tag,
          name: elementName(el),
          title: elementTitle(el, tag),
          w,
          h,
          innerBelow: ib,
          position: posHint,
          overlapSibling: overlapSibling >= 64 ? overlapSibling : undefined,
          sectionScope: outlineSectionScope(el),
        })
        if ([...el.classList].some(c => c.includes('recharts-responsive-container'))) {
          return
        }
        if (tag === 'svg' && h >= 48) {
          return
        }
      }
      for (const child of el.children) {
        walk(child, nextDepth, el)
      }
    }
    for (const child of host.children) {
      walk(child, 0, host)
    }
  }
  const sheetHeightPx = Math.max(...pageHeightsPx)
  if (opts.mode === 'pdf') {
    if (opts.namePages && paginate) {
      namePdfPages(pageHeightsPx)
    }
    return { paginate, scrollHeight, sheetHeightPx, pageHeightsPx }
  }
  return {
    widthPx,
    scrollHeight,
    paginate,
    pageHeightsPx,
    segmentHeightsPx,
    tree,
    treeOmitted,
  }
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
  }) as {
    paginate: boolean;
    scrollHeight: number;
    sheetHeightPx: number;
    pageHeightsPx: number[]
  }
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
