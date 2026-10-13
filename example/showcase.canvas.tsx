/**
 * SDK showcase — `cursor/canvas` plus relative data files under ./data/.
 *
 * Single example for verify, smoke, contract, and the README screenshot.
 */
import { BarChart, Button, Callout, Card, CardBody, CardHeader, Checkbox, Code, CollapsibleSection, DiffStats, DiffView, Divider, Grid, H1, H2, H3, IconButton, LineChart, Link, PieChart, Pill, Row, Select, Spacer, Stack, Stat, Swatch, Table, Text, TextArea, TextInput, TodoList, TodoListCard, Toggle, UsageBar, colorPalette, computeDAGLayout, mergeStyle, useCanvasAction, useCanvasState, useHostTheme, useMemo, type ChartSeries, type Color, type DiffLineData, type StackProps, type TodoItem } from 'cursor/canvas'
import daily from './data/daily.tsv'
import deployEvents from './data/deploy-events.jsonl'
import outlierRows from './data/outliers.csv'
import phaseRssMb from './data/phase-rss.yaml'
import report from './data/report.json'

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
	{ name: 'uptime %', data: [99.2, 99.5, 99.1, 99.8, 99.6, 99.9], tone: 'success' },
]
const TRAFFIC_SHARE: ChartSeries[] = [
	{ name: 'Web', data: [40, 45, 50], tone: 'info' },
	{ name: 'API', data: [35, 30, 25], tone: 'success' },
	{ name: 'Batch', data: [25, 25, 25], tone: 'neutral' },
]
const SHARE_WEEKS = ['W1', 'W2', 'W3']
const QUEUE: ChartSeries[] = [
	{ name: 'ready', data: [12, 8, 15, 6], tone: 'neutral' },
	{ name: 'retry', data: [3, 5, 2, 4], tone: 'warning' },
]
const QUEUE_STAGES = ['ingest', 'build', 'test', 'ship']

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
	nodeWidth: 96,
	nodeHeight: 34,
	rankGap: 40,
	nodeGap: 18,
})

/* -------------------------------------------------------------- subsections */

function Section({
	title,
	children,
}: {
	title: string;
	children: StackProps['children']
}) {
	return (
		<Stack gap={10}>
			<H2>{title}</H2>
			{children}
		</Stack>
	)
}

