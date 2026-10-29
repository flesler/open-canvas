/**
 * SDK showcase — `cursor/canvas` plus relative data files under ./data/.
 *
 * Single example for verify, smoke, contract, and the README screenshot.
 */
import { BarChart, Button, Callout, Card, CardBody, CardHeader, Checkbox, Code, CollapsibleSection, DiffStats, DiffView, Divider, Grid, H1, H2, H3, LineChart, Link, PieChart, Pill, Row, Select, Spacer, Stack, Stat, Swatch, Table, Text, TextArea, TextInput, TodoList, TodoListCard, Toggle, UsageBar, canvasPaletteGrokDark, canvasPaletteGrokLight, computeDAGLayout, mergeStyle, usageColorSequence, useCanvasAction, useCanvasState, useEffect, useHostTheme, useMemo, useRef, useState, type ChartSeries, type Color, type DiffLineData, type StackProps, type TableRowTone, type TodoItem } from 'cursor/canvas'
import pkg from '../package.json'
import daily from './data/daily.tsv'
import deployEvents from './data/deploy-events.jsonl'
import outlierRows from './data/outliers.csv'
import phaseRssMb from './data/phase-rss.yaml'
import report from './data/report.json'

type PhaseRssMb = {
	rows: { phase: string; p90: number }[]
}

const repoUrl = `https://github.com/${pkg.repository.replace(/^github:/, '')}`
const shimDep = pkg.dependencies['@flesler/cursor-canvas-web']

/** GitHub Pages: dark export → `./`; light (or anything else) → `./dark.html`. */
function ExportThemeToggleLink() {
	const { kind, text } = useHostTheme()
	const dark = kind === 'dark'
	return (
		<a
			href={dark ? './' : './dark.html'}
			target="_self"
			style={{ color: text.link }}
		>
			{dark ? 'Light mode' : 'Dark mode'}
		</a>
	)
}

/** Bar/line height in the charts grid; pie `size` matches for visual parity. */
const SHOWCASE_CHART_HEIGHT = 200

const OUTLIER_TABLE = {
	headers: ['App', 'Stack', 'Total', 'Peak RSS', 'Files@pack'],
	rows: outlierRows.map(r => [
		r.app,
		r.stack,
		r.total,
		r.peak_rss,
		r.files_pack,
	]),
}

/* --------------------------------------------------------------- demo data */

const LATENCY: ChartSeries[] = [
	{ name: 'p50', data: [120, 110, 130, 105, 98, 112], tone: 'info' },
	{ name: 'p95', data: [320, 410, 380, 350, 300, 290], tone: 'warning' },
]
const REQUESTS: ChartSeries[] = [
	{ name: 'IDE', data: [40, 52, 48, 61, 55, 67], tone: 'info' },
	{ name: 'CLI', data: [12, 18, 15, 20, 22, 19], tone: 'success' },
	{ name: 'Cloud', data: [8, 9, 14, 11, 16, 21], tone: 'neutral' },
]
const CATEGORIES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const UPTIME: ChartSeries[] = [
	{
		name: 'uptime %',
		data: [99.2, 99.5, 99.1, 99.8, 99.6, 99.9],
		tone: 'success',
	},
]
const TRAFFIC_SHARE: ChartSeries[] = [
	{ name: 'Web', data: [40, 45, 50], tone: 'info' },
	{ name: 'API', data: [35, 30, 25], tone: 'success' },
	{ name: 'Batch', data: [25, 25, 25], tone: 'neutral' },
]
const SHARE_WEEKS = ['W1', 'W2', 'W3']

const DRAIN_CHECKPOINTS = ['T+5s', 'T+10s', 'T+15s', 'T+20s', 'T+30s']
const DRAIN_SERIES: ChartSeries[] = [
	{ name: 'Off-heap reclaimed', data: [0.12, 0.18, 0.24, 0.36, 0.41], tone: 'info' },
	{ name: 'Heap reclaimed', data: [0.58, 0.55, 0.62, 0.71, 0.85], tone: 'warning' },
]

function serviceTableRows(): {
	tone?: TableRowTone;
	row: [string, string, string]
}[] {
	return [
		{ row: ['api-gateway', 'healthy', '3.2k'], tone: 'success' },
		{ row: ['workers', 'hot', '8.1k'], tone: 'warning' },
		{ row: ['billing', 'down', '0'], tone: 'danger' },
	]
}
const OUTCOMES = [
	{ label: 'Passing', value: 68, tone: 'success' as const },
	{ label: 'Flaky', value: 14, tone: 'warning' as const },
	{ label: 'Failing', value: 9, tone: 'danger' as const },
]

const CATEGORY_LEGEND: { color: Color; label: string }[] = [
	{ color: 'purple', label: 'tools' },
	{ color: 'green', label: 'rules' },
	{ color: 'blue', label: 'conversation' },
	{ color: 'orange', label: 'skills' },
]

const TODOS: TodoItem[] = [
	{ id: '1', content: 'Scaffold Vite + shim alias', status: 'completed' },
	{
		id: '2',
		content: 'Implement the full cursor/canvas surface',
		status: 'completed',
	},
	{
		id: '3',
		content: 'Render the showcase in the IDE and on Pages',
		status: 'in_progress',
	},
	{ id: '4', content: 'Pixel-perfect theme parity', status: 'pending' },
	{
		id: '5',
		content: 'Vendor official .d.ts as the type source',
		status: 'cancelled',
	},
]

