import fs from 'node:fs'
import path from 'node:path'
import { canvasStem } from './util.js'

/** Flat object written by the IDE beside `<stem>.canvas.tsx`. */
export type CanvasStateSidecar = Record<string, unknown>

export function canvasStateSidecarPath(canvasPath: string): string {
	return path.join(
		path.dirname(canvasPath),
		`${canvasStem(canvasPath)}.canvas.data.json`,
	)
}

/** Missing file → undefined. Invalid JSON or a non-object root throws. */
export function readCanvasStateSidecar(
	canvasPath: string,
): CanvasStateSidecar | undefined {
	const file = canvasStateSidecarPath(canvasPath)
	if (!fs.existsSync(file)) {
		return undefined
	}
	let parsed: unknown
	try {
		parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
	} catch {
		throw new Error(`invalid canvas state sidecar: ${file}`)
	}
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error(`canvas state sidecar must be a JSON object: ${file}`)
	}
	return parsed as CanvasStateSidecar
}

/** Prepended to the canvas module (export + optional `cursor` emit with --inline-state). */
export function canvasStateSeedPreamble(state: CanvasStateSidecar): string {
	if (Object.keys(state).length === 0) {
		return ''
	}
	const json = JSON.stringify(state)
	return `const __canvasJsonState = ${json} as Record<string, unknown>
if (typeof localStorage !== 'undefined') {
	for (const [key, value] of Object.entries(__canvasJsonState)) {
		const storageKey = 'canvas:' + key
		if (localStorage.getItem(storageKey) === null) {
			localStorage.setItem(storageKey, JSON.stringify(value))
		}
	}
}

`
}
