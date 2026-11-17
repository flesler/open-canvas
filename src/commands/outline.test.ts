import { describe, expect, it } from 'vitest'
import { outlineReferenceDocPath } from '../paths.js'
import { forTests } from './outline.js'
import type { CanvasOutlineMeasure } from '../render/index.js'

const { formatOutline, structureTreeRows, sectionContainsSummary, prependOutlineHelp } = forTests

function payload(partial: Partial<CanvasOutlineMeasure>): CanvasOutlineMeasure {
  return {
    widthPx: 1280,
    scrollHeight: 2000,
    paginate: true,
    pageHeightsPx: [900, 700],
    segmentHeightsPx: [850, 700],
    tree: [],
    treeOmitted: 0,
    ...partial,
  }
}

describe('outline', () => {
  it('prints landmarks, compresses runs, caps lines', () => {
    const text = formatOutline(
      payload({
        tree: [
          { depth: 0, page: 1, tag: 'section', name: '#x', title: 'Intro', w: 800, h: 400, innerBelow: 0 },
          { depth: 1, page: 1, tag: 'p', name: '"a"', title: '', w: 10, h: 10, innerBelow: 0 },
          { depth: 1, page: 1, tag: 'p', name: '"a"', title: '', w: 10, h: 10, innerBelow: 0 },
          { depth: 0, page: 2, tag: 'section', name: '#y', title: 'Outro', w: 400, h: 20, innerBelow: 0 },
        ],
      }),
      { threshold: 80, maxLines: 10 },
    )
    expect(text).toContain('MAJOR BLOCKS')
    expect(text).toContain('seg-1  section#x  800×400px  "Intro"')
    expect(text).toContain('×2')
    expect(text).toContain('seg-1  height 900px')
    expect(text).toContain('VERTICAL SEGMENTS (export slice height in px)')
    expect(text).toContain('VIEWPORT —')
    expect(text).toContain('LEGEND —')
    expect(text).not.toContain('PDF')
  })

  it('omits landmark sections from STRUCTURE', () => {
    const tree = [
      { depth: 0, page: 1, tag: 'section', name: '#x', title: 'Intro', w: 800, h: 400, innerBelow: 0 },
      { depth: 1, page: 1, tag: 'h2', name: '"Hi"', title: '', w: 10, h: 10, innerBelow: 0 },
    ]
    const keys = new Set(['#x'])
    expect(structureTreeRows(tree, keys)).toHaveLength(1)
    const text = formatOutline(payload({ tree }), { threshold: 80, maxLines: 20 })
    expect(text).toContain('MAJOR BLOCKS')
    expect(text).toContain('section#x')
    expect(text).toContain('sections omitted')
    expect(text).not.toMatch(/STRUCTURE[\s\S]*section#x/)
  })

  it('rolls up section contents', () => {
    const tree = [
      { depth: 0, page: 1, tag: 'section', name: '#x', title: 'Intro', w: 800, h: 400, innerBelow: 0 },
      { depth: 1, page: 1, tag: 'h2', name: '"Hi"', title: '', w: 10, h: 10, innerBelow: 0, sectionScope: '#x' },
      { depth: 1, page: 1, tag: 'button', name: '"Go"', title: '', w: 10, h: 10, innerBelow: 0, sectionScope: '#x' },
    ]
    expect(sectionContainsSummary(tree, '#x')).toBe('1×button, 1×heading')
    expect(formatOutline(payload({ tree }), { threshold: 80, maxLines: 20 })).toContain(
      'contains: 1×button, 1×heading',
    )
    const shallow = payload({
      tree: [
        { depth: 0, page: 1, tag: 'section', name: '#big', title: 'X', w: 800, h: 300, innerBelow: 0 },
        { depth: 1, page: 1, tag: 'h2', name: '"Only"', title: '', w: 10, h: 10, innerBelow: 0, sectionScope: '#big' },
      ],
    })
    expect(formatOutline(shallow, { threshold: 80, maxLines: 20 })).toContain('shallow outline')
  })

  it('prepends npm bundle path to reference doc', () => {
    const ref = outlineReferenceDocPath()
    const text = prependOutlineHelp('VIEWPORT — test')
    expect(text.startsWith('Sections:')).toBe(true)
    expect(text).toContain(ref)
    expect(text).toContain('VIEWPORT — test')
  })
})