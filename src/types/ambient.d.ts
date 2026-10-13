declare const __OPEN_CANVAS_THEME__: 'light' | 'dark'

declare module '*.json' {
	const data: any
	export default data
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
	const data: any
	export default data
}

declare module '*.yml' {
	const data: any
	export default data
}

/** Vite alias at build time → path from OPEN_CANVAS_CANVAS_PATH */
declare module '@open-canvas/user-canvas' {
	import type { ComponentType } from 'react'
	const Canvas: ComponentType
	export default Canvas
}
