#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const cli = path.join(pkgRoot, "dist", "cli.js")

const r = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: pkgRoot,
  stdio: "inherit",
  env: process.env,
})

process.exit(r.status ?? 1)
