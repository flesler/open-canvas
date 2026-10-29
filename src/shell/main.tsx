import { mountCanvas } from '@flesler/cursor-canvas-web/runtime'
import '@mantine/charts/styles.css'
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

mountCanvas(
	'root',
	<Box component="main" p={24} pb={32}>
		<Canvas />
	</Box>,
	{ defaultColorScheme: kind },
)
