import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkPackageLock } from './check-package-lock.js'

function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

describe('checkPackageLock', () => {
  it('accepts allowed file:../cursor-canvas-web shim lock', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-lock-'))
    writeJson(path.join(dir, 'package.json'), {
      version: '1.0.0',
      dependencies: {
        '@flesler/cursor-canvas-web': 'file:../cursor-canvas-web',
      },
    })
    writeJson(path.join(dir, 'package-lock.json'), {
      packages: {
        '': {
          version: '1.0.0',
          dependencies: {
            '@flesler/cursor-canvas-web': 'file:../cursor-canvas-web',
          },
        },
        'node_modules/@flesler/cursor-canvas-web': {
          version: '1.5.0',
          resolved: '../cursor-canvas-web',
          integrity: 'sha512-local',
        },
      },
    })
    expect(() => checkPackageLock(dir)).not.toThrow()
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('fails when package.json and lock root versions differ', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-lock-'))
    writeJson(path.join(dir, 'package.json'), {
      version: '2.0.0',
      dependencies: {
        '@flesler/cursor-canvas-web': 'file:../cursor-canvas-web',
      },
    })
    writeJson(path.join(dir, 'package-lock.json'), {
      packages: {
        '': {
          version: '1.0.0',
          dependencies: {
            '@flesler/cursor-canvas-web': 'file:../cursor-canvas-web',
          },
        },
        'node_modules/@flesler/cursor-canvas-web': {
          version: '1.5.0',
          resolved: '../cursor-canvas-web',
        },
      },
    })
    expect(() => checkPackageLock(dir)).toThrow(/package.json version/)
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
