/** One visible block in print layout. `y` is px from the top of its PDF page; `x` from the content's left edge (absolute). */
export type OutlineNode = {
  depth: number;
  page: number;
  y: number;
  x: number;
  kind: string;
  label: string;
  w: number;
  h: number;
  /** Extra facts: row count, selected tab, link target, fixed position. */
  note?: string;
  /** Empty px below the last child, when at least the slack threshold. */
  slack?: number;
  /** Smallest SVG text as painted (after viewBox scaling), with an example string at that size. */
  minFont?: { px: number; sample: string }
}

export type TextChecks = {
  overlaps: Array<{ page: number; y: number; a: string; b: string; w: number; h: number }>;
  overlapsTotal: number;
  clipped: Array<{ page: number; y: number; text: string; px: number }>;
  clippedTotal: number;
  overflow: Array<{ page: number; y: number; label: string; px: number; scrolls: boolean }>
}

export type CanvasOutline = {
  widthPx: number;
  scrollHeight: number;
  paginate: boolean;
  pageHeightsPx: number[];
  contentHeightsPx: number[];
  nodes: OutlineNode[];
  nodesOmitted: number;
  text: TextChecks
}

/** SVG text painted smaller than this is reported as hard to read. */
export const SMALL_TEXT_PX = 9

/**
 * Runs in the page (Playwright `evaluate`), after print media and pagination are applied.
 * Must stay self-contained: no imports or outer references at runtime.
 */
