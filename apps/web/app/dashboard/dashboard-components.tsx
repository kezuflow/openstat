import type { ReactNode } from "react";

import { Chip, SearchField } from "@heroui/react";
import {
  AlertTriangle,
  Bell,
  CircleCheck,
  Clock3,
  RefreshCw,
  Search,
} from "lucide-react";

import type {
  DashboardAnalyticsSeriesPoint,
  DashboardRange,
} from "../../lib/openstat-api";
import { SignInModal } from "../sign-in-modal";

type KpiTone = "neutral" | "success" | "warning" | "danger";

type DataTableColumn<T> = {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
};

export function DashboardTopToolbar(props: {
  eyebrow?: string;
  range: DashboardRange;
  errorCount: number;
  showSignIn?: boolean;
  title?: string;
  unreadNotifications: number;
}) {
  return (
    <header className="dashboard-topbar">
      <div className="dashboard-title-block">
        <p className="dashboard-eyebrow">{props.eyebrow ?? "OpenStat"}</p>
        <h1>{props.title ?? "AI trading agent telemetry"}</h1>
      </div>

      <div className="dashboard-toolbar-actions">
        <SearchField
          aria-label="Search dashboard"
          className="dashboard-search"
          name="dashboard-search"
          variant="secondary"
        >
          <SearchField.Group>
            <SearchField.SearchIcon>
              <Search aria-hidden="true" size={15} />
            </SearchField.SearchIcon>
            <SearchField.Input placeholder="Search runs, trades, traces..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <nav className="dashboard-range-control" aria-label="Dashboard range">
          {(["24h", "7d", "30d"] as const).map((range) => (
            <a
              aria-current={props.range === range ? "page" : undefined}
              className="dashboard-range-link"
              href={`/dashboard?range=${range}`}
              key={range}
            >
              {range}
            </a>
          ))}
        </nav>

        <a
          className="dashboard-icon-link"
          href={`/dashboard?range=${props.range}`}
        >
          <RefreshCw aria-hidden="true" size={16} />
          <span>Refresh</span>
        </a>

        <a className="dashboard-icon-link" href="#alerts">
          <Bell aria-hidden="true" size={16} />
          <span>{props.unreadNotifications || props.errorCount}</span>
        </a>

        {props.showSignIn ? (
          <SignInModal className="dashboard-signin-button">Sign in</SignInModal>
        ) : null}
      </div>
    </header>
  );
}

export function DashboardKpiCard(props: {
  label: string;
  series?: Array<DashboardAnalyticsSeriesPoint>;
  seriesKey?: DashboardSparklineKey;
  value: string;
  href: string;
  tone?: KpiTone;
}) {
  const tone = props.tone ?? "neutral";
  const seriesKey = props.seriesKey;

  return (
    <a className={`dashboard-kpi dashboard-kpi-${tone}`} href={props.href}>
      <span className="dashboard-kpi-label">{props.label}</span>
      <strong>{props.value}</strong>
      {props.series && seriesKey ? (
        <DashboardKpiSparkline
          points={props.series.map((point) => point[seriesKey] ?? 0)}
          tone={tone}
        />
      ) : null}
    </a>
  );
}

type DashboardSparklineKey =
  | "activeAgents"
  | "decisions"
  | "errors"
  | "events"
  | "failures"
  | "fills"
  | "orders"
  | "pnlSnapshots"
  | "riskRejects";

function DashboardKpiSparkline(props: { points: number[]; tone: KpiTone }) {
  const width = 180;
  const height = 28;
  const padding = 2;
  const path = getSparklinePath(props.points, width, height, padding);

  if (!path) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className="dashboard-kpi-sparkline"
      focusable="false"
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        className={`dashboard-kpi-sparkline-line dashboard-kpi-sparkline-${props.tone}`}
        d={path}
      />
    </svg>
  );
}

function getSparklinePath(
  points: number[],
  width: number,
  height: number,
  padding: number,
) {
  if (points.length < 2) {
    return undefined;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(max - min, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return points
    .map((point, index) => {
      const x = padding + (index / (points.length - 1)) * innerWidth;
      const y = padding + (1 - (point - min) / span) * innerHeight;

      return `${index === 0 ? "M" : "L"} ${roundPathNumber(x)} ${roundPathNumber(y)}`;
    })
    .join(" ");
}

function roundPathNumber(value: number) {
  return Number(value.toFixed(2));
}

export function DashboardPanel(props: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  id?: string;
  title: string;
}) {
  return (
    <section
      className={["dashboard-panel", props.className].filter(Boolean).join(" ")}
      id={props.id}
    >
      <div className="dashboard-panel-header">
        <div>
          {props.eyebrow ? (
            <p className="dashboard-panel-eyebrow">{props.eyebrow}</p>
          ) : null}
          <h2>{props.title}</h2>
        </div>
        {props.actions ? (
          <div className="dashboard-panel-actions">{props.actions}</div>
        ) : null}
      </div>
      {props.children}
    </section>
  );
}

export function DashboardEmptyState(props: { children: ReactNode }) {
  return (
    <div className="dashboard-empty">
      <CircleCheck aria-hidden="true" size={18} />
      <p>{props.children}</p>
    </div>
  );
}

export function DashboardStatusChip(props: { status: string }) {
  const normalized = props.status.toLowerCase();
  const color =
    normalized.includes("error") ||
    normalized.includes("fail") ||
    normalized.includes("reject") ||
    normalized.includes("revoked")
      ? "danger"
      : normalized.includes("stale") || normalized.includes("pending")
        ? "warning"
        : normalized.includes("active") ||
            normalized.includes("online") ||
            normalized.includes("ok") ||
            normalized.includes("filled")
          ? "success"
          : "default";

  return (
    <Chip color={color} size="sm" variant="soft">
      <Chip.Label>{props.status}</Chip.Label>
    </Chip>
  );
}

export function DashboardAttentionItem(props: {
  href: string;
  meta: string;
  title: string;
  tone?: "danger" | "warning" | "neutral";
}) {
  const Icon = props.tone === "danger" ? AlertTriangle : Clock3;

  return (
    <a
      className={`dashboard-attention-item dashboard-attention-${props.tone ?? "neutral"}`}
      href={props.href}
    >
      <span className="dashboard-attention-icon">
        <Icon aria-hidden="true" size={15} />
      </span>
      <span>
        <strong>{props.title}</strong>
        <small>{props.meta}</small>
      </span>
    </a>
  );
}

export function DashboardDataTable<T extends { id: string }>(props: {
  columns: Array<DataTableColumn<T>>;
  empty: string;
  items: Array<T>;
}) {
  if (props.items.length === 0) {
    return <DashboardEmptyState>{props.empty}</DashboardEmptyState>;
  }

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            {props.columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.items.map((item) => (
            <tr key={item.id}>
              {props.columns.map((column) => (
                <td key={column.key}>{column.render(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString();
}

export function formatNumber(value?: number) {
  return (value ?? 0).toLocaleString();
}
