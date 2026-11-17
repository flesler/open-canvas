import { describe, expect, it } from 'vitest'
import { readCanvasSdkManifest } from './sdkContract.js'
import { hashCanvasSdkTree } from './sdkHash.js'
import { shimCanvasSdkDir } from '../util/paths.js'

describe('sdkHash', () => {
  it('manifest contentHash matches vendored .d.ts tree', () => {
    const m = readCanvasSdkManifest()
    const dir = shimCanvasSdkDir()
    expect(m?.contentHash).toBe(hashCanvasSdkTree(dir))
  })
})