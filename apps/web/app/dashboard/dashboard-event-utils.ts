import type { DashboardEvent } from "../../lib/openstat-api";

export function getAgentLabel(
  agentId: string | null | undefined,
  agentNameById: Map<string, string>,
) {
  if (!agentId) {
    return "System";
  }

  return agentNameById.get(agentId) ?? shortId(agentId);
}

export function getEventState(event: DashboardEvent) {
  if (event.eventType === "error") {
    return "error";
  }

  if (
    event.eventType === "risk_check" &&
    getString(event.data?.result) === "rejected"
  ) {
    return "rejected";
  }

  if (event.eventType === "heartbeat") {
    return getString(event.data?.status) ?? "heartbeat";
  }

  if (event.eventType === "completion") {
    return getString(event.data?.status) ?? "completion";
  }

  if (
    event.eventType === "audit_anchor" ||
    event.eventType === "audit_insight" ||
    event.eventType === "chain_transaction" ||
    event.eventType === "order" ||
    event.eventType === "fill" ||
    event.eventType === "settlement"
  ) {
    return getString(event.data?.status) ?? event.eventType;
  }

  if (event.eventType === "strategy_evaluation") {
    return "evaluated";
  }

  if (event.eventType === "strategy_selected") {
    return "selected";
  }

  if (event.eventType === "market_snapshot") {
    return "snapshot";
  }

  if (event.eventType === "position_proposal") {
    return "proposed";
  }

  return event.eventType;
}

