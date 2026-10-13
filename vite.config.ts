import dsv from "@rollup/plugin-dsv"
import react from "@vitejs/plugin-react"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, type Plugin } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

const pkgRoot = path.dirname(fileURLToPath(import.meta.url))
const stem = process.env.OPEN_CANVAS_STEM ?? "index"
const outDir = process.env.OPEN_CANVAS_OUT_DIR ?? path.join(pkgRoot, "example", "out")
const canvasPath = process.env.OPEN_CANVAS_CANVAS_PATH
const theme = process.env.OPEN_CANVAS_THEME === "dark" ? "dark" : "light"
const title = process.env.OPEN_CANVAS_TITLE ?? "Canvas"
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

function htmlTitle(): Plugin {
  return {
    name: "html-title",
    transformIndexHtml(html) {
      return html.replace("<title>Canvas</title>", `<title>${escapeHtml(title)}</title>`)
    },
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")
}

export default defineConfig({
  base: "./",
  plugins: [react(), dsv(), htmlTitle(), viteSingleFile(), flatHtmlArtifact()],
  define: {
    __OPEN_CANVAS_THEME__: JSON.stringify(theme),
  },
  resolve: {
    alias: {
      "cursor/canvas": "@thisismydesign/cursor-canvas-web",
      "@open-canvas/user-canvas": canvasPath,
    },
  },
  root: path.join(pkgRoot, "src", "shell"),
  build: {
    outDir: viteBuildDir,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
  },
})
