import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { emitCursorCanvas } from "./emit-cursor.js"
import { canvasStem, parseFormats, titleCaseFromStem } from "./util.js"

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export type ExportOptions = {
  canvas?: string
  out?: string
  title?: string
  theme?: "light" | "dark"
  formats?: string
}

export function runExport(opts: ExportOptions): void {
  if (!opts.canvas) {
    throw new Error("--canvas is required")
  }
  const canvasPath = path.resolve(opts.canvas)
  if (!fs.existsSync(canvasPath)) {
    throw new Error(`canvas not found: ${canvasPath}`)
  }

  const stem = canvasStem(canvasPath)
  const canvasDir = path.dirname(canvasPath)
  const outDir = path.resolve(canvasDir, opts.out ?? "out")
  const title = opts.title ?? titleCaseFromStem(stem)
  const theme = opts.theme ?? "light"
  if (theme !== "light" && theme !== "dark") {
    throw new Error(`--theme must be light or dark (got ${theme})`)
  }

  const formats = parseFormats(opts.formats ?? "html,png,pdf")
  const needsHtml = formats.some((f) => f === "html" || f === "png" || f === "pdf" || f === "jpg")
  const needsPng = formats.some((f) => f === "png" || f === "pdf" || f === "jpg")

  fs.mkdirSync(outDir, { recursive: true })

  const hostDir = path.join(pkgRoot, "host")
  const entryPath = path.join(hostDir, "entry.tsx")

  const entry = `import "@mantine/charts/styles.css"
import "@mantine/core/styles.css"
import { Box } from "@mantine/core"
import { mountCanvas } from "@thisismydesign/cursor-canvas-web/runtime"
import Canvas from "@open-canvas/user-canvas"

mountCanvas(
  "root",
  <Box component="main" p={24} pb={32} mih="100vh">
    <Canvas />
  </Box>,
  { defaultColorScheme: "${theme}" },
)
`
  fs.writeFileSync(entryPath, entry)

  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      html,
      body {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./entry.tsx"></script>
  </body>
</html>
`
  fs.writeFileSync(path.join(hostDir, "index.html"), indexHtml)

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    OPEN_CANVAS_STEM: stem,
    OPEN_CANVAS_OUT_DIR: outDir,
    OPEN_CANVAS_THEME: theme,
    OPEN_CANVAS_CANVAS_PATH: canvasPath,
  }

  if (formats.includes("cursor")) {
    const cursorOut = path.join(outDir, `${stem}.canvas.tsx`)
    emitCursorCanvas(canvasPath, cursorOut)
    console.log(`→ ${cursorOut}`)
  }

  if (needsHtml) {
    const vite = spawnSync("npx", ["vite", "build", "--config", path.join(pkgRoot, "vite.config.ts")], {
      cwd: pkgRoot,
      stdio: "inherit",
      env,
    })
    if (vite.status !== 0) {
      process.exit(vite.status ?? 1)
    }
  }

  if (needsPng) {
    runScript("render-png.ts", env)
  }
  if (formats.includes("pdf")) {
    runScript("render-pdf.ts", env)
  }
  if (formats.includes("jpg")) {
    runScript("render-jpg.ts", env)
  }

  for (const f of formats) {
    if (f === "html") {
      console.log(`→ ${path.join(outDir, `${stem}.html`)}`)
    }
    if (f === "png") {
      console.log(`→ ${path.join(outDir, `${stem}.png`)}`)
    }
    if (f === "pdf") {
      console.log(`→ ${path.join(outDir, `${stem}.pdf`)}`)
    }
    if (f === "jpg") {
      console.log(`→ ${path.join(outDir, `${stem}.jpg`)}`)
    }
  }

}

function runScript(name: string, env: NodeJS.ProcessEnv): void {
  const script = path.join(pkgRoot, "scripts", name)
  const r = spawnSync("npx", ["tsx", script], { cwd: pkgRoot, stdio: "inherit", env })
  if (r.status !== 0) {
    process.exit(r.status ?? 1)
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")
}
