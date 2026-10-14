import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { shimCanvasSdkDir } from './paths.js'

export type CanvasSdkManifest = {
	syncedAt?: string;
	sdkSource?: string;
	contentHash?: string
}

export function hashCanvasSdkTree(root: string): string {
	const abs = path.resolve(root)
	if (!fs.existsSync(abs)) {
		throw new Error(`hashCanvasSdkTree: missing directory ${abs}`)
	}

	const files: string[] = []
	collectDts(abs, abs, files)
	files.sort()

	const h = crypto.createHash('sha256')
	for (const rel of files) {
		h.update(rel)
		h.update('\0')
		h.update(fs.readFileSync(path.join(abs, rel)))
		h.update('\0')
	}
	return h.digest('hex')
}

function collectDts(dir: string, base: string, out: string[]): void {
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name)
		if (fs.statSync(p).isDirectory()) {
			collectDts(p, base, out)
		} else if (name.endsWith('.d.ts')) {
			out.push(path.relative(base, p))
		}
	}
}

function pruneSdkArtifacts(sdkDir: string): void {
	for (const name of fs.readdirSync(sdkDir)) {
		const p = path.join(sdkDir, name)
		if (fs.statSync(p).isDirectory()) {
			pruneSdkArtifacts(p)
			continue
		}
		if (name.endsWith('.test.d.ts') || name.endsWith('.d.ts.map')) {
			fs.rmSync(p)
		}
	}
}

const IDE_SKILL_PATH = '~/.cursor/skills-cursor/canvas/sdk'
const BUNDLED_SDK_PATH = './assets/sdk'
const IDE_SKILL_REF = '~/.cursor/skills-cursor/canvas/SKILL.md'
const BUNDLED_SKILL_REF = '../../references/canvas.md'

/** Copy shim vendor tree (e.g. into `open-canvas skill` target `assets/sdk/`). */
export function copyCanvasSdkTree(src: string, dest: string): void {
	fs.rmSync(dest, { recursive: true, force: true })
	fs.mkdirSync(dest, { recursive: true })
	fs.cpSync(src, dest, { recursive: true })
	pruneSdkArtifacts(dest)
	const indexPath = path.join(dest, 'index.d.ts')
	if (fs.existsSync(indexPath)) {
		const text = fs.readFileSync(indexPath, 'utf8')
		let next = text
		if (next.includes(IDE_SKILL_PATH)) {
			next = next.replaceAll(IDE_SKILL_PATH, BUNDLED_SDK_PATH)
		}
		if (next.includes(IDE_SKILL_REF)) {
			next = next.replaceAll(IDE_SKILL_REF, BUNDLED_SKILL_REF)
		}
		if (next !== text) {
			fs.writeFileSync(indexPath, next)
		}
	}
}

/** Cursor canvas reference vendored for open-canvas; rewrite IDE paths for installed layout. */
export function copyCanvasReferenceMarkdown(src: string, dest: string): void {
	let text = fs.readFileSync(src, 'utf8')
	text = text.replaceAll(IDE_SKILL_PATH, BUNDLED_SDK_PATH)
	text = text.replaceAll(IDE_SKILL_REF, './references/canvas.md')
	fs.mkdirSync(path.dirname(dest), { recursive: true })
	fs.writeFileSync(dest, text)
}

export function readCanvasSdkManifest(): CanvasSdkManifest | null {
	const manifestPath = path.join(shimCanvasSdkDir(), 'manifest.json')
	if (!fs.existsSync(manifestPath)) {
		return null
	}
	try {
		return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as CanvasSdkManifest
	} catch {
		return null
	}
}

export function formatCanvasSdkContractLine(): string {
	const m = readCanvasSdkManifest()
	if (!m?.contentHash) {
		return 'canvas-sdk contract: (missing shim vendor manifest)'
	}
	const when = m.syncedAt ? `, synced ${m.syncedAt}` : ''
	return `canvas-sdk contract: hash=${m.contentHash.slice(0, 12)}…${when}`
}
