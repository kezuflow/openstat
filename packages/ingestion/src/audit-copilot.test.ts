import { describe, expect, it } from "vitest";

import { analyzeChainTransaction } from "./audit-copilot.js";

describe("analyzeChainTransaction", () => {
  it("passes a confirmed transaction with complete audit context", () => {
    const result = analyzeChainTransaction({
      action: "anchor_audit",
      blockNumber: "42",
      chainId: 5003,
      externalRunId: "run_123",
      status: "confirmed",
      transactionHash: `0x${"a".repeat(64)}`,
    });

    expect(result).toMatchObject({
      anomalyFlags: [],
      riskScore: 0,
      verdict: "pass",
    });
    expect(result.telemetryDigest).toMatch(/^0x[0-9a-f]{64}$/u);
    expect(result.insightDigest).toMatch(/^0x[0-9a-f]{64}$/u);
  });

  it("fails a reverted transaction and explains missing context", () => {
    const result = analyzeChainTransaction({
      chainId: 5000,
      status: "reverted",
      transactionHash: `0x${"b".repeat(64)}`,
    });

    expect(result).toMatchObject({
      anomalyFlags: [
        "transaction_reverted",
        "missing_run_context",
        "missing_action_context",
      ],
      riskScore: 95,
      verdict: "fail",
    });
  });
});
