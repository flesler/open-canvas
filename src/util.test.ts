import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { canvasStem, emitCursorCanvas, formatCursorCanvasEmit, parseDataContent, parseFormats, parseJsonl, titleCaseFromStem } from './util.js'

describe('parseJsonl', () => {
	it('parses one object per line', () => {
		expect(parseJsonl('{"a":1}\n{"a":2}\n')).toEqual([{ a: 1 }, { a: 2 }])
	})

	it('skips blank lines', () => {
		expect(parseJsonl('\n{"x":true}\n\n')).toEqual([{ x: true }])
	})

	it('throws on bad line', () => {
		expect(() => parseJsonl('not json\n')).toThrow(/line 1/)
	})
})

describe('parseDataContent', () => {
	it('parses csv', () => {
		const rows = parseDataContent('.csv', 'a,b\n1,2\n') as Record<string, string>[]
		expect(rows[0].a).toBe('1')
	})
})

describe('canvasStem', () => {
	it('strips .canvas.tsx', () => {
		expect(canvasStem('/foo/my-report.canvas.tsx')).toBe('my-report')
	})

	it('rejects wrong extension', () => {
		expect(() => canvasStem('x.tsx')).toThrow()
	})
})

describe('parseFormats', () => {
	it('parses comma list', () => {
		expect(parseFormats('html,png,cursor')).toEqual(['html', 'png', 'cursor'])
	})

	it('rejects unknown', () => {
		expect(() => parseFormats('gif')).toThrow()
	})
})

describe('titleCaseFromStem', () => {
	it('hyphenated stem', () => {
		expect(titleCaseFromStem('build-plane')).toBe('Build Plane')
	})
})

describe('formatCursorCanvasEmit', () => {
	it('puts cursor import first with blank line before inlines', () => {
		expect(formatCursorCanvasEmit({
			cursorImports: ["import { Stack } from 'cursor/canvas'"],
			inlines: ['const data = {"n":1}'],
			body: 'export default function T() { return <Stack /> }',
		})).toBe(
			"import { Stack } from 'cursor/canvas'\n\nconst data = {\"n\":1}\nexport default function T() { return <Stack /> }\n",
		)
	})

	it('uses single newlines between inlines and before body', () => {
		expect(formatCursorCanvasEmit({
			cursorImports: [],
			inlines: ['const a = 1', 'const b = 2'],
			body: 'const c = 3',
		})).toBe('const a = 1\nconst b = 2\nconst c = 3\n')
	})
})

describe('emitCursorCanvas', () => {
	it('inlines json and places cursor import first', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-emit-'))
		fs.writeFileSync(path.join(dir, 'nums.json'), '{"n":1}')
		const canvas = path.join(dir, 'mini.canvas.tsx')
		fs.writeFileSync(
			canvas,
			'import { Stack } from \'cursor/canvas\'\nimport nums from \'./nums.json\'\n\nexport default function Mini() { return <Stack /> }\n',
		)
		const out = path.join(dir, 'mini-out.canvas.tsx')
		emitCursorCanvas(canvas, out)
		expect(fs.readFileSync(out, 'utf8')).toBe(
			"import { Stack } from 'cursor/canvas'\n\nconst nums = {\"n\":1}\nexport default function Mini() { return <Stack /> }\n",
		)
	})
})
