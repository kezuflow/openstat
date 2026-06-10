import Link from "next/link";

import {
  type DashboardEvent,
  getDashboardData,
  getDashboardDeepBookConfig,
  getDashboardEvents,
  getDashboardInspectorData,
} from "../../../lib/openstat-api";
import {
  DEEPBOOK_EVENTS_LIMIT,
  DEEPBOOK_VENUE,
  findLatestEvent,
  getNumberLike,
  getString,
  isDeepBookEvent,
  isDeepBookRun,
  isDeepBookTrade,
} from "../../features/deepbook/dashboard";
import {
  DashboardDataTable,
  DashboardKpiCard,
  DashboardPanel,
  DashboardStatusChip,
  formatDateTime,
  formatPnl,
  formatRelativeTime,
} from "../dashboard-components";
import { formatEventType, summarizeEvent } from "../dashboard-event-utils";
import {
  getFirstParam,
  parseDashboardRange,
  parseInspectorKind,
  type DashboardSearchParams,
} from "../dashboard-page-utils";
import { DashboardRouteShell } from "../dashboard-route-shell";

import { DeepBookConfigManager } from "./deepbook-config-manager";
import styles from "./deepbook-dashboard.module.css";

type DeepBookPageProps = {
  searchParams?: Promise<DashboardSearchParams>;
};

