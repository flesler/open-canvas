import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { pathInPkg } from '../paths.js'
import verifyCommand from './verify.js'

const exampleCanvas = pathInPkg('example', 'showcase.canvas.tsx')

describe('verify', () => {
  it('accepts the example canvas', () => {
    expect(verifyCommand.run(verifyCommand.input.parse({ canvas: exampleCanvas }))).toMatch(/^canvas-sdk contract:/)
  })

  it('rejects a syntax error', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-verify-'))
    const bad = path.join(dir, 'broken.canvas.tsx')
    fs.writeFileSync(
      bad,
      'import { Stack } from \'cursor/canvas\'\nexport default function Broken() { return <Stack> }\n',
    )
    expect(() => verifyCommand.run(verifyCommand.input.parse({ canvas: bad }))).toThrow(/verify failed/)
  })
})
