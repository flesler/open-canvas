import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ExportTheme } from '../export/enums.js'
import { pathInPkg } from '../util/paths.js'
import generateCommand from './generate.js'

describe('generate', () => {
  it('with --verify rejects a broken canvas before artifacts', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-gen-verify-'))
    const bad = path.join(dir, 'broken.canvas.tsx')
    fs.writeFileSync(
      bad,
      'import { Stack } from \'cursor/canvas\'\nexport default function Broken() { return <Stack> }\n',
    )
    await expect(
      generateCommand.run(
        generateCommand.input.parse({ canvas: bad, verify: true, formats: ['html'] }),
      ),
    ).rejects.toThrow(/verify failed/)
    expect(fs.existsSync(path.join(dir, 'out'))).toBe(false)
  })

  it('with --verify accepts a valid canvas (cursor format)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-gen-verify-ok-'))
    const canvas = path.join(dir, 'ok.canvas.tsx')
    fs.writeFileSync(
      canvas,
      `import { Stack, Text } from 'cursor/canvas'
export default function Ok() {
  return <Stack><Text>ok</Text></Stack>
}
`,
    )
    const artifacts = await generateCommand.run(
      generateCommand.input.parse({ canvas, verify: true, formats: ['cursor'], quiet: true }),
    )
    expect(artifacts.some(p => p.endsWith('.canvas.tsx'))).toBe(true)
  })
  it('inlines canvas state into html', async () => {
    if (!fs.existsSync(pathInPkg('dist', 'cli.js'))) {
      return
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-gen-'))
    const canvas = path.join(dir, 'label.canvas.tsx')
    fs.writeFileSync(
      canvas,
      `import { Text, useCanvasState } from 'cursor/canvas'
export default function Label() {
  const [label] = useCanvasState('label', 'default-label')
  return <Text>{label}</Text>
}
`,
    )
    fs.writeFileSync(
      path.join(dir, 'label.canvas.data.json'),
      '{ "label": "from-sidecar" }\n',
    )
    await generateCommand.run(
      generateCommand.input.parse({
        canvas,
        formats: ['html'],
        theme: ExportTheme.Light,
      }),
    )
    const html = fs.readFileSync(path.join(dir, 'out', 'label.html'), 'utf8')
    expect(html).toContain('from-sidecar')
  }, 30_000)
})