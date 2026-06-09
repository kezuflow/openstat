import Link from "next/link";

import {
  DashboardDataTable,
  DashboardPanel,
  DashboardStatusChip,
  formatDateTime,
  formatRelativeTime,
} from "./dashboard-components";
import {
  formatEventType,
  formatReferenceLabel,
  getAgentLabel,
  getEventState,
  summarizeEvent,
} from "./dashboard-event-utils";
import type { DashboardData, DashboardRange } from "./dashboard-overview-types";

export function DashboardLatestTables(props: {
  data: DashboardData;
  range: DashboardRange;
}) {
  const agentNameById = new Map(
    props.data.agents.map((agent) => [
      agent.id,
      agent.name || agent.externalId || agent.id,
    ]),
  );

  return (
    <section className="dashboard-table-grid">
      <DashboardPanel
        actions={
          <Link href="/dashboard/runs" scroll={false}>
            View all
          </Link>
        }
        className="dashboard-latest-panel"
        id="runs"
        title="Latest runs"
        titleCount={props.data.runs.length}
      >
        <DashboardDataTable
          empty={
            <span>
              No runs yet. Connect an agent from the{" "}
              <Link href="/dashboard/api-keys">API Keys</Link> page, then emit a
              decision event with a run ID.
            </span>
          }
          items={props.data.runs}
          columns={[
            {
              key: "run",
              label: "Run",
              render: (run) => (
                <Link
                  className="dashboard-table-primary"
                  href={`/dashboard?range=${props.range}&inspect=run&id=${run.id}`}
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
              render: (run) => formatDateTime(run.startedAt),
            },
          ]}
        />
      </DashboardPanel>

      <DashboardPanel
        actions={
          <Link href="/dashboard/trades" scroll={false}>
            View all
          </Link>
        }
        className="dashboard-latest-panel"
        id="trades"
        title="Latest trades"
        titleCount={props.data.trades.length}
      >
        <DashboardDataTable
          empty={
            <span>
              No trades yet. Send order, fill, or PnL events after creating an{" "}
              <Link href="/dashboard/api-keys">API key</Link>.
            </span>
          }
          items={props.data.trades}
          columns={[
            {
              key: "trade",
              label: "Trade",
              render: (trade) => (
                <Link
                  className="dashboard-table-primary"
                  href={`/dashboard?range=${props.range}&inspect=trade&id=${trade.id}`}
                  scroll={false}
                >
                  {trade.side.toUpperCase()} {trade.symbol}
                </Link>
              ),
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
        actions={
          <Link href={`/dashboard/events?range=${props.range}`} scroll={false}>
            Explore
          </Link>
        }
        className="dashboard-events-panel dashboard-latest-panel"
        title="Latest events"
        titleCount={props.data.overview?.events.latest.length ?? 0}
      >
        <DashboardDataTable
          empty={
            <span>
              No events ingested yet. Create a project key and send your first
              heartbeat from the{" "}
              <Link href="/dashboard/api-keys">API Keys</Link> page.
            </span>
          }
          items={props.data.overview?.events.latest ?? []}
          columns={[
            {
              key: "summary",
              label: "Summary",
              render: (event) => (
                <span className="dashboard-event-summary">
                  <Link
                    className="dashboard-table-primary dashboard-event-summary-link"
                    href={`/dashboard?range=${props.range}&inspect=event&id=${event.id}`}
                    scroll={false}
                  >
                    {summarizeEvent(event)}
                  </Link>
                  <span className="dashboard-event-links">
                    <span>{formatEventType(event.eventType)}</span>
                    {event.traceId ? (
                      <Link
                        href={`/dashboard?range=${props.range}&inspect=trace&id=${event.traceId}`}
                        scroll={false}
                      >
                        trace
                      </Link>
                    ) : null}
                    {event.runId ? (
                      <span title={event.runId}>
                        run{" "}
                        {formatReferenceLabel(event.runId, {
                          dropPrefix: "run",
                        })}
                      </span>
                    ) : null}
                  </span>
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (event) => (
                <DashboardStatusChip status={getEventState(event)} />
              ),
            },
            {
              key: "agent",
              label: "Agent",
              render: (event) => (
                <span className="dashboard-table-secondary">
                  {getAgentLabel(event.agentId, agentNameById)}
                </span>
              ),
            },
            {
              key: "source",
              label: "Source",
              render: (event) => (
                <span className="dashboard-source-label">{event.source}</span>
              ),
            },
            {
              key: "time",
              label: "Time",
              render: (event) => (
                <span title={formatDateTime(event.timestamp)}>
                  {formatRelativeTime(event.timestamp)}
                </span>
              ),
            },
          ]}
        />
      </DashboardPanel>
    </section>
  );
}
