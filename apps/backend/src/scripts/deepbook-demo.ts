import { schema } from "@openstat/db";

const deepBookStrategy = "deepbook-predict-range-v1";
const deepBookVenue = "deepbook-predict";
const deepBookProduct = "deepbook-predict-agent-desk";
type DeepBookExecutionMode = "paper" | "replay";

export const deepBookDemoAgentSeed = {
  externalId: "deepbook-predict-v1",
  name: "DeepBook Predict Agent",
  status: "online",
  tags: ["trading", "deepbook", "predict", "sui"],
} as const;

export const deepBookDemoTradingStrategySeed = {
  strategy: deepBookStrategy,
  agentExternalId: deepBookDemoAgentSeed.externalId,
  symbols: ["SUI/USDC", "DEEP/USDC", "DEEP/SUI"],
} as const;

type EventInsert = typeof schema.events.$inferInsert;
type InsertEvent = (values: EventInsert) => Promise<{ id: string }>;

type DeepBookSeedContext = {
  agentId: string;
  confidence: number;
  day: number;
  executionMode: DeepBookExecutionMode;
  externalRunId: string;
  insertEvent: InsertEvent;
  metadata: Record<string, unknown>;
  organizationId: string;
  price: number;
  projectId: string;
  quantity: number;
  seedMarker: string;
  side: "buy" | "sell";
  startedAt: Date;
  strategyIndex: number;
  symbol: string;
  traceId: string;
};

export function isDeepBookDemoStrategy(strategy: string) {
  return strategy === deepBookStrategy;
}

export function getDeepBookVenue() {
  return deepBookVenue;
}

export function getDeepBookExecutionMode(day: number): DeepBookExecutionMode {
  return day % 6 === 0 ? "replay" : "paper";
}

export function getDeepBookAction(side: "buy" | "sell") {
  return side === "buy" ? "buy_yes_range" : "hedge_no_range";
}

export function getDeepBookRunMetadata(input: {
  day: number;
  executionMode: DeepBookExecutionMode;
  seedMarker: string;
  symbol: string;
}) {
  return {
    seed: input.seedMarker,
    demo_day: input.day,
    market_session: "24h",
    chain: "sui",
    execution_mode: input.executionMode,
    market: input.symbol,
    network: "testnet",
    product: deepBookProduct,
    venue: deepBookVenue,
  };
}

export function getDeepBookRiskReason(riskRejected: boolean) {
  return riskRejected
    ? "Prediction exposure exceeds market liquidity guard."
    : "Within liquidity, exposure, and settlement risk limits.";
}

export function getDeepBookRiskData(input: {
  price: number;
  quantity: number;
  reason: string;
  rejected: boolean;
  seedMarker: string;
  strategy: string;
  symbol: string;
}) {
  return {
    seed: input.seedMarker,
    exposure_usd: (input.quantity * input.price).toFixed(2),
    market: input.symbol,
    max_slippage_bps: 35,
    reason: input.reason,
    result: input.rejected ? "rejected" : "approved",
    strategy: input.strategy,
    symbol: input.symbol,
    venue: deepBookVenue,
  };
}

export function getDeepBookCompletion(input: {
  day: number;
  rejected: boolean;
}) {
  return {
    model: "deepbook-predict-agent",
    status: input.rejected ? "completed_with_rejection" : "completed",
    summary: input.rejected
      ? "Run stopped after the DeepBook Predict risk gate rejected exposure."
      : "DeepBook Predict run completed with simulated settlement and PnL.",
    totalTokens: input.rejected ? 1420 + input.day * 3 : 1860 + input.day * 4,
  };
}

export function getDeepBookDecisionData(input: {
  action: string;
  confidence: number;
  executionMode: DeepBookExecutionMode;
  seedMarker: string;
  side: "buy" | "sell";
  strategy: string;
  symbol: string;
}) {
  return {
    seed: input.seedMarker,
    action: input.action,
    confidence: input.confidence,
    execution_mode: input.executionMode,
    market: input.symbol,
    rationale_summary: `${input.symbol} range probability and liquidity supported a ${input.side} position.`,
    selected_strategy: "range-mean-reversion",
    strategy: input.strategy,
    symbol: input.symbol,
    venue: deepBookVenue,
  };
}

