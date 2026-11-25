import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { build } from 'vite'
import { resolveCanvasState } from '../canvas/stateSidecar.js'
import { exportCssPurgeEnabled, purgeExportHtmlStyles } from '../export/cssPurge.js'
import { buildExportViteConfig } from '../export/viteConfig.js'
import { resolveRenderOptions } from '../render/options.js'
import type { CanvasOutline, OutlineNode } from '../render/index.js'
import { outlineReferenceDocPath } from '../util/paths.js'
import { measureStagedExport, SMALL_TEXT_PX } from '../render/index.js'
import { canvasStem, parseSelectors, titleCaseFromStem } from '../util/index.js'
import { defineCommand } from '../util/defineCommand.js'
import { sharedCliExportOptionsSchema, sharedRuntimeExportFields } from './generate.js'

const DEFAULT_SLACK_PX = 80
const DEFAULT_MAX_LINES = 200

const outlineInput = sharedCliExportOptionsSchema.extend({
  canvas: z.string().describe('path to *.canvas.tsx').meta({ positional: true }),
  slack: z.coerce.number().default(DEFAULT_SLACK_PX).describe(`flag containers with at least this many empty px at the bottom (default ${DEFAULT_SLACK_PX})`),
  maxLines: z.coerce.number().default(DEFAULT_MAX_LINES).describe(`max block lines across all pages (default ${DEFAULT_MAX_LINES})`),
  ...sharedRuntimeExportFields,
})

export const forTests = { formatOutline }

export default defineCommand({
  meta: {
    description: 'Print what each PDF page contains, with sizes and text problems (stdout; same print layout as generate)',
  },
  input: outlineInput,
  run: executeOutline,
})

async function executeOutline(opts: z.infer<typeof outlineInput>): Promise<string> {
  const canvasPath = path.resolve(opts.canvas)
  if (!fs.existsSync(canvasPath)) {
    throw new Error(`canvas not found: ${canvasPath}`)
  }
  const canvasDir = path.dirname(canvasPath)
  const title = opts.title ?? titleCaseFromStem(canvasStem(canvasPath))
  const outDir = path.resolve(canvasDir, opts.out ?? 'out')
  const { theme, brand } = opts
  const options = resolveRenderOptions({
    theme,
    width: opts.width,
    minHeight: opts.minHeight,
    renderOptions: opts.renderOptions,
  })
  const minHeight = options.page.minHeight
  fs.mkdirSync(outDir, { recursive: true })
  const stagedHtml = path.join(outDir, '_build', 'index.html')
  const debug = process.env.OPEN_CANVAS_DEBUG === '1' || process.env.OPEN_CANVAS_DEBUG === 'true'
  await build({
    ...buildExportViteConfig({
      canvasPath,
      outDir,
      theme,
      brand,
      title,
      canvasState: resolveCanvasState(canvasPath, opts.state),
      basePath: process.env.BASE_PATH,
    }),
    logLevel: debug ? 'info' : 'silent',
  })
  if (exportCssPurgeEnabled() && fs.existsSync(stagedHtml)) {
    await purgeExportHtmlStyles(stagedHtml)
  }
  if (!fs.existsSync(stagedHtml)) {
    throw new Error('vite build did not produce _build/index.html')
  }
  try {
    const measure = await measureStagedExport({
      htmlPath: stagedHtml,
      options,
      selectors: parseSelectors(opts.selector),
      minHeightPx: typeof minHeight === 'number' ? minHeight : undefined,
      uniformPageHeight: minHeight === 'max',
      maxNodes: Math.max(opts.maxLines, 1) * 2,
      slackPx: opts.slack,
    })
    return formatOutline(measure, {
      file: path.basename(canvasPath),
      maxLines: Math.max(opts.maxLines, 1),
      minHeight: minHeight === undefined ? undefined : String(opts.minHeight),
    })
  } finally {
    fs.rmSync(path.join(outDir, '_build'), { recursive: true, force: true })
  }
}

type FormatOpts = { file: string; maxLines: number; minHeight?: string }

function formatOutline(m: CanvasOutline, opts: FormatOpts): string {
  const pages = m.pageHeightsPx.length
  const lines = [
    `${opts.file} · print layout ${m.widthPx}px wide · ${pages} PDF page${pages === 1 ? '' : 's'}`,
    'Lines: +Y = px from page top · x=X = px right of the parent\'s left edge (omitted when ~0) · W×H px · indent = nesting · a › b = a wraps only b',
  ]
  let budget = opts.maxLines
  const runs = compressRuns(withRelativeX(foldNodes(m.nodes)))
  for (let p = 1; p <= pages; p++) {
    lines.push('', pageHeader(m, p, opts.minHeight))
    for (const row of runs.filter(n => n.page === p)) {
      if (budget-- <= 0) {
        break
      }
      lines.push(formatNode(row))
    }
  }
  const hiddenLines = runs.length - opts.maxLines + m.nodesOmitted
  if (hiddenLines > 0) {
    lines.push(`… ${hiddenLines} more block line${hiddenLines === 1 ? '' : 's'} not shown (raise --max-lines)`)
  }
  lines.push('', ...formatText(m))
  const hint = pageHint(m, opts.minHeight)
  if (hint) {
    lines.push('', hint)
  }
  lines.push('', `Edge cases and heuristics: ${outlineReferenceDocPath()}`)
  return lines.join('\n')
}

function pageHeader(m: CanvasOutline, p: number, minHeight: string | undefined): string {
  const pageH = m.pageHeightsPx[p - 1]
  const content = m.contentHeightsPx[p - 1] ?? pageH
  const fill = pageH > content
    ? `${content}px content + ${pageH - content}px blank from --min-height ${minHeight ?? ''}`.trim()
    : 'fully used'
  return `PAGE ${p} · ${pageH}px tall (${fill})`
}

