import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import openCanvas from './index.js'
import { pathInPkg, shimVendorDir } from './paths.js'

const bundledSkill = pathInPkg('src', 'vendor', 'skill-bundle', 'SKILL.md')

describe('index', () => {
  it('loads the published entry', () => {
    expect(openCanvas.verify(pathInPkg('example', 'showcase.canvas.tsx'))).toMatch(/^canvas-sdk contract:/)
    expect(openCanvas.skill()).toBe(fs.readFileSync(bundledSkill, 'utf8'))
    expect(openCanvas.vendorPath()).toBe(path.resolve(shimVendorDir()))
  })
})