export function getDeepBookOrderData(input: {
  executionMode: DeepBookExecutionMode;
  orderId: string;
  orderType: "limit";
  price: string;
  quantity: string;
  seedMarker: string;
  side: "buy" | "sell";
  status: string;
  strategy: string;
  symbol: string;
}) {
  return {
    seed: input.seedMarker,
    execution_mode: input.executionMode,
    market_type: "prediction_range",
    order_id: input.orderId,
    order_type: input.orderType,
    position_side: input.side === "buy" ? "yes" : "no",
    price: input.price,
    quantity: input.quantity,
    side: input.side,
    status: input.status,
    strategy: input.strategy,
    symbol: input.symbol,
    venue: deepBookVenue,
  };
}

export function getDeepBookFillData(input: {
  executionMode: DeepBookExecutionMode;
  fillId: string;
  orderId: string;
  price: string;
  quantity: string;
  seedMarker: string;
  side: "buy" | "sell";
  strategy: string;
  symbol: string;
}) {
  return {
    seed: input.seedMarker,
    execution_mode: input.executionMode,
    fill_id: input.fillId,
    market_type: "prediction_range",
    order_id: input.orderId,
    position_side: input.side === "buy" ? "yes" : "no",
    price: input.price,
    quantity: input.quantity,
    side: input.side,
    strategy: input.strategy,
    symbol: input.symbol,
    venue: deepBookVenue,
  };
}

export async function seedDeepBookStrategyEvents(context: DeepBookSeedContext) {
  const marketSnapshotAt = context.startedAt;
  await context.insertEvent({
    organizationId: context.organizationId,
    projectId: context.projectId,
    agentId: context.agentId,
    externalEventId: `seed-market-snapshot-${deepBookStrategy}-${context.day}`,
    eventType: "market_snapshot",
    source: "sdk",
    timestamp: marketSnapshotAt,
    traceId: context.traceId,
    spanId: `span-market-${deepBookStrategy}-${context.day}`,
    runId: context.externalRunId,
    data: {
      seed: context.seedMarker,
      best_ask: (context.price + 0.02).toFixed(4),
      best_bid: (context.price - 0.02).toFixed(4),
      liquidity_usd: (180_000 + context.day * 1750).toString(),
      market: context.symbol,
      oracle_price: context.price.toFixed(4),
      summary: `${context.symbol} market snapshot captured before strategy evaluation.`,
      venue: deepBookVenue,
    },
    metadata: context.metadata,
    tags: ["demo", "deepbook", "market"],
    createdAt: marketSnapshotAt,
    updatedAt: marketSnapshotAt,
  });

  const strategyEvaluationAt = new Date(
    context.startedAt.valueOf() + 2 * 60 * 1000,
  );
  await context.insertEvent({
    organizationId: context.organizationId,
    projectId: context.projectId,
    agentId: context.agentId,
    externalEventId: `seed-strategy-evaluation-${deepBookStrategy}-${context.day}`,
    eventType: "strategy_evaluation",
    source: "sdk",
    timestamp: strategyEvaluationAt,
    traceId: context.traceId,
    spanId: `span-strategy-eval-${deepBookStrategy}-${context.day}`,
    runId: context.externalRunId,
    data: {
      seed: context.seedMarker,
      candidate_strategies: [
        {
          name: "range-mean-reversion",
          score: 82 + (context.day % 9),
        },
        {
          name: "breakout-follow",
          score: 67 + (context.day % 7),
        },
        {
          name: "liquidity-neutral",
          score: 59 + (context.day % 6),
        },
      ],
      market: context.symbol,
      selected_strategy: "range-mean-reversion",
      summary:
        "Agent compared range, breakout, and liquidity-neutral strategies.",
    },
    metadata: context.metadata,
    tags: ["demo", "deepbook", "strategy"],
    createdAt: strategyEvaluationAt,
    updatedAt: strategyEvaluationAt,
  });

  const strategySelectedAt = new Date(
    context.startedAt.valueOf() + 3 * 60 * 1000,
  );
  await context.insertEvent({
    organizationId: context.organizationId,
    projectId: context.projectId,
    agentId: context.agentId,
    externalEventId: `seed-strategy-selected-${deepBookStrategy}-${context.day}`,
    eventType: "strategy_selected",
    source: "sdk",
    timestamp: strategySelectedAt,
    traceId: context.traceId,
    spanId: `span-strategy-selected-${deepBookStrategy}-${context.day}`,
    runId: context.externalRunId,
    data: {
      seed: context.seedMarker,
      confidence: context.confidence,
      market: context.symbol,
      reason:
        "Order book spread and oracle drift favored a bounded range position.",
      selected_strategy: "range-mean-reversion",
      summary: "Range strategy selected for DeepBook Predict market.",
    },
    metadata: context.metadata,
    tags: ["demo", "deepbook", "strategy"],
    createdAt: strategySelectedAt,
    updatedAt: strategySelectedAt,
  });
}

