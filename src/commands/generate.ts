import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { build } from 'vite'
import { readCanvasStateSidecar } from '../canvas/stateSidecar.js'
import { exportCssPurgeEnabled, purgeExportHtmlStyles } from '../export/cssPurge.js'
import { buildExportViteConfig } from '../export/viteConfig.js'
import { DEFAULT_FORMATS, DEFAULT_OUTPUT_FORMATS, exportBrandSchema, exportThemeSchema, normalizeFormatInput, OutputFormat, outputFormatListSchema } from '../export/enums.js'
import { resolveRenderOptions } from '../render/options.js'
import { render } from '../render/index.js'
import { defineCommand } from '../util/defineCommand.js'
import { canvasStem, emitCursorCanvas, outputSlug, parseSelectors, titleCaseFromStem } from '../util/index.js'
import verifyCommand from './verify.js'

/** Shared generate/outline CLI flags (`trpc-cli` + Zod `.meta()` for aliases). */
export const sharedCliExportOptionsSchema = z.object({
  out: z.string().default('out').describe('output directory relative to canvas').meta({ alias: 'o' }),
  title: z.string().optional().describe('HTML document title'),
  theme: exportThemeSchema.describe('light or dark').meta({ alias: 't' }),
  brand: exportBrandSchema.describe('cursor or grok (host theme brand)'),
  width: z.coerce.number().default(1280).describe('Playwright viewport width (default 1280)').meta({ alias: 'w' }),
  renderOptions: z.string().optional().describe('Playwright options JSON (launch / page / screenshot / pdf)'),
  selector: z.array(z.string()).default([]).describe('export matched nodes only (repeatable; comma-separated ok)'),
})

export const sharedRuntimeExportFields = {
  minHeight: z.preprocess(
    normalizeMinHeight,
    z
      .union([z.string(), z.number()])
      .optional()
      .describe(
        'minimum page height: px, width ratio (<= 10, e.g. 1.5), a4, or max (PDF pages all match the tallest)',
      ),
  ),
} as const

const generateInput = sharedCliExportOptionsSchema.extend({
  canvas: z.string().describe('path to *.canvas.tsx').meta({ positional: true }),
  name: z.string().optional().describe('output basename without extension').meta({ alias: 'n' }),
  formats: z.preprocess(normalizeFormatInput, outputFormatListSchema.default([...DEFAULT_OUTPUT_FORMATS])).describe(`comma-separated: html,png,pdf,jpg,cursor (default ${DEFAULT_FORMATS})`).meta({ alias: 'f' }),
  inlineState: z.boolean().default(false).describe('with --formats cursor: inline .canvas.data.json and seed localStorage'),
  quiet: z.boolean().default(false).describe('no stdout on success').meta({ alias: 'q' }),
  verify: z.boolean().default(false).describe('typecheck before export (same as open-canvas verify)'),
  ...sharedRuntimeExportFields,
})

export default defineCommand({
  meta: {
    description: 'Build artifacts from a canvas file',
    usage: [
      '[options] <canvas>',
      ` --formats <list>   comma-separated (default ${DEFAULT_FORMATS})`,
    ],
  },
  input: generateInput,
  run: executeGenerate,
})

async function executeGenerate(opts: z.infer<typeof generateInput>): Promise<string[]> {
  const canvasPath = path.resolve(opts.canvas)
  if (!fs.existsSync(canvasPath)) {
    throw new Error(`canvas not found: ${canvasPath}`)
  }
  if (opts.verify) {
    verifyCommand.run(verifyCommand.input.parse({ canvas: opts.canvas }))
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
  const selectors = parseSelectors(opts.selector)
  const needsBrowser =
    needsRender || (Boolean(selectors) && formats.includes(OutputFormat.Html))

  fs.mkdirSync(outDir, { recursive: true })

  const canvasStateForBuild = readCanvasStateSidecar(canvasPath) ?? {}

  const options = resolveRenderOptions({
    theme,
    width: opts.width,
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

function generateDebug(): boolean {
  const v = process.env.OPEN_CANVAS_DEBUG
  return v === '1' || v === 'true'
}

function normalizeMinHeight(raw: unknown): string | number | undefined {
  if (raw === undefined) {
    return undefined
  }
  if (typeof raw === 'number') {
    return raw
  }
  const s = String(raw).trim()
  return s.length > 0 ? s : undefined
}