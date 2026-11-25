import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathInPkg } from '../util/paths.js'

const pkgRoot = path.dirname(pathInPkg('package.json'))
const require = createRequire(pathInPkg('package.json'))
let chromiumReady = false

export function ensureChromium(): void {
  if (chromiumReady) {
    return
  }
  const { chromium } = require('playwright') as {
    chromium: { executablePath: () => string }
  }
  const exe = chromium.executablePath()
  if (fs.existsSync(exe)) {
    chromiumReady = true
    return
  }
  const playwrightPkg = require.resolve('playwright/package.json')
  const cli = path.join(path.dirname(playwrightPkg), 'cli.js')
  const install = spawnSync(process.execPath, [cli, 'install', 'chromium'], {
    cwd: pkgRoot,
    stdio: 'inherit',
    env: process.env,
  })
  if (install.status !== 0) {
    throw new Error(
      'playwright install chromium failed (required for png/pdf/jpg)',
    )
  }
  chromiumReady = true
}