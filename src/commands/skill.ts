import fs from 'node:fs'
import path from 'node:path'
import { copyCanvasReferenceMarkdown, copyCanvasSdkTree, formatCanvasSdkContractLine } from '../canvas-sdk-contract.js'
import { cursorCanvasDir, pathInPkg, shimCanvasReferencePath, shimCanvasSdkDir } from '../paths.js'
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

function installSkillBundle(targetDir: string): void {
	if (!fs.existsSync(skillPath)) {
		console.error('SKILL.md not found in skill-bundle')
		process.exit(1)
	}
	fs.mkdirSync(targetDir, { recursive: true })
	fs.copyFileSync(skillPath, path.join(targetDir, 'SKILL.md'))

	copyCanvasReferenceMarkdown(
		shimCanvasReferencePath(),
		path.join(targetDir, 'references', 'canvas.md'),
	)

	copyCanvasSdkTree(shimCanvasSdkDir(), path.join(targetDir, 'assets', 'sdk'))
}

export function runSkill(targetPath?: string): void {
	if (!targetPath) {
		if (!fs.existsSync(skillPath)) {
			console.error('SKILL.md not found in skill-bundle')
			process.exit(1)
		}
		process.stdout.write(fs.readFileSync(skillPath, 'utf8'))
		return
	}

	const targetDir = path.resolve(expandHome(targetPath))
	installSkillBundle(targetDir)

	console.error(`Installed -> ${targetDir} (open-canvas@${version}, cursor-canvas-web@${shimVersion()})`)
	console.error(formatCanvasSdkContractLine())
}
