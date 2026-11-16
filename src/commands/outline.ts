import fs from 'node:fs'
import path from 'node:path'
import { build } from 'vite'
import { readCanvasStateSidecar } from '../canvas-state-sidecar.js'
import { exportCssPurgeEnabled, purgeExportHtmlStyles } from '../export-css-purge.js'
import { buildExportViteConfig } from '../export-vite-config.js'
import { resolveRenderOptions } from '../render-options.js'
import type { CanvasOutlineMeasure } from '../render.js'
import { outlineReferenceDocPath } from '../paths.js'
import { version } from '../pkg.js'
import { measureStagedExport } from '../render.js'
import { canvasStem, parseSelectors, titleCaseFromStem } from '../util.js'

export const DEFAULT_OUTLINE_THRESHOLD = 80
/** Max lines printed under STRUCTURE (display cap). */
export const DEFAULT_OUTLINE_MAX_LINES = 96
/** Nodes collected in the browser when display cap is not raised. */
export const DEFAULT_OUTLINE_MEASURE_NODES = 180

export type OutlineOptions = {
  canvas: string;
  out?: string;
  title?: string;
  theme?: 'light' | 'dark';
  brand?: 'cursor' | 'grok';
  viewportWidth?: number;
  minHeight?: string | number;
  renderOptions?: string;
  selectors?: string | string[];
  threshold?: number;
  maxChildren?: number;
  warnSlack?: boolean
}

export async function runOutline(opts: OutlineOptions): Promise<string> {
  const canvasPath = path.resolve(opts.canvas)
  if (!fs.existsSync(canvasPath)) {
    throw new Error(`canvas not found: ${canvasPath}`)
  }
  const canvasDir = path.dirname(canvasPath)
  const title = opts.title ?? titleCaseFromStem(canvasStem(canvasPath))
  const outDir = path.resolve(canvasDir, opts.out ?? 'out')
  const theme = opts.theme ?? 'light'
  if (theme !== 'light' && theme !== 'dark') {
    throw new Error(`--theme must be light or dark (got ${theme})`)
  }
  const brand = opts.brand ?? 'cursor'
  if (brand !== 'cursor' && brand !== 'grok') {
    throw new Error(`--brand must be cursor or grok (got ${brand})`)
  }
  const options = resolveRenderOptions({
    theme,
    viewportWidth: opts.viewportWidth,
    minHeight: opts.minHeight,
    renderOptions: opts.renderOptions,
  })
  const minHeight = options.page.minHeight
  const minHeightPx = typeof minHeight === 'number' ? minHeight : undefined
  const uniformPageHeight = minHeight === 'max'
  const selectors = parseSelectors(opts.selectors)
  const threshold =
    opts.warnSlack === false
      ? opts.threshold
      : (opts.threshold ?? DEFAULT_OUTLINE_THRESHOLD)
  const recordThreshold =
    opts.warnSlack === false ? 999_999 : (opts.threshold ?? DEFAULT_OUTLINE_THRESHOLD)
  const maxLines = opts.maxChildren ?? DEFAULT_OUTLINE_MAX_LINES
  const maxTreeNodes = opts.maxChildren ?? DEFAULT_OUTLINE_MEASURE_NODES
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
      canvasState: readCanvasStateSidecar(canvasPath) ?? {},
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
      selectors,
      minHeightPx,
      uniformPageHeight,
      maxTreeNodes,
      outlineThreshold: recordThreshold,
    })
    return prependOutlineHelp(
      formatOutline(measure, {
        threshold,
        maxLines,
      }),
    )
  } finally {
    fs.rmSync(path.join(outDir, '_build'), { recursive: true, force: true })
  }
}

export const forTests = {
  formatOutline,
  structureTreeRows,
  sectionContainsSummary,
  prependOutlineHelp,
}

function prependOutlineHelp(body: string): string {
  const ref = outlineReferenceDocPath()
  const lines = [
    'Sections: VIEWPORT → LEGEND → MAJOR BLOCKS → STRUCTURE → VERTICAL SEGMENTS (read top to bottom; self-contained).',
    `If a token is still unclear: ${ref}  (bundled with @flesler/open-canvas@${version})`,
    '',
    body,
  ]
  return lines.join('\n')
}

type TreeRow = CanvasOutlineMeasure['tree'][number]

function sectionLandmarkKey(row: TreeRow): string | undefined {
  return row.tag === 'section' && row.name ? row.name : undefined
}

/** Sections already listed under MAJOR BLOCKS are omitted from STRUCTURE. */
export function structureTreeRows(
  tree: TreeRow[],
  landmarkSections: Set<string>,
): TreeRow[] {
  if (!landmarkSections.size) {
    return tree
  }
  return tree.filter((row) => {
    const key = sectionLandmarkKey(row)
    return !(key && landmarkSections.has(key))
  })
}

