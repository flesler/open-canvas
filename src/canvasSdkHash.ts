import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export function hashCanvasSdkTree(root: string): string {
  const abs = path.resolve(root)
  if (!fs.existsSync(abs)) {
    throw new Error(`hashCanvasSdkTree: missing directory ${abs}`)
  }

  const files: string[] = []
  collectDts(abs, abs, files)
  files.sort()

  const h = createHash('sha256')
  for (const rel of files) {
    h.update(rel)
    h.update('\0')
    h.update(fs.readFileSync(path.join(abs, rel)))
    h.update('\0')
  }
  return h.digest('hex')
}

function collectDts(dir: string, base: string, out: string[]): void {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) {
      collectDts(p, base, out)
    } else if (name.endsWith('.d.ts')) {
      out.push(path.relative(base, p))
    }
  }
}