import { describe, expect, it } from "vitest";

import { buildDeepBookReplayEvents } from "./replay.js";

describe("DeepBook replay payloads", () => {
  it("builds a deterministic decision-to-outcome sequence", () => {
    const events = buildDeepBookReplayEvents({
      executionMode: "paper",
      market: "SUI/USDC",
      network: "testnet",
      now: Date.UTC(2026, 4, 11, 9, 30),
      runId: "run-deepbook-test",
    });

    expect(events.map((event) => event.type)).toEqual([
      "heartbeat",
      "market_snapshot",
      "strategy_evaluation",
      "strategy_selected",
      "decision",
      "risk_check",
      "position_proposal",
      "order",
      "fill",
      "position",
      "chain_transaction",
      "settlement",
      "pnl_snapshot",
      "audit_insight",
      "audit_anchor",
      "completion",
    ]);
    expect(events.every((event) => event.run_id === "run-deepbook-test")).toBe(
      true,
    );
    expect(events[2]?.data).toMatchObject({
      selected_strategy: "range-mean-reversion",
    });
    expect(events[10]?.data).toMatchObject({
      chain: "sui",
      status: "paper_not_broadcast",
    });
    expect(events[15]?.metadata).toMatchObject({
      kind: "run_lifecycle",
      run_status: "completed",
    });
  });

  it("emits execution only after risk approval", () => {
    const events = buildDeepBookReplayEvents({
      executionMode: "replay",
      market: "DEEP/USDC",
      network: "testnet",
      now: Date.UTC(2026, 4, 11, 9, 30),
    });
    const riskIndex = events.findIndex((event) => event.type === "risk_check");
    const orderIndex = events.findIndex((event) => event.type === "order");
    const risk = events[riskIndex];

    expect(risk?.data).toMatchObject({ result: "approved" });
    expect(orderIndex).toBeGreaterThan(riskIndex);
  });

  it("uses enabled dashboard guardrails for strategy selection and risk limits", () => {
    const events = buildDeepBookReplayEvents({
      config: {
        maxExposureUsd: 1_200,
        maxSlippageBps: 20,
        settlementWindow: "24h",
        strategyCandidates: [
          {
            name: "range-mean-reversion",
            enabled: false,
            maxWeight: 80,
          },
          {
            name: "breakout-follow",
            enabled: true,
            maxWeight: 55,
          },
          {
            name: "liquidity-neutral",
            enabled: true,
            maxWeight: 25,
          },
        ],
      },
      executionMode: "paper",
      market: "SUI/USDC",
      network: "testnet",
      now: Date.UTC(2026, 4, 11, 9, 30),
    });
    const strategyEvaluation = events.find(
      (event) => event.type === "strategy_evaluation",
    );
    const strategySelected = events.find(
      (event) => event.type === "strategy_selected",
    );
    const riskCheck = events.find((event) => event.type === "risk_check");

    expect(strategyEvaluation?.data?.candidate_strategies).toEqual([
      {
        max_weight: 55,
        name: "breakout-follow",
        score: 99,
      },
      {
        max_weight: 25,
        name: "liquidity-neutral",
        score: 77,
      },
    ]);
    expect(strategySelected?.data).toMatchObject({
      selected_strategy: "breakout-follow",
    });
    expect(riskCheck?.data).toMatchObject({
      max_exposure_usd: 1200,
      max_slippage_bps: 20,
    });
  });
});