/** Extra rows on the selectable TodoList so the right column matches the left stack height. */
const TODOS_SELECTABLE: TodoItem[] = [
	...TODOS,
	{
		id: '6',
		content: 'Keep README showcase PNGs in sync after layout edits',
		status: 'pending',
	},
	{
		id: '7',
		content: 'Run contract + verify on every SDK bump',
		status: 'pending',
	},
]

const DIFF_LINES: DiffLineData[] = [
	{
		type: 'unchanged',
		content: "import { H1 } from 'cursor/canvas';",
		lineNumber: 1,
	},
	{ type: 'unchanged', content: '', lineNumber: 2 },
	{
		type: 'removed',
		content: 'export default function Demo() {',
		lineNumber: 3,
	},
	{
		type: 'added',
		content: 'export default function Showcase() {',
		lineNumber: 3,
	},
	{ type: 'unchanged', content: '  return <H1>Hello</H1>;', lineNumber: 4 },
	{ type: 'unchanged', content: '}', lineNumber: 5 },
]

const STEPS: { n: string; title: string; desc: string }[] = [
	{
		n: '1',
		title: 'Author',
		desc: 'Write a .canvas.tsx that imports only cursor/canvas.',
	},
	{
		n: '2',
		title: 'Alias',
		desc: 'Vite + tsconfig redirect cursor/canvas at build time.',
	},
	{
		n: '3',
		title: 'Shim',
		desc: 'Mantine implements the same API, props, and tones.',
	},
	{
		n: '4',
		title: 'Export',
		desc: 'open-canvas generate → HTML, PNG, PDF beside the canvas.',
	},
]

const DAG_NODE_W = 96
const DAG_NODE_H = 40

const DAG = computeDAGLayout({
	nodes: [
		{ id: 'Plan' },
		{ id: 'Search' },
		{ id: 'Edit' },
		{ id: 'Test' },
		{ id: 'Review' },
	],
	edges: [
		{ from: 'Plan', to: 'Search' },
		{ from: 'Search', to: 'Edit' },
		{ from: 'Edit', to: 'Test' },
		{ from: 'Test', to: 'Review' },
		{ from: 'Review', to: 'Edit' },
	],
	direction: 'horizontal',
	nodeWidth: DAG_NODE_W,
	nodeHeight: DAG_NODE_H,
	rankGap: 52,
	nodeGap: 18,
	padding: 32,
})

/* -------------------------------------------------------------- subsections */

function Section({
	title,
	id,
	children,
}: {
	title: string;
	id?: string;
	children: StackProps['children']
}) {
	return (
		<div id={id}>
			<Stack gap={10}>
				<H2>{title}</H2>
				{children}
			</Stack>
		</div>
	)
}

function DagDiagram() {
	const theme = useHostTheme()
	const labelOf = (id: string) => id
	const backEdgeLift = 48
	return (
		<div style={{ width: '100%' }}>
			<svg
				viewBox={`0 0 ${DAG.width} ${DAG.height}`}
				width="100%"
				height="auto"
				preserveAspectRatio="xMidYMid meet"
				role="img"
				aria-label="Agent loop graph"
				style={{ display: 'block', minHeight: 88, maxHeight: 140 }}
			>
				<defs>
					<marker
						id="dag-arrow"
						viewBox="0 0 8 8"
						refX={7}
						refY={4}
						markerWidth={6}
						markerHeight={6}
						orient="auto-start-reverse"
					>
						<path d="M0 0L8 4L0 8z" fill={theme.text.tertiary} />
					</marker>
					<marker
						id="dag-arrow-back"
						viewBox="0 0 8 8"
						refX={7}
						refY={4}
						markerWidth={6}
						markerHeight={6}
						orient="auto-start-reverse"
					>
						<path d="M0 0L8 4L0 8z" fill={theme.accent.primary} />
					</marker>
				</defs>
				{DAG.ranks.map(rank => (
					<rect
						key={rank.rank}
						x={rank.x}
						y={rank.y}
						width={rank.width}
						height={rank.height}
						rx={8}
						fill={theme.fill.secondary}
						stroke={theme.stroke.secondary}
						strokeWidth={1}
					/>
				))}
				{DAG.edges.map(edge =>
					edge.isBackEdge ? (
						<path
							key={`${edge.from}-${edge.to}`}
							d={`M ${edge.sourceX} ${edge.sourceY} C ${edge.sourceX} ${edge.sourceY - backEdgeLift}, ${edge.targetX} ${edge.targetY - backEdgeLift}, ${edge.targetX} ${edge.targetY}`}
							fill="none"
							stroke={theme.accent.primary}
							strokeWidth={1.5}
							strokeDasharray="4 3"
							markerEnd="url(#dag-arrow-back)"
						/>
					) : (
						<line
							key={`${edge.from}-${edge.to}`}
							x1={edge.sourceX}
							y1={edge.sourceY}
							x2={edge.targetX}
							y2={edge.targetY}
							stroke={theme.text.tertiary}
							strokeWidth={1.5}
							markerEnd="url(#dag-arrow)"
						/>
					),
				)}
				{DAG.nodes.map(node => (
					<g key={node.id}>
						<rect
							x={node.x}
							y={node.y}
							width={DAG_NODE_W}
							height={DAG_NODE_H}
							rx={6}
							fill={theme.fill.primary}
							stroke={theme.stroke.primary}
						/>
						<text
							x={node.x + DAG_NODE_W / 2}
							y={node.y + DAG_NODE_H / 2}
							textAnchor="middle"
							dominantBaseline="central"
							fontSize={12}
							fill={theme.text.primary}
						>
							{labelOf(node.id)}
						</text>
					</g>
				))}
			</svg>
		</div>
	)
}

