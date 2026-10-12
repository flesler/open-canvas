import path from "node:path"

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

export type ExportFormat = "html" | "png" | "pdf" | "jpg" | "cursor"

export function parseFormats(raw: string): ExportFormat[] {
  const allowed = new Set<ExportFormat>(["html", "png", "pdf", "jpg", "cursor"])
  const list = raw.split(",").map((s) => s.trim().toLowerCase())
  for (const f of list) {
    if (!allowed.has(f as ExportFormat)) {
      throw new Error(`unknown format: ${f}`)
    }
  }
  return list as ExportFormat[]
}
