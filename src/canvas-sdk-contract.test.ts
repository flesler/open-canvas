import { describe, expect, it } from 'vitest'
import { formatCanvasSdkContractLine, hashCanvasSdkTree, readCanvasSdkManifest } from './canvas-sdk-contract.js'
import { canvasSdkTypesDir } from './paths.js'

describe('canvas-sdk contract', () => {
	it('reads manifest from shim vendor', () => {
		const m = readCanvasSdkManifest()
		expect(m?.contentHash).toMatch(/^[a-f0-9]{64}$/)
	})

	it('manifest contentHash matches vendored .d.ts tree', () => {
		const m = readCanvasSdkManifest()
		const dir = canvasSdkTypesDir()
		expect(m?.contentHash).toBe(hashCanvasSdkTree(dir))
	})

	it('formats contract line', () => {
		expect(formatCanvasSdkContractLine()).toMatch(/canvas-sdk contract:/)
	})
})
