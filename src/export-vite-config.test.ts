import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { IndexHtmlTransformContext, Plugin, TransformResult, UserConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { canvasStateSeedPreamble } from './canvas-state-sidecar.js'
import { buildExportViteConfig, canvasStateSeedPlugin, dataImportsPlugin, escapeHtmlForExportTitle, htmlTitlePlugin, type ExportViteBuildInput } from './export-vite-config.js'
import { pathInPkg } from './paths.js'

const SHOWCASE = pathInPkg('example', 'showcase.canvas.tsx')

function defaultInput(
	overrides: Partial<ExportViteBuildInput> = {},
): ExportViteBuildInput {
	return {
		canvasPath: SHOWCASE,
		outDir: path.join(os.tmpdir(), 'open-canvas-export-vite'),
		theme: 'light',
		brand: 'cursor',
		title: 'Test Canvas',
		canvasState: {},
		...overrides,
	}
}

function flattenPlugins(plugins: UserConfig['plugins']): Plugin[] {
	const out: Plugin[] = []
	for (const item of plugins ?? []) {
		if (!item) {
			continue
		}
		if (Array.isArray(item)) {
			out.push(...flattenPlugins(item))
			continue
		}
		if (typeof item === 'object' && 'name' in item) {
			out.push(item)
		}
	}
	return out
}

function pluginNamed(config: UserConfig, name: string): Plugin {
	const found = flattenPlugins(config.plugins).find(p => p.name === name)
	if (!found) {
		throw new Error(`plugin not found: ${name}`)
	}
	return found
}

const htmlCtx: IndexHtmlTransformContext = {
	filename: 'index.html',
	path: '/index.html',
	server: undefined as never,
	bundle: undefined as never,
}

function runTransform(plugin: Plugin, code: string, id: string) {
	const hook = plugin.transform
	if (!hook) {
		return undefined
	}
	const fn = typeof hook === 'function' ? hook : hook.handler
	return (fn as (code: string, id: string) => TransformResult | undefined)(code, id)
}

function runTransformIndexHtml(plugin: Plugin, html: string) {
	const hook = plugin.transformIndexHtml
	if (!hook || typeof hook !== 'function') {
		return html
	}
	return (
		(hook as (html: string, ctx: IndexHtmlTransformContext) => string | undefined)(
			html,
			htmlCtx,
		) ?? html
	)
}

describe('escapeHtmlForExportTitle', () => {
	it.each([
		{ raw: 'Plain', out: 'Plain' },
		{ raw: 'A & B', out: 'A &amp; B' },
		{ raw: '1 < 2', out: '1 &lt; 2' },
		{ raw: 'Say "hi"', out: 'Say &quot;hi&quot;' },
		{ raw: '&<"', out: '&amp;&lt;&quot;' },
	])('escapes $raw', ({ raw, out }) => {
		expect(escapeHtmlForExportTitle(raw)).toBe(out)
	})
})

describe('htmlTitlePlugin', () => {
	it('replaces the default shell title', () => {
		const plugin = htmlTitlePlugin('My Report')
		const html = runTransformIndexHtml(
			plugin,
			'<!doctype html><head><title>Canvas</title></head>',
		)
		expect(html).toContain('<title>My Report</title>')
	})

	it('escapes unsafe title text', () => {
		const plugin = htmlTitlePlugin('X & Y')
		const html = runTransformIndexHtml(plugin, '<title>Canvas</title>')
		expect(html).toContain('<title>X &amp; Y</title>')
	})
})

describe('canvasStateSeedPlugin', () => {
	it('does not transform when state is empty', () => {
		const plugin = canvasStateSeedPlugin(SHOWCASE, {})
		const out = runTransform(plugin, 'export default function X() {}', SHOWCASE)
		expect(out).toBeUndefined()
	})

	it('prepends preamble only for the canvas module id', () => {
		const state = { tab: 'chart' }
		const plugin = canvasStateSeedPlugin(SHOWCASE, state)
		const body = 'export default function X() {}'
		const hit = runTransform(plugin, body, SHOWCASE)
		expect(hit?.code).toBe(canvasStateSeedPreamble(state) + body)
		expect(runTransform(plugin, body, '/other/file.tsx')).toBeUndefined()
	})

	it('matches canvas path when id has a query suffix', () => {
		const state = { k: 1 }
		const plugin = canvasStateSeedPlugin(SHOWCASE, state)
		const body = 'export {}'
		const id = `${SHOWCASE}?t=1`
		expect(runTransform(plugin, body, id)?.code).toContain('__canvasJsonState')
	})
})

describe('dataImportsPlugin', () => {
	it('ignores non-data modules', () => {
		const plugin = dataImportsPlugin()
		expect(runTransform(plugin, 'export const x = 1', '/foo/bar.tsx')).toBeUndefined()
	})

	it('rewrites sibling csv imports', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-data-plugin-'))
		const csv = path.join(dir, 'rows.csv')
		fs.writeFileSync(csv, 'a,b\n1,2\n')
		const plugin = dataImportsPlugin()
		const src = 'import rows from "./rows.csv"'
		const out = runTransform(plugin, src, csv)
		expect(out?.code).toContain('export default')
		expect(out?.map).toBeNull()
	})
})

