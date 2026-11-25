import { describe, expect, it } from 'vitest'
import { outlineReferenceDocPath } from '../util/paths.js'
import { forTests } from './outline.js'
import type { CanvasOutline, OutlineNode } from '../render/index.js'

const { formatOutline } = forTests

const opts = { file: 'demo.canvas.tsx', maxLines: 200 }

function node(partial: Partial<OutlineNode>): OutlineNode {
  return { depth: 0, page: 1, y: 0, x: 0, kind: 'div', label: '', w: 100, h: 20, ...partial }
}

function outline(partial: Partial<CanvasOutline>): CanvasOutline {
  return {
    widthPx: 1280,
    scrollHeight: 1600,
    paginate: true,
    pageHeightsPx: [900, 700],
    contentHeightsPx: [900, 700],
    nodes: [],
    nodesOmitted: 0,
    text: { overlaps: [], overlapsTotal: 0, clipped: [], clippedTotal: 0, overflow: [] },
    ...partial,
  }
}

describe('outline', () => {
  it('prints a header, one block per page, and the reference path', () => {
    const text = formatOutline(outline({
      nodes: [
        node({ kind: 'h1', label: 'Title', w: 1216, h: 30, y: 24 }),
        node({ page: 2, kind: 'table', label: 'A, B', note: '8 rows', w: 1216, h: 300, y: 20 }),
      ],
    }), opts)
    expect(text).toContain('demo.canvas.tsx · print layout 1280px wide · 2 PDF pages')
    expect(text).toContain('PAGE 1 · 900px tall (fully used)')
    expect(text).toMatch(/\+24\s+h1 "Title" {2}1216×30/)
    expect(text).toContain('PAGE 2 · 700px tall')
    expect(text).toContain('table "A, B"  1216×300 · 8 rows')
    expect(text).toContain(outlineReferenceDocPath())
  })

  it('folds a section with its heading and an untitled wrapper with its only child', () => {
    const text = formatOutline(outline({
      nodes: [
        node({ kind: 'section#intro', w: 1216, h: 200 }),
        node({ depth: 1, kind: 'h2', label: 'Intro' }),
        node({ depth: 1, kind: 'card', y: 40, w: 400, h: 75 }),
        node({ depth: 2, kind: 'stat', label: '35 — Components', y: 55 }),
        node({ depth: 1, kind: 'p', label: 'tail', y: 120 }),
      ],
    }), opts)
    expect(text).toContain('section#intro › h2 "Intro"  1216×200')
    expect(text).toContain('card › stat "35 — Components"  400×75')
    expect(text).not.toMatch(/^\s+\+0\s+h2/m)
  })

  it('shows x relative to the parent and hides padding-sized offsets', () => {
    const text = formatOutline(outline({
      nodes: [
        node({ kind: 'card', label: 'Right', x: 616, w: 600, h: 200 }),
        node({ depth: 1, kind: 'bar chart', x: 631, y: 50 }),
        node({ depth: 1, kind: 'button', label: 'Go', x: 1000, y: 150 }),
      ],
    }), opts)
    expect(text).toContain('x=616 card "Right"')
    expect(text).toMatch(/\+50\s+bar chart/)
    expect(text).toContain('x=384 button "Go"')
  })

  it('compresses identical runs and caps lines', () => {
    const repeated = Array.from({ length: 5 }, (_, i) => node({ kind: 'card', w: 600, h: 99, y: i }))
    const text = formatOutline(outline({ nodes: [...repeated, node({ kind: 'p', label: 'x' }), node({ kind: 'p', label: 'y' })] }), { ...opts, maxLines: 2 })
    expect(text).toContain('card  600×99 · ×5 in a row')
    expect(text).toContain('… 1 more block line not shown (raise --max-lines)')
  })

  it('marks slack and blank padding from --min-height', () => {
    const text = formatOutline(
      outline({ contentHeightsPx: [900, 600], nodes: [node({ kind: 'card', label: 'Loose', h: 400, slack: 120 })] }),
      { ...opts, minHeight: 'max' },
    )
    expect(text).toContain('⚠ 120px empty at the bottom')
    expect(text).toContain('PAGE 2 · 700px tall (600px content + 100px blank from --min-height max)')
    expect(text).not.toContain('PAGES ·')
  })

  it('reports a clean TEXT section when nothing is wrong', () => {
    expect(formatOutline(outline({}), opts)).toContain('TEXT · no overlapping text')
  })

  it('lists text problems with page, position, and a fix', () => {
    const text = formatOutline(outline({
      nodes: [node({ kind: 'line chart', y: 80, w: 570, h: 200, minFont: { px: 8, sample: '120ms' } })],
      text: {
        overlaps: [{ page: 1, y: 73, a: 'First', b: 'Second', w: 67, h: 18 }],
        overlapsTotal: 3,
        clipped: [{ page: 2, y: 10, text: '0.41 GB', px: 6 }],
        clippedTotal: 1,
        overflow: [{ page: 1, y: 126, label: 'div "Long"', px: 265, scrolls: false }],
      },
    }), opts)
    expect(text).toContain('TEXT · 6 problems to fix before exporting')
    expect(text).toMatch(/page 1 \+73\s+"First" overlaps "Second" by 67×18px/)
    expect(text).toContain('… 2 more overlapping pairs')
    expect(text).toContain('SVG label cut off by 6px at the edge of its box: "0.41 GB"')
    expect(text).toContain('content 265px wider than its box (the rest is clipped): div "Long"')
    expect(text).toContain('8px text like "120ms" in line chart 570×200')
    expect(text).toContain('showValues={false}')
    expect(text).toContain('smallest text 8px ⚠')
  })

  it('suggests --min-height max with its cost when pages differ', () => {
    const text = formatOutline(outline({}), opts)
    expect(text).toContain('PAGES · content is 700–900px per page. --min-height max makes every page 900px (+200px blank, 11% of the PDF)')
  })

  it('suggests page breaks for one tall page', () => {
    const text = formatOutline(outline({ pageHeightsPx: [3000], contentHeightsPx: [3000] }), opts)
    expect(text).toContain('1 PDF page')
    expect(text).toContain('breakBefore: "page"')
  })
})
