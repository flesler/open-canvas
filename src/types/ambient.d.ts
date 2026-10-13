declare const __OPEN_CANVAS_THEME__: "light" | "dark"

declare module "*.csv" {
  const rows: Record<string, string>[]
  export default rows
}

declare module "*.tsv" {
  const rows: Record<string, string>[]
  export default rows
}

/** Vite alias at build time → path from OPEN_CANVAS_CANVAS_PATH */
declare module "@open-canvas/user-canvas" {
  import type { ComponentType } from "react"
  const Canvas: ComponentType
  export default Canvas
}