export function summarizeEvent(event: DashboardEvent) {
  const data = event.data ?? {};

  switch (event.eventType) {
    case "decision": {
      const action = getString(data.action) ?? "Decision";
      const symbol = getString(data.symbol);
      const confidence = getNumber(data.confidence);

      return [
        action.toUpperCase(),
        symbol,
        confidence === undefined ? undefined : `${confidence}% confidence`,
      ]
        .filter(Boolean)
        .join(" - ");
    }
    case "risk_check": {
      const result = getString(data.result) ?? "Risk check";
      const reason = getString(data.reason);

      return reason ? `${capitalize(result)}: ${reason}` : capitalize(result);
    }
    case "order": {
      return [
        getString(data.side)?.toUpperCase(),
        getDecimal(data.quantity),
        getString(data.symbol),
        getString(data.order_type),
      ]
        .filter(Boolean)
        .join(" ");
    }
    case "fill": {
      return [
        capitalize(getString(data.status) ?? "filled"),
        getDecimal(data.quantity),
        getString(data.symbol),
        getDecimal(data.price) ? `at ${getDecimal(data.price)}` : undefined,
      ]
        .filter(Boolean)
        .join(" ");
    }
    case "position": {
      return [
        "Position",
        getDecimal(data.quantity),
        getString(data.symbol),
        getDecimal(data.average_price)
          ? `avg ${getDecimal(data.average_price)}`
          : undefined,
      ]
        .filter(Boolean)
        .join(" ");
    }
    case "pnl_snapshot": {
      return [
        getString(data.symbol) ?? getString(data.strategy) ?? "Portfolio",
        getDecimal(data.equity)
          ? `equity ${getDecimal(data.equity)}`
          : undefined,
        getDecimal(data.realized_pnl)
          ? `realized ${getDecimal(data.realized_pnl)}`
          : undefined,
        getDecimal(data.unrealized_pnl)
          ? `unrealized ${getDecimal(data.unrealized_pnl)}`
          : undefined,
      ]
        .filter(Boolean)
        .join(" - ");
    }
    case "heartbeat": {
      return (
        getString(data.summary) ??
        `Heartbeat ${getString(data.status) ?? "received"}`
      );
    }
    case "market_snapshot": {
      return (
        getString(data.summary) ??
        [
          getString(data.market) ?? getString(data.symbol) ?? "Market",
          getDecimal(data.best_bid)
            ? `bid ${getDecimal(data.best_bid)}`
            : undefined,
          getDecimal(data.best_ask)
            ? `ask ${getDecimal(data.best_ask)}`
            : undefined,
        ]
          .filter(Boolean)
          .join(" - ")
      );
    }
    case "strategy_evaluation": {
      return (
        getString(data.summary) ??
        [
          "Evaluated strategies",
          getString(data.selected_strategy)
            ? `selected ${getString(data.selected_strategy)}`
            : undefined,
        ]
          .filter(Boolean)
          .join(" - ")
      );
    }
    case "strategy_selected": {
      return (
        getString(data.summary) ??
        [
          "Selected",
          getString(data.selected_strategy),
          getNumber(data.confidence) === undefined
            ? undefined
            : `${getNumber(data.confidence)}% confidence`,
        ]
          .filter(Boolean)
          .join(" - ")
      );
    }
    case "position_proposal": {
      return (
        getString(data.summary) ??
        [
          "Proposed",
          getString(data.position_side)?.toUpperCase(),
          getDecimal(data.quantity),
          getString(data.market) ?? getString(data.symbol),
        ]
          .filter(Boolean)
          .join(" ")
      );
    }
    case "chain_transaction": {
      return (
        getString(data.summary) ??
        [
          getString(data.chain)?.toUpperCase() ?? "Chain",
          getString(data.status) ?? "transaction",
          getString(data.digest_reference),
        ]
          .filter(Boolean)
          .join(" - ")
      );
    }
    case "settlement": {
      return (
        getString(data.summary) ??
        [
          capitalize(getString(data.status) ?? "settlement"),
          getString(data.outcome),
          getDecimal(data.settlement_price)
            ? `at ${getDecimal(data.settlement_price)}`
            : undefined,
        ]
          .filter(Boolean)
          .join(" - ")
      );
    }
    case "audit_insight": {
      return (
        getString(data.summary) ??
        [
          "Audit",
          getString(data.verdict)
            ? `verdict ${getString(data.verdict)}`
            : undefined,
        ]
          .filter(Boolean)
          .join(" - ")
      );
    }
    case "audit_anchor": {
      return (
        getString(data.summary) ??
        ["Audit anchor", getString(data.status), getString(data.anchor_mode)]
          .filter(Boolean)
          .join(" - ")
      );
    }
    case "completion": {
      const usage = getRecord(data.usage);

      return [
        getString(data.model) ??
          getString(event.metadata?.model) ??
          "Model call",
        getNumber(data.latency_ms) === undefined
          ? undefined
          : `${getNumber(data.latency_ms)}ms`,
        getNumber(usage?.total_tokens) === undefined
          ? undefined
          : `${getNumber(usage?.total_tokens)?.toLocaleString()} tokens`,
      ]
        .filter(Boolean)
        .join(" - ");
    }
    case "error": {
      const code = getString(data.code);
      const message = getString(data.message);
      const retryable = data.retryable === true ? "retryable" : undefined;

      return (
        [code, message, retryable].filter(Boolean).join(" - ") || "Error event"
      );
    }
    default:
      return (
        getString(data.summary) ??
        getString(data.rationale_summary) ??
        "Telemetry event"
      );
  }
}

export function formatEventType(value: string) {
  return value.replaceAll("_", " ");
}

export function shortId(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
}

export function formatReferenceLabel(
  value: string,
  options?: { dropPrefix?: string },
) {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

  if (uuidPattern.test(value)) {
    return shortId(value);
  }

  const prefix = options?.dropPrefix ? `${options.dropPrefix}-` : undefined;
  const normalized =
    prefix && value.startsWith(prefix) ? value.slice(prefix.length) : value;

  if (normalized.length <= 16) {
    return normalized;
  }

  const parts = normalized.split(/[-_:]/u).filter(Boolean);
  const label = parts.reduce((current, part) => {
    if (current.length >= 8 || `${current}-${part}`.length > 16) {
      return current;
    }

    return current ? `${current}-${part}` : part;
  }, "");

  return label || `${normalized.slice(0, 12)}...`;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getDecimal(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString();
  }

  return getString(value);
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
