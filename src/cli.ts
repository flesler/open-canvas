import { runExport, type ExportOptions } from "./export.js"
import { runSkill } from "./skill.js"

function usage(): void {
  console.error(`Usage:
  open-canvas [--canvas <path.canvas.tsx>] [export flags…]
  open-canvas export --canvas <path.canvas.tsx> [flags…]
  open-canvas skill [path]   print SKILL.md or write to path/SKILL.md

Export flags:
  --canvas <path>   required (*.canvas.tsx)
  --out <dir>       default: ./out next to canvas file
  --title <text>    default: title case of canvas stem
  --theme light|dark   default: light
  --formats <list>  default: html,png,pdf  (html,png,pdf,jpg,cursor)
`)
}

function parseExportArgs(argv: string[]): ExportOptions {
  const opts: ExportOptions = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = argv[i + 1]
    if (a === "--canvas" && next) {
      opts.canvas = next
      i++
    } else if (a === "--out" && next) {
      opts.out = next
      i++
    } else if (a === "--title" && next) {
      opts.title = next
      i++
    } else if (a === "--theme" && next) {
      opts.theme = next as "light" | "dark"
      i++
    } else if (a === "--formats" && next) {
      opts.formats = next
      i++
    } else if (a === "--help" || a === "-h") {
      usage()
      process.exit(0)
    } else {
      throw new Error(`unknown argument: ${a}`)
    }
  }
  if (!opts.canvas) {
    usage()
    throw new Error("--canvas is required")
  }
  return opts
}

function main(): void {
  const argv = process.argv.slice(2)
  if (argv[0] === "skill") {
    argv.shift()
    runSkill(argv[0])
    return
  }

  let cmd = "export"
  if (argv[0] === "export") {
    cmd = argv.shift()!
  }

  if (cmd !== "export") {
    throw new Error(`unknown command: ${cmd}`)
  }

  try {
    runExport(parseExportArgs(argv))
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  }
}

main()
