#!/usr/bin/env bash
# Shim must resolve from the npm registry in package.json + package-lock.json (never file: /tmp tgz).
# When that shim version exists on npm, lock integrity must match the published tarball.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node <<'NODE'
const { execSync } = require('node:child_process');

const pkg = require('./package.json');
const lock = require('./package-lock.json');
const name = '@flesler/cursor-canvas-web';
const dep = pkg.dependencies?.[name];
if (!dep || typeof dep !== 'string') {
  console.error(`check-shim-lockfile: missing ${name} in package.json dependencies`);
  process.exit(1);
}
if (dep.startsWith('file:') || dep.startsWith('link:') || dep.includes('/tmp/')) {
  console.error(`check-shim-lockfile: package.json must use a registry range, not: ${dep}`);
  process.exit(1);
}
const rootDep = lock.packages?.['']?.dependencies?.[name];
if (!rootDep || rootDep.startsWith('file:') || rootDep.includes('/tmp/')) {
  console.error(`check-shim-lockfile: lockfile root dependency must be a registry range, not: ${rootDep ?? '(missing)'}`);
  process.exit(1);
}
const entry = lock.packages?.[`node_modules/${name}`];
if (!entry) {
  console.error(`check-shim-lockfile: missing lock entry node_modules/${name}`);
  process.exit(1);
}
const resolved = entry.resolved ?? '';
if (!resolved.startsWith('https://registry.npmjs.org/')) {
  console.error(`check-shim-lockfile: lockfile resolved must be registry.npmjs.org, not: ${resolved || '(missing)'}`);
  process.exit(1);
}
const lockIntegrity = entry.integrity ?? '';
const ver = entry.version;
if (!ver || !lockIntegrity) {
  console.error('check-shim-lockfile: lock entry missing version or integrity');
  process.exit(1);
}

let registryIntegrity = '';
try {
  registryIntegrity = execSync(`npm view ${name}@${ver} dist.integrity`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
} catch {
  console.warn(
    `check-shim-lockfile: ${name}@${ver} not on npm yet (skipping integrity check; npm ci will fail until publish)`,
  );
  process.exit(0);
}

if (registryIntegrity !== lockIntegrity) {
  console.error(`check-shim-lockfile: lock integrity does not match npm for ${name}@${ver}`);
  console.error(`  lock:     ${lockIntegrity}`);
  console.error(`  registry: ${registryIntegrity}`);
  console.error('  fix: npm update @flesler/cursor-canvas-web');
  process.exit(1);
}
NODE

echo "check-shim-lockfile OK"
