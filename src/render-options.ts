import fs from 'node:fs'
import path from 'node:path'
import type { LaunchOptions, Page, PageScreenshotOptions } from 'playwright'

type PagePdfOptions = NonNullable<Parameters<Page['pdf']>[0]>

export type RenderPageOptions = {
	viewport: { width: number; height: number };
	deviceScaleFactor?: number;
	colorScheme?: 'light' | 'dark' | 'no-preference'
}

export type RenderOptions = {
	launch?: LaunchOptions;
	page: RenderPageOptions;
	screenshot: Omit<PageScreenshotOptions, 'path'>;
	pdf: Omit<PagePdfOptions, 'path'>
}

export type RenderOptionsInput = {
	viewportWidth?: number;
	viewportHeight?: number;
	renderOptions?: string;
	theme?: 'light' | 'dark'
}

const DEFAULTS: RenderOptions = {
	page: {
		viewport: { width: 1280, height: 900 },
		deviceScaleFactor: 1,
	},
	screenshot: {
		fullPage: true,
		animations: 'disabled',
	},
	pdf: {
		printBackground: true,
		margin: { top: 0, right: 0, bottom: 0, left: 0 },
	},
}

export function resolveRenderOptions(input: RenderOptionsInput): RenderOptions {
	let fileConfig: Partial<RenderOptions> = {}
	if (input.renderOptions) {
		fileConfig = loadRenderOptionsJson(input.renderOptions)
	}

	const page: RenderPageOptions = {
		...DEFAULTS.page,
		...fileConfig.page,
		viewport: {
			width: input.viewportWidth ?? fileConfig.page?.viewport?.width ?? DEFAULTS.page.viewport.width,
			height: input.viewportHeight ?? fileConfig.page?.viewport?.height ?? DEFAULTS.page.viewport.height,
		},
		deviceScaleFactor: fileConfig.page?.deviceScaleFactor ?? DEFAULTS.page.deviceScaleFactor,
		colorScheme: input.theme ?? fileConfig.page?.colorScheme ?? DEFAULTS.page.colorScheme,
	}

	return {
		launch: { ...fileConfig.launch },
		page,
		screenshot: { ...DEFAULTS.screenshot, ...fileConfig.screenshot },
		pdf: { ...DEFAULTS.pdf, ...fileConfig.pdf },
	}
}

function loadRenderOptionsJson(raw: string): Partial<RenderOptions> {
	const trimmed = raw.trim()
	const text = trimmed.startsWith('{')
		? trimmed
		: fs.readFileSync(path.resolve(trimmed), 'utf8')
	const parsed = JSON.parse(text) as Partial<RenderOptions>
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('--render-options must be a JSON object or path to one')
	}
	return parsed
}
