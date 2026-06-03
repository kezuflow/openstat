import {
  type DashboardRun,
  getDashboardData,
  getDashboardInspectorData,
  getDashboardRuns,
} from "../../../lib/openstat-api";
import { DashboardCursorPagination } from "../dashboard-cursor-pagination";
import {
  DashboardDataTable,
  DashboardKpiCard,
  DashboardPanel,
  DashboardStatusChip,
  formatDateTime,
  formatNumber,
  formatRelativeTime,
} from "../dashboard-components";
import {
  getFirstParam,
  parseDashboardRange,
  parseInspectorKind,
  type DashboardSearchParams,
} from "../dashboard-page-utils";
import { DashboardRouteShell } from "../dashboard-route-shell";

type RunsPageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

const RUNS_PAGE_SIZE = 10;

export default async function RunsPage(props: RunsPageProps) {
  const searchParams = await props.searchParams;
  const range = parseDashboardRange(getFirstParam(searchParams?.range));
  const cursor = parseRunsCursor(getFirstParam(searchParams?.cursor));
  const cursorStack = parseRunsCursorStack(
    getFirstParam(searchParams?.cursorStack),
  );
  const inspect = parseInspectorKind(getFirstParam(searchParams?.inspect));
  const inspectId = getFirstParam(searchParams?.id);
  const [dashboardData, runData] = await Promise.all([
    getDashboardData(range, { includeRuns: false }),
    getDashboardRuns({ cursor, limit: RUNS_PAGE_SIZE }),
  ]);
  const data = {
    ...dashboardData,
    errors: [...dashboardData.errors, ...runData.errors],
    runs: runData.runs,
  };
  const totals = data.analytics?.totals ?? {};
  const series = data.analytics?.series ?? [];
  const runs = runData.runs;
  const stageItems = getStageItems(runs);
  const strategyItems = getStrategyItems(runs);
  const activeRuns = runs.filter((run) => getRunStage(run).tone === "watch");
  const failedRuns = runs.filter((run) => getRunStage(run).tone === "bad");
  const completedRuns = runs.filter((run) => getRunStage(run).tone === "good");
  const completionRate =
    runs.length > 0
      ? Math.round((completedRuns.length / runs.length) * 100)
      : 0;
  const inspector =
    inspect && inspectId
      ? await getDashboardInspectorData(inspect, inspectId)
      : undefined;
  const currentHref = buildRunsHref({ cursor, cursorStack, range });
  const currentPage = cursor ? cursorStack.length + 2 : 1;
  const previousCursor = cursorStack[cursorStack.length - 1];
  const previousHref = cursor
    ? buildRunsHref({
        cursor: previousCursor,
        cursorStack: cursorStack.slice(0, -1),
        range,
      })
    : undefined;
  const nextCursor = runData.pagination?.nextCursor ?? undefined;
  const nextHref = nextCursor
    ? buildRunsHref({
        cursor: nextCursor,
        cursorStack: cursor ? [...cursorStack, cursor] : cursorStack,
        range,
      })
    : undefined;
  const pageStart = (currentPage - 1) * RUNS_PAGE_SIZE + 1;
  const pageEnd = pageStart + Math.max(runs.length - 1, 0);

  return (
    <DashboardRouteShell
      closeHref={currentHref}
      data={data}
      inspector={inspector}
      range={range}
      title="Runs"
    >
      <section className="dashboard-kpi-grid dashboard-route-kpis runs-kpis">
        <DashboardKpiCard
          badge={{
            label:
              runs.length > 0 ? `${formatNumber(runs.length)} latest` : range,
            tone: "neutral",
          }}
          href="/dashboard/runs"
          label="Decision runs"
          series={series}
          seriesKey="decisions"
          tone="success"
          value={formatNumber(totals.decisions ?? runs.length)}
        />
        <DashboardKpiCard
          badge={{
            label: activeRuns.length > 0 ? "In flight" : "Idle",
            tone: activeRuns.length > 0 ? "warning" : "neutral",
          }}
          href="/dashboard/runs"
          label="Active queue"
          monitorBars={stageItems.map((stage) => ({
            tone: stage.tone,
          }))}
          monitorLabel="Run stages"
          tone={activeRuns.length > 0 ? "warning" : "neutral"}
          value={formatNumber(activeRuns.length)}
        />
        <DashboardKpiCard
          badge={{
            label: failedRuns.length > 0 ? "Needs review" : "Clear",
            tone: failedRuns.length > 0 ? "danger" : "success",
          }}
          href="/dashboard/runs"
          label="Failures"
          series={series}
          seriesKey="failures"
          tone={failedRuns.length > 0 ? "danger" : "success"}
          value={formatNumber(totals.failures ?? failedRuns.length)}
        />
        <DashboardKpiCard
          badge={{
            label: `${formatNumber(completedRuns.length)} completed`,
            tone: completionRate >= 80 ? "success" : "warning",
          }}
          href="/dashboard/runs"
          label="Completion rate"
          sparklinePoints={series.map((point) =>
            point.decisions > 0
              ? Math.round(
                  ((point.decisions - point.failures) / point.decisions) * 100,
                )
              : 0,
          )}
          tone={completionRate >= 80 ? "success" : "warning"}
          value={`${completionRate}%`}
        />
      </section>

      <section className="runs-workbench">
        <DashboardPanel
          actions={
            runData.pagination?.nextCursor ? (
              <span>{formatRunCount(runs.length, true)}</span>
            ) : (
              <span>{range} window</span>
            )
          }
          className="dashboard-latest-panel runs-table-panel"
          title="Run queue"
          titleCount={runs.length}
        >
          <DashboardDataTable
            empty="No runs yet."
            items={runs}
            columns={[
              {
                key: "run",
                label: "Run",
                render: (run) => (
                  <span className="runs-run-cell">
                    <a
                      className="dashboard-table-primary"
                      href={buildRunsHref({
                        cursor,
                        cursorStack,
                        id: run.id,
                        inspect: "run",
                        range,
                      })}
                    >
                      {run.strategy ?? run.externalRunId ?? run.id}
                    </a>
                    <small>{run.externalRunId ?? run.id}</small>
                  </span>
                ),
              },
              {
                key: "stage",
                label: "Stage",
                render: (run) => {
                  const stage = getRunStage(run);

                  return (
                    <span className={`runs-stage runs-stage-${stage.tone}`}>
                      {stage.label}
                    </span>
                  );
                },
              },
              {
                key: "status",
                label: "Status",
                render: (run) => <DashboardStatusChip status={run.status} />,
              },
              {
                key: "strategy",
                label: "Strategy",
                render: (run) => (
                  <span className="dashboard-table-secondary">
                    {run.strategy ?? "Unassigned"}
                  </span>
                ),
              },
              {
                key: "started",
                label: "Started",
                render: (run) => (
                  <span title={formatDateTime(run.startedAt)}>
                    {formatRelativeTime(run.startedAt)}
                  </span>
                ),
              },
              {
                key: "duration",
                label: "Duration",
                render: (run) => formatRunDuration(run),
              },
            ]}
          />
        </DashboardPanel>

        <aside className="runs-rail" aria-label="Run operations">
          <DashboardPanel
            className="dashboard-latest-panel runs-rail-panel"
            title="Stages"
          >
            <div className="runs-breakdown-list">
              {stageItems.map((item) => (
                <div className="runs-breakdown-item" key={item.label}>
                  <span>
                    <i
                      className={`runs-stage-dot runs-stage-dot-${item.tone}`}
                    />
                    {item.label}
                  </span>
                  <strong>{formatNumber(item.count)}</strong>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel
            className="dashboard-latest-panel runs-rail-panel"
            title="Strategies"
          >
            <div className="runs-breakdown-list">
              {strategyItems.length > 0 ? (
                strategyItems.map((item) => (
                  <a
                    className="runs-breakdown-item"
                    href={buildRunsHref({ cursor, cursorStack, range })}
                    key={item.label}
                  >
                    <span>{item.label}</span>
                    <strong>{formatNumber(item.count)}</strong>
                  </a>
                ))
              ) : (
                <p className="runs-empty-note">No strategies yet.</p>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel
            className="dashboard-latest-panel runs-rail-panel"
            title="Attention"
          >
            <div className="runs-attention-list">
              {failedRuns.length > 0 ? (
                failedRuns.slice(0, 4).map((run) => (
                  <a
                    href={buildRunsHref({
                      cursor,
                      cursorStack,
                      id: run.id,
                      inspect: "run",
                      range,
                    })}
                    key={run.id}
                  >
                    <strong>
                      {run.strategy ?? run.externalRunId ?? "Run"}
                    </strong>
                    <span>{run.status}</span>
                  </a>
                ))
              ) : (
                <p className="runs-empty-note">No failing runs.</p>
              )}
            </div>
          </DashboardPanel>
        </aside>
      </section>
      <DashboardCursorPagination
        nextHref={nextHref}
        page={currentPage}
        previousHref={previousHref}
        summary={
          runs.length > 0
            ? `Showing ${pageStart.toLocaleString()}-${pageEnd.toLocaleString()}`
            : `Page ${currentPage.toLocaleString()}`
        }
      />
    </DashboardRouteShell>
  );
}

function parseRunsCursor(value: string | undefined) {
  const cursor = value?.trim();

  if (!cursor || cursor.length > 1024) {
    return undefined;
  }

  return cursor;
}

function parseRunsCursorStack(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((cursor) => parseRunsCursor(cursor))
    .filter((cursor): cursor is string => Boolean(cursor))
    .slice(-20);
}

function buildRunsHref(options: {
  cursor?: string;
  cursorStack?: string[];
  id?: string;
  inspect?: "run";
  range: string;
}) {
  const params = new URLSearchParams({ range: options.range });

  if (options.cursor) {
    params.set("cursor", options.cursor);
  }

  if (options.cursorStack && options.cursorStack.length > 0) {
    params.set("cursorStack", options.cursorStack.join(","));
  }

  if (options.inspect && options.id) {
    params.set("inspect", options.inspect);
    params.set("id", options.id);
  }

  return `/dashboard/runs?${params.toString()}`;
}

function formatRunCount(count: number, hasMore: boolean) {
  return `${count.toLocaleString()}${hasMore ? "+" : ""} ${
    count === 1 ? "run" : "runs"
  }`;
}

function getRunStage(run: DashboardRun) {
  const normalized = run.status.toLowerCase();

  if (
    normalized.includes("fail") ||
    normalized.includes("error") ||
    normalized.includes("reject")
  ) {
    return { label: "Review", tone: "bad" as const };
  }

  if (
    normalized.includes("running") ||
    normalized.includes("processing") ||
    normalized.includes("pending") ||
    normalized.includes("started")
  ) {
    return { label: "Executing", tone: "watch" as const };
  }

  if (normalized.includes("complete") || normalized.includes("success")) {
    return { label: "Settled", tone: "good" as const };
  }

  return { label: "Queued", tone: "watch" as const };
}

function getStageItems(runs: DashboardRun[]) {
  const counts = new Map<
    string,
    { count: number; tone: "good" | "watch" | "bad" }
  >();

  for (const run of runs) {
    const stage = getRunStage(run);
    const current = counts.get(stage.label) ?? { count: 0, tone: stage.tone };
    counts.set(stage.label, { ...current, count: current.count + 1 });
  }

  return ["Executing", "Review", "Settled", "Queued"].map((label) => ({
    count: counts.get(label)?.count ?? 0,
    label,
    tone: counts.get(label)?.tone ?? getStageTone(label),
  }));
}

function getStrategyItems(runs: DashboardRun[]) {
  const counts = new Map<string, number>();

  for (const run of runs) {
    const strategy = run.strategy ?? "Unassigned";
    counts.set(strategy, (counts.get(strategy) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ count, label }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);
}

function getStageTone(label: string): "good" | "watch" | "bad" {
  if (label === "Review") {
    return "bad";
  }

  if (label === "Settled") {
    return "good";
  }

  return "watch";
}

function formatRunDuration(run: DashboardRun) {
  const start = new Date(run.startedAt).valueOf();
  const end = run.endedAt ? new Date(run.endedAt).valueOf() : Date.now();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "Unknown";
  }

  return formatDuration(Math.max(0, end - start));
}

function formatDuration(ms: number) {
  const minutes = Math.round(ms / 60_000);

  if (minutes < 1) {
    return "<1m";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