export async function seedDeepBookPositionProposal(
  context: DeepBookSeedContext,
) {
  const proposalAt = new Date(context.startedAt.valueOf() + 11 * 60 * 1000);
  await context.insertEvent({
    organizationId: context.organizationId,
    projectId: context.projectId,
    agentId: context.agentId,
    externalEventId: `seed-position-proposal-${deepBookStrategy}-${context.day}`,
    eventType: "position_proposal",
    source: "sdk",
    timestamp: proposalAt,
    traceId: context.traceId,
    spanId: `span-position-proposal-${deepBookStrategy}-${context.day}`,
    runId: context.externalRunId,
    data: {
      seed: context.seedMarker,
      entry_price: context.price.toFixed(4),
      market: context.symbol,
      max_loss_usd: (context.quantity * context.price * 0.18).toFixed(2),
      position_side: context.side === "buy" ? "yes" : "no",
      quantity: context.quantity.toString(),
      settlement_window: "24h",
      summary: "Agent proposed a bounded DeepBook Predict position.",
    },
    metadata: context.metadata,
    tags: ["demo", "deepbook", "position"],
    createdAt: proposalAt,
    updatedAt: proposalAt,
  });
}

export async function seedDeepBookChainReference(context: DeepBookSeedContext) {
  const chainAt = new Date(context.startedAt.valueOf() + 20 * 60 * 1000);
  await context.insertEvent({
    organizationId: context.organizationId,
    projectId: context.projectId,
    agentId: context.agentId,
    externalEventId: `seed-chain-tx-${deepBookStrategy}-${context.day}`,
    eventType: "chain_transaction",
    source: "sdk",
    timestamp: chainAt,
    traceId: context.traceId,
    spanId: `span-chain-${deepBookStrategy}-${context.day}`,
    runId: context.externalRunId,
    data: {
      seed: context.seedMarker,
      chain: "sui",
      digest_reference: `demo-sui-digest-${context.day}-${context.strategyIndex}`,
      execution_mode: context.executionMode,
      network: "testnet",
      status:
        context.executionMode === "replay"
          ? "simulated_from_replay"
          : "paper_not_broadcast",
      summary:
        context.executionMode === "replay"
          ? "Replay attached a redacted Sui transaction reference."
          : "Paper execution recorded no broadcast transaction.",
    },
    metadata: context.metadata,
    tags: ["demo", "deepbook", "chain"],
    createdAt: chainAt,
    updatedAt: chainAt,
  });
}

