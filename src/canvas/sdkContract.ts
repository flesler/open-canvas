import fs from 'node:fs'
import path from 'node:path'
import { shimCanvasSdkDir } from '../paths.js'

export type CanvasSdkManifest = {
  syncedAt?: string;
  sdkSource?: string;
  contentHash?: string
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