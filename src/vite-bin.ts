import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function viteCliPath(root: string): string {
	return path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
}
