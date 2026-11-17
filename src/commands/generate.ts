import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { build } from 'vite'
import { readCanvasStateSidecar } from '../canvas-state-sidecar.js'
import { exportCssPurgeEnabled, purgeExportHtmlStyles } from '../export-css-purge.js'
import { buildExportViteConfig } from '../export-vite-config.js'
import { DEFAULT_FORMATS, DEFAULT_OUTPUT_FORMATS, normalizeFormatInput, OutputFormat, outputFormatListSchema } from '../exportEnums.js'
import { resolveRenderOptions } from '../render-options.js'
import { render } from '../render.js'
import { canvasStem, emitCursorCanvas, outputSlug, parseSelectors, titleCaseFromStem } from '../util.js'
import { normalizeSelectors, sharedCliExportOptionsSchema, sharedRuntimeExportFields } from './exportSchemas.js'

function generateDebug(): boolean {
  const v = process.env.OPEN_CANVAS_DEBUG
  return v === '1' || v === 'true'
}

export const generateFieldsSchema = sharedCliExportOptionsSchema
  .extend({
    canvas: z.string().describe('path to *.canvas.tsx').meta({ positional: true }),
    name: z.string().optional().describe('output basename without extension').meta({ alias: 'n' }),
    formats: z
      .preprocess(
        normalizeFormatInput,
        outputFormatListSchema.default([...DEFAULT_OUTPUT_FORMATS]),
      )
      .describe(`comma-separated: html,png,pdf,jpg,cursor (default ${DEFAULT_FORMATS})`)
      .meta({ alias: 'f' }),
    inlineState: z
      .boolean()
      .default(false)
      .describe('with --formats cursor: inline .canvas.data.json and seed localStorage'),
    quiet: z.boolean().default(false).describe('no stdout on success').meta({ alias: 'q' }),
    ...sharedRuntimeExportFields,
  })

export const generateInputSchema = generateFieldsSchema.transform(({ selector, width, ...rest }) => ({
  ...rest,
  viewportWidth: width,
  selectors: normalizeSelectors(selector),
}))

export type GenerateOptions = z.input<typeof generateFieldsSchema>

export async function runGenerate(raw: GenerateOptions): Promise<string[]> {
  const opts = generateInputSchema.parse(raw)
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
  const { theme, brand } = opts
  const formats = opts.formats ?? [...DEFAULT_OUTPUT_FORMATS]
  const needsHtml = formats.some(
    f => f === OutputFormat.Html || f === OutputFormat.Png || f === OutputFormat.Pdf || f === OutputFormat.Jpg,
  )
  const needsRender = formats.some(
    f => f === OutputFormat.Png || f === OutputFormat.Pdf || f === OutputFormat.Jpg,
  )
  const selectors = parseSelectors(opts.selectors)
  const needsBrowser =
    needsRender || (Boolean(selectors) && formats.includes(OutputFormat.Html))

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

  if (formats.includes(OutputFormat.Cursor)) {
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
          png: formats.includes(OutputFormat.Png),
          pdf: formats.includes(OutputFormat.Pdf),
          jpg: formats.includes(OutputFormat.Jpg),
          html: Boolean(selectors) && formats.includes(OutputFormat.Html),
        })
      }
      if (formats.includes(OutputFormat.Html) && !selectors && fs.existsSync(stagedHtml)) {
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
    if (f === OutputFormat.Html) {
      noteArtifact(path.join(outDir, `${stem}.html`))
    }
    if (f === OutputFormat.Png) {
      noteArtifact(path.join(outDir, `${stem}.png`))
    }
    if (f === OutputFormat.Pdf) {
      noteArtifact(path.join(outDir, `${stem}.pdf`))
    }
    if (f === OutputFormat.Jpg) {
      noteArtifact(path.join(outDir, `${stem}.jpg`))
    }
  }

  return artifacts
}