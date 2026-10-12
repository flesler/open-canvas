import {
    BarChart,
    Callout,
    Card,
    CardBody,
    CardHeader,
    Grid,
    H1,
    LineChart,
    Stack,
    Stat,
    Table,
    Text,
    useHostTheme,
    type ChartSeries,
} from "cursor/canvas"

export type PushflowReport = {
  meta: {
    title: string;
    periodStart: string;
    periodEnd: string;
    deployCount: number;
  };
  kpis: { label: string; value: string; hint?: string }[];
  durationByPhase: { rows: { phase: string; p50: number; p90: number }[] };
  dailyTrend: { date: string; deploys: number; totalDurationP90Sec: number }[];
  phaseRssMb: { rows: { phase: string; p90: number }[] };
  outliers: { headers: string[]; rows: string[][] };
};

export default function PushflowBuildOlapCanvas({ report }: { report: PushflowReport }) {
  const theme = useHostTheme();
  const { meta, kpis, durationByPhase, dailyTrend, phaseRssMb, outliers } = report;
  const cap = { color: theme.text.tertiary, fontSize: 12 };

  const phases = durationByPhase.rows.map((r) => r.phase);
  const durationSeries: ChartSeries[] = [
    { name: "p50", data: durationByPhase.rows.map((r) => r.p50), tone: "info" },
    { name: "p90", data: durationByPhase.rows.map((r) => r.p90), tone: "warning" },
  ];
  const dayLabels = dailyTrend.map((d) => d.date.slice(5));

  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H1>{meta.title}</H1>
        <Text style={cap}>
          {meta.periodStart} → {meta.periodEnd} · {meta.deployCount.toLocaleString()} deploys
        </Text>
        <Text style={cap}>Source: Pushflow synthetic OLAP</Text>
      </Stack>

      <Grid columns={3} gap={12}>
        {kpis.map((k) => (
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
              categories={phaseRssMb.rows.map((r) => r.phase)}
              series={[{ name: "p90", data: phaseRssMb.rows.map((r) => r.p90), tone: "danger" }]}
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
              series={[{ name: "p90", data: dailyTrend.map((d) => d.totalDurationP90Sec), tone: "info" }]}
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
              series={[{ name: "deploys", data: dailyTrend.map((d) => d.deploys), tone: "neutral" }]}
              height={220}
            />
          </CardBody>
        </Card>
      </Grid>

      <Card>
        <CardHeader>Slowest deploys (top 8)</CardHeader>
        <CardBody>
          <Table
            headers={outliers.headers}
            columnAlign={["left", "left", "right", "right", "right"]}
            rows={outliers.rows}
            striped
          />
        </CardBody>
      </Card>
    </Stack>
  );
}
