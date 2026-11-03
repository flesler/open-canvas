#!/usr/bin/env -S node --experimental-strip-types
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const SHIM_PKG = '@flesler/cursor-canvas-web'
const ALLOWED_FILE_SHIM = 'file:../cursor-canvas-web'

type LockPackage = {
  version?: string;
  resolved?: string;
  integrity?: string;
  dependencies?: Record<string, string>
}

type LockFile = {
  packages?: Record<string, LockPackage | undefined>
}

/** Policy checks for `package.json` / `package-lock.json` (shim registry integrity when published). */
export function checkPackageLock(root: string = pkgRoot): void {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
  ) as { version?: string; dependencies?: Record<string, string> }
  const lock = JSON.parse(
    fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'),
  ) as LockFile
  const lockRoot = lock.packages?.[''] ?? {}

  if (lockRoot.version !== pkg.version) {
    fail(
      `package.json version ${pkg.version} vs lock ${lockRoot.version ?? '(missing)'}`,
    )
  }

  const dep = pkg.dependencies?.[SHIM_PKG]
  if (!dep || typeof dep !== 'string') {
    fail(`missing ${SHIM_PKG} in package.json dependencies`)
  }
  if (dep.startsWith('file:') || dep.startsWith('link:') || dep.includes('/tmp/')) {
    if (dep !== ALLOWED_FILE_SHIM) {
      fail(`package.json must use a registry range, not: ${dep}`)
    }
  }

  const rootDep = lockRoot.dependencies?.[SHIM_PKG]
  if (
    !rootDep ||
    (rootDep.startsWith('file:') && rootDep !== ALLOWED_FILE_SHIM) ||
    rootDep.includes('/tmp/')
  ) {
    fail(
      `lockfile root dependency must be a registry range, not: ${rootDep ?? '(missing)'}`,
    )
  }

  const entry = lock.packages?.[`node_modules/${SHIM_PKG}`]
  if (!entry) {
    fail(`missing lock entry node_modules/${SHIM_PKG}`)
  }

  const resolved = entry.resolved ?? ''
  if (dep === ALLOWED_FILE_SHIM || resolved.startsWith('../cursor-canvas-web')) {
    console.log('check-package-lock OK (local file:../cursor-canvas-web shim)')
    return
  }

  if (!resolved.startsWith('https://registry.npmjs.org/')) {
    fail(
      `lockfile resolved must be registry.npmjs.org, not: ${resolved || '(missing)'}`,
    )
  }

  const lockIntegrity = entry.integrity ?? ''
  const ver = entry.version
  if (!ver || !lockIntegrity) {
    fail('lock entry missing version or integrity')
  }

  const registryIntegrity = npmShimIntegrity(ver)
  if (registryIntegrity === undefined) {
    console.warn(
      `check-package-lock: ${SHIM_PKG}@${ver} not on npm yet (skipping integrity check; npm ci will fail until publish)`,
    )
    return
  }

  if (registryIntegrity !== lockIntegrity) {
    console.error(
      `check-package-lock: lock integrity does not match npm for ${SHIM_PKG}@${ver}`,
    )
    console.error(`  lock:     ${lockIntegrity}`)
    console.error(`  registry: ${registryIntegrity}`)
    console.error('  fix: npm update @flesler/cursor-canvas-web')
    throw new Error('check-package-lock: lock integrity mismatch')
  }

  console.log('check-package-lock OK')
}

function fail(message: string): never {
  throw new Error(`check-package-lock: ${message}`)
}

function npmShimIntegrity(version: string): string | undefined {
  try {
    return execSync(`npm view ${SHIM_PKG}@${version} dist.integrity`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return undefined
  }
}

function isDirectRun(): boolean {
  const entry = process.argv[1]
  if (!entry) {
    return false
  }
  return path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url))
}

if (isDirectRun()) {
  try {
    checkPackageLock()
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  }
}
