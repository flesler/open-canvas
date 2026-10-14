import '@mantine/charts/styles.css'
import { Box } from '@mantine/core'
import '@mantine/core/styles.css'
import Canvas from '@open-canvas/user-canvas'
import { mountCanvas } from '@flesler/cursor-canvas-web/runtime'

const theme = __OPEN_CANVAS_THEME__ as 'light' | 'dark'
const brand = __OPEN_CANVAS_BRAND__ as 'cursor' | 'grok'

if (typeof window !== 'undefined') {
	window.__cursorCanvas = {
		state: {
			theme: { kind: theme, brand },
		},
	}
}

mountCanvas(
	'root',
	<Box component="main" p={24} pb={32} mih="100vh">
		<Canvas />
	</Box>,
	{ defaultColorScheme: theme },
)
