import fs from 'node:fs'
import path from 'node:path'
import { shimVendorDir } from '../paths.js'

export function runVendorPath(): string {
  const dir = path.resolve(shimVendorDir())
  const reference = path.join(dir, 'canvas', 'SKILL.md')
  const sdkIndex = path.join(dir, 'canvas-sdk', 'index.d.ts')
  if (!fs.existsSync(reference) || !fs.existsSync(sdkIndex)) {
    throw new Error(`shim vendor missing under ${dir}`)
  }
  return dir
}