import fs from 'node:fs'
import path from 'node:path'
import { formatCanvasSdkContractLine } from '../canvas-sdk-contract.js'
import { cursorCanvasDir, pathInPkg } from '../paths.js'
import { version } from '../pkg.js'

const bundleRoot = pathInPkg('src', 'vendor', 'skill-bundle')
const skillPath = path.join(bundleRoot, 'SKILL.md')

function expandHome(p: string): string {
	return p.replace(/^~(?=$|[\\/])/, process.env.HOME ?? '')
}

function shimVersion(): string {
	const shimPkg = path.join(cursorCanvasDir(), 'package.json')
	const json = JSON.parse(fs.readFileSync(shimPkg, 'utf8')) as { version?: string }
	return json.version ?? 'unknown'
}

function warnLegacyLayout(targetDir: string): void {
	for (const name of ['assets', 'references']) {
		const legacy = path.join(targetDir, name)
		if (fs.existsSync(legacy)) {
			console.error(
				`Stale ${name}/ in skill dir (removed in open-canvas@${version}); delete it and use \`open-canvas vendor-path\`.`,
			)
		}
	}
}

function installSkillMd(targetDir: string): void {
	if (!fs.existsSync(skillPath)) {
		console.error('SKILL.md not found in skill-bundle')
		process.exit(1)
	}
	fs.mkdirSync(targetDir, { recursive: true })
	fs.copyFileSync(skillPath, path.join(targetDir, 'SKILL.md'))
	warnLegacyLayout(targetDir)
}

export function runSkill(targetPath?: string): void {
	if (!targetPath) {
		if (!fs.existsSync(skillPath)) {
			console.error('SKILL.md not found in skill-bundle')
			process.exit(1)
		}
		process.stderr.write(
			'Install with `open-canvas skill <dir>` (writes SKILL.md only). Resolve vendor docs with `open-canvas vendor-path`.\n',
		)
		process.stdout.write(fs.readFileSync(skillPath, 'utf8'))
		return
	}

	const targetDir = path.resolve(expandHome(targetPath))
	installSkillMd(targetDir)

	console.error(`Installed -> ${targetDir}/SKILL.md (open-canvas@${version}, cursor-canvas-web@${shimVersion()})`)
	console.error(formatCanvasSdkContractLine())
}
