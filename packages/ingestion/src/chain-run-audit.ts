import { schema, type Database } from "@openstat/db";
import { and, desc, eq } from "drizzle-orm";

import { analyzeRunAudit, type RunAuditInput } from "./audit-copilot.js";
import { redactTelemetryPayload } from "./redaction.js";

export async function getChainRunAudit(options: {
  db: Database["db"];
  externalRunId: string;
  scope: {
    organizationId: string;
    projectId: string;
  };
}) {
  const [run] = await options.db
    .select()
    .from(schema.agentRuns)
    .where(
      and(
        eq(schema.agentRuns.organizationId, options.scope.organizationId),
        eq(schema.agentRuns.projectId, options.scope.projectId),
        eq(schema.agentRuns.externalRunId, options.externalRunId),
      ),
    )
    .limit(1);

  if (!run) {
    return undefined;
  }

  const [events, chainTransactions, latestInsight, latestAnchor] =
    await Promise.all([
      options.db
        .select({
          data: schema.events.data,
          eventType: schema.events.eventType,
          timestamp: schema.events.timestamp,
        })
        .from(schema.events)
        .where(
          and(
            eq(schema.events.organizationId, options.scope.organizationId),
            eq(schema.events.projectId, options.scope.projectId),
            eq(schema.events.runId, options.externalRunId),
          ),
        )
        .orderBy(schema.events.timestamp),
      options.db
        .select({
          action: schema.chainTransactions.action,
          blockNumber: schema.chainTransactions.blockNumber,
          chainId: schema.chainTransactions.chainId,
          explorerUrl: schema.chainTransactions.explorerUrl,
          gasUsed: schema.chainTransactions.gasUsed,
          id: schema.chainTransactions.id,
          status: schema.chainTransactions.status,
          submittedAt: schema.chainTransactions.submittedAt,
          transactionHash: schema.chainTransactions.transactionHash,
        })
        .from(schema.chainTransactions)
        .where(
          and(
            eq(schema.chainTransactions.projectId, options.scope.projectId),
            eq(schema.chainTransactions.externalRunId, options.externalRunId),
          ),
        )
        .orderBy(schema.chainTransactions.submittedAt),
      getLatestInsight(options),
      getLatestAnchor(options),
    ]);
  const safeEvents = events.map((event) => ({
    data: getSafeEventData(redactTelemetryPayload(event.data)),
    eventType: event.eventType,
    timestamp: event.timestamp.toISOString(),
  }));

  return {
    anchor: latestAnchor,
    chainTransactions,
    events: safeEvents,
    insight: latestInsight,
    run: {
      agentId: run.agentId,
      endedAt: run.endedAt,
      externalRunId: run.externalRunId,
      id: run.id,
      startedAt: run.startedAt,
      status: run.status,
      strategy: run.strategy,
    },
  };
}

export async function createChainRunAuditInsight(options: {
  db: Database["db"];
  externalRunId: string;
  scope: {
    organizationId: string;
    projectId: string;
  };
}) {
  const audit = await getChainRunAudit(options);

  if (!audit) {
    return undefined;
  }

  const input: RunAuditInput = {
    events: audit.events,
    externalRunId: options.externalRunId,
    transactions: audit.chainTransactions.map((transaction) => ({
      action: transaction.action,
      blockNumber: transaction.blockNumber,
      chainId: transaction.chainId,
      explorerUrl: transaction.explorerUrl,
      gasUsed: transaction.gasUsed,
      status: transaction.status,
      transactionHash: transaction.transactionHash,
    })),
  };
  const analyzed = analyzeRunAudit(input);
  const [existingInsight] = await options.db
    .select()
    .from(schema.auditInsights)
    .where(
      and(
        eq(schema.auditInsights.projectId, options.scope.projectId),
        eq(schema.auditInsights.externalRunId, options.externalRunId),
        eq(schema.auditInsights.telemetryDigest, analyzed.telemetryDigest),
        eq(schema.auditInsights.insightDigest, analyzed.insightDigest),
      ),
    )
    .limit(1);

  if (existingInsight) {
    return existingInsight;
  }

  const [insight] = await options.db
    .insert(schema.auditInsights)
    .values({
      agentId: audit.run.agentId,
      analysis: analyzed.analysis,
      anomalyFlags: analyzed.anomalyFlags,
      chainTransactionId: audit.chainTransactions[0]?.id,
      externalRunId: options.externalRunId,
      insightDigest: analyzed.insightDigest,
      model: "deterministic-v1",
      organizationId: options.scope.organizationId,
      projectId: options.scope.projectId,
      provider: "openstat",
      riskScore: analyzed.riskScore,
      summary: analyzed.summary,
      telemetryDigest: analyzed.telemetryDigest,
      verdict: analyzed.verdict,
    })
    .returning();

  return insight;
}

async function getLatestInsight(options: {
  db: Database["db"];
  externalRunId: string;
  scope: { projectId: string };
}) {
  const [insight] = await options.db
    .select({
      anomalyFlags: schema.auditInsights.anomalyFlags,
      createdAt: schema.auditInsights.createdAt,
      id: schema.auditInsights.id,
      insightDigest: schema.auditInsights.insightDigest,
      riskScore: schema.auditInsights.riskScore,
      summary: schema.auditInsights.summary,
      telemetryDigest: schema.auditInsights.telemetryDigest,
      verdict: schema.auditInsights.verdict,
    })
    .from(schema.auditInsights)
    .where(
      and(
        eq(schema.auditInsights.projectId, options.scope.projectId),
        eq(schema.auditInsights.externalRunId, options.externalRunId),
      ),
    )
    .orderBy(desc(schema.auditInsights.createdAt))
    .limit(1);

  return insight;
}

async function getLatestAnchor(options: {
  db: Database["db"];
  externalRunId: string;
  scope: { projectId: string };
}) {
  const [anchor] = await options.db
    .select({
      anchoredAt: schema.auditAnchors.anchoredAt,
      contractAddress: schema.auditAnchors.contractAddress,
      explorerUrl: schema.auditAnchors.explorerUrl,
      insightDigest: schema.auditAnchors.insightDigest,
      outcome: schema.auditAnchors.outcome,
      telemetryDigest: schema.auditAnchors.telemetryDigest,
      transactionHash: schema.auditAnchors.transactionHash,
    })
    .from(schema.auditAnchors)
    .where(
      and(
        eq(schema.auditAnchors.projectId, options.scope.projectId),
        eq(schema.auditAnchors.externalRunId, options.externalRunId),
      ),
    )
    .orderBy(desc(schema.auditAnchors.anchoredAt))
    .limit(1);

  return anchor;
}

function getSafeEventData(data: Record<string, unknown>) {
  const allowedKeys = [
    "action",
    "confidence",
    "rationale_summary",
    "reason",
    "result",
    "status",
    "summary",
    "symbol",
    "tool_name",
  ];

  return Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        allowedKeys.includes(key) &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"),
    ),
  );
}
