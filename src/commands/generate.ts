import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { renderJpg, renderPdf, renderPng } from "../render.js"
import { canvasStem, emitCursorCanvas, parseFormats, titleCaseFromStem } from "../util.js"

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

export type GenerateOptions = {
  canvas: string
  out?: string
  title?: string
  theme?: "light" | "dark"
  formats?: string
}

export async function runGenerate(opts: GenerateOptions): Promise<void> {
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

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    OPEN_CANVAS_STEM: stem,
    OPEN_CANVAS_OUT_DIR: outDir,
    OPEN_CANVAS_THEME: theme,
    OPEN_CANVAS_TITLE: title,
    OPEN_CANVAS_CANVAS_PATH: canvasPath,
  }

  const renderCtx = { outDir, stem, theme }

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
    await renderPng(renderCtx)
  }
  if (formats.includes("pdf")) {
    await renderPdf(renderCtx)
  }
  if (formats.includes("jpg")) {
    await renderJpg(renderCtx)
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