const SEQ_ACTORS = [
	{ label: 'CI', sub: 'orchestrator' },
	{ label: 'CLI', sub: 'runner' },
	{ label: 'API', sub: 'service' },
	{ label: 'Worker', sub: 'queue' },
]

type SeqKind = 'call' | 'return' | 'async'

const SEQ_MESSAGES: {
	from: number;
	to: number;
	label: string;
	kind: SeqKind;
	step?: string
}[] = [
	{ from: 0, to: 1, label: 'invoke', kind: 'call', step: '1' },
	{ from: 1, to: 2, label: 'submit job', kind: 'call' },
	{ from: 2, to: 1, label: 'accepted', kind: 'return' },
	{ from: 2, to: 3, label: 'enqueue', kind: 'async' },
	{ from: 3, to: 2, label: 'complete', kind: 'async' },
	{ from: 1, to: 0, label: 'exit code', kind: 'return' },
]

function SequenceDiagram() {
	const theme = useHostTheme()
	const boxStroke = theme.stroke.primary
	const lifelineStroke = theme.stroke.secondary
	const width = 920
	const headerH = 52
	const rowH = 34
	const gap = 14
	const labelRail = 40
	const boxW = 120
	const slot = (width - labelRail - 12) / SEQ_ACTORS.length
	const centers = SEQ_ACTORS.map(
		(_, index) => labelRail + slot * index + slot / 2,
	)
	const rows = SEQ_MESSAGES.map((message, index) => {
		const previous = SEQ_MESSAGES[index - 1]
		const extra = message.step && previous ? gap : 0
		return { message, extra }
	})
	let cursor = headerH + 16
	const placed = rows.map((row) => {
		cursor += row.extra
		const y = cursor
		cursor += rowH
		return { ...row, y }
	})
	const height = cursor + 12
	const highlight = 1

	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			width="100%"
			role="img"
			aria-label="Sequence diagram: CI invokes a CLI that talks to an API and async worker"
			style={{ display: 'block' }}
		>
			{SEQ_ACTORS.map((actor, index) => {
				const x = centers[index] - boxW / 2
				const primary = index === highlight
				return (
					<g key={actor.label}>
						<rect
							x={x}
							y={8}
							width={boxW}
							height={40}
							rx={6}
							fill={primary ? theme.fill.tertiary : theme.bg.elevated}
							stroke={primary ? theme.accent.primary : boxStroke}
							strokeWidth={1.5}
						/>
						<text
							x={centers[index]}
							y={26}
							textAnchor="middle"
							fill={theme.text.primary}
							fontSize={13}
							fontWeight={600}
						>
							{actor.label}
						</text>
						<text
							x={centers[index]}
							y={40}
							textAnchor="middle"
							fill={theme.text.tertiary}
							fontSize={10}
						>
							{actor.sub}
						</text>
						<line
							x1={centers[index]}
							y1={52}
							x2={centers[index]}
							y2={height - 8}
							stroke={lifelineStroke}
							strokeWidth={2}
							strokeDasharray="4 5"
						/>
					</g>
				)
			})}
			{placed.map(({ message, y }) => {
				const x1 = centers[message.from]
				const x2 = centers[message.to]
				const dir = x2 >= x1 ? 1 : -1
				const dashed = message.kind !== 'call'
				const color = dashed ? theme.stroke.primary : theme.accent.primary
				const lineWidth = dashed ? 2 : 2.5
				const mid = (x1 + x2) / 2
				const head = 8
				const tip = x2 - dir * 2
				return (
					<g key={`${message.label}-${y}`}>
						{message.step && (
							<text
								x={8}
								y={y - 10}
								fill={theme.text.tertiary}
								fontSize={10}
								fontWeight={600}
							>
								{message.step}
							</text>
						)}
						<line
							x1={x1}
							y1={y}
							x2={tip - dir * head}
							y2={y}
							stroke={color}
							strokeWidth={lineWidth}
							strokeDasharray={dashed ? '5 4' : undefined}
						/>
						<polygon
							points={`${tip},${y} ${tip - dir * head},${y - 5} ${tip - dir * head},${y + 5}`}
							fill={color}
						/>
						<text
							x={mid}
							y={y - 6}
							textAnchor="middle"
							fill={theme.text.primary}
							fontSize={11}
						>
							{message.label}
						</text>
					</g>
				)
			})}
		</svg>
	)
}

