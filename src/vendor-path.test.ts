import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { runVendorPath } from './commands/vendor-path.js'
import { shimVendorDir } from './paths.js'

describe('vendor-path', () => {
	it('shimVendorDir contains canvas reference and SDK', () => {
		const vendor = path.resolve(shimVendorDir())
		expect(fs.existsSync(path.join(vendor, 'canvas', 'SKILL.md'))).toBe(true)
		expect(fs.existsSync(path.join(vendor, 'canvas-sdk', 'index.d.ts'))).toBe(true)
	})

	it('prints vendor dir on stdout', () => {
		const stdout = captureStdout(() => {
			runVendorPath()
		})
		expect(stdout.trim()).toBe(path.resolve(shimVendorDir()))
	})
})

function captureStdout(fn: () => void): string {
	const chunks: string[] = []
	const write = process.stdout.write.bind(process.stdout)
	process.stdout.write = ((chunk: string | Uint8Array) => {
		chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'))
		return true
	}) as typeof process.stdout.write
	try {
		fn()
	} finally {
		process.stdout.write = write
	}
	return chunks.join('')
}