export async function seedDeepBookSettlementAuditEvents(
  context: DeepBookSeedContext,
) {
  const settlementAt = new Date(context.startedAt.valueOf() + 26 * 60 * 1000);
  const outcome =
    (context.day + context.strategyIndex) % 4 === 0
      ? "range_missed"
      : "range_won";
  await context.insertEvent({
    organizationId: context.organizationId,
    projectId: context.projectId,
    agentId: context.agentId,
    externalEventId: `seed-settlement-${deepBookStrategy}-${context.day}`,
    eventType: "settlement",
    source: "sdk",
    timestamp: settlementAt,
    traceId: context.traceId,
    spanId: `span-settlement-${deepBookStrategy}-${context.day}`,
    runId: context.externalRunId,
    data: {
      seed: context.seedMarker,
      market: context.symbol,
      outcome,
      settlement_price: (
        context.price + (outcome === "range_won" ? 0.06 : -0.08)
      ).toFixed(4),
      status: "settled",
      summary:
        outcome === "range_won"
          ? "Prediction settled in range and realized simulated profit."
          : "Prediction settled outside range and capped simulated loss.",
    },
    metadata: context.metadata,
    tags: ["demo", "deepbook", "settlement"],
    createdAt: settlementAt,
    updatedAt: settlementAt,
  });

  const auditInsightAt = new Date(context.startedAt.valueOf() + 28 * 60 * 1000);
  await context.insertEvent({
    organizationId: context.organizationId,
    projectId: context.projectId,
    agentId: context.agentId,
    externalEventId: `seed-audit-insight-${deepBookStrategy}-${context.day}`,
    eventType: "audit_insight",
    source: "sdk",
    timestamp: auditInsightAt,
    traceId: context.traceId,
    spanId: `span-audit-insight-${deepBookStrategy}-${context.day}`,
    runId: context.externalRunId,
    data: {
      seed: context.seedMarker,
      checks: [
        "strategy_evaluation_present",
        "risk_gate_approved",
        "execution_mode_recorded",
        "wallet_identifier_redacted",
      ],
      summary:
        "Audit review found strategy, risk, execution, and settlement breadcrumbs.",
      verdict: "passed",
    },
    metadata: context.metadata,
    tags: ["demo", "deepbook", "audit"],
    createdAt: auditInsightAt,
    updatedAt: auditInsightAt,
  });

  const pnlAt = new Date(context.startedAt.valueOf() + 30 * 60 * 1000);
  await context.insertEvent({
    organizationId: context.organizationId,
    projectId: context.projectId,
    agentId: context.agentId,
    externalEventId: `seed-run-pnl-${deepBookStrategy}-${context.day}`,
    eventType: "pnl_snapshot",
    source: "sdk",
    timestamp: pnlAt,
    traceId: context.traceId,
    spanId: `span-pnl-${deepBookStrategy}-${context.day}`,
    runId: context.externalRunId,
    data: {
      seed: context.seedMarker,
      equity: (25_000 + (30 - context.day) * 180).toFixed(2),
      realized_pnl: (outcome === "range_won"
        ? context.quantity * context.price * 0.13
        : -context.quantity * context.price * 0.07
      ).toFixed(2),
      strategy: deepBookStrategy,
      symbol: context.symbol,
      unrealized_pnl: "0.00",
    },
    metadata: context.metadata,
    tags: ["demo", "deepbook", "pnl"],
    createdAt: pnlAt,
    updatedAt: pnlAt,
  });

  const auditAnchorAt = new Date(context.startedAt.valueOf() + 32 * 60 * 1000);
  await context.insertEvent({
    organizationId: context.organizationId,
    projectId: context.projectId,
    agentId: context.agentId,
    externalEventId: `seed-audit-anchor-${deepBookStrategy}-${context.day}`,
    eventType: "audit_anchor",
    source: "sdk",
    timestamp: auditAnchorAt,
    traceId: context.traceId,
    spanId: `span-audit-anchor-${deepBookStrategy}-${context.day}`,
    runId: context.externalRunId,
    data: {
      seed: context.seedMarker,
      anchor_mode: "demo_not_broadcast",
      digest_reference: `audit-demo-${context.day}-${context.strategyIndex}`,
      status: "ready",
      summary: "Audit packet is ready to anchor; demo mode does not broadcast.",
    },
    metadata: context.metadata,
    tags: ["demo", "deepbook", "audit"],
    createdAt: auditAnchorAt,
    updatedAt: auditAnchorAt,
  });
}
