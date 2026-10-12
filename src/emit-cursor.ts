import fs from "node:fs"
import path from "node:path"
import { Project } from "ts-morph"
import { loadDataFile } from "./load-data-file.js"

const DATA_EXT = /\.(json|csv|tsv)$/i

export function emitCursorCanvas(canvasPath: string, outPath: string): void {
  const absCanvas = path.resolve(canvasPath)
  const canvasDir = path.dirname(absCanvas)
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: false },
  })
  const source = project.addSourceFileAtPath(absCanvas)
  const inlines: string[] = []

  for (const imp of [...source.getImportDeclarations()]) {
    const spec = imp.getModuleSpecifierValue()
    if (spec === "cursor/canvas") {
      continue
    }
    if (!spec.startsWith(".")) {
      throw new Error(`cursor emit: only relative data imports allowed (got ${spec})`)
    }
    const resolved = path.resolve(canvasDir, spec)
    if (!DATA_EXT.test(resolved)) {
      throw new Error(`cursor emit: not a data file import: ${spec}`)
    }
    const binding = imp.getDefaultImport()
    if (!binding) {
      throw new Error(`cursor emit: use default import for data: ${spec}`)
    }
    const name = binding.getText()
    const value = loadDataFile(resolved)
    inlines.push(`const ${name} = ${JSON.stringify(value, null, 2)}`)
    imp.remove()
  }

  const rest = source.getFullText().trim()
  const out = inlines.length > 0 ? `${inlines.join("\n\n")}\n\n${rest}\n` : `${rest}\n`
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, out)
}
