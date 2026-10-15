import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { canvasStateSeedPreamble, canvasStateSidecarPath, readCanvasStateSidecar } from './canvas-state-sidecar.js'
import { runGenerate } from './commands/generate.js'
import { pathInPkg } from './paths.js'

describe('readCanvasStateSidecar', () => {
	it('returns undefined when the sidecar is missing', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-state-'))
		const canvas = path.join(dir, 'demo.canvas.tsx')
		expect(canvasStateSidecarPath(canvas)).toBe(
			path.join(dir, 'demo.canvas.data.json'),
		)
		expect(readCanvasStateSidecar(canvas)).toBeUndefined()
	})

	it('parses a flat object', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-state-'))
		const canvas = path.join(dir, 'demo.canvas.tsx')
		fs.writeFileSync(
			path.join(dir, 'demo.canvas.data.json'),
			'{ "durationS": "240", "live": false }\n',
		)
		expect(readCanvasStateSidecar(canvas)).toEqual({
			durationS: '240',
			live: false,
		})
	})

	it('throws on invalid JSON', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-state-'))
		const canvas = path.join(dir, 'demo.canvas.tsx')
		fs.writeFileSync(path.join(dir, 'demo.canvas.data.json'), '{')
		expect(() => readCanvasStateSidecar(canvas)).toThrow(
			/invalid canvas state sidecar/,
		)
	})

	it('throws when the root is not an object', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-state-'))
		const canvas = path.join(dir, 'demo.canvas.tsx')
		fs.writeFileSync(path.join(dir, 'demo.canvas.data.json'), '["nope"]')
		expect(() => readCanvasStateSidecar(canvas)).toThrow(
			/must be a JSON object/,
		)
	})
})

describe('canvasStateSeedPreamble', () => {
	it('returns empty when there is no state', () => {
		expect(canvasStateSeedPreamble({})).toBe('')
	})

	it('only seeds localStorage when a key is missing', () => {
		const code = canvasStateSeedPreamble({ label: 'from-sidecar' })
		expect(code).toContain('__canvasJsonState')
		expect(code).toContain('getItem(storageKey) === null')
		expect(code).toContain('"from-sidecar"')
	})
})

describe('generate inlines canvas state into html', () => {
	it('embeds sidecar values in the html bundle', async () => {
		if (!fs.existsSync(pathInPkg('dist', 'cli.js'))) {
			return
		}
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-gen-'))
		const canvas = path.join(dir, 'label.canvas.tsx')
		fs.writeFileSync(
			canvas,
			`import { Text, useCanvasState } from 'cursor/canvas'
export default function Label() {
	const [label] = useCanvasState('label', 'default-label')
	return <Text>{label}</Text>
}
`,
		)
		fs.writeFileSync(
			path.join(dir, 'label.canvas.data.json'),
			'{ "label": "from-sidecar" }\n',
		)
		await runGenerate({
			canvas,
			formats: ['html'],
			theme: 'light',
		})
		const html = fs.readFileSync(path.join(dir, 'out', 'label.html'), 'utf8')
		expect(html).toContain('from-sidecar')
	})
})
