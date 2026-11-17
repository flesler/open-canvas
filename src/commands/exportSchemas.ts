import { z } from 'zod'
import { exportBrandSchema, exportThemeSchema } from '../exportEnums.js'
import type { CommandOptionMeta } from '../util/defineCommand.js'

export { exportBrandSchema, exportThemeSchema }

/** Flags for zod-opts (no unions — parser rejects mixed option types). */
export const sharedCliExportOptionsSchema = z.object({
  out: z.string().default('out').describe('output directory relative to canvas'),
  title: z.string().optional().describe('HTML document title'),
  theme: exportThemeSchema.describe('light or dark'),
  brand: exportBrandSchema.describe('cursor or grok (host theme brand)'),
  viewportWidth: z.coerce.number().default(1280).describe('Playwright viewport width'),
  minHeight: z
    .string()
    .optional()
    .describe('minimum page height: px, width ratio (<= 10), a4, or max'),
  renderOptions: z
    .string()
    .optional()
    .describe('Playwright options JSON (launch / page / screenshot / pdf)'),
  selectors: z
    .array(z.string())
    .optional()
    .describe('export matched nodes only (repeatable)'),
})

export const sharedExportOptionMeta: Record<keyof z.infer<typeof sharedCliExportOptionsSchema>, CommandOptionMeta> = {
  out: { alias: 'o' },
  title: {},
  theme: { alias: 't', argumentName: 'mode' },
  brand: { argumentName: 'name' },
  viewportWidth: { alias: 'w', argumentName: 'px' },
  minHeight: {},
  renderOptions: {},
  selectors: {},
}

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
  minHeight: z.preprocess(normalizeMinHeight, z.union([z.string(), z.number()]).optional()),
  selectors: z.preprocess(normalizeSelectors, z.array(z.string()).optional()),
} as const