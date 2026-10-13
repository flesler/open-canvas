import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const skillPath = path.join(pkgRoot, 'src', 'md', 'SKILL.md')

export function runSkill(targetPath?: string): void {
	if (!fs.existsSync(skillPath)) {
		console.error('SKILL.md not found in package')
		process.exit(1)
	}
	const content = fs.readFileSync(skillPath, 'utf8')

	if (!targetPath) {
		process.stdout.write(content)
		return
	}

	let target = path.resolve(targetPath.replace(/^~/, process.env.HOME ?? ''))
	if (!path.extname(target)) {
		target = path.join(target, 'SKILL.md')
	}
	fs.mkdirSync(path.dirname(target), { recursive: true })
	fs.writeFileSync(target, content)
	console.error(`Installed skill to ${target}`)
}
