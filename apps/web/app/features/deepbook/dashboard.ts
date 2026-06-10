import type {
  DashboardEvent,
  DashboardRun,
  DashboardTrade,
} from "../../../lib/openstat-api";

export const DEEPBOOK_EVENTS_LIMIT = 60;
export const DEEPBOOK_PRODUCT = "deepbook-predict-agent-desk";
export const DEEPBOOK_VENUE = "deepbook-predict";

const deepBookEventTypes = new Set([
  "audit_anchor",
  "settlement",
  "strategy_evaluation",
  "strategy_selected",
]);

export function isDeepBookEvent(event: DashboardEvent) {
  return (
    event.tags?.includes("deepbook") === true ||
    event.metadata?.product === DEEPBOOK_PRODUCT ||
    event.metadata?.venue === DEEPBOOK_VENUE ||
    deepBookEventTypes.has(event.eventType)
  );
}

export function isDeepBookRun(run: DashboardRun) {
  return Boolean(
    run.strategy?.includes("deepbook") ||
    run.externalRunId?.includes("deepbook"),
  );
}

export function isDeepBookTrade(trade: DashboardTrade) {
  return Boolean(
    trade.strategy?.includes("deepbook") || trade.symbol.includes("/"),
  );
}

export function findLatestEvent(events: DashboardEvent[], eventType: string) {
  return events.find((event) => event.eventType === eventType);
}

export function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function getNumberLike(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
