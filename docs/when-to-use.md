## When a canvas wins (intent)

Use a canvas when the deliverable is a **standalone artifact** you’ll reopen, filter, or share—not a one-off chat answer or “go fix this file” work:

- Investigations with **structured findings** (billing, usage, security, architecture)
- **Metrics / ops** reports from queries or exports
- **Multi-section narratives** (summary → evidence → outliers → recommendations)
- **Interactive exploration** (tabs, filters, persisted controls) beside the agent
- **Same file** in IDE, `open-canvas generate` (HTML/PNG/PDF), and optional `cursor` export

Skip canvases for: drafting a Slack/email, implementing a fix, building *in* another product (Datadog dashboard, etc.), or short Q&A.

## By SDK surface (what the showcase actually exercises)

### Metrics & quantitative storytelling

| Pattern | Components / technique | Good for |
|--------|-------------------------|----------|
| **KPI strip** | `Stat`, `Card`, `Grid` | SLO summary, release scorecard, audit counts |
| **Time series** | `LineChart` (+ `fill`, `referenceLines`, tight `yMin`/`yMax`) | Latency, error rate, daily trends, uptime vs SLO |
| **Composition over time** | `BarChart` `stacked` / `normalized` | Traffic mix, cost breakdown by category |
| **Rankings / stages** | `BarChart` `horizontal` | Queue depth, pipeline stages, top-N durations |
| **Plan vs actual** | Grouped bars + `referenceLines` | Budget, forecast, capacity |
| **Part-to-whole** | `PieChart` / donut | Test outcomes, incident categories, share of spend |
| **Segmented totals** | `UsageBar` + `Swatch` legend | Context/token budget, memory composition, quota usage |
| **Tabular evidence** | `Table` (`striped`, `rowTone`, `columnAlign`, cells as `Pill`) | Service health, outlier deploys, comparison matrices |
| **Imported datasets** | Relative `json` / `yaml` / `tsv` / `csv` / `jsonl` | Real reports without `fetch`—CI timings, deploy tails, KPI JSON |

### Findings, status, and narrative

| Pattern | Components | Good for |
|--------|------------|----------|
| **Alert / recommendation blocks** | `Callout` (success/warning/danger/info/neutral) | Incidents, regressions, “watch this tail” |
| **Executive headline** | `H1`–`H3`, `Text` tones, `Divider` | Report title, period, methodology caption |
| **Inline technical refs** | `Code`, `Link` | Flags, query names, repo links |
| **Severity / state chips** | `Pill` (+ keyboard hints, swatches) | Environments, build status, diff semantics (`deleted` / `renamed`) |
| **Stepped explanation** | `Grid` + `Card` + numbered `Pill` | How it works, runbooks, migration phases |

### Diagrams & structure (not only charts)

| Pattern | Components / technique | Good for |
|--------|-------------------------|----------|
| **DAG / flowchart** | `computeDAGLayout` + themed **SVG** (`line` / `path`, arrows, dashed **back-edges**) | Agent loops, CI stages, data pipelines, approval flows, **cycles** (retry/review loops) |
| **Layered hierarchy** | `layout.ranks` from DAG + bands | Swimlanes by “rank”, phased rollouts |
| **Custom topology** | Raw SVG + `useHostTheme()` | **Sequence-style** lifelines (you draw them), network sketches, dependency graphs when layout is hand-tuned |
| **Tree disclosure** | `CollapsibleSection` (nested, counts, trailing metrics) | Tool lists, call stacks, nested config, “what’s in context” |
| **Architecture review boards** | Cards + diagram + callouts | System map + per-component risks |

There is **no** built-in Mermaid/sequence component; sequence and C4-style diagrams are still strong canvas use cases via **SVG + tokens** (showcase’s DAG section is the official pattern: layout helper + your renderer).

### Code change & review

