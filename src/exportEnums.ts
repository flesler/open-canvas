import { z } from 'zod'

export enum ExportTheme {
  Light = 'light',
  Dark = 'dark',
}

export enum ExportBrand {
  Cursor = 'cursor',
  Grok = 'grok',
}

export enum OutputFormat {
  Html = 'html',
  Png = 'png',
  Pdf = 'pdf',
  Jpg = 'jpg',
  Cursor = 'cursor',
}

const exportThemeValues = [ExportTheme.Light, ExportTheme.Dark] as const
const exportBrandValues = [ExportBrand.Cursor, ExportBrand.Grok] as const
const outputFormatValues = [
  OutputFormat.Html,
  OutputFormat.Png,
  OutputFormat.Pdf,
  OutputFormat.Jpg,
  OutputFormat.Cursor,
] as const

export const exportThemeSchema = z.enum(exportThemeValues).default(ExportTheme.Light)
export const exportBrandSchema = z.enum(exportBrandValues).default(ExportBrand.Cursor)
export const outputFormatSchema = z.enum(outputFormatValues)
export const outputFormatListSchema = z.array(outputFormatSchema)

export const DEFAULT_OUTPUT_FORMATS = [
  OutputFormat.Html,
  OutputFormat.Png,
  OutputFormat.Pdf,
] as const

export const DEFAULT_FORMATS = DEFAULT_OUTPUT_FORMATS.join(',')

const allowedFormats = new Set<string>(outputFormatValues)

export function parseFormats(raw: string | string[]): OutputFormat[] {
  const list = (typeof raw === 'string' ? raw.split(',') : raw).map(s => s.trim().toLowerCase())
  for (const f of list) {
    if (!allowedFormats.has(f)) {
      throw new Error(`unknown format: ${f}`)
    }
  }
  return list as OutputFormat[]
}

export function normalizeFormatInput(raw: unknown): OutputFormat[] | undefined {
  if (raw === undefined) {
    return undefined
  }
  return parseFormats(raw as string | string[])
}