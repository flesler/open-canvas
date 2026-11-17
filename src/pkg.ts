import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PackageJson } from 'type-fest'

export const pkgRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const packageJson = JSON.parse(
  fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'),
) as PackageJson

export default packageJson