const CONTAINER_KIND = /^(section|article|main|header|footer|aside|nav|form|div|card)/

/** Merges a container with its heading (same top) or with its only child, when the container has no label of its own. */
function foldNodes(nodes: OutlineNode[]): OutlineNode[] {
  const out: OutlineNode[] = []
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    const next = nodes[i + 1]
    const after = nodes[i + 2]
    const child = next && next.page === n.page && next.depth === n.depth + 1 ? next : undefined
    if (!child || n.label || n.slack || !CONTAINER_KIND.test(n.kind)) {
      out.push(n)
      continue
    }
    const heading = /^h[1-6]$/.test(child.kind) && Math.abs(child.y - n.y) <= 4
    const onlyChild = !after || after.page !== n.page || after.depth <= n.depth
    if (heading || onlyChild) {
      out.push({ ...n, kind: `${n.kind} › ${child.kind}`, label: child.label, note: child.note, minFont: child.minFont })
      i += 1
    } else {
      out.push(n)
    }
  }
  return out
}

/** Converts absolute x to px from the parent's left edge; padding-sized offsets read as 0. */
function withRelativeX(nodes: OutlineNode[]): OutlineNode[] {
  const lefts: number[] = []
  return nodes.map((n) => {
    lefts[n.depth] = n.x
    const rel = n.x - (n.depth > 0 ? lefts[n.depth - 1] ?? 0 : 0)
    return { ...n, x: rel > (n.depth > 0 ? 24 : 8) ? rel : 0 }
  })
}

type Run = OutlineNode & { run: number }

function compressRuns(nodes: OutlineNode[]): Run[] {
  const out: Run[] = []
  for (const n of nodes) {
    const prev = out[out.length - 1]
    if (prev && prev.page === n.page && prev.depth === n.depth && prev.kind === n.kind && prev.label === n.label && prev.w === n.w && prev.h === n.h) {
      prev.run += 1
    } else {
      out.push({ ...n, run: 1 })
    }
  }
  return out
}

function formatNode(n: Run): string {
  const pos = `+${n.y}`.padEnd(6)
  const parts = [`${'  '.repeat(n.depth + 1)}${pos} ${n.x ? `x=${n.x} ` : ''}${n.kind}${n.label ? ` "${n.label}"` : ''}  ${n.w}×${n.h}`]
  if (n.note) {
    parts.push(n.note)
  }
  if (n.minFont) {
    parts.push(`smallest text ${n.minFont.px}px${n.minFont.px < SMALL_TEXT_PX ? ' ⚠' : ''}`)
  }
  if (n.slack) {
    parts.push(`⚠ ${n.slack}px empty at the bottom`)
  }
  if (n.run > 1) {
    parts.push(`×${n.run} in a row`)
  }
  return parts.join(' · ')
}

function formatText(m: CanvasOutline): string[] {
  const { overlaps, overlapsTotal, clipped, clippedTotal, overflow } = m.text
  const small = m.nodes.filter(n => n.minFont && n.minFont.px < SMALL_TEXT_PX)
  const total = overlapsTotal + clippedTotal + overflow.length + small.length
  if (!total) {
    return [`TEXT · no overlapping text, cut-off labels, overflowing boxes, or SVG text under ${SMALL_TEXT_PX}px`]
  }
  const lines = [`TEXT · ${total} problem${total === 1 ? '' : 's'} to fix before exporting`]
  const at = (page: number, y: number) => `page ${page} +${y}`.padEnd(14)
  for (const o of overlaps) {
    lines.push(`  ${at(o.page, o.y)} "${o.a}" overlaps "${o.b}" by ${o.w}×${o.h}px`)
  }
  if (overlapsTotal > overlaps.length) {
    lines.push(`  … ${overlapsTotal - overlaps.length} more overlapping pairs`)
  }
  for (const c of clipped) {
    lines.push(`  ${at(c.page, c.y)} SVG label cut off by ${c.px}px at the edge of its box: "${c.text}"`)
  }
  if (clippedTotal > clipped.length) {
    lines.push(`  … ${clippedTotal - clipped.length} more cut-off labels`)
  }
  for (const o of overflow) {
    const why = o.scrolls ? 'scrolls, so print shows only the visible part' : 'the rest is clipped'
    lines.push(`  ${at(o.page, o.y)} content ${o.px}px wider than its box (${why}): ${o.label}`)
  }
  for (const s of small) {
    const fix = s.kind.endsWith('chart')
      ? 'chart value labels: pass showValues={false} or give the chart more room'
      : 'raise its fontSize, or draw the SVG wider / with a smaller viewBox'
    lines.push(`  ${at(s.page, s.y)} ${s.minFont?.px}px text like "${s.minFont?.sample}" in ${s.kind} ${s.w}×${s.h}, under ${SMALL_TEXT_PX}px is hard to read (${fix})`)
  }
  return lines
}

function pageHint(m: CanvasOutline, minHeight: string | undefined): string | undefined {
  const content = m.contentHeightsPx
  if (content.length === 1) {
    return content[0] > m.widthPx * 1.5
      ? `PAGES · one ${content[0]}px page. To split the PDF, put <div style={{ breakBefore: "page" }} /> between sections.`
      : undefined
  }
  if (minHeight !== undefined) {
    return undefined
  }
  const max = Math.max(...content)
  const min = Math.min(...content)
  const blank = content.reduce((sum, h) => sum + max - h, 0)
  const pct = Math.round((blank / (max * content.length)) * 100)
  return `PAGES · content is ${min}–${max}px per page. --min-height max makes every page ${max}px (+${blank}px blank, ${pct}% of the PDF); otherwise each page keeps its own height.`
}
