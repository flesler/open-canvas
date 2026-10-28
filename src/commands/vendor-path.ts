import fs from 'node:fs'
import path from 'node:path'
import { formatCanvasSdkContractLine } from '../canvas-sdk-contract.js'
import { shimVendorDir } from '../paths.js'

export function runVendorPath(): void {
	const dir = path.resolve(shimVendorDir())
	const reference = path.join(dir, 'canvas', 'SKILL.md')
	const sdkIndex = path.join(dir, 'canvas-sdk', 'index.d.ts')
	if (!fs.existsSync(reference) || !fs.existsSync(sdkIndex)) {
		throw new Error(`shim vendor missing under ${dir}`)
	}
	process.stdout.write(`${dir}\n`)
	console.error(formatCanvasSdkContractLine())
}
