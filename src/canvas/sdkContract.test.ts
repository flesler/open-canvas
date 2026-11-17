import { describe, expect, it } from 'vitest'
import { formatCanvasSdkContractLine, readCanvasSdkManifest } from './sdkContract.js'

describe('sdkContract', () => {
  it('reads manifest from shim vendor', () => {
    const m = readCanvasSdkManifest()
    expect(m?.contentHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('formats contract line', () => {
    expect(formatCanvasSdkContractLine()).toMatch(/canvas-sdk contract:/)
  })
})
