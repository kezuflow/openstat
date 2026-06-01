import { describe, expect, it } from "vitest";

import { analyzeRunAudit } from "./audit-copilot.js";
import { summarizeMantleRpcError } from "./integrations/mantle/rpc.js";

const confirmedTransaction = {
  action: "anchor_audit",
  chain: "mantle",
  chainId: 5003,
  status: "confirmed" as const,
  transactionHash: `0x${"a".repeat(64)}`,
};

describe("analyzeRunAudit", () => {
  it("passes a confirmed run with intent and risk context", () => {
    const result = analyzeRunAudit({
      events: [
        {
          data: { action: "anchor" },
          eventType: "decision",
          timestamp: "2026-06-01T00:00:00.000Z",
        },
        {
          data: { result: "approved" },
          eventType: "risk_check",
          timestamp: "2026-06-01T00:00:01.000Z",
        },
      ],
      externalRunId: "run_123",
      transactions: [confirmedTransaction],
    });

    expect(result).toMatchObject({
      anomalyFlags: [],
      riskScore: 0,
      verdict: "pass",
    });
    expect(result.telemetryDigest).toMatch(/^0x[0-9a-f]{64}$/u);
    expect(result.insightDigest).toMatch(/^0x[0-9a-f]{64}$/u);
  });

  it("fails a reverted run and produces stable canonical digests", () => {
    const input = {
      events: [],
      externalRunId: "run_reverted",
      transactions: [{ ...confirmedTransaction, status: "reverted" as const }],
    };

    expect(analyzeRunAudit(input)).toMatchObject({
      anomalyFlags: [
        "missing_timeline_context",
        "transaction_reverted",
        "missing_decision_context",
        "missing_risk_check_context",
      ],
      riskScore: 90,
      verdict: "fail",
    });
    expect(analyzeRunAudit(input).telemetryDigest).toBe(
      analyzeRunAudit(structuredClone(input)).telemetryDigest,
    );
  });
});

describe("summarizeMantleRpcError", () => {
  it("does not expose hosted RPC credentials", () => {
    const error = new Error(
      "Request failed at https://mantle-mainnet.g.alchemy.com/v2/super-secret.",
    );

    expect(summarizeMantleRpcError(error)).toBe(
      "Mantle RPC request failed (Error).",
    );
  });
});
