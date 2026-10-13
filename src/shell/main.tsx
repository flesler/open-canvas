import "@mantine/charts/styles.css"
import { Box } from "@mantine/core"
import "@mantine/core/styles.css"
import Canvas from "@open-canvas/user-canvas"
import { mountCanvas } from "@thisismydesign/cursor-canvas-web/runtime"

const theme = __OPEN_CANVAS_THEME__ as "light" | "dark"

mountCanvas(
  "root",
  <Box component="main" p={24} pb={32} mih="100vh">
    <Canvas />
  </Box>,
  { defaultColorScheme: theme },
)
