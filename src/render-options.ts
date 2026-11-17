import fs from 'node:fs'
import path from 'node:path'
import type { LaunchOptions, Page, PageScreenshotOptions } from 'playwright'

type PagePdfOptions = NonNullable<Parameters<Page['pdf']>[0]>

/** Pixels, or `max` to give every PDF page the tallest page's height. */
export type MinHeight = number | 'max'

export type RenderPageOptions = {
  viewport: { width: number; height: number };
  minHeight?: MinHeight;
  deviceScaleFactor?: number;
  colorScheme?: 'light' | 'dark' | 'no-preference'
}

export type RenderOptions = {
  launch?: LaunchOptions;
  page: RenderPageOptions;
  screenshot: Omit<PageScreenshotOptions, 'path'>;
  pdf: Omit<PagePdfOptions, 'path'>
}

export type RenderOptionsInput = {
  width?: number;
  minHeight?: string | number;
  renderOptions?: string;
  theme?: 'light' | 'dark'
}

export const BOOTSTRAP_VIEWPORT_HEIGHT = 1

const DEFAULTS: RenderOptions = {
  page: {
    viewport: { width: 1280, height: BOOTSTRAP_VIEWPORT_HEIGHT },
    deviceScaleFactor: 1,
  },
  screenshot: {
    fullPage: true,
    animations: 'disabled',
  },
  pdf: {
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  },
}

const MIN_HEIGHT_RATIO_ALIASES: Record<string, number> = { a4: 297 / 210 }
/** Values at or below this are width multipliers; above it they are pixels. */
const MAX_MIN_HEIGHT_RATIO = 10

export function parseMinHeight(raw: string | number, widthPx: number): MinHeight {
  const text = String(raw).trim().toLowerCase()
  if (text === 'max') {
    return 'max'
  }
  const value = MIN_HEIGHT_RATIO_ALIASES[text] ?? Number(text)
  if (!text || !Number.isFinite(value) || value <= 0) {
    throw new Error(`--min-height must be px, a width ratio, a4 or max (got ${JSON.stringify(raw)})`)
  }
  return value <= MAX_MIN_HEIGHT_RATIO ? Math.round(widthPx * value) : value
}

export function resolveRenderOptions(input: RenderOptionsInput): RenderOptions {
  let fileConfig: Partial<RenderOptions> = {}
  if (input.renderOptions) {
    fileConfig = loadRenderOptionsJson(input.renderOptions)
  }

  const jsonMinHeight =
    fileConfig.page?.minHeight
    ?? (fileConfig.page?.viewport?.height !== undefined
      && fileConfig.page.viewport.height > BOOTSTRAP_VIEWPORT_HEIGHT
      ? fileConfig.page.viewport.height
      : undefined)
  const minHeight = input.minHeight ?? jsonMinHeight
  const page: RenderPageOptions = {
    ...DEFAULTS.page,
    ...fileConfig.page,
    viewport: {
      width: input.width ?? fileConfig.page?.viewport?.width ?? DEFAULTS.page.viewport.width,
      height: BOOTSTRAP_VIEWPORT_HEIGHT,
    },
    deviceScaleFactor: fileConfig.page?.deviceScaleFactor ?? DEFAULTS.page.deviceScaleFactor,
    colorScheme: input.theme ?? fileConfig.page?.colorScheme ?? DEFAULTS.page.colorScheme,
  }
  if (minHeight !== undefined) {
    page.minHeight = parseMinHeight(minHeight, page.viewport.width)
  }

  return {
    launch: { ...fileConfig.launch },
    page,
    screenshot: { ...DEFAULTS.screenshot, ...fileConfig.screenshot },
    pdf: { ...DEFAULTS.pdf, ...fileConfig.pdf },
  }
}

function loadRenderOptionsJson(raw: string): Partial<RenderOptions> {
  const trimmed = raw.trim()
  const text = trimmed.startsWith('{')
    ? trimmed
    : fs.readFileSync(path.resolve(trimmed), 'utf8')
  const parsed = JSON.parse(text) as Partial<RenderOptions>
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('--render-options must be a JSON object or path to one')
  }
  return parsed
}
