import fs from "node:fs"
import path from "node:path"
import { csvParse, tsvParse } from "d3-dsv"

export function loadDataFile(filePath: string): unknown {
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
