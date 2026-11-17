import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { shimVendorDir } from './paths.js'

describe('paths', () => {
  it('shimVendorDir contains canvas reference and SDK', () => {
    const vendor = path.resolve(shimVendorDir())
    expect(fs.existsSync(path.join(vendor, 'canvas', 'SKILL.md'))).toBe(true)
    expect(fs.existsSync(path.join(vendor, 'canvas-sdk', 'index.d.ts'))).toBe(true)
  })
})