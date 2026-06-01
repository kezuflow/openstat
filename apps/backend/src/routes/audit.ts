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
        tags: ["Monitoring"],
        summary: "List scoped chain transactions and receipt status",
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
          tags: ["Monitoring"],
          summary: "Get one correlated chain run audit",
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
          tags: ["Monitoring"],
          summary: "Generate one deterministic chain run audit insight",
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
