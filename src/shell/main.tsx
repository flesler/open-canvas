import { mountCanvas } from '@flesler/cursor-canvas-web/runtime'
import { Box } from '@mantine/core'
import '@mantine/core/styles.css'
import Canvas from '@open-canvas/user-canvas'

declare const __THEME__: 'light' | 'dark'
declare const __BRAND__: 'cursor' | 'grok'

const kind = __THEME__
const brand = __BRAND__

if (typeof window !== 'undefined') {
  window.__cursorCanvas = {
    state: {
      theme: { kind, brand },
    },
  }
}

// Published Cursor canvas template: body padding 24px 32px; canvas authors tweak in-content.
mountCanvas(
  'root',
  <Box component="main" py={24} px={32}>
    <Canvas />
  </Box>,
  { defaultColorScheme: kind },
)
