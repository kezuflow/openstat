import type { NativeEvent } from "openstat";

export type DeepBookExecutionMode = "paper" | "replay";

export type DeepBookStrategyName =
  | "range-mean-reversion"
  | "breakout-follow"
  | "liquidity-neutral";

export type DeepBookStrategyConfig = {
  name: DeepBookStrategyName;
  enabled: boolean;
  maxWeight: number;
  notes?: string;
};

export type DeepBookAgentConfig = {
  maxExposureUsd: number;
  maxSlippageBps: number;
  settlementWindow: "24h";
  strategyCandidates: DeepBookStrategyConfig[];
};

export type DeepBookReplayOptions = {
  agentId?: string;
  config?: DeepBookAgentConfig;
  executionMode: DeepBookExecutionMode;
  market: string;
  network: string;
  now?: number;
  runId?: string;
  suiRpcUrl?: string;
};

const venue = "deepbook-predict";
const product = "deepbook-predict-agent-desk";
const defaultStrategyCandidates: DeepBookStrategyConfig[] = [
  {
    name: "range-mean-reversion",
    enabled: true,
    maxWeight: 45,
  },
  {
    name: "breakout-follow",
    enabled: true,
    maxWeight: 35,
  },
  {
    name: "liquidity-neutral",
    enabled: true,
    maxWeight: 20,
  },
];

export function buildDeepBookReplayEvents(
  options: DeepBookReplayOptions,
): NativeEvent[] {
  const startedAt = options.now ?? Date.now();
  const runId =
    options.runId ?? `deepbook-replay-${new Date(startedAt).toISOString()}`;
  const config = normalizeConfig(options.config);
  const candidateStrategies = rankCandidateStrategies(
    config.strategyCandidates,
  );
  const selectedStrategy = candidateStrategies[0]?.name ?? "liquidity-neutral";
  const maxExposureUsd = config.maxExposureUsd;
  const maxSlippageBps = config.maxSlippageBps;
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
    strategy: selectedStrategy,
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
  const side = "buy";
  const quantity = getPositionQuantity(maxExposureUsd, marketPrice);
  const entryPrice = marketPrice.toFixed(4);
  const fillPrice = (marketPrice + 0.024).toFixed(4);
  const outcome = "range_won";
  const maxLossUsd = Math.max(1, maxExposureUsd * 0.0069).toFixed(2);

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
        candidate_strategies: candidateStrategies,
        market: options.market,
        selected_strategy: selectedStrategy,
        summary:
          "Agent compared enabled strategies from the dashboard guardrails.",
      },
    },
    {
      ...context,
      type: "strategy_selected",
      timestamp: timestamp(3),
      data: {
        confidence: candidateStrategies[0]?.score ?? 60,
        market: options.market,
        reason: getStrategyReason(selectedStrategy),
        selected_strategy: selectedStrategy,
        summary: `${formatStrategyName(selectedStrategy)} selected for DeepBook Predict market.`,
      },
    },
    {
      ...context,
      type: "decision",
      timestamp: timestamp(5),
      data: {
        action: "buy_yes_range",
        confidence: candidateStrategies[0]?.score ?? 60,
        rationale_summary: `${options.market} range probability and liquidity supported a ${side} position.`,
        strategy: selectedStrategy,
        symbol: options.market,
        venue,
      },
    },
    {
      ...context,
      type: "risk_check",
      timestamp: timestamp(9),
      data: {
        max_exposure_usd: maxExposureUsd,
        max_slippage_bps: maxSlippageBps,
        reason: `Within exposure cap $${maxExposureUsd} and slippage cap ${maxSlippageBps} bps.`,
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
        max_loss_usd: maxLossUsd,
        position_side: "yes",
        quantity,
        settlement_window: config.settlementWindow,
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
        strategy: selectedStrategy,
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
        strategy: selectedStrategy,
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
        strategy: selectedStrategy,
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
        strategy: selectedStrategy,
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
      metadata: {
        ...metadata,
        kind: "run_lifecycle",
        run_status: "completed",
      },
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

function normalizeConfig(
  config: DeepBookAgentConfig | undefined,
): DeepBookAgentConfig {
  return {
    maxExposureUsd: config?.maxExposureUsd ?? 2_500,
    maxSlippageBps: config?.maxSlippageBps ?? 35,
    settlementWindow: config?.settlementWindow ?? "24h",
    strategyCandidates: config?.strategyCandidates.filter(
      (candidate) => candidate.enabled,
    ).length
      ? config.strategyCandidates
      : defaultStrategyCandidates,
  };
}

function rankCandidateStrategies(strategies: DeepBookStrategyConfig[]) {
  return strategies
    .filter((strategyCandidate) => strategyCandidate.enabled)
    .map((strategyCandidate, index) => ({
      max_weight: strategyCandidate.maxWeight,
      name: strategyCandidate.name,
      score: Math.max(
        1,
        Math.min(99, 54 + strategyCandidate.maxWeight - index * 2),
      ),
    }))
    .sort((left, right) => right.score - left.score);
}

function getPositionQuantity(maxExposureUsd: number, marketPrice: number) {
  return String(Math.max(1, Math.floor(maxExposureUsd / marketPrice / 40)));
}

function formatStrategyName(name: DeepBookStrategyName) {
  return name.replaceAll("-", " ");
}

function getStrategyReason(name: DeepBookStrategyName) {
  switch (name) {
    case "breakout-follow":
      return "Momentum, liquidity, and guardrail weight favored breakout-follow.";
    case "liquidity-neutral":
      return "Liquidity-neutral was preferred because market depth was uncertain.";
    case "range-mean-reversion":
      return "Order book spread and oracle drift favored a bounded range position.";
  }
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
