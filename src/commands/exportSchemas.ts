import { z } from 'zod'
import { exportBrandSchema, exportThemeSchema } from '../exportEnums.js'

export { exportBrandSchema, exportThemeSchema }

/** Shared generate/outline CLI flags (trpc-cli maps camelCase → kebab; `selector` → `--selector`). */
export const sharedCliExportOptionsSchema = z.object({
  out: z.string().default('out').describe('output directory relative to canvas').meta({ alias: 'o' }),
  title: z.string().optional().describe('HTML document title'),
  theme: exportThemeSchema.describe('light or dark').meta({ alias: 't' }),
  brand: exportBrandSchema.describe('cursor or grok (host theme brand)'),
  width: z.coerce.number().default(1280).describe('Playwright viewport width (default 1280)').meta({ alias: 'w' }),
  renderOptions: z
    .string()
    .optional()
    .describe('Playwright options JSON (launch / page / screenshot / pdf)'),
  selector: z
    .array(z.string())
    .default([])
    .describe('export matched nodes only (repeatable; comma-separated ok)'),
})

function normalizeSelectors(raw: unknown): string[] | undefined {
  if (raw === undefined) {
    return undefined
  }
  const list = Array.isArray(raw) ? raw : [raw]
  const flat = list.flatMap(p => String(p).split(',')).map(s => s.trim()).filter(Boolean)
  return flat.length > 0 ? flat : undefined
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

export { normalizeSelectors }