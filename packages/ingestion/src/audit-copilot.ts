import { createHash } from "node:crypto";

export type AuditTransactionInput = {
  action?: string | null;
  blockNumber?: string | null;
  chainId: number;
  externalRunId?: string | null;
  status: "submitted" | "confirmed" | "reverted";
  transactionHash: string;
};

export function analyzeChainTransaction(input: AuditTransactionInput) {
  const anomalyFlags = getAnomalyFlags(input);
  const riskScore = getRiskScore(input, anomalyFlags);
  const verdict =
    input.status === "reverted"
      ? "fail"
      : anomalyFlags.length > 0
        ? "warning"
        : "pass";
  const telemetryDigest = digest(input);
  const analysis = {
    analyzer: "openstat-deterministic-v1",
    chainId: input.chainId,
    status: input.status,
    transactionHash: input.transactionHash,
  };
  const summary = getSummary(input, verdict);

  return {
    analysis,
    anomalyFlags,
    insightDigest: digest({
      analysis,
      anomalyFlags,
      riskScore,
      summary,
      telemetryDigest,
      verdict,
    }),
    riskScore,
    summary,
    telemetryDigest,
    verdict,
  };
}

function getAnomalyFlags(input: AuditTransactionInput) {
  const flags: string[] = [];

  if (input.status === "submitted") {
    flags.push("transaction_pending");
  }

  if (input.status === "reverted") {
    flags.push("transaction_reverted");
  }

  if (!input.externalRunId) {
    flags.push("missing_run_context");
  }

  if (!input.action) {
    flags.push("missing_action_context");
  }

  return flags;
}

function getRiskScore(
  input: AuditTransactionInput,
  anomalyFlags: readonly string[],
) {
  const statusScore =
    input.status === "reverted" ? 80 : input.status === "submitted" ? 25 : 0;

  return Math.min(100, statusScore + anomalyFlags.length * 5);
}

function getSummary(
  input: AuditTransactionInput,
  verdict: "pass" | "warning" | "fail",
) {
  if (verdict === "fail") {
    return `Mantle transaction ${input.transactionHash} reverted onchain.`;
  }

  if (verdict === "warning") {
    return `Mantle transaction ${input.transactionHash} needs operator review.`;
  }

  return `Mantle transaction ${input.transactionHash} confirmed with complete audit context.`;
}

function digest(value: unknown) {
  return `0x${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, nestedValue]) =>
          `${JSON.stringify(key)}:${stableJson(nestedValue)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
