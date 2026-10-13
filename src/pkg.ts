import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PackageJson } from 'type-fest'

/** Installed package root (npm link, global CLI, nested under a consumer project). */
export const pkgRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
)

export const packageJson = JSON.parse(
	fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'),
) as PackageJson

export const version = packageJson.version ?? '0.0.0'

export const description = packageJson.description ?? ''

/** CLI binary name from `package.json` `bin` (not the scoped npm `name`). */
export const cliName = (() => {
	const bin = packageJson.bin
	if (!bin) {
		return 'open-canvas'
	}
	if (typeof bin === 'string') {
		return path.basename(bin, path.extname(bin))
	}
	const keys = Object.keys(bin)
	return keys[0] ?? 'open-canvas'
})()
