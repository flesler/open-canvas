import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { runTestCases } from './test/utils.test.js'
import { canvasStem, emitCursorCanvas, formatCursorCanvasEmit, outputSlug, parseDataContent, parseFormats, parseJsonl, parseSelectors, titleCaseFromStem, titleSlug } from './util.js'

describe('parseJsonl', () => {
  runTestCases(parseJsonl, [
    { desc: 'one object per line', input: '{"a":1}\n{"a":2}\n', expected: [{ a: 1 }, { a: 2 }] },
    { desc: 'blank lines', input: '\n{"x":true}\n\n', expected: [{ x: true }] },
    { desc: 'bad line', input: 'not json\n', throws: 'invalid JSONL at line 1' },
  ])
})

describe('parseDataContent', () => {
  it('parses csv', () => {
    const rows = parseDataContent('.csv', 'a,b\n1,2\n') as Record<string, string>[]
    expect(rows[0].a).toBe('1')
  })

  it('returns txt and md as strings', () => {
    expect(parseDataContent('.txt', 'hello')).toBe('hello')
    expect(parseDataContent('.md', '# Title\n\nbody')).toBe('# Title\n\nbody')
  })
})

describe('canvasStem', () => {
  runTestCases(canvasStem, [
    { desc: '.canvas.tsx stem', input: '/foo/my-report.canvas.tsx', expected: 'my-report' },
    { desc: 'wrong extension', input: 'x.tsx', throws: 'canvas must end with .canvas.tsx' },
  ])
})

describe('outputSlug', () => {
  runTestCases(outputSlug, [
    { desc: '--name', input: { name: 'index', canvasStem: 'showcase', title: 'X' }, expected: 'index' },
    { desc: 'canvas stem default', input: { canvasStem: 'showcase', title: 'X' }, expected: 'showcase' },
    { desc: 'title slug fallback', input: { canvasStem: '', title: 'Open Canvas — SDK' }, expected: 'open-canvas-sdk' },
    { desc: 'path in name', input: { name: 'dark.html', canvasStem: 'a' }, throws: 'must be a slug' },
  ])
})

describe('titleSlug', () => {
  runTestCases(titleSlug, [
    { desc: 'kebab-case', input: 'My Report', expected: 'my-report' },
  ])
})

describe('parseFormats', () => {
  runTestCases(parseFormats, [
    { desc: 'comma list', input: 'html,png,cursor', expected: ['html', 'png', 'cursor'] },
    { desc: 'unknown format', input: 'gif', throws: 'unknown format' },
  ])
})

describe('parseSelectors', () => {
  runTestCases(parseSelectors, [
    { desc: 'commas and repeated flags', input: ['#a', '.b, .c'], expected: ['#a', '.b', '.c'] },
  ])
})

describe('titleCaseFromStem', () => {
  runTestCases(titleCaseFromStem, [
    { desc: 'hyphenated stem', input: 'build-plane', expected: 'Build Plane' },
  ])
})

describe('formatCursorCanvasEmit', () => {
  runTestCases(formatCursorCanvasEmit, [
    {
      desc: 'cursor import before inlines',
      input: {
        cursorImports: ["import { Stack } from 'cursor/canvas'"],
        inlines: ['const data = {"n":1}'],
        body: 'export default function T() { return <Stack /> }',
      },
      expected:
        "import { Stack } from 'cursor/canvas'\n\nconst data = {\"n\":1}\nexport default function T() { return <Stack /> }\n",
    },
    {
      desc: 'inlines then body',
      input: {
        cursorImports: [],
        inlines: ['const a = 1', 'const b = 2'],
        body: 'const c = 3',
      },
      expected: 'const a = 1\nconst b = 2\nconst c = 3\n',
    },
  ])
})

describe('emitCursorCanvas', () => {
  it('inlines md as a string const', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-emit-'))
    fs.writeFileSync(path.join(dir, 'note.md'), '# Hi\n')
    const canvas = path.join(dir, 'mini.canvas.tsx')
    fs.writeFileSync(
      canvas,
      'import note from \'./note.md\'\nexport default function Mini() { return note }\n',
    )
    const out = path.join(dir, 'mini-out.canvas.tsx')
    emitCursorCanvas(canvas, out)
    expect(fs.readFileSync(out, 'utf8')).toContain('const note = "# Hi\\n"')
  })

  it('inlines json and places cursor import first', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-emit-'))
    fs.writeFileSync(path.join(dir, 'nums.json'), '{"n":1}')
    const canvas = path.join(dir, 'mini.canvas.tsx')
    fs.writeFileSync(
      canvas,
      'import { Stack } from \'cursor/canvas\'\nimport nums from \'./nums.json\'\n\nexport default function Mini() { return <Stack /> }\n',
    )
    const out = path.join(dir, 'mini-out.canvas.tsx')
    emitCursorCanvas(canvas, out)
    expect(fs.readFileSync(out, 'utf8')).toBe(
      "import { Stack } from 'cursor/canvas'\n\nconst nums = {\"n\":1}\nexport default function Mini() { return <Stack /> }\n",
    )
  })

  it('prepends state seed when inlineState is set', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-canvas-emit-'))
    const canvas = path.join(dir, 'mini.canvas.tsx')
    fs.writeFileSync(
      canvas,
      'import { Stack } from \'cursor/canvas\'\nexport default function Mini() { return <Stack /> }\n',
    )
    fs.writeFileSync(
      path.join(dir, 'mini.canvas.data.json'),
      '{ "tab": "table" }\n',
    )
    const out = path.join(dir, 'mini-out.canvas.tsx')
    emitCursorCanvas(canvas, out, { inlineState: true })
    const text = fs.readFileSync(out, 'utf8')
    expect(text).toContain('__canvasJsonState')
    expect(text).toContain('"tab":"table"')
    expect(text).toContain('getItem(storageKey) === null')
  })
})
