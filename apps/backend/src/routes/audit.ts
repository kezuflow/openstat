import { schema } from "@openstat/db";
import {
  createChainRunAuditInsight,
  getChainRunAudit,
} from "@openstat/ingestion";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { resolveReadScope } from "../auth-scope.js";
import { database } from "../context.js";
import {
  auditInsightResponseSchema,
  bearerSecurity,
  chainTransactionListResponseSchema,
  errorResponseSchema,
  chainRunAuditResponseSchema,
  sessionCookieSecurity,
} from "../openapi/schemas.js";

const listQuerySchema = z.object({
  chain: z.string().min(1).max(64).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const runParamsSchema = z.object({
  runId: z.string().min(1).max(160),
});

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get(
    "/v1/audit/transactions",
    {
      schema: {
        tags: ["On-chain Audit"],
        summary: "List scoped chain transactions and receipt status",
        description: [
          "Returns chain transaction telemetry for the current project with reconciled receipt status when available.",
          "",
          "Mantle is OpenStat's first chain verification ecosystem. These records can include submitted transaction hashes, receipt status, explorer links, and any correlated redacted AI audit insight or on-chain audit anchor.",
          "",
          "This endpoint verifies receipt data through configured chain RPC integrations. It does not execute trades or publish raw telemetry on-chain.",
        ].join("\n"),
        security: [...sessionCookieSecurity, ...bearerSecurity],
        response: {
          200: chainTransactionListResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const scope = await resolveReadScope(request);
      const query = listQuerySchema.parse(request.query);
      const transactions = await database.db
        .select()
        .from(schema.chainTransactions)
        .where(
          and(
            eq(schema.chainTransactions.projectId, scope.projectId),
            query.chain
              ? eq(schema.chainTransactions.chain, query.chain)
              : undefined,
          ),
        )
        .orderBy(desc(schema.chainTransactions.createdAt))
        .limit(query.limit ?? 50);
      const auditByRunId = new Map(
        await Promise.all(
          [
            ...new Set(
              transactions
                .map((transaction) => transaction.externalRunId)
                .filter((runId): runId is string => Boolean(runId)),
            ),
          ].map(
            async (runId) =>
              [
                runId,
                await getChainRunAudit({
                  db: database.db,
                  externalRunId: runId,
                  scope,
                }),
              ] as const,
          ),
        ),
      );

      return {
        transactions: transactions.map((transaction) => {
          const audit = transaction.externalRunId
            ? auditByRunId.get(transaction.externalRunId)
            : undefined;

          return {
            ...transaction,
            anchor: audit?.anchor,
            insight: audit?.insight,
          };
        }),
      };
    },
  );

  const getRunAudit = async (request: FastifyRequest, reply: FastifyReply) => {
    const scope = await resolveReadScope(request);
    const params = runParamsSchema.parse(request.params);
    const audit = await getChainRunAudit({
      db: database.db,
      externalRunId: params.runId,
      scope,
    });

    if (!audit) {
      return reply.status(404).send(getRunAuditNotFound(request.id));
    }

    return { audit };
  };
  const createRunAuditInsight = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const scope = await resolveReadScope(request);
    const params = runParamsSchema.parse(request.params);
    const insight = await createChainRunAuditInsight({
      db: database.db,
      externalRunId: params.runId,
      scope,
    });

    if (!insight) {
      return reply.status(404).send(getRunAuditNotFound(request.id));
    }

    return { insight };
  };

  for (const path of [
    "/v1/chains/runs/:runId/audit",
    "/v1/mantle/runs/:runId/audit",
  ]) {
    app.get(
      path,
      {
        schema: {
          tags: ["On-chain Audit"],
          summary: "Get one correlated on-chain run audit",
          description: [
            "Returns the OpenStat audit view for one agent run, including run context, related events, reconciled chain transactions, the redacted AI audit insight, and the on-chain audit anchor when one exists.",
            "",
            "Use `/v1/chains/runs/{runId}/audit` for generic chain-aware clients. `/v1/mantle/runs/{runId}/audit` is a Mantle-first alias for the same audit model.",
            "",
            "The first proof integration anchors redacted audit commitments through `OpenStatAuditAnchor` on Mantle Sepolia. Additional chain integrations are planned soon.",
          ].join("\n"),
          security: [...sessionCookieSecurity, ...bearerSecurity],
          response: {
            200: chainRunAuditResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      getRunAudit,
    );
  }

  for (const path of [
    "/v1/chains/runs/:runId/audit-insights",
    "/v1/mantle/runs/:runId/audit-insights",
  ]) {
    app.post(
      path,
      {
        schema: {
          tags: ["On-chain Audit"],
          summary: "Generate one deterministic on-chain audit insight",
          description: [
            "Creates or returns a deterministic Audit Copilot insight for one chain-aware agent run.",
            "",
            "The insight summarizes redacted run context and reconciled chain receipt data, then produces the digests used by the on-chain proof flow. For Mantle, those digests can be anchored through `OpenStatAuditAnchor.anchorAudit(...)`.",
            "",
            "The response does not expose raw prompts, wallet secrets, private account details, or unredacted telemetry.",
          ].join("\n"),
          security: [...sessionCookieSecurity, ...bearerSecurity],
          response: {
            200: auditInsightResponseSchema,
            401: errorResponseSchema,
            403: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      createRunAuditInsight,
    );
  }
}

function getRunAuditNotFound(requestId: string) {
  return {
    error: {
      code: "RUN_AUDIT_NOT_FOUND",
      message: "Chain run audit was not found.",
      requestId,
    },
  };
}
