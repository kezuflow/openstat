import { Skeleton } from "@heroui/react";

type DashboardLoadingVariant =
  | "agents"
  | "alerts"
  | "api-keys"
  | "events"
  | "onchain"
  | "overview"
  | "runs"
  | "settings"
  | "trades";

type DashboardTableSkeletonColumn = {
  kind?: "actions" | "compact" | "date" | "primary" | "status" | "wide";
  label: string;
};

const agentColumns: DashboardTableSkeletonColumn[] = [
  { kind: "primary", label: "Agent" },
  { kind: "wide", label: "External ID" },
  { kind: "status", label: "Status" },
  { kind: "date", label: "Last seen" },
];

const alertColumns: DashboardTableSkeletonColumn[] = [
  { kind: "primary", label: "Alert" },
  { kind: "compact", label: "Type" },
  { kind: "status", label: "Status" },
  { kind: "date", label: "Created" },
];

const apiKeyColumns: DashboardTableSkeletonColumn[] = [
  { kind: "primary", label: "Name" },
  { kind: "compact", label: "Prefix" },
  { kind: "status", label: "Status" },
  { kind: "date", label: "Last used" },
  { kind: "date", label: "Created" },
  { kind: "actions", label: "Actions" },
];

const eventColumns: DashboardTableSkeletonColumn[] = [
  { kind: "wide", label: "Summary" },
  { kind: "status", label: "Status" },
  { kind: "compact", label: "Type" },
  { label: "Agent" },
  { kind: "compact", label: "Source" },
  { label: "Trace / Run" },
  { kind: "date", label: "Time" },
];

const latestEventColumns: DashboardTableSkeletonColumn[] = [
  { kind: "wide", label: "Summary" },
  { kind: "status", label: "Status" },
  { label: "Agent" },
  { kind: "compact", label: "Source" },
  { kind: "date", label: "Time" },
];

const latestRunColumns: DashboardTableSkeletonColumn[] = [
  { kind: "primary", label: "Run" },
  { kind: "status", label: "Status" },
  { kind: "date", label: "Started" },
];

const latestTradeColumns: DashboardTableSkeletonColumn[] = [
  { kind: "primary", label: "Trade" },
  { label: "Value" },
  { kind: "status", label: "Status" },
];

const onchainColumns: DashboardTableSkeletonColumn[] = [
  { kind: "primary", label: "Transaction" },
  { kind: "status", label: "Receipt" },
  { label: "Network" },
  { label: "Action" },
  { label: "Run" },
  { kind: "wide", label: "Audit Copilot" },
  { label: "Proof" },
  { kind: "date", label: "Submitted" },
];

const runColumns: DashboardTableSkeletonColumn[] = [
  { kind: "primary", label: "Run" },
  { kind: "compact", label: "Stage" },
  { kind: "status", label: "Status" },
  { label: "Strategy" },
  { kind: "date", label: "Started" },
  { kind: "compact", label: "Duration" },
];

const tradeColumns: DashboardTableSkeletonColumn[] = [
  { kind: "primary", label: "Trade" },
  { label: "Strategy" },
  { label: "Value" },
  { kind: "status", label: "Status" },
];

export function DashboardLoadingShell(props: {
  variant?: DashboardLoadingVariant;
}) {
  const variant = props.variant ?? "overview";

  return (
    <main
      aria-busy="true"
      aria-label="Loading dashboard"
      className="shell dashboard-content dashboard-loading-page"
    >
      <DashboardToolbarSkeleton />
      <DashboardRouteSkeleton variant={variant} />
    </main>
  );
}

function DashboardToolbarSkeleton() {
  return (
    <header className="dashboard-topbar dashboard-loading-topbar">
      <div className="dashboard-toolbar-actions">
        <Skeleton className="dashboard-loading-icon" />
        <div className="dashboard-toolbar-utility-actions">
          <Skeleton className="dashboard-loading-search" />
          <Skeleton className="dashboard-loading-icon" />
          <Skeleton className="dashboard-loading-icon" />
        </div>
      </div>

      <div className="dashboard-toolbar-main">
        <div className="dashboard-title-block">
          <Skeleton className="dashboard-loading-title" />
        </div>

        <div className="dashboard-toolbar-secondary-actions">
          <Skeleton className="dashboard-loading-label" />
          <Skeleton className="dashboard-loading-range" />
          <Skeleton className="dashboard-loading-icon" />
        </div>
      </div>
    </header>
  );
}

