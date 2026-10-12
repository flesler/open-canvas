import fs from "node:fs"
import path from "node:path"
import { chromium } from "playwright"

const outDir = process.env.OPEN_CANVAS_OUT_DIR
const stem = process.env.OPEN_CANVAS_STEM
const theme = process.env.OPEN_CANVAS_THEME === "dark" ? "dark" : "light"

if (!outDir || !stem) {
  console.error("OPEN_CANVAS_OUT_DIR and OPEN_CANVAS_STEM must be set")
  process.exit(1)
}

const html = path.join(outDir, `${stem}.html`)
const jpg = path.join(outDir, `${stem}.jpg`)

if (!fs.existsSync(html)) {
  console.error("run vite build first")
  process.exit(1)
}

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  colorScheme: theme,
})
await page.goto(`file://${html}`, { waitUntil: "networkidle" })
await page.waitForSelector("#root", { timeout: 15_000 })
await page.screenshot({ path: jpg, fullPage: true, type: "jpeg", quality: 90, animations: "disabled" })
await browser.close()
