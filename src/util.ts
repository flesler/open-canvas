import { csvParse, tsvParse } from 'd3-dsv'
import fs from 'node:fs'
import path from 'node:path'
import { Project } from 'ts-morph'
import { parse as parseYaml } from 'yaml'

/** Relative data imports beside a canvas (json handled by Vite natively). */
export const DATA_FILE_EXT = /\.(jsonl|json|csv|tsv|ya?ml)$/i

const VITE_DATA_EXT = /\.(jsonl|csv|tsv|ya?ml)$/i

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
	if (!VITE_DATA_EXT.test(file)) {
		return undefined
	}
	const ext = path.extname(file).toLowerCase()
	const data = parseDataContent(ext, raw)
	return { code: `export default ${JSON.stringify(data)}` }
}

export function canvasStem(canvasPath: string): string {
	const base = path.basename(canvasPath)
	if (!base.endsWith('.canvas.tsx')) {
		throw new Error(`canvas must end with .canvas.tsx (got ${base})`)
	}
	return base.slice(0, -'.canvas.tsx'.length)
}

export function titleCaseFromStem(stem: string): string {
	return stem
		.split('-')
		.filter(Boolean)
		.map(w => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ')
}

export type OutputFormat = 'html' | 'png' | 'pdf' | 'jpg' | 'cursor'

export function parseFormats(raw: string): OutputFormat[] {
	const allowed = new Set<OutputFormat>(['html', 'png', 'pdf', 'jpg', 'cursor'])
	const list = raw.split(',').map(s => s.trim().toLowerCase())
	for (const f of list) {
		if (!allowed.has(f as OutputFormat)) {
			throw new Error(`unknown format: ${f}`)
		}
	}
	return list as OutputFormat[]
}

export function emitCursorCanvas(canvasPath: string, outPath: string): void {
	const absCanvas = path.resolve(canvasPath)
	const canvasDir = path.dirname(absCanvas)
	const project = new Project({
		skipAddingFilesFromTsConfig: true,
		compilerOptions: { allowJs: false },
	})
	const source = project.addSourceFileAtPath(absCanvas)
	const inlines: string[] = []
	const cursorImports: string[] = []

	for (const imp of [...source.getImportDeclarations()]) {
		const spec = imp.getModuleSpecifierValue()
		if (spec === 'cursor/canvas') {
			cursorImports.push(imp.getText().trimEnd())
			imp.remove()
			continue
		}
		if (!spec.startsWith('.')) {
			throw new Error(`cursor emit: only relative data imports allowed (got ${spec})`)
		}
		const resolved = path.resolve(canvasDir, spec)
		if (!DATA_FILE_EXT.test(resolved)) {
			throw new Error(`cursor emit: not a data file import: ${spec}`)
		}
		const binding = imp.getDefaultImport()
		if (!binding) {
			throw new Error(`cursor emit: use default import for data: ${spec}`)
		}
		const name = binding.getText()
		const value = loadDataFile(resolved)
		inlines.push(`const ${name} = ${JSON.stringify(value)}`)
		imp.remove()
	}

	const body = source.getFullText().trim()
	const out = formatCursorCanvasEmit({ cursorImports, inlines, body })
	fs.mkdirSync(path.dirname(outPath), { recursive: true })
	fs.writeFileSync(outPath, out)
}

export function formatCursorCanvasEmit(parts: {
	cursorImports: string[];
	inlines: string[];
	body: string
}): string {
	let out = ''
	if (parts.cursorImports.length > 0) {
		out += `${parts.cursorImports.join('\n')}\n\n`
	}
	if (parts.inlines.length > 0) {
		out += `${parts.inlines.join('\n')}\n`
	}
	out += `${parts.body}\n`
	return out
}
