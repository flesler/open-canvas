import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { shimVendorDir } from '../util/paths.js'
import vendorPathCommand from './vendor-path.js'

describe('vendor-path', () => {
  it('returns vendor dir', () => {
    expect(vendorPathCommand.run(vendorPathCommand.input.parse({}))).toBe(path.resolve(shimVendorDir()))
  })
})