describe('buildExportViteConfig', () => {
	it('defaults base to ./', () => {
		const config = buildExportViteConfig(defaultInput())
		expect(config.base).toBe('./')
	})

	it('honors basePath', () => {
		const config = buildExportViteConfig(
			defaultInput({ basePath: '/docs/' }),
		)
		expect(config.base).toBe('/docs/')
	})

	it.each([
		{ theme: 'light' as const, brand: 'cursor' as const },
		{ theme: 'dark' as const, brand: 'grok' as const },
	])('injects theme=$theme brand=$brand', ({ theme, brand }) => {
		const config = buildExportViteConfig(
			defaultInput({ theme, brand }),
		)
		expect(config.define).toEqual({
			'process.env.OPEN_CANVAS_THEME': JSON.stringify(theme),
			'process.env.OPEN_CANVAS_BRAND': JSON.stringify(brand),
		})
	})

	it('roots the build in src/shell', () => {
		const config = buildExportViteConfig(defaultInput())
		expect(config.root).toBe(pathInPkg('src', 'shell'))
	})

	it('writes staged html under outDir/_build', () => {
		const outDir = path.join(os.tmpdir(), 'oc-vite-build-out')
		const config = buildExportViteConfig(defaultInput({ outDir }))
		expect(config.build?.outDir).toBe(path.join(outDir, '_build'))
	})

	it('aliases the user canvas module', () => {
		const canvasPath = path.resolve(SHOWCASE)
		const config = buildExportViteConfig(defaultInput({ canvasPath }))
		const alias = config.resolve?.alias as Record<string, string>
		expect(alias['@open-canvas/user-canvas']).toBe(canvasPath)
	})

	it('allows reading the canvas directory via server.fs', () => {
		const canvasPath = path.resolve(SHOWCASE)
		const config = buildExportViteConfig(defaultInput({ canvasPath }))
		const allow = config.server?.fs?.allow ?? []
		expect(allow).toContain(path.dirname(canvasPath))
	})

	it('registers export pipeline plugins by name', () => {
		const config = buildExportViteConfig(defaultInput())
		const names = flattenPlugins(config.plugins).map(p => p.name)
		expect(names).toContain('canvas-state-seed')
		expect(names).toContain('canvas-data-imports')
		expect(names).toContain('html-title')
		expect(names).toContain('vite:singlefile')
	})

	it('wires html-title from input title', () => {
		const config = buildExportViteConfig(
			defaultInput({ title: 'Quarterly KPIs' }),
		)
		const plugin = pluginNamed(config, 'html-title')
		const html = runTransformIndexHtml(plugin, '<title>Canvas</title>')
		expect(html).toContain('Quarterly KPIs')
	})

	it('wires state seed from input canvasState', () => {
		const config = buildExportViteConfig(
			defaultInput({ canvasState: { env: 'prod' } }),
		)
		const plugin = pluginNamed(config, 'canvas-state-seed')
		const body = 'export default function C() {}'
		expect(runTransform(plugin, body, SHOWCASE)?.code).toContain('"env":"prod"')
	})

	it('sets build options for single-file export', () => {
		const config = buildExportViteConfig(defaultInput())
		expect(config.build).toMatchObject({
			emptyOutDir: true,
			assetsInlineLimit: 100_000_000,
			reportCompressedSize: false,
		})
	})
})
