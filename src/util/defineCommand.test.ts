import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import defineCommand from './defineCommand.js'

describe('defineCommand', () => {
  it('parses options and args via cli', async () => {
    let seen: { name: string; count: number } | undefined
    const command = defineCommand({
      name: 'test',
      options: z.object({ count: z.coerce.number().default(1) }),
      args: z.object({ name: z.string() }),
      optionMeta: { count: { alias: 'c' } },
      handler: (params) => {
        seen = { name: params.name, count: params.count }
      },
    })
    await command.cli(['alpha', '-c', '3'])
    expect(seen).toEqual({ name: 'alpha', count: 3 })
  })
})