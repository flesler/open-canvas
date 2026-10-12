import react from "@vitejs/plugin-react"
import dsv from "@rollup/plugin-dsv"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, type Plugin } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

const pkgRoot = path.dirname(fileURLToPath(import.meta.url))
const stem = process.env.OPEN_CANVAS_STEM ?? "review"
const outDir = process.env.OPEN_CANVAS_OUT_DIR ?? path.join(pkgRoot, "example", "out")
const canvasPath = process.env.OPEN_CANVAS_CANVAS_PATH
const viteBuildDir = path.join(outDir, "_build")
const htmlOut = path.join(outDir, `${stem}.html`)

if (!canvasPath) {
  throw new Error("OPEN_CANVAS_CANVAS_PATH is required for vite build")
}

function flatHtmlArtifact(): Plugin {
  return {
    name: "flat-html-artifact",
    closeBundle() {
      const index = path.join(viteBuildDir, "index.html")
      if (!fs.existsSync(index)) {
        return
      }
      fs.mkdirSync(outDir, { recursive: true })
      fs.renameSync(index, htmlOut)
      fs.rmSync(viteBuildDir, { recursive: true, force: true })
    },
  }
}

export default defineConfig({
  base: "./",
  plugins: [react(), dsv(), viteSingleFile(), flatHtmlArtifact()],
  resolve: {
    alias: {
      "cursor/canvas": "@thisismydesign/cursor-canvas-web",
      "@open-canvas/user-canvas": canvasPath,
    },
  },
  root: path.join(pkgRoot, "host"),
  build: {
    outDir: viteBuildDir,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
  },
})