function DagDiagram() {
	const theme = useHostTheme()
	const labelOf = (id: string) => id
	return (
		<div style={{ overflowX: 'auto' }}>
			<svg
				width={DAG.width}
				height={DAG.height}
				role="img"
				aria-label="Agent loop graph"
			>
				<defs>
					<marker
						id="arrow"
						viewBox="0 0 8 8"
						refX={7}
						refY={4}
						markerWidth={6}
						markerHeight={6}
						orient="auto-start-reverse"
					>
						<path d="M0 0L8 4L0 8z" fill={theme.text.tertiary} />
					</marker>
				</defs>
				{DAG.edges.map(edge =>
					edge.isBackEdge ? (
						<path
							key={`${edge.from}-${edge.to}`}
							d={`M ${edge.sourceX} ${edge.sourceY} C ${edge.sourceX} ${edge.sourceY - 42}, ${edge.targetX} ${edge.targetY - 42}, ${edge.targetX} ${edge.targetY}`}
							fill="none"
							stroke={theme.accent.primary}
							strokeWidth={1.5}
							strokeDasharray="4 3"
							markerEnd="url(#arrow)"
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
							markerEnd="url(#arrow)"
						/>
					),
				)}
				{DAG.nodes.map(node => (
					<g key={node.id}>
						<rect
							x={node.x}
							y={node.y}
							width={96}
							height={34}
							rx={6}
							fill={theme.fill.tertiary}
							stroke={theme.stroke.primary}
						/>
						<text
							x={node.x + 48}
							y={node.y + 17}
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
	const dimmed = useMemo(
		() =>
			new Set(
				TODOS.filter(t => t.status === 'completed').map(t => t.id),
			),
		[],
	)

	const { meta, kpis, durationByPhase } = report
	const cap = { color: theme.text.tertiary, fontSize: 12 }
	const rssRows = (phaseRssMb as { rows?: Array<{ phase: string; p90: number }> }).rows ?? []
	const phases = durationByPhase.rows.map(r => r.phase)
	const durationSeries: ChartSeries[] = [
		{ name: 'p50', data: durationByPhase.rows.map(r => r.p50), tone: 'info' },
		{ name: 'p90', data: durationByPhase.rows.map(r => r.p90), tone: 'warning' },
	]
	const dayLabels = daily.map(d => d.date.slice(5))

	return (
		<Stack gap={20}>
			{/* Header --------------------------------------------------------- */}
			<Row gap={12}>
				<H1>Cursor Canvas SDK showcase</H1>
				<Spacer />
				<Pill tone="info" active={live}>
					{live ? 'live' : 'paused'}
				</Pill>
				<IconButton
					title="Ask about this canvas in chat"
					onClick={() =>
						dispatch({
							type: 'newComposerChat',
							userPrompt: 'Explain this canvas',
						})
					}
				>
					?
				</IconButton>
			</Row>

			<Text tone="secondary">
				Full <Code>cursor/canvas</Code> gallery plus <Code>./data/*</Code> imports
				(JSON, YAML, TSV, CSV, JSONL) — one file for verify, smoke, and exports.
			</Text>

			{/* How it works (stepped explanation, not a callout) -------------- */}
			<Section title="How it works">
				<Grid columns={4} gap={12}>
					{STEPS.map(step => (
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
			<Grid columns={4} gap={12}>
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
				<Card>
					<CardBody>
						<Stat value="0" label="Canvas edits to deploy" tone="success" />
					</CardBody>
				</Card>
			</Grid>

			{/* Charts, tables & context --------------------------------------- */}
			<Section title="Charts, tables & context">
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
							<Grid columns={3} gap={16} align="start">
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
								<Card>
									<CardHeader>Test outcomes</CardHeader>
									<CardBody
										style={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											minHeight: SHOWCASE_CHART_HEIGHT,
										}}
									>
										<PieChart data={OUTCOMES} donut size={SHOWCASE_CHART_HEIGHT} />
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
							rowTone={['success', undefined, 'danger']}
							striped
							rows={[
								['api-gateway', <Pill tone="success">healthy</Pill>, '3.2k'],
								['workers', <Pill tone="warning">hot</Pill>, '8.1k'],
								['billing', <Pill tone="deleted">down</Pill>, '0'],
							]}
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
								referenceLines={[
									{ value: 99.9, label: 'SLO', tone: 'danger' },
								]}
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
						<CardHeader>Queue depth (horizontal stacked)</CardHeader>
						<CardBody>
							<BarChart
								categories={QUEUE_STAGES}
								series={QUEUE}
								height={160}
								horizontal
								stacked
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

			{/* Diff ----------------------------------------------------------- */}
			<Section title="Diff">
				<Card collapsible defaultOpen>
					<CardHeader trailing={<DiffStats additions={1} deletions={1} />}>
						showcase.canvas.tsx
					</CardHeader>
					<CardBody style={{ padding: 0 }}>
						<DiffView path="showcase.canvas.tsx" lines={DIFF_LINES} />
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
						<TodoListCard todos={TODOS} dimmedTodoIds={dimmed} defaultExpanded />
					</Stack>
					<Card>
						<CardHeader>TodoList (selectable)</CardHeader>
						<CardBody>
							<TodoList
								todos={TODOS}
								onTodoClick={t => setSelectedTodo(t.id)}
							/>
							<Text size="small" tone="tertiary" style={{ marginTop: 8 }}>
								Selected: {selectedTodo}
							</Text>
						</CardBody>
					</Card>
				</Grid>
			</Section>

			{/* Typography ----------------------------------------------------- */}
			<Section title="Typography & text">
				<Card>
					<CardBody>
						<Stack gap={6}>
							<H3>Heading level 3</H3>
							<Text>Primary body text in the default tone and weight.</Text>
							<Text tone="secondary">Secondary — supporting copy.</Text>
							<Text tone="tertiary" size="small">
								Tertiary, small — captions and hints.
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
			</Section>

			{/* Forms ---------------------------------------------------------- */}
			<Section title="Forms (state persists via useCanvasState)">
				<Card>
					<CardBody>
						<Stack gap={12}>
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

			{/* Theme tokens --------------------------------------------------- */}
			<Section title="Theme tokens (useHostTheme)">
				<Stack gap={10}>
					<Text size="small" tone="secondary">
						Chart palette keys (some IDE canvases read{' '}
						<Code>theme.chart.palette</Code>):
					</Text>
					<Row gap={10} wrap>
						{(
							[
								['green', theme.chart.palette.green],
								['blue', theme.chart.palette.blue],
								['neutralLine', theme.chart.palette.neutralLine],
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
				</Stack>
				<Row gap={10} wrap>
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
									}}
								/>
								<Text size="small" tone="secondary">
									text.{key}
								</Text>
							</div>
						),
					)}
				</Row>
			</Section>

			<Section title="Data imports (JSON, YAML, TSV, CSV, JSONL)">
				<Stack gap={12}>
					<Text size="small" tone="secondary">
						{meta.periodStart} → {meta.periodEnd} · {meta.deployCount.toLocaleString()} deploys ·{' '}
						{deployEvents.length} tail events in JSONL
					</Text>
					<Grid columns={3} gap={12}>
						{kpis.map(k => (
							<Card key={k.label}>
								<CardBody>
									<Stat value={k.value} label={k.label} />
									{k.hint && <Text style={{ ...cap, marginTop: 4 }}>{k.hint}</Text>}
								</CardBody>
							</Card>
						))}
					</Grid>
					<Callout tone="danger" title="Deps dominates p90; watch tail latency">
						Deps ~51% of p90 wall time (211s of 412s). Max 47m 27s is 6.9× p90 — check cache and workspace size.
					</Callout>
					<Grid columns={2} gap={16}>
						<Card>
							<CardHeader>Phase duration (p50 vs p90)</CardHeader>
							<CardBody>
								<Text style={cap}>Y: seconds</Text>
								<BarChart categories={phases} series={durationSeries} height={260} valueSuffix="s" />
							</CardBody>
						</Card>
						<Card>
							<CardHeader>Peak RSS by phase (p90)</CardHeader>
							<CardBody>
								<Text style={cap}>Y: megabytes</Text>
								<BarChart
									categories={rssRows.map(r => r.phase)}
									series={[{ name: 'p90', data: rssRows.map(r => r.p90), tone: 'danger' }]}
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
										{ name: 'deploys', data: daily.map(d => Number(d.deploys)), tone: 'neutral' },
									]}
									height={220}
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
								rows={OUTLIER_TABLE.rows}
								striped
							/>
						</CardBody>
					</Card>
				</Stack>
			</Section>

			<Divider />
			<Text size="small" tone="tertiary">
				<Code>cursor/canvas</Code> + relative data files · colors from{' '}
				<Code>useHostTheme()</Code> · category hues from <Code>colorPalette</Code>{' '}
				({Object.keys(colorPalette).length} hues) ·{' '}
				<Link href="https://github.com/flesler/open-canvas">open-canvas</Link> ·
				same file in the IDE, CLI verify, and static exports.
			</Text>
		</Stack>
	)
}
