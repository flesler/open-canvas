import path from 'node:path'

export function canvasStem(canvasPath: string): string {
  const base = path.basename(canvasPath)
  if (!base.endsWith('.canvas.tsx')) {
    throw new Error(`canvas must end with .canvas.tsx (got ${base})`)
  }
  return base.slice(0, -'.canvas.tsx'.length)
}