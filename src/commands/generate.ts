import fs from 'node:fs'
import path from 'node:path'
import { build } from 'vite'
import { readCanvasStateSidecar } from '../canvas-state-sidecar.js'
import { exportCssPurgeEnabled, purgeExportHtmlStyles } from '../export-css-purge.js'
import { buildExportViteConfig } from '../export-vite-config.js'
import { resolveRenderOptions } from '../render-options.js'
import { render } from '../render.js'
import { canvasStem, DEFAULT_FORMAT_LIST, emitCursorCanvas, outputSlug, parseFormats, parseSelectors, titleCaseFromStem } from '../util.js'

function generateDebug(): boolean {
  const v = process.env.OPEN_CANVAS_DEBUG
  return v === '1' || v === 'true'
}

export type GenerateOptions = {
  canvas: string;
  out?: string;
  name?: string;
  title?: string;
  theme?: 'light' | 'dark';
  brand?: 'cursor' | 'grok';
  formats?: string[];
  viewportWidth?: number;
  minHeight?: string | number;
  renderOptions?: string;
  selectors?: string | string[];
  /** With `--formats cursor`, prepend inlined sidecar + localStorage seed. */
  inlineState?: boolean;
  /** CLI only: skip printing artifact paths (library always returns them). */
  quiet?: boolean
}

export async function runGenerate(opts: GenerateOptions): Promise<string[]> {
  const canvasPath = path.resolve(opts.canvas)
  if (!fs.existsSync(canvasPath)) {
    throw new Error(`canvas not found: ${canvasPath}`)
  }

  const canvasDir = path.dirname(canvasPath)
  const fileStem = canvasStem(canvasPath)
  const title = opts.title ?? titleCaseFromStem(fileStem)
  const outDir = path.resolve(canvasDir, opts.out ?? 'out')
  const stem = outputSlug({
    name: opts.name,
    canvasStem: fileStem,
    title,
  })
  const theme = opts.theme ?? 'light'
  if (theme !== 'light' && theme !== 'dark') {
    throw new Error(`--theme must be light or dark (got ${theme})`)
  }
  const brand = opts.brand ?? 'cursor'
  if (brand !== 'cursor' && brand !== 'grok') {
    throw new Error(`--brand must be cursor or grok (got ${brand})`)
  }

  const formats = parseFormats(opts.formats ?? DEFAULT_FORMAT_LIST)
  const needsHtml = formats.some(
    f => f === 'html' || f === 'png' || f === 'pdf' || f === 'jpg',
  )
  const needsRender = formats.some(
    f => f === 'png' || f === 'pdf' || f === 'jpg',
  )
  const selectors = parseSelectors(opts.selectors)
  const needsBrowser =
    needsRender || (Boolean(selectors) && formats.includes('html'))

  fs.mkdirSync(outDir, { recursive: true })

  const canvasStateForBuild = readCanvasStateSidecar(canvasPath) ?? {}

  const options = resolveRenderOptions({
    theme,
    viewportWidth: opts.viewportWidth,
    minHeight: opts.minHeight,
    renderOptions: opts.renderOptions,
  })
  const renderCtx = { outDir, stem, options, selectors }
  const artifacts: string[] = []
  const noteArtifact = (p: string) => {
    artifacts.push(p)
  }

  if (formats.includes('cursor')) {
    const cursorPath = path.join(outDir, `${stem}.canvas.tsx`)
    emitCursorCanvas(canvasPath, cursorPath, {
      inlineState: opts.inlineState,
    })
    noteArtifact(cursorPath)
  }

  const viteBuildDir = path.join(outDir, '_build')
  const stagedHtml = path.join(viteBuildDir, 'index.html')
  const deliveredHtml = path.join(outDir, `${stem}.html`)
  let viteFailed = false

  try {
    if (needsHtml) {
      const debug = generateDebug()
      try {
        await build({
          ...buildExportViteConfig({
            canvasPath,
            outDir,
            theme,
            brand,
            title,
            canvasState: canvasStateForBuild,
            basePath: process.env.BASE_PATH,
          }),
          logLevel: debug ? 'info' : 'silent',
        })
      } catch (e) {
        viteFailed = true
        if (debug) {
          console.error(e)
        }
      }
      if (!viteFailed && exportCssPurgeEnabled() && fs.existsSync(stagedHtml)) {
        await purgeExportHtmlStyles(stagedHtml)
      }
    }

    if (!viteFailed) {
      if (needsBrowser) {
        await render(renderCtx, {
          png: formats.includes('png'),
          pdf: formats.includes('pdf'),
          jpg: formats.includes('jpg'),
          html: Boolean(selectors) && formats.includes('html'),
        })
      }
      if (formats.includes('html') && !selectors && fs.existsSync(stagedHtml)) {
        fs.renameSync(stagedHtml, deliveredHtml)
      }
    }
  } finally {
    fs.rmSync(viteBuildDir, { recursive: true, force: true })
  }

  if (viteFailed) {
    throw new Error('vite build failed')
  }

  for (const f of formats) {
    if (f === 'html') {
      noteArtifact(path.join(outDir, `${stem}.html`))
    }
    if (f === 'png') {
      noteArtifact(path.join(outDir, `${stem}.png`))
    }
    if (f === 'pdf') {
      noteArtifact(path.join(outDir, `${stem}.pdf`))
    }
    if (f === 'jpg') {
      noteArtifact(path.join(outDir, `${stem}.jpg`))
    }
  }

  return artifacts
}
