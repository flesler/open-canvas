import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import defineCommand from './defineCommand.js'
import { cliFlagName, remapParsedCliOptions } from './cliFlags.js'

describe('cliFlags', () => {
  it('maps schema fields to documented kebab flags', () => {
    expect(cliFlagName('viewportWidth')).toBe('width')
    expect(cliFlagName('inlineState')).toBe('inline-state')
    expect(cliFlagName('theme')).toBe('theme')
  })

  it('remaps parsed CLI keys to camelCase params', () => {
    const out = remapParsedCliOptions(
      { canvas: 'a.canvas.tsx', width: 1280, 'min-height': 'max' },
      { width: 'viewportWidth', 'min-height': 'minHeight' },
      new Set(['canvas']),
    )
    expect(out).toEqual({ canvas: 'a.canvas.tsx', viewportWidth: 1280, minHeight: 'max' })
  })

  it('parse uses kebab flags only', async () => {
    let seen: { viewportWidth: number; minHeight?: string } | undefined
    const command = defineCommand({
      name: 'test',
      options: z.object({
        viewportWidth: z.coerce.number(),
        minHeight: z.string().optional(),
      }),
      optionMeta: { viewportWidth: { alias: 'w' } },
      handler: (params) => {
        seen = { viewportWidth: params.viewportWidth, minHeight: params.minHeight }
      },
    })
    await command.cli(['--width', '900', '--min-height', '1.5'])
    expect(seen).toEqual({ viewportWidth: 900, minHeight: '1.5' })
  })
})