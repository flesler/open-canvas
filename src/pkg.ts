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

/** `@flesler/cursor-canvas-web` install dir (hoisting-safe). */
function cursorCanvasDir(): string {
	const entry = require.resolve('@flesler/cursor-canvas-web')
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
export function verifyTypeScriptPaths(_canvasPath: string): {
	baseUrl: string;
	typeRoots: string[];
	paths: Record<string, string[]>
} {
	// Cursor canvases often ship minimal `canvases/node_modules/@types/react` stubs.
	// Pin full @types/react from this package so JSX matches `cursor/canvas` prop types.
	const reactTypes = path.join(pkgRoot, 'node_modules', '@types', 'react')
	return {
		baseUrl: pkgRoot,
		typeRoots: typeRootsUpward(pkgRoot),
		paths: {
			'cursor/canvas': [cursorCanvasDir()],
			react: [path.join(reactTypes, 'index.d.ts')],
			'react/jsx-runtime': [path.join(reactTypes, 'jsx-runtime.d.ts')],
		},
	}
}

/** Vite resolve when the canvas file is outside `src/shell`. */
export function viteResolveForCanvas(canvasPath: string) {
	const abs = path.resolve(canvasPath)
	const cc = cursorCanvasDir()
	const reactPkg = path.dirname(require.resolve('react/package.json'))
	const reactDomPkg = path.dirname(require.resolve('react-dom/package.json'))
	const mantineCoreStyles = require.resolve('@mantine/core/styles.css')
	const mantineChartsStyles = require.resolve('@mantine/charts/styles.css')
	const mantineRoot = (pkg: string) =>
		path.dirname(path.dirname(require.resolve(pkg)))
	return {
		modules: [path.join(pkgRoot, 'node_modules'), 'node_modules'],
		alias: {
			react: reactPkg,
			'react-dom': reactDomPkg,
			'react/jsx-runtime': path.join(reactPkg, 'jsx-runtime.js'),
			'react-dom/client': path.join(reactDomPkg, 'client.js'),
			'react/jsx-dev-runtime': path.join(reactPkg, 'jsx-dev-runtime.js'),
			'@mantine/core': mantineRoot('@mantine/core'),
			'@mantine/core/styles.css': mantineCoreStyles,
			'@mantine/hooks': mantineRoot('@mantine/hooks'),
			'@mantine/charts': mantineRoot('@mantine/charts'),
			'@mantine/charts/styles.css': mantineChartsStyles,
			'cursor/canvas': path.join(cc, 'dist', 'cursor-canvas.js'),
			'@flesler/cursor-canvas-web/runtime': path.join(
				cc,
				'dist',
				'runtime.js',
			),
			'@open-canvas/user-canvas': abs,
		},
		fsAllow: [pkgRoot, path.dirname(abs)],
	}
}
