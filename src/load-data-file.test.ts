import { describe, expect, it } from 'vitest'
import { parseDataContent, parseJsonl } from './load-data-file.js'

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
