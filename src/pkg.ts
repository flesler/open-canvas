import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Installed package root (npm link, global CLI, nested under a consumer project). */
export const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const require = createRequire(path.join(pkgRoot, 'package.json'))

export function pathInPkg(...segments: string[]): string {
	return path.join(pkgRoot, ...segments)
}

export function viteCliPath(): string {
	const vitePkg = require.resolve('vite/package.json')
	return path.join(path.dirname(vitePkg), 'bin', 'vite.js')
}

/** `@thisismydesign/cursor-canvas-web` install dir (hoisting-safe). */
function cursorCanvasDir(): string {
	const entry = require.resolve('@thisismydesign/cursor-canvas-web')
	return path.resolve(path.dirname(entry), '..')
}

function typeRootsUpward(start: string): string[] {
	const roots: string[] = []
	let dir = start
	for (let depth = 0; depth < 6; depth++) {
		roots.push(path.join(dir, 'node_modules', '@types'))
		const parent = path.dirname(dir)
		if (parent === dir) {
			break
		}
		dir = parent
	}
	return roots
}

/** TypeScript `paths` / `typeRoots` for verify (canvas file may be anywhere). */
export function verifyTypeScriptPaths(): {
	baseUrl: string;
	typeRoots: string[];
	paths: Record<string, string[]>
} {
	return {
		baseUrl: pkgRoot,
		typeRoots: typeRootsUpward(pkgRoot),
		paths: { 'cursor/canvas': [cursorCanvasDir()] },
	}
}

/** Vite resolve when the canvas file is outside `src/shell`. */
export function viteResolveForCanvas(canvasPath: string) {
	const abs = path.resolve(canvasPath)
	const cc = cursorCanvasDir()
	return {
		modules: [path.join(pkgRoot, 'node_modules'), 'node_modules'],
		alias: {
			'react/jsx-runtime': require.resolve('react/jsx-runtime'),
			'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
			'cursor/canvas': path.join(cc, 'dist', 'cursor-canvas.js'),
			'@opencanvas/user-canvas': abs,
		},
		fsAllow: [pkgRoot, path.dirname(abs)],
	}
}
