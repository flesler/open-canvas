import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { canvasStateSidecarPath, readCanvasStateSidecar } from './canvas-state-sidecar.js'
import { pathInPkg } from './paths.js'
import { seedCanvasState } from './render.js'
import { runGenerate } from './commands/generate.js'

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

describe('seedCanvasState', () => {
	let browser: Awaited<ReturnType<typeof chromium.launch>>

	beforeAll(async () => {
		browser = await chromium.launch()
	})

	afterAll(async () => {
		await browser?.close()
	})

	it('writes canvas:<key> before page scripts run', async () => {
		const page = await browser.newPage()
		const file = path.join(
			os.tmpdir(),
			`open-canvas-seed-${process.pid}.html`,
		)
		fs.writeFileSync(file, '<!doctype html><title>seed</title>')
		await seedCanvasState(page, { 'show.env': 'staging', live: false })
		await page.goto(`file://${file}`)
		const stored = await page.evaluate(() => ({
			env: localStorage.getItem('canvas:show.env'),
			live: localStorage.getItem('canvas:live'),
		}))
		expect(stored).toEqual({
			env: JSON.stringify('staging'),
			live: JSON.stringify(false),
		})
		await page.close()
	})
})

describe('generate hydrates useCanvasState', () => {
	it('renders the sidecar value instead of the hook default', async () => {
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
			selectors: '#root',
		})
		const html = fs.readFileSync(path.join(dir, 'out', 'label.html'), 'utf8')
		expect(html).toContain('>from-sidecar<')
		expect(html).not.toContain('>default-label<')
	})
})
