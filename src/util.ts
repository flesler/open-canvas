import { csvParse, tsvParse } from "d3-dsv"
import fs from "node:fs"
import path from "node:path"
import { Project } from "ts-morph"

export function canvasStem(canvasPath: string): string {
  const base = path.basename(canvasPath)
  if (!base.endsWith(".canvas.tsx")) {
    throw new Error(`--canvas must end with .canvas.tsx (got ${base})`)
  }
  return base.slice(0, -".canvas.tsx".length)
}

export function titleCaseFromStem(stem: string): string {
  return stem
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export type OutputFormat = "html" | "png" | "pdf" | "jpg" | "cursor"

export function parseFormats(raw: string): OutputFormat[] {
  const allowed = new Set<OutputFormat>(["html", "png", "pdf", "jpg", "cursor"])
  const list = raw.split(",").map((s) => s.trim().toLowerCase())
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

const DATA_EXT = /\.(json|csv|tsv)$/i

function loadDataFile(filePath: string): unknown {
  const ext = path.extname(filePath).toLowerCase()
  const raw = fs.readFileSync(filePath, "utf8")
  if (ext === ".json") {
    return JSON.parse(raw)
  }
  if (ext === ".csv") {
    return csvParse(raw)
  }
  if (ext === ".tsv") {
    return tsvParse(raw)
  }
  throw new Error(`unsupported data file: ${filePath}`)
}
