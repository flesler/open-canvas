/** Host bridge; the Cursor IDE sets this. Export may set `state.theme.brand` when `--brand grok`. */
interface Window {
	__cursorCanvas?: {
		state?: {
			theme?: {
				kind?: 'light' | 'dark';
				brand?: 'cursor' | 'grok'
			}
		}
	}
}

declare module '*.jsonl' {
	const rows: unknown[]
	export default rows
}

declare module '*.csv' {
	const rows: Record<string, string>[]
	export default rows
}

declare module '*.tsv' {
	const rows: Record<string, string>[]
	export default rows
}

declare module '*.yaml' {
	const data: unknown
	export default data
}

declare module '*.yml' {
	const data: unknown
	export default data
}

/** Vite alias at build time → path from OPEN_CANVAS_CANVAS_PATH */
declare module '@open-canvas/user-canvas' {
	import type { ComponentType } from 'react'
	const Canvas: ComponentType
	export default Canvas
}
