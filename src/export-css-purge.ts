import fs from 'node:fs'
import postcss from 'postcss'
import { PurgeCSS, type UserDefinedSafelist } from 'purgecss'

/**
 * Purge unused rules from inline `<style>` blocks in a single-file export HTML.
 * Content scan includes the HTML and inlined JS (Mantine emits many classes from JS).
 */
export async function purgeExportHtmlStyles(htmlPath: string): Promise<{
  before: number;
  after: number
}> {
  const html = fs.readFileSync(htmlPath, 'utf8')
  const script = extractScriptBodies(html)
  const content = [
    { raw: html, extension: 'html' as const },
    { raw: script, extension: 'js' as const },
  ]

  const styleRe = /<style([^>]*)>([\s\S]*?)<\/style>/gi
  let before = 0
  let after = 0
  let out = html
  const blocks: { full: string; attrs: string; css: string }[] = []
  for (const m of html.matchAll(styleRe)) {
    blocks.push({
      full: m[0],
      attrs: m[1] ?? '',
      css: m[2] ?? '',
    })
    before += (m[2] ?? '').length
  }

  const purger = new PurgeCSS()
  for (const block of blocks) {
    const css = await purgeCssBlock(purger, block.css, content)
    after += css.length
    out = out.replace(block.full, `<style${block.attrs}>${css}</style>`)
  }

  fs.writeFileSync(htmlPath, out, 'utf8')
  return { before, after }
}

/** Skip purge when debugging CSS regressions. Purge is on by default. */
export function exportCssPurgeEnabled(): boolean {
  const v = process.env.OPEN_CANVAS_PURGE_CSS
  if (v === '0' || v === 'false') {
    return false
  }
  return true
}

function extractScriptBodies(html: string): string {
  const chunks: string[] = []
  for (const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
    chunks.push(m[1] ?? '')
  }
  return chunks.join('\n')
}

async function purgeCssBlock(
  purger: PurgeCSS,
  css: string,
  content: { raw: string; extension: 'html' | 'js' }[],
): Promise<string> {
  try {
    const [result] = await purger.purge({
      content,
      css: [{ raw: css }],
      safelist: CSS_SAFELIST,
      variables: false,
      keyframes: true,
      fontFace: true,
      dynamicAttributes: ['data-mantine-color-scheme'],
    })
    const next = result?.css ?? css
    if (!isValidCss(next)) {
      return css
    }
    return next
  } catch {
    return css
  }
}

function isValidCss(css: string): boolean {
  try {
    postcss.parse(css)
    return true
  } catch {
    return false
  }
}

const CSS_SAFELIST: UserDefinedSafelist = {
  standard: [/^recharts-/],
}
