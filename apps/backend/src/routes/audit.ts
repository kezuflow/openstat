import { schema } from "@openstat/db";
import { analyzeChainTransaction } from "@openstat/ingestion";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { resolveReadScope } from "../auth-scope.js";
import { database } from "../context.js";
import {
  auditInsightResponseSchema,
  chainTransactionListResponseSchema,
  errorResponseSchema,
  sessionCookieSecurity,
  bearerSecurity,
} from "../openapi/schemas.js";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const transactionParamsSchema = z.object({
  transactionId: z.uuid(),
});

export async function registerAuditRoutes(app: FastifyInstance) {
  app.get(
    "/v1/audit/transactions",
    {
      schema: {
        tags: ["Monitoring"],
        summary: "List scoped Mantle transactions and receipt status",
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
        .where(eq(schema.chainTransactions.projectId, scope.projectId))
        .orderBy(desc(schema.chainTransactions.createdAt))
        .limit(query.limit ?? 50);

      return { transactions };
    },
  );

  app.post(
    "/v1/audit/transactions/:transactionId/analyze",
    {
      schema: {
        tags: ["Monitoring"],
        summary: "Analyze a scoped Mantle transaction with Audit Copilot",
        security: [...sessionCookieSecurity, ...bearerSecurity],
        response: {
          200: auditInsightResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const scope = await resolveReadScope(request);
      const params = transactionParamsSchema.parse(request.params);
      const [transaction] = await database.db
        .select()
        .from(schema.chainTransactions)
        .where(
          and(
            eq(schema.chainTransactions.id, params.transactionId),
            eq(schema.chainTransactions.projectId, scope.projectId),
          ),
        )
        .limit(1);

      if (!transaction) {
        return reply.status(404).send({
          error: {
            code: "CHAIN_TRANSACTION_NOT_FOUND",
            message: "Chain transaction was not found.",
            requestId: request.id,
          },
        });
      }

      const audit = analyzeChainTransaction(transaction);
      const [insight] = await database.db
        .insert(schema.auditInsights)
        .values({
          agentId: transaction.agentId,
          analysis: audit.analysis,
          anomalyFlags: audit.anomalyFlags,
          chainTransactionId: transaction.id,
          externalRunId: transaction.externalRunId ?? transaction.id,
          insightDigest: audit.insightDigest,
          organizationId: scope.organizationId,
          projectId: scope.projectId,
          provider: "openstat",
          model: "deterministic-v1",
          riskScore: audit.riskScore,
          summary: audit.summary,
          telemetryDigest: audit.telemetryDigest,
          verdict: audit.verdict,
        })
        .returning();

      return { insight };
    },
  );
}
