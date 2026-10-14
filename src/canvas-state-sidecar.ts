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
