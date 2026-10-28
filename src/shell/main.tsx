/// <reference types="node" />
import { mountCanvas } from '@flesler/cursor-canvas-web/runtime'
import '@mantine/charts/styles.css'
import { Box } from '@mantine/core'
import '@mantine/core/styles.css'
import Canvas from '@open-canvas/user-canvas'

/** Vite inlines from `generate --theme` / `--brand` (shell bootstrap only). */
const colorScheme = (process.env.OPEN_CANVAS_THEME ?? 'light') as 'light' | 'dark'
const brand = (process.env.OPEN_CANVAS_BRAND ?? 'cursor') as 'cursor' | 'grok'

if (typeof window !== 'undefined' && brand !== 'cursor') {
	window.__cursorCanvas = {
		state: {
			theme: { brand },
		},
	}
}

mountCanvas(
	'root',
	<Box component="main" p={24} pb={32}>
		<Canvas />
	</Box>,
	{ defaultColorScheme: colorScheme },
)
