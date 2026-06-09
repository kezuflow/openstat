import {
  chainTransactionDataSchema,
  fillDataSchema,
  ingestEventBatchInputSchema,
  ingestEventInputSchema,
  orderDataSchema,
  otlpLogSignalSchema,
  otlpMetricSignalSchema,
  otlpSpanSignalSchema,
  redactionPolicySchema,
} from "@openstat/schemas/ingestion";
import { describe, expect, it } from "vitest";

describe("OpenStat ingestion schemas", () => {
  it("accepts a valid native decision event", () => {
    const parsed = ingestEventInputSchema.parse({
      id: "event_decision_1",
      agent: {
        id: "agent-alpha",
        name: "Alpha Agent",
        tags: ["paper"],
      },
      type: "decision",
      data: {
        decision_id: "decision_external_1",
        strategy: "breakout",
        symbol: "BTC-USD",
        venue: "coinbase",
        action: "enter_long",
        confidence: 82,
        rationale_summary: "Momentum and risk budget aligned.",
      },
      timestamp: 1_779_468_000_000,
      trace_id: "trace_1",
      span_id: "span_1",
      run_id: "run_1",
      metadata: {
        provider: "openai",
      },
    });

    expect(parsed.schema_version).toBe(1);
    expect(parsed.type).toBe("decision");
    expect(parsed.data).toEqual(
      expect.objectContaining({ decision_id: "decision_external_1" }),
    );
  });

  it("rejects invalid batches and malformed trading payloads", () => {
    expect(() => ingestEventBatchInputSchema.parse({ events: [] })).toThrow();
    expect(() =>
      orderDataSchema.parse({
        symbol: "ETH-USD",
        side: "hold",
        order_type: "limit",
        quantity: "1.5",
      }),
    ).toThrow();
    expect(() =>
      fillDataSchema.parse({
        symbol: "ETH-USD",
        side: "buy",
        quantity: "1.5",
      }),
    ).toThrow();
  });

  it("accepts normalized heartbeat, completion, and OTLP signal contracts", () => {
    expect(
      ingestEventInputSchema.parse({
        type: "heartbeat",
        data: {
          status: "online",
          expected_check_in_seconds: 60,
        },
      }).data,
    ).toEqual({
      status: "online",
      expected_check_in_seconds: 60,
    });

    expect(
      ingestEventInputSchema.parse({
        type: "completion",
        data: {
          provider: "openai",
          model: "gpt-5.4",
          usage: {
            input_tokens: 10,
            output_tokens: 20,
            total_tokens: 30,
          },
        },
      }).type,
    ).toBe("completion");

    expect(
      otlpSpanSignalSchema.parse({
        trace_id: "trace_1",
        span_id: "span_1",
        name: "agent.run",
        started_at: 1_779_468_000_000,
      }).resource,
    ).toEqual({});
    expect(
      otlpLogSignalSchema.parse({
        observed_at: 1_779_468_000_000,
        severity_text: "ERROR",
      }).attributes,
    ).toEqual({});
    expect(
      otlpMetricSignalSchema.parse({
        name: "worker.lag",
        kind: "gauge",
        value: "3",
        recorded_at: 1_779_468_000_000,
      }).resource,
    ).toEqual({});
  });

  it("defaults to redaction and raw-capture safety", () => {
    expect(redactionPolicySchema.parse({})).toEqual({
      enabled: true,
      raw_capture_enabled: false,
      raw_retention_days: 30,
      derived_retention_days: 365,
      extra_sensitive_keys: [],
    });
  });

  it("accepts normalized chain transactions and rejects malformed EVM references", () => {
    expect(
      ingestEventInputSchema.parse({
        agent: { id: "mantle-agent" },
        type: "chain_transaction",
        run_id: "run_mantle_1",
        data: {
          chain: "mantle",
          chain_id: 5003,
          tx_hash: `0x${"a".repeat(64)}`,
          action: "anchor_audit",
          from_address: `0x${"b".repeat(40)}`,
          status: "submitted",
        },
      }).type,
    ).toBe("chain_transaction");

    expect(
      chainTransactionDataSchema.parse({
        chain: "base",
        chain_id: 8453,
        tx_hash: `0x${"a".repeat(64)}`,
      }).chain,
    ).toBe("base");
    expect(() =>
      chainTransactionDataSchema.parse({
        chain: "mantle",
        chain_id: 0,
        tx_hash: `0x${"a".repeat(64)}`,
      }),
    ).toThrow();
    expect(() =>
      chainTransactionDataSchema.parse({
        chain: "Base Mainnet",
        chain_id: 8453,
        tx_hash: `0x${"a".repeat(64)}`,
      }),
    ).toThrow();
    expect(() =>
      chainTransactionDataSchema.parse({
        chain: "mantle",
        chain_id: 5000,
        tx_hash: "0xshort",
      }),
    ).toThrow();
  });

  it("accepts DeepBook Predict telemetry conventions", () => {
    const baseEvent = {
      agent: {
        id: "deepbook-predict-v1",
        name: "DeepBook Predict Agent",
        tags: ["deepbook", "sui"],
      },
      run_id: "seed-trade-run-deepbook-predict-range-v1-0",
      metadata: {
        chain: "sui",
        execution_mode: "paper",
        market: "SUI/USDC",
        network: "testnet",
        product: "deepbook-predict-agent-desk",
        venue: "deepbook-predict",
      },
      tags: ["deepbook", "demo"],
    };

    expect(
      ingestEventInputSchema.parse({
        ...baseEvent,
        type: "market_snapshot",
        data: {
          best_ask: "3.8400",
          best_bid: "3.8000",
          liquidity_usd: "180000",
          market: "SUI/USDC",
          oracle_price: "3.8200",
          summary:
            "SUI/USDC market snapshot captured before strategy evaluation.",
        },
      }).type,
    ).toBe("market_snapshot");

    expect(
      ingestEventInputSchema.parse({
        ...baseEvent,
        type: "strategy_evaluation",
        data: {
          candidate_strategies: [
            { name: "range-mean-reversion", score: 88 },
            { name: "breakout-follow", score: 71 },
          ],
          selected_strategy: "range-mean-reversion",
        },
      }).type,
    ).toBe("strategy_evaluation");

    expect(
      ingestEventInputSchema.parse({
        ...baseEvent,
        type: "position_proposal",
        data: {
          entry_price: "3.8200",
          market: "SUI/USDC",
          max_loss_usd: "18.50",
          position_side: "yes",
          quantity: "25",
          settlement_window: "24h",
        },
      }).type,
    ).toBe("position_proposal");

    expect(
      ingestEventInputSchema.parse({
        ...baseEvent,
        type: "settlement",
        data: {
          market: "SUI/USDC",
          outcome: "range_won",
          settlement_price: "3.8800",
          status: "settled",
        },
      }).type,
    ).toBe("settlement");

    expect(
      ingestEventInputSchema.parse({
        ...baseEvent,
        type: "audit_insight",
        data: {
          checks: ["strategy_evaluation_present", "risk_gate_approved"],
          summary:
            "Audit review found strategy, risk, execution, and settlement breadcrumbs.",
          verdict: "passed",
        },
      }).type,
    ).toBe("audit_insight");

    expect(
      ingestEventInputSchema.parse({
        ...baseEvent,
        type: "chain_transaction",
        data: {
          chain: "sui",
          digest_reference: "demo-sui-digest-0-3",
          execution_mode: "paper",
          network: "testnet",
          status: "paper_not_broadcast",
        },
      }).data,
    ).toEqual(
      expect.objectContaining({
        chain: "sui",
        digest_reference: "demo-sui-digest-0-3",
      }),
    );
  });
});
