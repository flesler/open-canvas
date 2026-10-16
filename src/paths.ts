import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pkgRoot } from './pkg.js'

const require = createRequire(path.join(pkgRoot, 'package.json'))

export function pathInPkg(...segments: string[]): string {
	return path.join(pkgRoot, ...segments)
}

/** `@flesler/cursor-canvas-web` install dir (hoisting-safe). */
export function cursorCanvasDir(): string {
	const entry = require.resolve('@flesler/cursor-canvas-web')
	return path.resolve(path.dirname(entry), '..')
}

function shimPackageRoot(): string {
	return cursorCanvasDir()
}

function resolveShimCanvasSkillPath(packageRoot: string): string | undefined {
	for (const rel of ['src/vendor/canvas/SKILL.md', 'vendor/canvas/SKILL.md']) {
		const p = path.join(packageRoot, rel)
		if (fs.existsSync(p)) {
			return p
		}
	}
	const legacy = path.join(
		packageRoot,
		'skills',
		'open-canvas',
		'references',
		'canvas.md',
	)
	if (fs.existsSync(legacy)) {
		return legacy
	}
	return undefined
}

/** Vendored Cursor `/canvas` skill (`src/vendor/canvas/SKILL.md` in shim). */
export function shimCanvasReferencePath(): string {
	const fromPkg = resolveShimCanvasSkillPath(shimPackageRoot())
	if (fromPkg) {
		return fromPkg
	}
	const shimRoot =
		process.env.CURSOR_CANVAS_WEB_ROOT ?? path.join(pkgRoot, '..', 'cursor-canvas-web')
	const sibling = resolveShimCanvasSkillPath(shimRoot)
	if (sibling) {
		return sibling
	}
	throw new Error(
		'canvas skill missing — install @flesler/cursor-canvas-web (run sync:sdk in shim)',
	)
}

function resolveShimCanvasSdkDir(packageRoot: string): string | undefined {
	for (const rel of ['src/vendor/canvas-sdk', 'vendor/canvas-sdk']) {
		const dir = path.join(packageRoot, rel)
		if (fs.existsSync(path.join(dir, 'index.d.ts'))) {
			return dir
		}
	}
	return undefined
}

/** Canonical vendored `cursor/canvas` declarations (from the shim package). */
export function shimCanvasSdkDir(): string {
	const fromPkg = resolveShimCanvasSdkDir(shimPackageRoot())
	if (fromPkg) {
		return fromPkg
	}
	const shimRoot =
		process.env.CURSOR_CANVAS_WEB_ROOT ?? path.join(pkgRoot, '..', 'cursor-canvas-web')
	const sibling = resolveShimCanvasSdkDir(shimRoot)
	if (sibling) {
		return sibling
	}
	throw new Error(
		'canvas-sdk types missing — install @flesler/cursor-canvas-web (reinstall @flesler/open-canvas)',
	)
}

/** @deprecated alias */
export function canvasSdkTypesDir(): string {
	return shimCanvasSdkDir()
}

/** @deprecated */
export function shimCanvasSkillPath(): string {
	return shimCanvasReferencePath()
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
	const reactTypes = path.join(pkgRoot, 'node_modules', '@types', 'react')
	const sdk = shimCanvasSdkDir()
	return {
		baseUrl: pkgRoot,
		typeRoots: typeRootsUpward(pkgRoot),
		paths: {
			'cursor/canvas': [path.join(sdk, 'index.d.ts')],
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
		fsAllow: [
			pkgRoot,
			path.dirname(abs),
			path.dirname(path.dirname(abs)),
		],
	}
}
