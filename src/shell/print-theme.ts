export type HostTheme = {
  kind: 'light' | 'dark';
  editorBackground: string;
  brand?: 'cursor' | 'grok'
}

export function installPrintThemeSwap(screenKind: 'light' | 'dark'): void {
  if (screenKind !== 'dark') {
    return
  }
  let screenTheme: HostTheme | null = null

  window.addEventListener('beforeprint', () => {
    const current = readHostTheme()
    if (!current || current.kind === 'light') {
      return
    }
    screenTheme = current
    writeHostTheme({ kind: 'light', editorBackground: '#FCFCFC', brand: current.brand })
  })

  window.addEventListener('afterprint', () => {
    if (!screenTheme) {
      return
    }
    writeHostTheme(screenTheme)
    screenTheme = null
  })
}

function readHostTheme(): HostTheme | undefined {
  const canvas = window.__cursorCanvas
  if (!canvas?.state) {
    return undefined
  }
  const raw = canvas.state.theme
  if (!raw || typeof raw !== 'object') {
    return undefined
  }
  const t = raw as HostTheme
  if (t.kind !== 'light' && t.kind !== 'dark') {
    return undefined
  }
  return t
}

function writeHostTheme(value: HostTheme): void {
  const canvas = window.__cursorCanvas
  if (!canvas?.state) {
    return
  }
  canvas.state.theme = value
  document.dispatchEvent(
    new CustomEvent('cursor-canvas-state-change', { detail: { channel: 'theme' } }),
  )
}