| Pattern | Components | Good for |
|--------|------------|----------|
| **Unified diff** | `DiffView` (+ `path` / `language` for highlighting) | PR hunks, config changes, before/after snippets |
| **File-level chrome** | `Card` `collapsible`, `CardHeader`, `DiffStats` in `trailing` | Multi-file reviews, collapsed low-signal files |
| **Change summary row** | `DiffStats` beside `Text` | Refactor stats, release diff totals |

### Work tracking & checklists

| Pattern | Components | Good for |
|--------|------------|----------|
| **Static checklist** | `TodoList`, `TodoListCard` (`dimmedTodoIds`) | Rollout tasks, audit remediation, migration gates |
| **Selectable items** | `TodoList` + `onTodoClick` + `useCanvasState` | “Which item are we discussing?” |
| **Kanban-style boards** | `useCanvasState` for columns (documented in hooks) | Sprint boards, incident stages |

### Interactive tools (IDE-side)

| Pattern | Components / hooks | Good for |
|--------|-------------------|----------|
| **Persisted controls** | `useCanvasState` → `Select`, `TextInput`, `TextArea`, `Checkbox`, `Toggle` | Environment switcher, filters, notes that survive reload |
| **Scenario UI** | `Button`, `Pill` tabs | Chart vs table vs context (showcase tab pattern) |
| **Bridge to agent** | `useCanvasAction` → `newComposerChat`, `openAgent`, `openFile` | “Explain this canvas”, jump to transcript, open cited file |
| **Local UI state** | `useState` / `useMemo` / `useEffect` | Selection, mount markers, derived sets |

### Layout & composition

| Pattern | Components | Good for |
|--------|------------|----------|
| **Vertical narrative** | `Stack`, `Section` wrappers | Long reports |
| **Dashboard grids** | `Grid`, `Row`, `Spacer` | Side-by-side chart + table |
| **Grouped surfaces** | `Card` / `CardHeader` / `CardBody` (`variant`, `collapsible`) | Chart cards, diff files—not every block needs a card |
| **Token-safe custom UI** | `mergeStyle`, `theme.fill` / `stroke` / `text` / `chart.palette` | Legends, mini gauges, bespoke diagram nodes |

## Cross-cutting use-case themes (how teams actually use them)

1. **Ops & reliability** — SLO charts, incident timelines (line + callouts), service tables, deploy outlier tables (showcase’s data section).
2. **Performance & cost** — Phase duration/RSS bars, daily p90 lines, usage bars for quotas.
3. **Security & compliance** — Finding tables, severity pills, collapsible evidence, remediation todos.
4. **Architecture & design reviews** — DAG of dependencies, narrative callouts, links to files via `openFile`.
5. **PR / release communication** — Diff cards, stats, KPI strip, callouts for breaking changes.
6. **Agent / product analytics** — Request mix charts, context budget bar, tool-tree collapsibles.
7. **Benchmarks & experiments** — Grouped bars, reference lines, filterable tables.
8. **Onboarding & internal docs** — Step cards, themed diagrams, export to PNG/PDF for slides.
9. **Light apps** — Filters + persisted state + dispatch to chat—not a full web app, but a durable mini-tool.

## What canvases are *not* trying to be

- **Live dashboards** wired to streaming APIs (`fetch` is out; data is inline or relative imports).
- **Full design systems** or arbitrary npm UI—only `cursor/canvas` (+ relative data).
- **Pixel-perfect diagram editors**—DAG layout is math; everything else is your SVG/HTML.
- **Empty shells**—omit sections with no real data (skill rule).

**TLDR:** Canvases are for **durable, themed, structured artifacts**: KPIs, charts, tables, usage breakdowns, callouts, **diffs**, **task/trees**, **filterable forms**, **DAG/flow (and custom SVG for sequences/topology)**, plus **chat/file/agent hooks**—best when the output is something you’ll **open again** or **export**, not when the goal is only to edit repo code or paste a paragraph in chat.