import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { formatCanvasSdkContractLine } from '../canvas-sdk-contract.js'
import { pathInPkg, verifyTypeScriptPaths } from '../paths.js'

const ambientTypes = pathInPkg('src', 'types', 'ambient.d.ts')

export function runVerify(canvasPath: string): string {
  const abs = path.resolve(canvasPath)
  if (!fs.existsSync(abs)) {
    throw new Error(`canvas not found: ${abs}`)
  }
  if (!abs.endsWith('.canvas.tsx')) {
    throw new Error('canvas must end with .canvas.tsx')
  }
  if (!fs.existsSync(ambientTypes)) {
    throw new Error('package types missing (src/types/ambient.d.ts)')
  }

  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
    isolatedModules: true,
    resolveJsonModule: true,
    noEmit: true,
    ...verifyTypeScriptPaths(abs),
  }

  const program = ts.createProgram([ambientTypes, abs], options)
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(d => d.category === ts.DiagnosticCategory.Error)

  if (diagnostics.length === 0) {
    return formatCanvasSdkContractLine()
  }

  const lines = diagnostics.map((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n')
    if (d.file && d.start !== undefined) {
      const { line, character } = d.file.getLineAndCharacterOfPosition(d.start)
      const rel = path.relative(process.cwd(), d.file.fileName)
      return `${rel}:${line + 1}:${character + 1} - ${msg}`
    }
    return msg
  })
  throw new Error(
    `verify failed (${diagnostics.length} error${diagnostics.length === 1 ? '' : 's'})\n${lines.join('\n')}`,
  )
}