import { describe, expect, it } from 'vitest'
import { canvasStem, parseFormats, titleCaseFromStem } from './util.js'

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
		expect(titleCaseFromStem('push-flow')).toBe('Push Flow')
	})
})
