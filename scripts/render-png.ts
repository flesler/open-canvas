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
const png = path.join(outDir, `${stem}.png`)

if (!fs.existsSync(html)) {
  console.error("run vite build first")
  process.exit(1)
}

const errors: string[] = []
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  colorScheme: theme,
})
page.on("pageerror", (e) => errors.push(e.message))
await page.goto(`file://${html}`, { waitUntil: "networkidle" })
await page.waitForSelector("#root", { timeout: 15_000 })
if (errors.length) {
  await browser.close()
  console.error(errors.join("\n"))
  process.exit(1)
}
await page.screenshot({ path: png, fullPage: true, animations: "disabled" })
await browser.close()