export default async function DeepBookDashboardPage(props: DeepBookPageProps) {
  const searchParams = await props.searchParams;
  const range = parseDashboardRange(getFirstParam(searchParams?.range));
  const inspect = parseInspectorKind(getFirstParam(searchParams?.inspect));
  const inspectId = getFirstParam(searchParams?.id);
  const [dashboardData, eventData, configData] = await Promise.all([
    getDashboardData(range),
    getDashboardEvents(range, {
      includeRange: true,
      limit: DEEPBOOK_EVENTS_LIMIT,
    }),
    getDashboardDeepBookConfig(),
  ]);
  const inspector =
    inspect && inspectId
      ? await getDashboardInspectorData(inspect, inspectId)
      : undefined;
  const data = {
    ...dashboardData,
    errors: [
      ...dashboardData.errors,
      ...eventData.errors,
      ...configData.errors,
    ],
  };
  const deepbookEvents = eventData.events.filter(isDeepBookEvent);
  const deepbookRuns = dashboardData.runs.filter(isDeepBookRun);
  const deepbookTrades = dashboardData.trades.filter(isDeepBookTrade);
  const latestMarket = findLatestEvent(deepbookEvents, "market_snapshot");
  const latestStrategy =
    findLatestEvent(deepbookEvents, "strategy_selected") ??
    findLatestEvent(deepbookEvents, "strategy_evaluation");
  const latestRisk = findLatestEvent(deepbookEvents, "risk_check");
  const latestSettlement = findLatestEvent(deepbookEvents, "settlement");
  const latestAudit =
    findLatestEvent(deepbookEvents, "audit_anchor") ??
    findLatestEvent(deepbookEvents, "audit_insight");
  const latestPnl = findLatestEvent(deepbookEvents, "pnl_snapshot");
  const currentHref = `/dashboard/deepbook?range=${range}`;
  const selectedMarket =
    getString(latestMarket?.data?.market) ??
    getString(latestMarket?.data?.symbol) ??
    deepbookTrades[0]?.symbol ??
    "No market";
  const executionMode =
    getString(latestMarket?.metadata?.execution_mode) ??
    getString(deepbookEvents[0]?.metadata?.execution_mode) ??
    "not configured";
  const riskState =
    getString(latestRisk?.data?.result) ??
    getString(latestRisk?.data?.status) ??
    "waiting";
  const settlementState =
    getString(latestSettlement?.data?.status) ??
    getString(latestSettlement?.data?.outcome) ??
    "unsettled";
  const auditState =
    getString(latestAudit?.data?.verdict) ??
    getString(latestAudit?.data?.status) ??
    "not ready";
  const pnlValue = getNumberLike(latestPnl?.data?.realized_pnl);

  return (
    <DashboardRouteShell
      closeHref={currentHref}
      data={data}
      inspector={inspector}
      range={range}
      title="DeepBook Predict"
    >
      <section
        className={`dashboard-kpi-grid dashboard-route-kpis ${styles.kpis}`}
      >
        <DashboardKpiCard
          badge={{ label: executionMode, tone: "neutral" }}
          href="/dashboard/deepbook"
          label="Selected market"
          tone={selectedMarket === "No market" ? "neutral" : "success"}
          value={selectedMarket}
        />
        <DashboardKpiCard
          badge={{ label: riskState }}
          href="/dashboard/deepbook"
          label="Risk state"
          tone={riskState === "approved" ? "success" : "warning"}
          value={riskState}
        />
        <DashboardKpiCard
          badge={{ label: settlementState }}
          href="/dashboard/deepbook"
          label="Settlement"
          tone={settlementState === "settled" ? "success" : "neutral"}
          value={settlementState}
        />
        <DashboardKpiCard
          badge={{ label: auditState }}
          href="/dashboard/deepbook"
          label="Run PnL"
          tone={(pnlValue ?? 0) >= 0 ? "success" : "danger"}
          value={pnlValue === undefined ? "--" : formatPnl(pnlValue)}
        />
      </section>

      {data.errors.length > 0 ? (
        <DashboardPanel
          className={`dashboard-latest-panel ${styles.error}`}
          title="Backend state"
        >
          <p>{data.errors.join(" | ")}</p>
        </DashboardPanel>
      ) : null}

      {deepbookEvents.length === 0 &&
      deepbookRuns.length === 0 &&
      deepbookTrades.length === 0 ? (
        <DashboardPanel
          className={`dashboard-latest-panel ${styles.empty}`}
          title="DeepBook Predict"
        >
          <p>
            No DeepBook Predict telemetry yet. Seed the demo data or run the
            replay agent after creating an{" "}
            <Link href="/dashboard/api-keys">API key</Link>.
          </p>
        </DashboardPanel>
      ) : null}

      <DashboardPanel
        className={`dashboard-latest-panel ${styles.panel} ${styles.configPanel}`}
        title="Agent control"
      >
        <DeepBookConfigManager
          initialConfig={configData.config}
          initialUpdatedAt={configData.updatedAt}
        />
      </DashboardPanel>

      <section className={styles.grid}>
        <DashboardPanel
          className={`dashboard-latest-panel ${styles.panel}`}
          title="Run timeline"
          titleCount={deepbookEvents.length}
        >
          <div className={styles.timeline}>
            {deepbookEvents.slice(0, 10).map((event) => (
              <Link
                href={`${currentHref}&inspect=event&id=${event.id}`}
                key={event.id}
                scroll={false}
              >
                <span>{formatEventType(event.eventType)}</span>
                <strong>{summarizeEvent(event)}</strong>
                <small title={formatDateTime(event.timestamp)}>
                  {formatRelativeTime(event.timestamp)}
                </small>
              </Link>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          className={`dashboard-latest-panel ${styles.panel}`}
          title="Market snapshot"
        >
          <DeepBookFactList
            items={[
              ["Market", selectedMarket],
              [
                "Venue",
                getString(latestMarket?.metadata?.venue) ?? DEEPBOOK_VENUE,
              ],
              [
                "Network",
                getString(latestMarket?.metadata?.network) ?? "testnet",
              ],
              ["Execution", executionMode],
              ["Oracle", getString(latestMarket?.data?.oracle_price) ?? "--"],
              [
                "Liquidity",
                getString(latestMarket?.data?.liquidity_usd) ?? "--",
              ],
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          className={`dashboard-latest-panel ${styles.panel}`}
          title="Strategy evaluator"
        >
          <DeepBookFactList
            items={[
              [
                "Selected",
                getString(latestStrategy?.data?.selected_strategy) ?? "waiting",
              ],
              [
                "Confidence",
                latestStrategy?.data?.confidence === undefined
                  ? "--"
                  : `${String(latestStrategy.data.confidence)}%`,
              ],
              ["Summary", summarizeNullableEvent(latestStrategy)],
            ]}
          />
        </DashboardPanel>

        <DashboardPanel
          className={`dashboard-latest-panel ${styles.panel}`}
          title="Risk and audit"
        >
          <DeepBookFactList
            items={[
              ["Risk", summarizeNullableEvent(latestRisk)],
              ["Settlement", summarizeNullableEvent(latestSettlement)],
              ["Audit", summarizeNullableEvent(latestAudit)],
            ]}
          />
        </DashboardPanel>
      </section>

      <DashboardPanel
        className={`dashboard-latest-panel ${styles.panel}`}
        title="Executions"
        titleCount={deepbookTrades.length}
      >
        <DashboardDataTable
          empty="No DeepBook executions yet."
          items={deepbookTrades}
          columns={[
            {
              key: "trade",
              label: "Trade",
              render: (trade) => (
                <Link
                  className="dashboard-table-primary"
                  href={`${currentHref}&inspect=trade&id=${trade.id}`}
                  scroll={false}
                >
                  {trade.side.toUpperCase()} {trade.symbol}
                </Link>
              ),
            },
            {
              key: "strategy",
              label: "Strategy",
              render: (trade) => trade.strategy ?? "DeepBook Predict",
            },
            {
              key: "value",
              label: "Value",
              render: (trade) =>
                `${trade.quantity}${trade.price ? ` at ${trade.price}` : ""}`,
            },
            {
              key: "status",
              label: "Status",
              render: (trade) => <DashboardStatusChip status={trade.status} />,
            },
          ]}
        />
      </DashboardPanel>

      <DashboardPanel
        className={`dashboard-latest-panel ${styles.panel}`}
        title="Agent runs"
        titleCount={deepbookRuns.length}
      >
        <DashboardDataTable
          empty="No DeepBook runs yet."
          items={deepbookRuns}
          columns={[
            {
              key: "run",
              label: "Run",
              render: (run) => (
                <Link
                  className="dashboard-table-primary"
                  href={`${currentHref}&inspect=run&id=${run.id}`}
                  scroll={false}
                >
                  {run.strategy ?? run.externalRunId ?? run.id}
                </Link>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (run) => <DashboardStatusChip status={run.status} />,
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
          ]}
        />
      </DashboardPanel>
    </DashboardRouteShell>
  );
}

function DeepBookFactList(props: { items: Array<[string, string]> }) {
  return (
    <dl className={styles.facts}>
      {props.items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function summarizeNullableEvent(event: DashboardEvent | undefined) {
  return event ? summarizeEvent(event) : "waiting";
}
