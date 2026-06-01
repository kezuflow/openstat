import { createHash } from "node:crypto";

import { z } from "zod";

export const auditInsightSchema = z.object({
  verdict: z.enum(["pass", "warning", "fail"]),
  risk_score: z.number().int().min(0).max(100),
  summary: z.string().max(2_000),
  anomaly_flags: z.array(z.string().min(1).max(160)).max(20),
});

export type RunAuditInput = {
  events: Array<{
    data: Record<string, unknown>;
    eventType: string;
    timestamp: string;
  }>;
  externalRunId: string;
  transactions: Array<{
    action?: string | null;
    blockNumber?: string | null;
    chainId: number;
    explorerUrl?: string | null;
    gasUsed?: string | null;
    status: "submitted" | "confirmed" | "reverted";
    transactionHash: string;
  }>;
};

export function analyzeRunAudit(input: RunAuditInput) {
  const canonicalInput = canonicalize(input);
  const anomalyFlags = getAnomalyFlags(input);
  const riskScore = getRiskScore(input, anomalyFlags);
  const verdict = getVerdict(input, anomalyFlags);
  const summary = getSummary(input, verdict);
  const structuredInsight = auditInsightSchema.parse({
    anomaly_flags: anomalyFlags,
    risk_score: riskScore,
    summary,
    verdict,
  });
  const telemetryDigest = digest(canonicalInput);

  return {
    analysis: {
      analyzer: "openstat-deterministic-v1",
      input: canonicalInput,
    },
    anomalyFlags: structuredInsight.anomaly_flags,
    insightDigest: digest(structuredInsight),
    riskScore: structuredInsight.risk_score,
    summary: structuredInsight.summary,
    telemetryDigest,
    verdict: structuredInsight.verdict,
  };
}

function getAnomalyFlags(input: RunAuditInput) {
  const flags: string[] = [];

  if (input.events.length === 0) {
    flags.push("missing_timeline_context");
  }

  if (input.transactions.length === 0) {
    flags.push("missing_chain_transaction");
  }

  if (
    input.transactions.some((transaction) => transaction.status === "submitted")
  ) {
    flags.push("transaction_pending");
  }

  if (
    input.transactions.some((transaction) => transaction.status === "reverted")
  ) {
    flags.push("transaction_reverted");
  }

  if (!input.events.some((event) => event.eventType === "decision")) {
    flags.push("missing_decision_context");
  }

  if (!input.events.some((event) => event.eventType === "risk_check")) {
    flags.push("missing_risk_check_context");
  }

  return flags;
}

function getRiskScore(input: RunAuditInput, anomalyFlags: readonly string[]) {
  const statusScore = input.transactions.some(
    (transaction) => transaction.status === "reverted",
  )
    ? 70
    : input.transactions.some(
          (transaction) => transaction.status === "submitted",
        )
      ? 20
      : 0;

  return Math.min(100, statusScore + anomalyFlags.length * 5);
}

function getVerdict(input: RunAuditInput, anomalyFlags: readonly string[]) {
  if (
    input.transactions.some((transaction) => transaction.status === "reverted")
  ) {
    return "fail" as const;
  }

  return anomalyFlags.length > 0 ? ("warning" as const) : ("pass" as const);
}

function getSummary(
  input: RunAuditInput,
  verdict: "pass" | "warning" | "fail",
) {
  if (verdict === "fail") {
    return `Run ${input.externalRunId} includes a reverted chain transaction.`;
  }

  if (verdict === "warning") {
    return `Run ${input.externalRunId} needs operator review before anchoring.`;
  }

  return `Run ${input.externalRunId} has complete intent, risk, and confirmed chain receipt context.`;
}

function digest(value: unknown) {
  return `0x${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function canonicalize<T>(value: T): T {
  return JSON.parse(stableJson(value)) as T;
}

function stableJson(value: unknown): string {
  if (value === undefined) {
    return "null";
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, nestedValue]) => nestedValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, nestedValue]) =>
          `${JSON.stringify(key)}:${stableJson(nestedValue)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
