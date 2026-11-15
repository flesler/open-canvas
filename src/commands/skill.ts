import fs from 'node:fs'
import path from 'node:path'
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

export type SkillInstallResult = {
  skillPath: string;
  status: string;
  legacyWarnings: string[]
}

function legacyLayoutWarnings(targetDir: string): string[] {
  const warnings: string[] = []
  for (const name of ['assets', 'references']) {
    const legacy = path.join(targetDir, name)
    if (fs.existsSync(legacy)) {
      warnings.push(
        `Stale ${name}/ in skill dir (removed in open-canvas@${version}); delete it and use \`open-canvas vendor-path\`.`,
      )
    }
  }
  return warnings
}

export function runSkill(targetPath?: string): string | SkillInstallResult {
  if (!fs.existsSync(skillPath)) {
    throw new Error('SKILL.md not found in skill-bundle')
  }

  if (!targetPath) {
    return fs.readFileSync(skillPath, 'utf8')
  }

  const targetDir = path.resolve(expandHome(targetPath))
  fs.mkdirSync(targetDir, { recursive: true })
  const installed = path.join(targetDir, 'SKILL.md')
  fs.copyFileSync(skillPath, installed)

  return {
    skillPath: installed,
    status: `Installed -> ${installed} (open-canvas@${version}, cursor-canvas-web@${shimVersion()})`,
    legacyWarnings: legacyLayoutWarnings(targetDir),
  }
}