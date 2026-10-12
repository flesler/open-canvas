/** Resolved at build time via vite.config.ts alias → user's *.canvas.tsx */
declare module "@open-canvas/user-canvas" {
  import type { ComponentType } from "react"
  const Canvas: ComponentType
  export default Canvas
}