function DashboardRouteSkeleton(props: { variant: DashboardLoadingVariant }) {
  if (props.variant === "overview") {
    return (
      <>
        <DashboardKpiSkeletonGrid />
        <section className="dashboard-command-grid">
          <DashboardChartSkeleton />
          <DashboardListSkeleton />
        </section>
        <section className="dashboard-table-grid">
          <DashboardTableSkeleton
            columns={latestRunColumns}
            isLatest
            rows={4}
            showAction
            showCount
          />
          <DashboardTableSkeleton
            columns={latestTradeColumns}
            isLatest
            rows={4}
            showAction
            showCount
          />
          <DashboardTableSkeleton
            columns={latestEventColumns}
            isLatest
            rows={5}
            showAction
            showCount
            wide
          />
        </section>
      </>
    );
  }

  if (props.variant === "agents") {
    return (
      <>
        <section className="agent-overview-row">
          <section className="dashboard-panel dashboard-latest-panel agent-overview-panel">
            <DashboardPanelHeaderSkeleton />
            <DashboardKpiSkeletonGrid className="agent-overview-kpis" />
          </section>

          <section className="dashboard-panel dashboard-latest-panel agent-uptime-panel">
            <DashboardPanelHeaderSkeleton showCount />
            <DashboardUptimeSkeleton />
          </section>
        </section>

        <DashboardTableSkeleton
          columns={agentColumns}
          isLatest
          rows={6}
          showCount
          wide
        />
      </>
    );
  }

  if (props.variant === "alerts") {
    return <DashboardTableSkeleton columns={alertColumns} rows={6} />;
  }

  if (props.variant === "trades") {
    return (
      <>
        <DashboardKpiSkeletonGrid />
        <DashboardTableSkeleton columns={tradeColumns} rows={6} />
      </>
    );
  }

  if (props.variant === "onchain") {
    return (
      <DashboardTableSkeleton columns={onchainColumns} rows={7} showCount />
    );
  }

  if (props.variant === "runs") {
    return (
      <>
        <DashboardKpiSkeletonGrid />
        <section className="runs-workbench">
          <DashboardTableSkeleton
            columns={runColumns}
            isLatest
            rows={7}
            showAction
            showCount
            wide
          />
          <aside className="runs-rail" aria-hidden="true">
            <DashboardListSkeleton items={4} />
            <DashboardListSkeleton items={3} />
            <DashboardListSkeleton items={3} />
          </aside>
        </section>
        <Skeleton className="dashboard-loading-pagination" />
      </>
    );
  }

  if (props.variant === "settings") {
    return (
      <div className="dashboard-settings-grid">
        <DashboardDefinitionListSkeleton />
        <DashboardDefinitionListSkeleton />
      </div>
    );
  }

  if (props.variant === "api-keys") {
    return <DashboardApiKeysSkeleton />;
  }

  if (props.variant === "events") {
    return (
      <>
        <DashboardTableSkeleton
          className="dashboard-events-route-panel"
          columns={eventColumns}
          isLatest
          rows={9}
          showAction
          showCount
          wide
        />
        <Skeleton className="dashboard-loading-pagination" />
      </>
    );
  }

  return <DashboardTableSkeleton columns={alertColumns} rows={6} />;
}

function DashboardKpiSkeletonGrid(props: { className?: string } = {}) {
  return (
    <section
      className={["dashboard-kpi-grid dashboard-route-kpis", props.className]
        .filter(Boolean)
        .join(" ")}
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="dashboard-kpi dashboard-loading-kpi" key={index}>
          <Skeleton className="dashboard-loading-kpi-label" />
          <div className="dashboard-kpi-value-row">
            <Skeleton className="dashboard-loading-kpi-value" />
            <Skeleton className="dashboard-loading-kpi-badge" />
          </div>
        </div>
      ))}
    </section>
  );
}

