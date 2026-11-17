import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { defineCommand } from '../util/defineCommand.js'
import { cursorCanvasDir, pathInPkg } from '../util/paths.js'
import pkg from '../pkg.js'

const bundleRoot = pathInPkg('src', 'vendor', 'skill-bundle')
const skillPath = path.join(bundleRoot, 'SKILL.md')

export type SkillInstallResult = {
  skillPath: string;
  status: string
}

const skillInput = z.object({
  dir: z.string().optional().describe('install directory (SKILL.md + references/)').meta({ positional: true }),
})

export default defineCommand({
  meta: {
    description: 'Print or install agent SKILL.md',
  },
  input: skillInput,
  run: executeSkill,
})

function executeSkill(input: z.infer<typeof skillInput>): string | SkillInstallResult {
  const targetPath = input.dir
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
  const refsSrc = path.join(bundleRoot, 'references')
  if (fs.existsSync(refsSrc)) {
    const refsDst = path.join(targetDir, 'references')
    fs.mkdirSync(refsDst, { recursive: true })
    for (const name of fs.readdirSync(refsSrc)) {
      const src = path.join(refsSrc, name)
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, path.join(refsDst, name))
      }
    }
  }

  return {
    skillPath: installed,
    status: `Installed -> ${installed} (open-canvas@${pkg.version}, cursor-canvas-web@${shimVersion()})`,
  }
}

function expandHome(p: string): string {
  return p.replace(/^~(?=$|[\\/])/, process.env.HOME ?? '')
}

function shimVersion(): string {
  const shimPkg = path.join(cursorCanvasDir(), 'package.json')
  const json = JSON.parse(fs.readFileSync(shimPkg, 'utf8')) as { version?: string }
  return json.version ?? 'unknown'
}