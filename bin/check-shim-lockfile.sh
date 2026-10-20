#!/usr/bin/env bash
# Shim must resolve from the npm registry in package.json + package-lock.json (never file: /tmp tgz).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node <<'NODE'
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
const resolved = lock.packages?.[`node_modules/${name}`]?.resolved ?? '';
if (!resolved.startsWith('https://registry.npmjs.org/')) {
  console.error(`check-shim-lockfile: lockfile resolved must be registry.npmjs.org, not: ${resolved || '(missing)'}`);
  process.exit(1);
}
NODE

echo "check-shim-lockfile OK"
