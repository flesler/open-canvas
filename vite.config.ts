import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const pkgRequire = createRequire(path.join(configDir, 'package.json'))
const { pkgRoot, viteResolveForCanvas } = pkgRequire('./dist/pkg.js') as typeof import('./dist/pkg.js')
const { viteDataModule } = pkgRequire('./dist/util.js') as typeof import('./dist/util.js')

const stem = process.env.OPENCANVAS_STEM ?? 'index'
const outDir = process.env.OPENCANVAS_OUT_DIR ?? path.join(pkgRoot, 'example', 'out')
const canvasPath = process.env.OPENCANVAS_CANVAS_PATH
const theme = process.env.OPENCANVAS_THEME === 'dark' ? 'dark' : 'light'
const title = process.env.OPENCANVAS_TITLE ?? 'Canvas'
const viteBuildDir = path.join(outDir, '_build')
const htmlOut = path.join(outDir, `${stem}.html`)

if (!canvasPath) {
	throw new Error('OPENCANVAS_CANVAS_PATH is required for vite build')
}

const canvasResolve = viteResolveForCanvas(canvasPath)

function flatHtmlArtifact(): Plugin {
	return {
		name: 'flat-html-artifact',
		closeBundle() {
			const index = path.join(viteBuildDir, 'index.html')
			if (!fs.existsSync(index)) {
				return
			}
			fs.mkdirSync(outDir, { recursive: true })
			fs.renameSync(index, htmlOut)
			fs.rmSync(viteBuildDir, { recursive: true, force: true })
		},
	}
}

function htmlTitle(): Plugin {
	return {
		name: 'html-title',
		transformIndexHtml(html) {
			return html.replace('<title>Canvas</title>', `<title>${escapeHtml(title)}</title>`)
		},
	}
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

function opencanvasDataImports(): Plugin {
	return {
		name: 'opencanvas-data-imports',
		transform(src, id) {
			const mod = viteDataModule(id, src)
			if (!mod) {
				return
			}
			return { ...mod, map: null }
		},
	}
}

export default defineConfig({
	base: './',
	plugins: [react(), opencanvasDataImports(), htmlTitle(), viteSingleFile(), flatHtmlArtifact()],
	define: {
		__OPENCANVAS_THEME__: JSON.stringify(theme),
	},
	resolve: {
		modules: canvasResolve.modules,
		alias: canvasResolve.alias,
	},
	server: {
		fs: {
			allow: canvasResolve.fsAllow,
		},
	},
	root: path.join(pkgRoot, 'src', 'shell'),
	build: {
		outDir: viteBuildDir,
		emptyOutDir: true,
		assetsInlineLimit: 100_000_000,
	},
})
