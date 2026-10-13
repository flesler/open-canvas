import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runVerify } from './commands/verify.js'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exampleCanvas = path.join(pkgRoot, 'example', 'build-plane.canvas.tsx')

describe('runVerify', () => {
	it('accepts the example canvas', () => {
		expect(() => runVerify(exampleCanvas)).not.toThrow()
	})

	it('rejects a syntax error', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencanvas-verify-'))
		const bad = path.join(dir, 'broken.canvas.tsx')
		fs.writeFileSync(
			bad,
			'import { Stack } from \'cursor/canvas\'\nexport default function Broken() { return <Stack> }\n',
		)
		expect(() => runVerify(bad)).toThrow(/verify failed/)
	})
})
