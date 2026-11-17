import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { defineCommand } from '../defineCommand.js'
import { shimVendorDir } from '../paths.js'

const vendorPathInput = z.object({})

export default defineCommand({
  meta: {
    description: 'Print absolute path to shim src/vendor (canvas/SKILL.md, canvas-sdk/)',
  },
  input: vendorPathInput,
  run: executeVendorPath,
})

function executeVendorPath(_input: z.infer<typeof vendorPathInput>): string {
  const dir = path.resolve(shimVendorDir())
  const reference = path.join(dir, 'canvas', 'SKILL.md')
  const sdkIndex = path.join(dir, 'canvas-sdk', 'index.d.ts')
  if (!fs.existsSync(reference) || !fs.existsSync(sdkIndex)) {
    throw new Error(`shim vendor missing under ${dir}`)
  }
  return dir
}