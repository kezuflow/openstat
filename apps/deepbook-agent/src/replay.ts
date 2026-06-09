import type { NativeEvent } from "openstat";

export type DeepBookExecutionMode = "paper" | "replay" | "testnet";

export type DeepBookReplayOptions = {
  agentId?: string;
  executionMode: DeepBookExecutionMode;
  market: string;
  network: string;
  now?: number;
  runId?: string;
  suiRpcUrl?: string;
};

const strategy = "deepbook-predict-range-v1";
const venue = "deepbook-predict";
const product = "deepbook-predict-agent-desk";

export function buildDeepBookReplayEvents(
  options: DeepBookReplayOptions,
): NativeEvent[] {
  const startedAt = options.now ?? Date.now();
  const runId =
    options.runId ?? `deepbook-replay-${new Date(startedAt).toISOString()}`;
  const agent = {
    id: options.agentId ?? "deepbook-predict-v1",
    name: "DeepBook Predict Agent",
    tags: ["deepbook", "predict", "sui"],
  };
  const metadata = {
    chain: "sui",
    execution_mode: options.executionMode,
    market: options.market,
    network: options.network,
    product,
    strategy,
    sui_rpc_configured: Boolean(options.suiRpcUrl),
    venue,
  };
  const context = {
    agent,
    run_id: runId,
    tags: ["deepbook", "predict", "demo"],
    metadata,
  };
  const timestamp = (minutes: number) => startedAt + minutes * 60_000;
  const marketPrice = getMarketPrice(options.market);
  const selectedStrategy = "range-mean-reversion";
  const side = "buy";
  const quantity = "25";
  const entryPrice = marketPrice.toFixed(4);
  const fillPrice = (marketPrice + 0.024).toFixed(4);
  const outcome = "range_won";

  return [
    {
      ...context,
      type: "heartbeat",
      timestamp: timestamp(0),
      data: {
        status: "online",
        summary: "DeepBook Predict replay agent is online.",
      },
    },
    {
      ...context,
      type: "market_snapshot",
      timestamp: timestamp(1),
      data: {
        best_ask: (marketPrice + 0.02).toFixed(4),
        best_bid: (marketPrice - 0.02).toFixed(4),
        liquidity_usd: "180000",
        market: options.market,
        oracle_price: entryPrice,
        summary: `${options.market} market snapshot captured before strategy evaluation.`,
        venue,
      },
    },
    {
      ...context,
      type: "strategy_evaluation",
      timestamp: timestamp(2),
      data: {
        candidate_strategies: [
          { name: selectedStrategy, score: 88 },
          { name: "breakout-follow", score: 71 },
          { name: "liquidity-neutral", score: 62 },
        ],
        market: options.market,
        selected_strategy: selectedStrategy,
        summary:
          "Agent compared range, breakout, and liquidity-neutral strategies.",
      },
    },
    {
      ...context,
      type: "strategy_selected",
      timestamp: timestamp(3),
      data: {
        confidence: 84,
        market: options.market,
        reason:
          "Order book spread and oracle drift favored a bounded range position.",
        selected_strategy: selectedStrategy,
        summary: "Range strategy selected for DeepBook Predict market.",
      },
    },
    {
      ...context,
      type: "decision",
      timestamp: timestamp(5),
      data: {
        action: "buy_yes_range",
        confidence: 84,
        rationale_summary: `${options.market} range probability and liquidity supported a ${side} position.`,
        strategy,
        symbol: options.market,
        venue,
      },
    },
    {
      ...context,
      type: "risk_check",
      timestamp: timestamp(9),
      data: {
        reason: "Within liquidity, exposure, and settlement risk limits.",
        result: "approved",
      },
    },
    {
      ...context,
      type: "position_proposal",
      timestamp: timestamp(11),
      data: {
        entry_price: entryPrice,
        market: options.market,
        max_loss_usd: "17.25",
        position_side: "yes",
        quantity,
        settlement_window: "24h",
        summary: "Agent proposed a bounded DeepBook Predict position.",
      },
    },
    {
      ...context,
      type: "order",
      timestamp: timestamp(14),
      data: {
        order_id: `${runId}-order`,
        order_type: "limit",
        price: entryPrice,
        quantity,
        side,
        status: "filled",
        strategy,
        symbol: options.market,
        venue,
      },
    },
    {
      ...context,
      type: "fill",
      timestamp: timestamp(18),
      data: {
        fill_id: `${runId}-fill`,
        order_id: `${runId}-order`,
        price: fillPrice,
        quantity,
        side,
        status: "filled",
        strategy,
        symbol: options.market,
        venue,
      },
    },
    {
      ...context,
      type: "position",
      timestamp: timestamp(19),
      data: {
        average_price: fillPrice,
        quantity,
        strategy,
        symbol: options.market,
        venue,
      },
    },
    {
      ...context,
      type: "chain_transaction",
      timestamp: timestamp(20),
      data: {
        chain: "sui",
        digest_reference: `${runId}-sui-reference`,
        execution_mode: options.executionMode,
        network: options.network,
        status:
          options.executionMode === "replay"
            ? "simulated_from_replay"
            : "paper_not_broadcast",
        summary:
          options.executionMode === "replay"
            ? "Replay attached a redacted Sui transaction reference."
            : "Paper execution recorded no broadcast transaction.",
      },
    },
    {
      ...context,
      type: "settlement",
      timestamp: timestamp(26),
      data: {
        market: options.market,
        outcome,
        settlement_price: (marketPrice + 0.06).toFixed(4),
        status: "settled",
        summary: "Prediction settled in range and realized simulated profit.",
      },
    },
    {
      ...context,
      type: "pnl_snapshot",
      timestamp: timestamp(30),
      data: {
        equity: "25180.00",
        realized_pnl: "12.42",
        strategy,
        symbol: options.market,
        unrealized_pnl: "0.00",
      },
    },
    {
      ...context,
      type: "audit_insight",
      timestamp: timestamp(31),
      data: {
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
    },
    {
      ...context,
      type: "audit_anchor",
      timestamp: timestamp(32),
      data: {
        anchor_mode: "demo_not_broadcast",
        digest_reference: `${runId}-audit-reference`,
        status: "ready",
        summary:
          "Audit packet is ready to anchor; demo mode does not broadcast.",
      },
    },
    {
      ...context,
      type: "completion",
      timestamp: timestamp(34),
      data: {
        latency_ms: 34 * 60_000,
        model: "deepbook-predict-agent",
        status: "completed",
        summary:
          "DeepBook Predict run completed with simulated settlement and PnL.",
        usage: {
          total_tokens: 1860,
        },
      },
    },
  ];
}

function getMarketPrice(market: string) {
  switch (market) {
    case "DEEP/SUI":
      return 0.035;
    case "DEEP/USDC":
      return 0.12;
    case "SUI/USDC":
      return 3.82;
    default:
      return 1;
  }
}
