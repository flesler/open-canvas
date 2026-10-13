import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const ambientTypes = path.join(pkgRoot, 'src', 'types', 'ambient.d.ts')
const tsconfigPath = path.join(pkgRoot, 'tsconfig.json')

export function runVerify(canvasPath: string): void {
	const abs = path.resolve(canvasPath)
	if (!fs.existsSync(abs)) {
		throw new Error(`canvas not found: ${abs}`)
	}
	if (!abs.endsWith('.canvas.tsx')) {
		throw new Error('--canvas must end with .canvas.tsx')
	}
	if (!fs.existsSync(ambientTypes)) {
		throw new Error('package types missing (src/types/ambient.d.ts)')
	}

	const read = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
	if (read.error) {
		throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, '\n'))
	}
	const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, pkgRoot)
	const program = ts.createProgram([ambientTypes, abs], { ...parsed.options, noEmit: true })
	const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => d.category === ts.DiagnosticCategory.Error)

	if (diagnostics.length === 0) {
		return
	}

	for (const d of diagnostics) {
		const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n')
		if (d.file && d.start !== undefined) {
			const { line, character } = d.file.getLineAndCharacterOfPosition(d.start)
			const rel = path.relative(process.cwd(), d.file.fileName)
			console.error(`${rel}:${line + 1}:${character + 1} - ${msg}`)
		} else {
			console.error(msg)
		}
	}
	throw new Error(`verify failed (${diagnostics.length} error${diagnostics.length === 1 ? '' : 's'})`)
}
