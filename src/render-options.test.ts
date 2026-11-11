import { describe, expect, it } from 'vitest'
import { resolveRenderOptions } from './render-options.js'

describe('resolveRenderOptions', () => {
  it('defaults viewport', () => {
    const cfg = resolveRenderOptions({ theme: 'light' })
    expect(cfg.page.viewport).toEqual({ width: 1280, height: 1 })
    expect(cfg.page.minHeight).toBeUndefined()
    expect(cfg.page.deviceScaleFactor).toBe(1)
    expect(cfg.page.colorScheme).toBe('light')
    expect(cfg.screenshot.quality).toBeUndefined()
  })

  it('CLI width and min-height override', () => {
    const cfg = resolveRenderOptions({
      viewportWidth: 1920,
      minHeight: 1200,
      theme: 'dark',
    })
    expect(cfg.page.viewport).toEqual({ width: 1920, height: 1 })
    expect(cfg.page.minHeight).toBe(1200)
    expect(cfg.page.colorScheme).toBe('dark')
  })

  it('merges inline JSON over defaults', () => {
    const cfg = resolveRenderOptions({
      theme: 'light',
      renderOptions: '{"screenshot":{"fullPage":false},"pdf":{"format":"A4"}}',
    })
    expect(cfg.screenshot.fullPage).toBe(false)
    expect(cfg.pdf.format).toBe('A4')
  })
})