export function sectionContainsSummary(tree: TreeRow[], sectionKey: string): string {
  const rows = tree.filter(
    row => row.sectionScope === sectionKey && !(row.tag === 'section' && row.name === sectionKey),
  )
  if (!rows.length) {
    return '(no outline nodes inside)'
  }
  const buckets = new Map<string, number>()
  const bump = (kind: string, n = 1) => buckets.set(kind, (buckets.get(kind) ?? 0) + n)
  for (const row of rows) {
    const tag = row.tag
    const name = row.name
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
      bump('heading')
    } else if (name.includes('recharts-responsive-container')) {
      bump('chart')
    } else if (tag === 'table') {
      bump('table')
    } else if (tag === 'svg') {
      bump('svg')
    } else if (tag === 'button') {
      bump('button')
    } else if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      bump('field')
    } else if (name.includes('tab-') || name.includes('[role=tab]')) {
      bump('tab')
    } else if (tag === 'a') {
      bump('link')
    } else if (tag === 'pre' || tag === 'code') {
      bump('snippet')
    }
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, count]) => `${count}×${kind}`)
    .join(', ')
}

function shallowOutlineNote(summary: string, sectionHeight: number): string {
  if (summary === '(no outline nodes inside)') {
    return sectionHeight > 48 ? ' — shallow outline (omitted DOM may fill this section)' : ''
  }
  const shallow =
    sectionHeight >= 120
    && !summary.includes('chart')
    && !summary.includes('table')
    && !summary.includes('svg')
    && !summary.includes('button')
    && !summary.includes('snippet')
    && !summary.includes('field')
    && (summary === '1×heading' || /^1×heading, \d+×link$/.test(summary))
  return shallow ? ' — shallow outline (most content not in tree)' : ''
}

function sectionDuplicateControls(rows: TreeRow[]): string | undefined {
  const byLabel = new Map<string, Set<number>>()
  for (const row of rows) {
    if (row.tag !== 'button') {
      continue
    }
    const match = row.name.match(/^"(.+)"$/)
    if (!match) {
      continue
    }
    const widths = byLabel.get(match[1]) ?? new Set()
    widths.add(row.w)
    byLabel.set(match[1], widths)
  }
  const dupes = [...byLabel.entries()].filter(([, widths]) => widths.size > 1)
  if (!dupes.length) {
    return undefined
  }
  return dupes
    .map(([label, widths]) => {
      const sizes = [...widths].sort((a, b) => a - b).join(', ')
      const short = label.length > 44 ? `${label.slice(0, 44)}…` : label
      return `"${short}" at ${sizes}px`
    })
    .join('; ')
}

