import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { pathInPkg } from '../pkg.js'
import { runVerify } from './verify.js'

const exampleCanvas = pathInPkg('example', 'showcase.canvas.tsx')

describe('runVerify', () => {
	it('accepts the example canvas', () => {
		expect(() => runVerify(exampleCanvas)).not.toThrow()
	})

	it('rejects a syntax error', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-verify-'))
		const bad = path.join(dir, 'broken.canvas.tsx')
		fs.writeFileSync(
			bad,
			'import { Stack } from \'cursor/canvas\'\nexport default function Broken() { return <Stack> }\n',
		)
		expect(() => runVerify(bad)).toThrow(/verify failed/)
	})
})
