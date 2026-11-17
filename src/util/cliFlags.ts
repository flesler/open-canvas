/** camelCase schema field → CLI long flag without `--` (kebab-case). */
export const OPTION_CLI_FLAG_NAMES: Record<string, string> = {
  viewportWidth: 'width',
  minHeight: 'min-height',
  renderOptions: 'render-options',
  selectors: 'selector',
  maxChildren: 'max-children',
  inlineState: 'inline-state',
}

export function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, ch => `-${ch.toLowerCase()}`)
}

export function cliFlagName(camelKey: string): string {
  return OPTION_CLI_FLAG_NAMES[camelKey] ?? camelToKebab(camelKey)
}

export function cliFlagMapsForOptionKeys(keys: Iterable<string>): {
  cliToCamel: Record<string, string>
} {
  const cliToCamel: Record<string, string> = {}
  for (const camelKey of keys) {
    cliToCamel[cliFlagName(camelKey)] = camelKey
  }
  return { cliToCamel }
}

/** zod-opts parse keys (kebab flags) → camelCase handler params. */
export function remapParsedCliOptions(
  parsed: Record<string, unknown>,
  cliToCamel: Record<string, string>,
  positionalKeys: ReadonlySet<string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (positionalKeys.has(key)) {
      out[key] = value
      continue
    }
    const camelKey = cliToCamel[key]
    if (camelKey === undefined) {
      throw new Error(`unexpected CLI option key: ${key}`)
    }
    out[camelKey] = value
  }
  return out
}