/* --------------------------------------------------------------------- main */

export default function ShowcaseCanvas() {
	const dispatch = useCanvasAction()
	const [env, setEnv] = useCanvasState('show.env', 'production')
	const [filter, setFilter] = useCanvasState('show.filter', '')
	const [note, setNote] = useCanvasState('show.note', '')
	const [verbose, setVerbose] = useCanvasState('show.verbose', false)
	const [live, setLive] = useCanvasState('show.live', true)
	const [tab, setTab] = useCanvasState('show.tab', 'charts')
	const [selectedTodo, setSelectedTodo] = useCanvasState('show.todo', '3')

	const theme = useHostTheme()
	const mounts = useRef(0)
	const [hookMark, setHookMark] = useState('pending')
	useEffect(() => {
		mounts.current += 1
		setHookMark(`mounted ${mounts.current}`)
	}, [])
	const dimmed = useMemo(
		() =>
			new Set(TODOS.filter(t => t.status === 'completed').map(t => t.id)),
		[],
	)

	const { meta, kpis, durationByPhase } = report
	const grokPalette =
		theme.kind === 'light' ? canvasPaletteGrokLight : canvasPaletteGrokDark
	const cap = { color: theme.text.tertiary, fontSize: 12 }

	const envTraffic = useMemo(() => {
		if (env === 'staging') {
			return { rps: '1.2k', tone: 'warning' as const, hint: 'mirrored subset' }
		}
		if (env === 'dev') {
			return { rps: '120', tone: 'info' as const, hint: 'local stack' }
		}
		return { rps: '3.2k', tone: 'success' as const, hint: 'primary region' }
	}, [env])

	const outlierRowTone = useMemo(
		() =>
			outlierRows.map((_, i) => {
				if (i === 0) {
					return 'danger' as const
				}
				if (i < 3) {
					return 'warning' as const
				}
				if (i === outlierRows.length - 1) {
					return 'success' as const
				}
				return undefined
			}),
		[],
	)
	const rssRows = (phaseRssMb as PhaseRssMb).rows
	const phases = durationByPhase.rows.map(r => r.phase)
	const durationSeries: ChartSeries[] = [
		{ name: 'p50', data: durationByPhase.rows.map(r => r.p50), tone: 'info' },
		{
			name: 'p90',
			data: durationByPhase.rows.map(r => r.p90),
			tone: 'warning',
		},
	]
	const dayLabels = daily.map(d => d.date.slice(5))

	return (
		<Stack gap={20}>
			{/* Header --------------------------------------------------------- */}
			<Row gap={12} align="center">
				<H1>Cursor Canvas SDK showcase</H1>
				<Spacer />
				<ExportThemeToggleLink />
				<Link href={repoUrl}>open-canvas</Link>
			</Row>

			<Text tone="secondary">
				Full <Code>cursor/canvas</Code> gallery — <Code>../package.json</Code>,{' '}
				<Code>./data/*</Code> (JSON, YAML, TSV, CSV, JSONL).
			</Text>

			{/* How it works (stepped explanation, not a callout) -------------- */}
			<Section title="How it works">
				<Grid columns={3} gap={12}>
					{STEPS.slice(0, 3).map(step => (
						<Card key={step.n}>
							<CardBody>
								<Stack gap={6}>
									<Pill tone="info">{step.n}</Pill>
									<Text weight="semibold">{step.title}</Text>
									<Text size="small" tone="secondary">
										{step.desc}
									</Text>
								</Stack>
							</CardBody>
						</Card>
					))}
				</Grid>
			</Section>

			{/* Stats ---------------------------------------------------------- */}
			<Grid columns={3} gap={12}>
				<Card>
					<CardBody>
						<Stat value="35" label="Components" tone="info" />
					</CardBody>
				</Card>
				<Card>
					<CardBody>
						<Stat value="3" label="Hooks" tone="success" />
					</CardBody>
				</Card>
				<Card>
					<CardBody>
						<Stat value="1" label="Source of truth" />
					</CardBody>
				</Card>
			</Grid>

			{/* Charts, tables & context --------------------------------------- */}
			<Section id="section-charts" title="Charts, tables & context">
				<Stack gap={12}>
					<Row gap={8} wrap>
						{(['charts', 'table', 'context'] as const).map(key => (
							<Pill key={key} active={tab === key} onClick={() => setTab(key)}>
								{key}
							</Pill>
						))}
					</Row>

					{tab === 'charts' && (
						<Stack gap={16}>
							<Grid columns={2} gap={16}>
								<Card>
									<CardHeader>Latency (ms)</CardHeader>
									<CardBody>
										<LineChart
											categories={CATEGORIES}
											series={LATENCY}
											height={SHOWCASE_CHART_HEIGHT}
											valueSuffix="ms"
										/>
									</CardBody>
								</Card>
								<Card>
									<CardHeader>Requests by source</CardHeader>
									<CardBody>
										<BarChart
											categories={CATEGORIES}
											series={REQUESTS}
											height={SHOWCASE_CHART_HEIGHT}
											stacked
										/>
									</CardBody>
								</Card>
							</Grid>
							<Grid columns={2} gap={16}>
								<Card>
									<CardHeader>Test outcomes (pie)</CardHeader>
									<CardBody
										style={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											minHeight: SHOWCASE_CHART_HEIGHT,
										}}
									>
										<PieChart data={OUTCOMES} size={SHOWCASE_CHART_HEIGHT} />
									</CardBody>
								</Card>
								<Card>
									<CardHeader>Test outcomes (donut)</CardHeader>
									<CardBody
										style={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											minHeight: SHOWCASE_CHART_HEIGHT,
										}}
									>
										<PieChart
											data={OUTCOMES}
											donut
											size={SHOWCASE_CHART_HEIGHT}
										/>
									</CardBody>
								</Card>
							</Grid>
							<Card>
								<CardHeader>Callout tones</CardHeader>
								<CardBody>
									<Stack gap={8}>
										<Callout tone="success" title="Deployed">
											Build published to Pages.
										</Callout>
										<Callout tone="warning">
											Cooldown gate active for fresh packages.
										</Callout>
										<Callout tone="danger" title="Failing">
											1 service degraded.
										</Callout>
										<Callout tone="info" title="Info">
											Contract tests track the IDE SDK snapshot.
										</Callout>
										<Callout tone="neutral">
											Neutral callout for secondary notices.
										</Callout>
									</Stack>
								</CardBody>
							</Card>
						</Stack>
					)}

					{tab === 'table' && (
						<Table
							headers={['Service', 'Status', 'RPS']}
							columnAlign={['left', 'left', 'right']}
							rowTone={serviceTableRows().map(r => r.tone)}
							striped
							rows={serviceTableRows().map(r => [
								r.row[0],
								<Pill
									tone={
										r.tone === 'success'
											? 'success'
											: r.tone === 'warning'
												? 'warning'
												: 'deleted'
									}
								>
									{r.row[1]}
								</Pill>,
								r.row[2],
							])}
						/>
					)}

					{tab === 'context' && (
						<Card>
							<CardHeader>Context budget</CardHeader>
							<CardBody>
								<Stack gap={10}>
									<UsageBar
										total={120000}
										topLeftLabel="64% full"
										topRightLabel="76.8K / 120K tokens"
										segments={[
											{ id: 'tools', value: 24000, color: 'purple' },
											{ id: 'rules', value: 12000, color: 'green' },
											{ id: 'conversation', value: 28000, color: 'blue' },
											{ id: 'skills', value: 12800, color: 'orange' },
										]}
									/>
									<Row gap={14} wrap>
										{CATEGORY_LEGEND.map(c => (
											<Row key={c.label} gap={6}>
												<Swatch color={c.color} />
												<Text size="small" tone="secondary">
													{c.label}
												</Text>
											</Row>
										))}
									</Row>
								</Stack>
							</CardBody>
						</Card>
					)}
				</Stack>
			</Section>

			{/* Chart axis / guides (exercises referenceLines, fill, normalized) */}
			<Section title="Chart guides & axes">
				<Grid columns={2} gap={16}>
					<Card>
						<CardHeader>Uptime % (SLO line, fill, tight axis)</CardHeader>
						<CardBody>
							<LineChart
								categories={CATEGORIES}
								series={UPTIME}
								height={180}
								fill
								showValues
								beginAtZero={false}
								yMin={99}
								yMax={100}
								valueSuffix="%"
								referenceLines={[{ value: 99.9, label: 'SLO', tone: 'danger' }]}
								showHoverGuide
							/>
						</CardBody>
					</Card>
					<Card>
						<CardHeader>Traffic share (normalized)</CardHeader>
						<CardBody>
							<BarChart
								categories={SHARE_WEEKS}
								series={TRAFFIC_SHARE}
								height={180}
								normalized
								stacked
								valueSuffix="%"
							/>
						</CardBody>
					</Card>
					<Card variant="borderless">
						<CardHeader>Lane depth (horizontal, long labels)</CardHeader>
						<CardBody>
							<BarChart
								categories={[
									'Aurora north intake',
									'HUD memory pressure',
									'Local-vs-CI divergence label',
									'ship',
								]}
								series={[
									{ name: 'Depth', data: [40, 85, 170, 255], tone: 'warning' },
								]}
								height={200}
								horizontal
								beginAtZero
								showValues
							/>
						</CardBody>
					</Card>
					<Card>
						<CardHeader>Grouped bars + budget line</CardHeader>
						<CardBody>
							<BarChart
								categories={CATEGORIES.slice(0, 4)}
								series={[
									{
										name: 'Actual',
										data: [180, 210, 195, 240],
										tone: 'info',
									},
									{
										name: 'Forecast',
										data: [200, 200, 200, 200],
										tone: 'neutral',
									},
								]}
								height={180}
								yMax={280}
								referenceLines={[
									{ value: 200, label: 'Budget', tone: 'warning' },
								]}
							/>
						</CardBody>
					</Card>
				</Grid>
				<Divider />
				<Grid columns="1.2fr 1fr" gap={16}>
					<Card>
						<CardHeader>Dual series, filled area</CardHeader>
						<CardBody>
							<LineChart
								categories={DRAIN_CHECKPOINTS}
								series={DRAIN_SERIES}
								height={200}
								fill
								beginAtZero
								valueSuffix=" GB"
								showValues
							/>
							<Text size="small" tone="tertiary">
								Median reclaimed resources vs checkpoint (illustrative).
							</Text>
						</CardBody>
					</Card>
					<Card>
						<CardHeader trailing="no bar labels">
							Weekly volume
						</CardHeader>
						<CardBody>
							<BarChart
								categories={SHARE_WEEKS}
								series={[
									{
										name: 'Builds',
										data: [42, 51, 48],
										tone: 'neutral',
									},
								]}
								height={160}
								showValues={false}
							/>
							<Row justify="space-between" align="end">
								<Text size="small" tone="secondary">
									Row justify / align
								</Text>
								<Text size="small" tone="quaternary">
									quaternary caption
								</Text>
							</Row>
						</CardBody>
					</Card>
				</Grid>
			</Section>

			{/* Graph ---------------------------------------------------------- */}
			<Section title="Graph layout (computeDAGLayout)">
				<Card>
					<CardBody>
						<Stack gap={8}>
							<Text size="small" tone="secondary">
								Pure layout math; rendering is the canvas's job. The dashed
								accent edge is a detected back-edge (cycle).
							</Text>
							<DagDiagram />
						</Stack>
					</CardBody>
				</Card>
			</Section>

			<Section title="Sequence diagram (SVG)">
				<Card>
					<CardBody>
						<Stack gap={8}>
							<Text size="small" tone="secondary">
								Solid arrows are synchronous calls; dashed arrows are returns or
								async hand-offs. Same host tokens as the DAG chart above.
							</Text>
							<SequenceDiagram />
						</Stack>
					</CardBody>
				</Card>
			</Section>

			{/* Diff ----------------------------------------------------------- */}
			<Section title="Diff">
				<Card collapsible defaultOpen>
					<CardHeader trailing={<DiffStats additions={1} deletions={1} />}>
						showcase.canvas.tsx
					</CardHeader>
					<CardBody style={{ padding: 0 }}>
						<DiffView
							path="showcase.canvas.tsx"
							language="typescript"
							lines={DIFF_LINES}
						/>
					</CardBody>
				</Card>
			</Section>

			{/* Disclosure & tasks -------------------------------------------- */}
			<Section title="Disclosure & tasks">
				<Grid columns={2} gap={16} align="start">
					<Stack gap={8}>
						<CollapsibleSection
							title="Tools"
							count={2}
							leading={<Swatch color="purple" />}
							trailing={
								<Text size="small" tone="tertiary">
									12.3k
								</Text>
							}
							defaultOpen
						>
							<CollapsibleSection title="Grep">
								<Text size="small" tone="secondary">
									Nested borderless rows read as a tree.
								</Text>
							</CollapsibleSection>
							<CollapsibleSection title="Edit">
								<Text size="small" tone="secondary">
									Each row toggles independently.
								</Text>
							</CollapsibleSection>
						</CollapsibleSection>
						<TodoListCard
							todos={TODOS}
							dimmedTodoIds={dimmed}
							defaultExpanded
						/>
					</Stack>
					<Card>
						<CardHeader trailing={<Pill active>selectable</Pill>}>
							TodoList
						</CardHeader>
						<CardBody>
							<TodoList
								todos={TODOS_SELECTABLE}
								onTodoClick={t => setSelectedTodo(t.id)}
							/>
							<Text size="small" tone="tertiary" style={{ marginTop: 8 }}>
								Selected: {selectedTodo}
							</Text>
						</CardBody>
					</Card>
				</Grid>
			</Section>

			{/* Typography + theme (half width each; stack on narrow viewports) ----- */}
			<Section title="Typography & theme">
				<Grid
					columns="repeat(auto-fit, minmax(min(100%, 22rem), 1fr))"
					gap={16}
					align="start"
				>
					<Card>
						<CardHeader>Typography & text</CardHeader>
						<CardBody>
							<Stack gap={6}>
								<Text>
									Nested emphasis stays inline, including{' '}
									<Text weight="semibold">25 staged items</Text>
								</Text>
								<Text tone="secondary" size="small">
									A second line of body copy sits directly under the emphasis.
								</Text>
								<H3>Heading level 3</H3>
								<Text>Primary body text in the default tone and weight.</Text>
								<Text tone="secondary">Secondary — supporting copy.</Text>
								<Text tone="tertiary" size="small">
									Tertiary, small — captions and hints.
								</Text>
								<Text tone="quaternary" size="small">
									Quaternary — footnotes and source lines.
								</Text>
								<Text weight="semibold">Semibold emphasis.</Text>
								<Text italic tone="secondary">
									Italic remark.
								</Text>
								<Row gap={6} wrap>
									<Pill tone="success">success</Pill>
									<Pill tone="warning">warning</Pill>
									<Pill tone="info" leadingContent={<Swatch color="blue" />}>
										with swatch
									</Pill>
									<Pill tone="neutral" keyboardHint="⇧Tab">
										hint
									</Pill>
									<Pill tone="deleted">deleted</Pill>
									<Pill tone="renamed">renamed</Pill>
								</Row>
							</Stack>
						</CardBody>
					</Card>
					<Card>
						<CardHeader>Theme tokens (useHostTheme)</CardHeader>
						<CardBody>
							<Stack gap={10}>
								<Text size="small" tone="secondary">
									Semantic palette keys from <Code>theme.palette</Code>:
								</Text>
								<Row gap={10} wrap>
									{(
										[
											['accent', theme.palette.accent],
											['link', theme.palette.link],
											['strokePrimary', theme.palette.strokePrimary],
										] as const
									).map(([key, hex]) => (
										<Row key={key} gap={6}>
											<span
												style={{
													width: 16,
													height: 16,
													borderRadius: 4,
													background: hex,
													border: `1px solid ${theme.stroke.secondary}`,
												}}
											/>
											<Text size="small" tone="tertiary">
												chart.{key}
											</Text>
										</Row>
									))}
								</Row>
								<Text size="small" tone="secondary">
									Category hues (<Code>theme.category</Code>):
								</Text>
								<Row gap={10} wrap>
									{(
										[
											['orange', theme.category.orange],
											['blue', theme.category.blue],
											['gray', theme.category.gray],
										] as const
									).map(([key, hex]) => (
										<Row key={key} gap={6}>
											<span
												style={{
													width: 16,
													height: 16,
													borderRadius: 4,
													background: hex,
													border: `1px solid ${theme.stroke.secondary}`,
												}}
											/>
											<Text size="small" tone="tertiary">
												category.{key}
											</Text>
										</Row>
									))}
								</Row>
								<Text size="small" tone="secondary">Text fills:</Text>
								<Grid columns={2} gap={8}>
									{(['primary', 'secondary', 'tertiary', 'quaternary'] as const).map(
										key => (
											<div
												key={key}
												style={mergeStyle(
													{
														display: 'flex',
														alignItems: 'center',
														gap: 8,
														padding: '6px 10px',
														borderRadius: 6,
														border: `1px solid ${theme.stroke.secondary}`,
														minWidth: 0,
													},
													{ background: theme.fill.quaternary },
												)}
											>
												<span
													style={{
														width: 14,
														height: 14,
														borderRadius: 4,
														background: theme.text[key],
														flexShrink: 0,
													}}
												/>
												<Text size="small" tone="secondary">
													text.{key}
												</Text>
											</div>
										),
									)}
								</Grid>
								<Text size="small" tone="tertiary">
									React hooks: {hookMark}. First{' '}
									<Code>usageColorSequence</Code> hue: {usageColorSequence[0]}.
								</Text>
							</Stack>
						</CardBody>
					</Card>
				</Grid>
			</Section>

			<Section title="Host brand (Cursor vs Grok)">
				<Stack gap={10}>
					<Row gap={8} wrap>
						<Pill active={theme.brand === 'cursor'}>brand: {theme.brand}</Pill>
						<Text size="small" tone="secondary">
							<Code>useHostTheme().brand</Code> from the host (open-canvas{' '}
							<Code>--brand grok</Code> for export).
						</Text>
					</Row>
					<Row gap={16} wrap>
						<Card size="base">
							<CardHeader>
								<Text weight="semibold">Active accent (host)</Text>
							</CardHeader>
							<CardBody>
								<Row gap={8}>
									<span
										style={{
											width: 120,
											height: 32,
											borderRadius: theme.radius.md,
											background: theme.palette.accent,
											border: `1px solid ${theme.stroke.secondary}`,
										}}
									/>
									<Text size="small" tone="secondary">
										{theme.palette.accent}
									</Text>
								</Row>
							</CardBody>
						</Card>
						{theme.brand === 'cursor' ? (
							<Card size="base" variant="borderless">
								<CardHeader>
									<Text weight="semibold">Grok reference</Text>
								</CardHeader>
								<CardBody>
									<Row gap={8}>
										<span
											style={{
												width: 120,
												height: 32,
												borderRadius: 8,
												background: grokPalette.accent,
												border: `1px solid ${theme.stroke.secondary}`,
											}}
										/>
										<Text size="small" tone="secondary">
											{grokPalette.accent}
										</Text>
									</Row>
								</CardBody>
							</Card>
						) : null}
					</Row>
					<BarChart
						categories={['A', 'B', 'C']}
						series={[
							{ name: 's1', data: [3, 5, 2], tone: 'info' },
							{ name: 's2', data: [2, 4, 6], tone: 'success' },
						]}
						height={140}
					/>
				</Stack>
			</Section>

			{/* Forms ---------------------------------------------------------- */}
			<Section title="Forms (state persists via useCanvasState)">
				<Card>
					<CardBody>
						<Stack gap={12}>
							<Card variant="borderless">
								<CardHeader trailing="reads sidecar on export">
									Environment snapshot
								</CardHeader>
								<CardBody
									style={{
										background: theme.bg.editor,
										borderRadius: 8,
										padding: 12,
									}}
								>
									<Row gap={16} wrap align="center">
										<Stat
											value={envTraffic.rps}
											label={`${env} · ${envTraffic.hint}`}
											tone={envTraffic.tone}
										/>
										<Text size="small" tone="secondary">
											Change Environment below —{' '}
											<Code>.canvas.data.json</Code> is inlined on export.
										</Text>
									</Row>
								</CardBody>
							</Card>
							<Grid columns={2} gap={16}>
								<Stack gap={6}>
									<Text size="small" tone="secondary" weight="medium">
										Environment
									</Text>
									<Select
										value={env}
										onChange={setEnv}
										options={[
											{ value: 'production', label: 'Production' },
											{ value: 'staging', label: 'Staging' },
											{ value: 'dev', label: 'Development' },
										]}
									/>
								</Stack>
								<Stack gap={6}>
									<Text size="small" tone="secondary" weight="medium">
										Filter
									</Text>
									<TextInput
										value={filter}
										onChange={setFilter}
										placeholder="service name…"
									/>
								</Stack>
							</Grid>
							<Stack gap={6}>
								<Text size="small" tone="secondary" weight="medium">
									Release note
								</Text>
								<TextArea
									value={note}
									onChange={setNote}
									placeholder="What changed…"
									rows={2}
								/>
							</Stack>
							<Row gap={16} wrap>
								<Checkbox
									label="Verbose logging"
									checked={verbose}
									onChange={setVerbose}
								/>
								<Row gap={8}>
									<Text size="small" tone="secondary">
										Live updates
									</Text>
									<Toggle checked={live} onChange={setLive} />
								</Row>
								<Spacer />
								<Button variant="ghost">Reset</Button>
								<Button variant="secondary">Preview</Button>
								<Button
									variant="primary"
									onClick={() =>
										dispatch({ type: 'openAgent', agentId: 'demo' })
									}
								>
									Deploy
								</Button>
							</Row>
						</Stack>
					</CardBody>
				</Card>
			</Section>

			<Section title="Data imports (JSON, YAML, TSV, CSV, JSONL)">
				<Stack gap={12}>
					<Grid columns={3} gap={12}>
						<Card>
							<CardBody>
								<Stat value={pkg.version} label="Version" />
							</CardBody>
						</Card>
						<Card>
							<CardBody>
								<Stat value={shimDep} label="@flesler/cursor-canvas-web" />
							</CardBody>
						</Card>
						<Card>
							<CardBody>
								<Stat value={pkg.license} label="License" />
							</CardBody>
						</Card>
					</Grid>
					<Text size="small" tone="secondary">
						{meta.periodStart} → {meta.periodEnd} ·{' '}
						{meta.deployCount.toLocaleString()} deploys · {deployEvents.length}{' '}
						tail events in JSONL
					</Text>
					<Grid columns={3} gap={12}>
						{kpis.map(k => (
							<Card key={k.label}>
								<CardBody>
									<Stat value={k.value} label={k.label} />
									{k.hint && (
										<Text style={{ ...cap, marginTop: 4 }}>{k.hint}</Text>
									)}
								</CardBody>
							</Card>
						))}
					</Grid>
					<Callout tone="danger" title="Deps dominates p90; watch tail latency">
						Deps ~51% of p90 wall time (211s of 412s). Max 47m 27s is 6.9× p90 —
						check cache and workspace size.
					</Callout>
					<Grid columns={2} gap={16}>
						<Card>
							<CardHeader>Phase duration (p50 vs p90)</CardHeader>
							<CardBody>
								<Text style={cap}>Y: seconds</Text>
								<BarChart
									categories={phases}
									series={durationSeries}
									height={260}
									valuePrefix="$"
									valueSuffix="s"
								/>
							</CardBody>
						</Card>
						<Card>
							<CardHeader>Peak RSS by phase (p90)</CardHeader>
							<CardBody>
								<Text style={cap}>Y: megabytes</Text>
								<BarChart
									categories={rssRows.map(r => r.phase)}
									series={[
										{
											name: 'p90',
											data: rssRows.map(r => r.p90),
											tone: 'danger',
										},
									]}
									height={260}
									valueSuffix=" MB"
								/>
							</CardBody>
						</Card>
					</Grid>
					<Grid columns={2} gap={16}>
						<Card>
							<CardHeader>Daily total duration p90</CardHeader>
							<CardBody>
								<LineChart
									categories={dayLabels}
									series={[
										{
											name: 'p90',
											data: daily.map(d => Number(d.totalDurationP90Sec)),
											tone: 'info',
										},
									]}
									height={220}
									valueSuffix="s"
								/>
							</CardBody>
						</Card>
						<Card>
							<CardHeader>Daily deploy volume</CardHeader>
							<CardBody>
								<BarChart
									categories={dayLabels}
									series={[
										{
											name: 'deploys',
											data: daily.map(d => Number(d.deploys)),
											tone: 'neutral',
										},
									]}
									height={220}
									beginAtZero
									showValues
								/>
							</CardBody>
						</Card>
					</Grid>
					<Card>
						<CardHeader>Slowest deploys (top 8)</CardHeader>
						<CardBody>
							<Table
								headers={OUTLIER_TABLE.headers}
								columnAlign={['left', 'left', 'right', 'right', 'right']}
								rowTone={outlierRowTone}
								rows={OUTLIER_TABLE.rows}
								striped
							/>
						</CardBody>
					</Card>
				</Stack>
			</Section>

		</Stack>
	)
}