function DashboardUptimeSkeleton() {
  return (
    <div className="agent-uptime-monitor dashboard-loading-uptime">
      <div className="agent-uptime-summary">
        <div>
          <Skeleton className="dashboard-loading-uptime-summary" />
        </div>
        <Skeleton className="dashboard-loading-uptime-state" />
      </div>

      <div className="agent-uptime-bars dashboard-loading-graph-surface" />

      <div className="agent-uptime-agent-grid">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className="agent-uptime-agent" key={index}>
            <span className="agent-uptime-agent-header">
              <Skeleton className="dashboard-loading-agent-name" />
              <Skeleton className="dashboard-loading-agent-percent" />
            </span>
            <span className="agent-uptime-agent-bars dashboard-loading-graph-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardChartSkeleton() {
  return (
    <section className="dashboard-panel dashboard-command-main">
      <DashboardPanelHeaderSkeleton showAction showEyebrow />
      <div className="dashboard-loading-chart dashboard-loading-graph-surface" />
    </section>
  );
}

function DashboardListSkeleton(props: { items?: number } = {}) {
  return (
    <section className="dashboard-panel dashboard-loading-list-panel">
      <DashboardPanelHeaderSkeleton />
      <div className="dashboard-loading-list">
        {Array.from({ length: props.items ?? 5 }).map((_, index) => (
          <div className="dashboard-loading-list-item" key={index}>
            <Skeleton className="dashboard-loading-list-icon" />
            <span>
              <Skeleton className="dashboard-loading-list-primary" />
              <Skeleton className="dashboard-loading-list-secondary" />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardDefinitionListSkeleton() {
  return (
    <section className="dashboard-panel">
      <DashboardPanelHeaderSkeleton />
      <div className="dashboard-loading-definitions">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="dashboard-loading-definition" key={index}>
            <Skeleton className="dashboard-loading-definition-label" />
            <Skeleton className="dashboard-loading-definition-value" />
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardTableSkeleton(props: {
  className?: string;
  columns: DashboardTableSkeletonColumn[];
  isLatest?: boolean;
  rows: number;
  showAction?: boolean;
  showCount?: boolean;
  wide?: boolean;
}) {
  return (
    <section
      className={[
        "dashboard-panel dashboard-loading-table-panel",
        props.className,
        props.isLatest ? "dashboard-latest-panel" : "",
        props.wide ? "dashboard-events-panel" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <DashboardPanelHeaderSkeleton
        showAction={props.showAction}
        showCount={props.showCount}
      />
      <div className="dashboard-table-wrap">
        <DashboardNativeTableSkeleton
          columns={props.columns}
          rows={props.rows}
        />
      </div>
    </section>
  );
}

function DashboardApiKeysSkeleton() {
  return (
    <section className="dashboard-panel api-keys-panel">
      <div className="dashboard-panel-header api-keys-panel-header">
        <div className="dashboard-loading-api-keys-copy">
          <div className="dashboard-panel-title-row">
            <Skeleton className="dashboard-loading-panel-title" />
            <Skeleton className="dashboard-loading-api-keys-count" />
          </div>
          <Skeleton className="dashboard-loading-api-keys-description" />
        </div>
        <Skeleton className="dashboard-loading-api-keys-button" />
      </div>

      <div className="dashboard-table-wrap api-keys-table-wrap">
        <DashboardNativeTableSkeleton
          className="api-keys-table"
          columns={apiKeyColumns}
          rows={5}
        />
      </div>
    </section>
  );
}

function DashboardNativeTableSkeleton(props: {
  className?: string;
  columns: DashboardTableSkeletonColumn[];
  rows: number;
}) {
  return (
    <table
      className={["dashboard-table", props.className].filter(Boolean).join(" ")}
    >
      <thead>
        <tr>
          {props.columns.map((column) => (
            <th
              aria-label={column.kind === "actions" ? column.label : undefined}
              key={column.label}
            >
              {column.kind === "actions" ? null : column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: props.rows }).map((_, rowIndex) => (
          <tr key={rowIndex}>
            {props.columns.map((column) => (
              <td key={column.label}>
                {column.kind === "actions" ? (
                  <div className="dashboard-loading-table-actions">
                    <Skeleton className="dashboard-loading-table-action" />
                    <Skeleton className="dashboard-loading-table-action" />
                  </div>
                ) : (
                  <Skeleton
                    className={[
                      "dashboard-loading-table-line",
                      `dashboard-loading-table-line-${column.kind ?? "default"}`,
                    ].join(" ")}
                  />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DashboardPanelHeaderSkeleton(
  props: {
    showAction?: boolean;
    showCount?: boolean;
    showEyebrow?: boolean;
  } = {},
) {
  return (
    <div className="dashboard-panel-header">
      <div className="dashboard-loading-panel-title-stack">
        {props.showEyebrow ? (
          <Skeleton className="dashboard-loading-panel-eyebrow" />
        ) : null}
        <div className="dashboard-loading-panel-title-row">
          <Skeleton className="dashboard-loading-panel-title" />
          {props.showCount ? (
            <Skeleton className="dashboard-loading-panel-count" />
          ) : null}
        </div>
      </div>
      {props.showAction ? (
        <Skeleton className="dashboard-loading-panel-action" />
      ) : null}
    </div>
  );
}