function formatOutline(
  payload: CanvasOutlineMeasure,
  opts: { threshold?: number; maxLines: number },
): string {
  const { threshold, maxLines } = opts
  const pageCount = payload.pageHeightsPx.length
  const breakNote =
    payload.paginate && pageCount > 1
      ? ` (${pageCount - 1} CSS page-break marker${pageCount > 2 ? 's' : ''} in the document)`
      : ''
  const lines = [
    `VIEWPORT — ${payload.widthPx}px wide, ${payload.scrollHeight}px tall — same print layout as generate: ${pageCount} vertical segment${pageCount === 1 ? '' : 's'}${breakNote}`,
  ]
  const legendBits = [
    'seg-N = vertical slice',
    'empty-inside = px below last child (charts may still paint)',
    '×N = repeated siblings',
    'overlap-sibling = shared bbox px² with a sibling (often columns/grid)',
    'fixed/sticky = overlay',
  ]
  if (threshold !== undefined) {
    legendBits.splice(1, 0, `! = inner slack ≥ ${threshold}px below last child`)
  }
  lines.push(`LEGEND — ${legendBits.join('; ')}`)
  const landmarks = payload.tree.filter(row => row.tag === 'section')
  const landmarkSections = new Set(
    landmarks.map(row => sectionLandmarkKey(row)).filter((k): k is string => !!k),
  )
  lines.push('')
  if (landmarks.length) {
    lines.push('MAJOR BLOCKS (seg-N = vertical slice; element, width×height in px, title)')
    for (const row of landmarks) {
      const title = row.title ? `  "${row.title}"` : ''
      const key = sectionLandmarkKey(row)
      const roll = key ? sectionContainsSummary(payload.tree, key) : ''
      const shallow = key ? shallowOutlineNote(roll, row.h) : ''
      const contains = key ? `  |  contains: ${roll}` : ''
      lines.push(`  seg-${row.page}  ${compactName(row)}  ${row.w}×${row.h}px${title}${contains}${shallow}`)
    }
  } else if (payload.tree.length) {
    lines.push('MAJOR BLOCKS — no section elements; use STRUCTURE for top-level regions (headings, #id, charts)')
  }
  const structureSource = structureTreeRows(payload.tree, landmarkSections)
  const cap = capTree(structureSource, maxLines)
  const omitted = payload.treeOmitted + cap.omitted
  if (structureSource.length) {
    lines.push('')
    const omitNote = omitted > 0 ? ` (+${omitted} more nodes not shown — raise --max-children)` : ''
    const sectionNote = landmarkSections.size
      ? ' — top-level sections omitted (listed above)'
      : ''
    lines.push(`STRUCTURE (grouped by section#id; depth indent = DOM nesting)${sectionNote}${omitNote}`)
    let lastScope: string | undefined
    for (const row of compressRuns(cap.kept)) {
      const scope = row.sectionScope ?? ''
      if (scope !== lastScope) {
        lines.push(scope ? `  — ${scope} —` : '  — (outside section) —')
        if (scope) {
          const dupes = sectionDuplicateControls(structureSource.filter(r => r.sectionScope === scope))
          if (dupes) {
            lines.push(`  · duplicate button layouts (same label, different width): ${dupes}`)
          }
        }
        lastScope = scope
      }
      const indent = '  '.repeat(row.depth + 1)
      const flag = threshold !== undefined && row.innerBelow >= threshold ? '! ' : ''
      const gap = row.innerBelow > 0 ? `  empty-inside=${row.innerBelow}px` : ''
      const mul = row.run > 1 ? `  ×${row.run}` : ''
      const pos = row.position ? `  ${row.position}` : ''
      const ov =
        row.overlapSibling && row.overlapSibling >= 64
          ? `  overlap-sibling=${row.overlapSibling}px²`
          : ''
      lines.push(
        `${indent}seg-${row.page}  ${flag}${compactName(row)}  ${row.w}×${row.h}px${gap}${pos}${ov}${mul}`,
      )
    }
  }
  lines.push('')
  lines.push('VERTICAL SEGMENTS (export slice height in px)')
  payload.pageHeightsPx.forEach((pageH, i) => {
    const onPage = payload.tree.filter(n => n.page === i + 1)
    const innerMax = onPage.reduce((m, n) => Math.max(m, n.innerBelow), 0)
    const warn = threshold !== undefined && innerMax >= threshold
    lines.push(
      `  seg-${i + 1}  height ${pageH}px${warn ? `  (largest empty-inside in this segment: ${innerMax}px)` : ''}`,
    )
  })
  return lines.join('\n')
}

function compactName(row: CanvasOutlineMeasure['tree'][number]): string {
  if (row.name.includes('recharts-responsive-container')) {
    return 'chart-host.recharts-responsive-container'
  }
  if (row.tag === 'div' && row.name.startsWith('#') && row.name.includes('-tab-')) {
    const tab = row.name.match(/-tab-([^-#]+)/)?.[1]
    if (tab) {
      return `${row.tag}${row.name} (tab: ${tab})`
    }
  }
  if (row.tag === 'div' && !row.name && row.w >= 400 && row.h >= 40) {
    return 'div layout-shell'
  }
  if (row.name.startsWith('#')) {
    return `${row.tag}${row.name}`
  }
  if (row.name.startsWith('"')) {
    return `${row.tag} ${row.name}`
  }
  if (row.name) {
    return `${row.tag}${row.name}`
  }
  return row.tag
}

function capTree(
  rows: CanvasOutlineMeasure['tree'],
  max: number,
): { kept: typeof rows; omitted: number } {
  if (rows.length <= max) {
    return { kept: rows, omitted: 0 }
  }
  return { kept: rows.slice(0, max), omitted: rows.length - max }
}

type TreeRun = CanvasOutlineMeasure['tree'][number] & { run: number }

function rowRunKey(row: CanvasOutlineMeasure['tree'][number]): string {
  const name = compactName(row)
  if (row.tag === 'button' || row.tag === 'a' || row.tag === 'pre' || row.tag === 'code') {
    return `${row.page}|${row.depth}|${row.tag}|${name}`
  }
  return `${row.page}|${row.depth}|${name}|${row.w}|${row.h}|${row.innerBelow}`
}

function compressRuns(rows: CanvasOutlineMeasure['tree']): TreeRun[] {
  const out: TreeRun[] = []
  for (const row of rows) {
    const key = rowRunKey(row)
    const prev = out[out.length - 1]
    const prevKey = prev ? rowRunKey(prev) : ''
    if (prev && key === prevKey) {
      prev.run += 1
    } else {
      out.push({ ...row, run: 1 })
    }
  }
  return out
}