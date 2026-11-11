import { mountCanvas } from '@flesler/cursor-canvas-web/runtime'
import '@mantine/core/styles.css'
import Canvas from '@open-canvas/user-canvas'

declare const __THEME__: 'light' | 'dark'
declare const __BRAND__: 'cursor' | 'grok'

const kind = __THEME__
const brand = __BRAND__
const editorBackground = kind === 'dark' ? '#181818' : '#FCFCFC'

if (typeof window !== 'undefined') {
  window.__cursorCanvas = {
    state: {
      theme: { kind, brand, editorBackground },
    },
  }
}

mountCanvas('root', <Canvas />, { defaultColorScheme: kind })
