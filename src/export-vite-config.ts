import react from '@vitejs/plugin-react'
import path from 'node:path'
import type { Plugin, UserConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import type { CanvasStateSidecar } from './canvas-state-sidecar.js'
import { canvasStateSeedPreamble } from './canvas-state-sidecar.js'
import { pathInPkg, viteResolveForCanvas } from './paths.js'
import { viteDataModule } from './util.js'

export type ExportViteBuildInput = {
	canvasPath: string;
	outDir: string;
	theme: 'light' | 'dark';
	brand: 'cursor' | 'grok';
	title: string;
	canvasState: CanvasStateSidecar;
	basePath?: string
}

/** HTML-escape for `<title>` in the export shell. */
export function escapeHtmlForExportTitle(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

export function htmlTitlePlugin(title: string): Plugin {
	return {
		name: 'html-title',
		transformIndexHtml(html) {
			return html.replace(
				'<title>Canvas</title>',
				`<title>${escapeHtmlForExportTitle(title)}</title>`,
			)
		},
	}
}

export function dataImportsPlugin(): Plugin {
	return {
		name: 'canvas-data-imports',
		transform(src, id) {
			const mod = viteDataModule(id, src)
			if (!mod) {
				return
			}
			return { ...mod, map: null }
		},
	}
}

export function canvasStateSeedPlugin(
	canvasPath: string,
	state: CanvasStateSidecar,
): Plugin {
	const preamble = canvasStateSeedPreamble(state)
	const absCanvas = path.resolve(canvasPath)
	return {
		name: 'canvas-state-seed',
		enforce: 'pre',
		transform(src, id) {
			if (!preamble) {
				return
			}
			const file = id.split('?')[0] ?? id
			if (path.resolve(file) !== absCanvas) {
				return
			}
			return { code: preamble + src, map: null }
		},
	}
}

/** Vite config for bundling `src/shell` + the user canvas (html/png/pdf/jpg export). */
export function buildExportViteConfig(input: ExportViteBuildInput): UserConfig {
	const shellDir = pathInPkg('src', 'shell')
	const absCanvas = path.resolve(input.canvasPath)
	const viteBuildDir = path.join(input.outDir, '_build')
	const canvasResolve = viteResolveForCanvas(absCanvas)

	return {
		base: input.basePath ?? './',
		plugins: [
			canvasStateSeedPlugin(absCanvas, input.canvasState),
			react(),
			dataImportsPlugin(),
			htmlTitlePlugin(input.title),
			viteSingleFile(),
		],
		define: {
			__OPEN_CANVAS_THEME__: JSON.stringify(input.theme),
			__OPEN_CANVAS_BRAND__: JSON.stringify(input.brand),
		},
		resolve: {
			alias: canvasResolve.alias,
			modules: canvasResolve.modules,
		} as UserConfig['resolve'],
		server: {
			fs: {
				allow: canvasResolve.fsAllow,
			},
		},
		root: shellDir,
		build: {
			outDir: viteBuildDir,
			emptyOutDir: true,
			assetsInlineLimit: 100_000_000,
			reportCompressedSize: false,
		},
	}
}