export function outlineEval(opts: { bounds: number[]; maxNodes: number; slackPx: number; smallTextPx: number }) {
  const { bounds, maxNodes, slackPx, smallTextPx } = opts
  const LABEL_MAX = 60
  const LIST_MAX = 20
  const host = document.getElementById('root') ?? document.body
  const contentLeft = host.getBoundingClientRect().left

  const pageIndex = (docTop: number): number => {
    const last = bounds.length - 2
    for (let i = 0; i <= last; i++) {
      if (docTop >= bounds[i] && (i === last || docTop < bounds[i + 1])) {
        return i
      }
    }
    return Math.max(0, last)
  }
  const place = (r: DOMRect) => {
    const top = r.top + window.scrollY
    const i = pageIndex(Math.round(top))
    return { page: i + 1, y: Math.max(0, Math.round(top - bounds[i])) }
  }
  const clean = (s: string | null | undefined, max = LABEL_MAX): string => {
    const t = (s || '').replace(/\s*\n\s*/g, ' · ').replace(/\s+/g, ' ').trim()
    return t.length > max ? `${t.slice(0, max - 1)}…` : t
  }
  const textOf = (el: Element): string => (el instanceof HTMLElement ? el.innerText : el.textContent) || ''
  const svgTextOf = (t: Element): string =>
    Array.from(t.childNodes)
      .filter(n => n.nodeName.toLowerCase() !== 'title')
      .map(n => n.textContent || '')
      .join(' ')
  const isNoiseId = (id: string) => /^(mantine-|recharts|:r|radix-)/i.test(id)
  const hidden = (el: Element) => {
    const s = getComputedStyle(el)
    return s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0'
  }

  function minFont(svg: SVGSVGElement): { px: number; sample: string } | undefined {
    const r = svg.getBoundingClientRect()
    const vb = svg.viewBox?.baseVal
    const scale = vb && vb.width > 0 && vb.height > 0 ? Math.min(r.width / vb.width, r.height / vb.height) : 1
    let min: { px: number; sample: string } | undefined
    for (const t of svg.querySelectorAll('text')) {
      const text = svgTextOf(t).trim()
      const size = parseFloat(getComputedStyle(t).fontSize) * scale
      if (text && !hidden(t) && !Number.isNaN(size) && (!min || size < min.px)) {
        min = { px: Math.round(size * 10) / 10, sample: clean(text, 24) }
      }
    }
    return min
  }

  type Desc = { kind: string; label: string; note?: string; leaf?: boolean; minFont?: { px: number; sample: string } }

  function chart(container: HTMLElement): Desc {
    const types = ['line', 'bar', 'area', 'pie', 'scatter', 'radar', 'funnel'].filter(t => container.querySelector(`.recharts-${t}`))
    const series = Array.from(container.querySelectorAll('.recharts-legend-item-text')).map(s => clean(s.textContent, 24))
    const svg = container.querySelector('svg.recharts-surface')
    return {
      kind: types.length ? `${types.join('+')} chart` : 'chart',
      label: series.join(', '),
      leaf: true,
      minFont: svg instanceof SVGSVGElement ? minFont(svg) : undefined,
    }
  }

  function describe(el: HTMLElement): Desc | undefined {
    const tag = el.tagName.toLowerCase()
    const role = el.getAttribute('role')
    const first = el.firstElementChild
    if (/^h[1-6]$/.test(tag)) {
      return { kind: tag, label: clean(textOf(el)), leaf: true }
    }
    if (el.classList.contains('mantine-Card-root')) {
      const head = el.children.length > 1 ? first : null
      return { kind: 'card', label: head ? clean(textOf(head)) : '' }
    }
    if (first?.hasAttribute('data-canvas-stat-value') && el.children.length === 2) {
      return { kind: 'stat', label: `${clean(first.textContent, 32)} — ${clean(textOf(el.children[1]))}`, leaf: true }
    }
    if (el.classList.contains('mantine-Alert-root')) {
      return { kind: 'callout', label: clean(textOf(el)), leaf: true }
    }
    if (Array.from(el.classList).some(c => c.includes('recharts-responsive-container'))) {
      return chart(el)
    }
    if (tag === 'table') {
      const headers = Array.from(el.querySelectorAll('thead th')).map(th => clean(th.textContent, 24))
      const rows = el.querySelectorAll('tbody tr').length
      return { kind: 'table', label: clean(headers.join(', '), 90), note: `${rows} row${rows === 1 ? '' : 's'}`, leaf: true }
    }
    if (role === 'tab') {
      return { kind: 'tab', label: clean(textOf(el), 40), note: el.getAttribute('aria-selected') === 'true' ? 'selected' : undefined, leaf: true }
    }
    if (tag === 'button') {
      return { kind: 'button', label: clean(textOf(el)), leaf: true }
    }
    if (tag === 'a') {
      const href = el.getAttribute('href')
      return { kind: 'link', label: clean(textOf(el)), note: href ? `→ ${href.slice(0, 100)}` : undefined, leaf: true }
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      const kind = el instanceof HTMLInputElement ? `input[${el.type || 'text'}]` : tag
      const placeholder = 'placeholder' in el ? el.placeholder : ''
      return { kind, label: clean(el.value || placeholder || el.getAttribute('aria-label'), 40), leaf: true }
    }
    if (tag === 'pre') {
      const lines = (el.textContent || '').split('\n').filter(l => l.trim())
      if (!lines.length) {
        return undefined
      }
      return { kind: 'code block', label: clean(lines[0], 50), note: `${lines.length} line${lines.length === 1 ? '' : 's'}`, leaf: true }
    }
    if (tag === 'code') {
      return { kind: 'code', label: clean(el.textContent, 40), leaf: true }
    }
    if (tag === 'img') {
      return { kind: 'img', label: clean(el.getAttribute('alt'), 40), leaf: true }
    }
    const id = el.id && !isNoiseId(el.id) ? `#${el.id}` : ''
    if (['section', 'main', 'article', 'header', 'footer', 'nav', 'form', 'aside'].includes(tag) || role === 'region' || role === 'dialog') {
      return { kind: `${tag}${id}`, label: '' }
    }
    if (id) {
      const text = clean(textOf(el), 40)
      return { kind: `${tag}${id}`, label: el.getBoundingClientRect().height < 48 ? text : '' }
    }
    return undefined
  }

  function emptyBelow(el: HTMLElement): number {
    const box = el.getBoundingClientRect()
    let bottom = box.top
    let any = false
    for (const child of el.children) {
      if (hidden(child)) {
        continue
      }
      const r = child.getBoundingClientRect()
      if (r.height >= 1) {
        bottom = Math.max(bottom, r.bottom)
        any = true
      }
    }
    return any ? Math.max(0, Math.floor(box.bottom - bottom)) : 0
  }

  const nodes: OutlineNode[] = []
  let nodesOmitted = 0
  const push = (r: DOMRect, depth: number, d: Desc, extra: Partial<OutlineNode> = {}) => {
    if (nodes.length >= maxNodes) {
      nodesOmitted += 1
      return
    }
    nodes.push({
      depth,
      ...place(r),
      x: Math.max(0, Math.round(r.left - contentLeft)),
      kind: d.kind,
      label: d.label,
      w: Math.round(r.width),
      h: Math.round(r.height),
      note: d.note,
      minFont: d.minFont,
      ...extra,
    })
  }
  const walk = (el: Element, depth: number) => {
    if (el instanceof SVGSVGElement) {
      const r = el.getBoundingClientRect()
      const texts = Array.from(el.querySelectorAll('text'), svgTextOf).map(t => t.trim()).filter(Boolean)
      const font = texts.length ? minFont(el) : undefined
      const tooSmall = font !== undefined && font.px < smallTextPx
      if ((tooSmall || (r.width >= 48 && r.height >= 48)) && r.width > 0 && !hidden(el)) {
        const title = el.getAttribute('aria-label') || el.querySelector(':scope > title')?.textContent
        const label = title ? clean(title) : texts.length ? clean(`text: ${texts.slice(0, 4).join(' · ')}${texts.length > 4 ? ` +${texts.length - 4}` : ''}`) : ''
        push(r, depth, { kind: 'svg', label, minFont: font })
      }
      return
    }
    if (!(el instanceof HTMLElement) || ['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName) || hidden(el)) {
      return
    }
    const r = el.getBoundingClientRect()
    let d = describe(el)
    const slack = d?.leaf ? 0 : emptyBelow(el)
    const flagged = slack >= slackPx
    if (!d && flagged && r.width >= 200) {
      d = { kind: el.tagName.toLowerCase(), label: clean(textOf(el), 40) }
    }
    if (d) {
      const position = getComputedStyle(el).position
      const pinned = position === 'fixed' || position === 'sticky' ? position : undefined
      push(r, depth, d, {
        slack: flagged ? slack : undefined,
        note: [d.note, pinned].filter(Boolean).join(' · ') || undefined,
      })
      if (d.leaf) {
        return
      }
    }
    for (const child of el.children) {
      walk(child, d ? depth + 1 : depth)
    }
  }
  for (const child of host.children) {
    walk(child, 0)
  }

  return { nodes, nodesOmitted, text: textChecks() }

  function textChecks(): TextChecks {
    type Box = { l: number; t: number; r: number; b: number; text: string; owner: Element }
    const boxes: Box[] = []
    const toBox = (rect: DOMRect, text: string, owner: Element): Box => ({
      l: rect.left,
      t: rect.top + window.scrollY,
      r: rect.right,
      b: rect.bottom + window.scrollY,
      text,
      owner,
    })
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
    const range = document.createRange()
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const owner = node.parentElement
      const text = clean(node.textContent, 40)
      if (!owner || !text || owner.closest('svg, style, script') || getComputedStyle(owner).visibility === 'hidden') {
        continue
      }
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) {
        if (rect.width >= 1 && rect.height >= 1) {
          boxes.push(toBox(rect, text, owner))
        }
      }
    }
    const clipped: TextChecks['clipped'] = []
    let clippedTotal = 0
    for (const t of host.querySelectorAll('svg text')) {
      const text = clean(svgTextOf(t), 40)
      const rect = t.getBoundingClientRect()
      if (!text || rect.width < 1 || rect.height < 1 || hidden(t)) {
        continue
      }
      boxes.push(toBox(rect, text, t))
      let clip: Element | null = (t as SVGTextElement).ownerSVGElement
      while (clip && clip !== document.body) {
        const s = getComputedStyle(clip)
        if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
          break
        }
        clip = clip.parentElement
      }
      if (!clip || clip === document.body) {
        continue
      }
      const c = clip.getBoundingClientRect()
      const out = Math.max(c.left - rect.left, rect.right - c.right, c.top - rect.top, rect.bottom - c.bottom)
      if (out > 3) {
        clippedTotal += 1
        if (clipped.length < LIST_MAX) {
          clipped.push({ ...place(rect), text, px: Math.round(out) })
        }
      }
    }
    boxes.sort((p, q) => p.t - q.t)
    const overlaps: TextChecks['overlaps'] = []
    const seen = new Set<string>()
    let overlapsTotal = 0
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i]
      for (let j = i + 1; j < boxes.length && boxes[j].t < a.b; j++) {
        const b = boxes[j]
        if (a.owner === b.owner || a.owner.contains(b.owner) || b.owner.contains(a.owner)) {
          continue
        }
        const w = Math.min(a.r, b.r) - Math.max(a.l, b.l)
        const h = Math.min(a.b, b.b) - Math.max(a.t, b.t)
        if (w < 2 || h < 0.25 * Math.min(a.b - a.t, b.b - b.t)) {
          continue
        }
        const key = `${a.text}\u0000${b.text}`
        if (seen.has(key)) {
          continue
        }
        seen.add(key)
        overlapsTotal += 1
        if (overlaps.length < LIST_MAX) {
          const at = place(new DOMRect(a.l, a.t - window.scrollY, a.r - a.l, a.b - a.t))
          overlaps.push({ ...at, a: a.text, b: b.text, w: Math.round(w), h: Math.round(h) })
        }
      }
    }
    const overflow: TextChecks['overflow'] = []
    const overflowEls: HTMLElement[] = []
    for (const el of host.querySelectorAll('*')) {
      if (!(el instanceof HTMLElement) || overflow.length >= LIST_MAX || el.clientWidth === 0) {
        continue
      }
      const px = el.scrollWidth - el.clientWidth
      const ox = px > 3 ? getComputedStyle(el).overflowX : 'visible'
      if (ox === 'visible' || overflowEls.some(o => o.contains(el))) {
        continue
      }
      overflowEls.push(el)
      const d = describe(el)
      overflow.push({
        ...place(el.getBoundingClientRect()),
        label: `${d?.kind ?? el.tagName.toLowerCase()} "${clean(textOf(el), 40)}"`,
        px,
        scrolls: ox === 'auto' || ox === 'scroll',
      })
    }
    return { overlaps, overlapsTotal, clipped, clippedTotal, overflow }
  }
}
