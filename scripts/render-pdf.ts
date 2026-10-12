import fs from "node:fs"
import path from "node:path"
import { PDFDocument } from "pdf-lib"

const outDir = process.env.OPEN_CANVAS_OUT_DIR
const stem = process.env.OPEN_CANVAS_STEM

if (!outDir || !stem) {
  console.error("OPEN_CANVAS_OUT_DIR and OPEN_CANVAS_STEM must be set")
  process.exit(1)
}

const png = path.join(outDir, `${stem}.png`)
const pdf = path.join(outDir, `${stem}.pdf`)

if (!fs.existsSync(png)) {
  console.error("run render-png first")
  process.exit(1)
}

const doc = await PDFDocument.create()
const image = await doc.embedPng(fs.readFileSync(png))
const page = doc.addPage([image.width, image.height])
page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
fs.writeFileSync(pdf, await doc.save())
