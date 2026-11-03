import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { exportCssPurgeEnabled, purgeExportHtmlStyles } from './export-css-purge.js'

describe('exportCssPurgeEnabled', () => {
	it('defaults to on', () => {
		const prev = process.env.OPEN_CANVAS_PURGE_CSS
		delete process.env.OPEN_CANVAS_PURGE_CSS
		expect(exportCssPurgeEnabled()).toBe(true)
		process.env.OPEN_CANVAS_PURGE_CSS = prev
	})
})

describe('purgeExportHtmlStyles', () => {
	it('returns before/after byte counts for inline styles', async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-purge-'))
		const htmlPath = path.join(dir, 'index.html')
		fs.writeFileSync(
			htmlPath,
			'<!doctype html><html><head><style>.keep{color:red}</style></head><body><div class="keep"></div></body></html>',
		)
		const { before, after } = await purgeExportHtmlStyles(htmlPath)
		expect(before).toBeGreaterThan(0)
		expect(after).toBeGreaterThan(0)
		fs.rmSync(dir, { recursive: true, force: true })
	})
})
