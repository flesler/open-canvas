import { csvParse, tsvParse } from 'd3-dsv'
import fs from 'node:fs'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'

/** Relative data imports beside a canvas (json handled by Vite natively). */
export const DATA_FILE_EXT = /\.(jsonl|json|csv|tsv|ya?ml)$/i

const VITE_TRANSFORM_EXT = /\.(jsonl|csv|tsv|ya?ml)$/i

export function isDataFilePath(filePath: string): boolean {
	return DATA_FILE_EXT.test(filePath)
}

export function parseDataContent(ext: string, raw: string): unknown {
	switch (ext.toLowerCase()) {
		case '.jsonl':
			return parseJsonl(raw)
		case '.json':
			return JSON.parse(raw)
		case '.csv':
			return csvParse(raw)
		case '.tsv':
			return tsvParse(raw)
		case '.yaml':
		case '.yml':
			return parseYaml(raw)
		default:
			throw new Error(`unsupported data file extension: ${ext}`)
	}
}

export function loadDataFile(filePath: string): unknown {
	const ext = path.extname(filePath).toLowerCase()
	const raw = fs.readFileSync(filePath, 'utf8')
	return parseDataContent(ext, raw)
}

/** Vite transform for non-JSON data imports; JSON uses Vite's built-in handling. */
export function viteDataModule(filePath: string, raw: string): { code: string } | undefined {
	const file = filePath.split('?')[0] ?? filePath
	if (!VITE_TRANSFORM_EXT.test(file)) {
		return undefined
	}
	const ext = path.extname(file).toLowerCase()
	const data = parseDataContent(ext, raw)
	return { code: `export default ${JSON.stringify(data)}` }
}

export function parseJsonl(raw: string): unknown[] {
	const lines = raw.split(/\r?\n/).filter(line => line.trim() !== '')
	return lines.map((line, index) => {
		try {
			return JSON.parse(line) as unknown
		} catch {
			throw new Error(`invalid JSONL at line ${index + 1}`)
		}
	})
}
