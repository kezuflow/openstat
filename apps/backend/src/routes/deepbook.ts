import { schema } from "@openstat/db";
import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import {
  authenticateIngestionScope,
  requireSessionScope,
} from "../auth-scope.js";
import { database } from "../context.js";
import {
  bearerSecurity,
  claimDeepBookJobBodySchema,
  claimDeepBookJobResponseSchema,
  createDeepBookRunBodySchema,
  createDeepBookRunResponseSchema,
  deepBookAgentConfigResponseSchema,
  deepBookAgentConfigSchema as deepBookAgentConfigOpenApiSchema,
  errorResponseSchema,
  sessionCookieSecurity,
} from "../openapi/schemas.js";

const DEEPBOOK_AGENT_EXTERNAL_ID = "deepbook-predict-v1";
const DEEPBOOK_AGENT_NAME = "DeepBook Predict Agent";
const DEEPBOOK_AGENT_CONFIG_METADATA_KEY = "deepbook_config";
const DEEPBOOK_PRODUCT = "deepbook-predict";
const DEEPBOOK_VENUE = "deepbook";

const strategyNameSchema = z.enum([
  "range-mean-reversion",
  "breakout-follow",
  "liquidity-neutral",
]);

const deepBookAgentStrategySchema = z.object({
  name: strategyNameSchema,
  enabled: z.boolean(),
  maxWeight: z.number().int().min(0).max(100),
  notes: z.string().trim().max(500).optional(),
});

const deepBookAgentConfigSchema = z
  .object({
    market: z.enum(["SUI/USDC", "DEEP/USDC", "DEEP/SUI"]),
    network: z.enum(["testnet"]),
    executionMode: z.enum(["replay", "paper"]),
    maxExposureUsd: z.number().int().min(100).max(100_000),
    maxSlippageBps: z.number().int().min(1).max(1_000),
    settlementWindow: z.enum(["24h"]),
    strategyCandidates: z
      .array(deepBookAgentStrategySchema)
      .min(1)
      .max(3)
      .refine(
        (strategies) =>
          new Set(strategies.map((strategy) => strategy.name)).size ===
          strategies.length,
        "Strategy candidates must be unique.",
      )
      .refine(
        (strategies) =>
          strategies.some((strategy) => strategy.enabled) &&
          strategies
            .filter((strategy) => strategy.enabled)
            .reduce((total, strategy) => total + strategy.maxWeight, 0) <= 100,
        "Enabled strategies must include at least one candidate and stay within 100 total weight.",
      ),
  })
  .strict();

type DeepBookAgentConfig = z.infer<typeof deepBookAgentConfigSchema>;

const createDeepBookRunSchema = z
  .object({
    executionMode: z.enum(["replay", "paper"]).optional(),
  })
  .strict();

const claimDeepBookJobSchema = z
  .object({
    runnerId: z.string().trim().min(1).max(120).default("deepbook-agent"),
  })
  .strict();

const defaultDeepBookAgentConfig = {
  market: "SUI/USDC",
  network: "testnet",
  executionMode: "paper",
  maxExposureUsd: 2_500,
  maxSlippageBps: 35,
  settlementWindow: "24h",
  strategyCandidates: [
    {
      name: "range-mean-reversion",
      enabled: true,
      maxWeight: 45,
      notes: "Prefer bounded markets with stable liquidity.",
    },
    {
      name: "breakout-follow",
      enabled: true,
      maxWeight: 35,
      notes: "Activate when momentum and liquidity agree.",
    },
    {
      name: "liquidity-neutral",
      enabled: true,
      maxWeight: 20,
      notes: "Fallback when spreads or book depth are unfavorable.",
    },
  ],
} satisfies DeepBookAgentConfig;

export async function registerDeepBookRoutes(app: FastifyInstance) {
  app.get(
    "/v1/deepbook/config",
    {
      schema: {
        tags: ["DeepBook Predict"],
        summary: "Get DeepBook Predict agent configuration",
        security: sessionCookieSecurity,
        response: {
          200: deepBookAgentConfigResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const scope = await requireSessionScope(request);
      const agent = await getDeepBookAgent(scope);

      return toDeepBookConfigResponse(agent);
    },
  );

  app.put(
    "/v1/deepbook/config",
    {
      schema: {
        tags: ["DeepBook Predict"],
        summary: "Update DeepBook Predict agent configuration",
        security: sessionCookieSecurity,
        body: deepBookAgentConfigOpenApiSchema,
        response: {
          200: deepBookAgentConfigResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const scope = await requireSessionScope(request);
      const config = deepBookAgentConfigSchema.parse(request.body ?? {});
      const now = new Date();
      const existingAgent = await getDeepBookAgent(scope);
      const metadata = {
        ...(asRecord(existingAgent?.metadata) ?? {}),
        [DEEPBOOK_AGENT_CONFIG_METADATA_KEY]: config,
        deepbook_config_updated_at: now.toISOString(),
        product: "deepbook-predict",
        venue: "deepbook",
      };

      if (existingAgent) {
        const [agent] = await database.db
          .update(schema.agents)
          .set({
            name: DEEPBOOK_AGENT_NAME,
            mode: "long_running",
            tags: getDeepBookAgentTags(),
            metadata,
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.agents.id, existingAgent.id),
              eq(schema.agents.organizationId, scope.organizationId),
              eq(schema.agents.projectId, scope.projectId),
            ),
          )
          .returning({
            id: schema.agents.id,
            externalId: schema.agents.externalId,
            name: schema.agents.name,
            metadata: schema.agents.metadata,
            updatedAt: schema.agents.updatedAt,
          });

        return toDeepBookConfigResponse(agent ?? existingAgent);
      }

      const [agent] = await database.db
        .insert(schema.agents)
        .values({
          organizationId: scope.organizationId,
          projectId: scope.projectId,
          externalId: DEEPBOOK_AGENT_EXTERNAL_ID,
          name: DEEPBOOK_AGENT_NAME,
          status: "unknown",
          mode: "long_running",
          expectedCheckInSeconds: 300,
          tags: getDeepBookAgentTags(),
          metadata,
        })
        .returning({
          id: schema.agents.id,
          externalId: schema.agents.externalId,
          name: schema.agents.name,
          metadata: schema.agents.metadata,
          updatedAt: schema.agents.updatedAt,
        });

      if (!agent) {
        throw new Error("Failed to save DeepBook Predict agent config.");
      }

      return toDeepBookConfigResponse(agent);
    },
  );

  app.post(
    "/v1/deepbook/runs",
    {
      schema: {
        tags: ["DeepBook Predict"],
        summary: "Request a DeepBook Predict agent run",
        description:
          "Creates a queued DeepBook Predict job. A separately deployed `apps/deepbook-agent` runner claims the job and emits telemetry.",
        security: sessionCookieSecurity,
        body: createDeepBookRunBodySchema,
        response: {
          200: createDeepBookRunResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const scope = await requireSessionScope(request);
      const input = createDeepBookRunSchema.parse(request.body ?? {});
      const now = new Date();
      const agent = await ensureDeepBookAgent(scope, now);
      const config = {
        ...getDeepBookAgentConfig(agent.metadata),
        executionMode:
          input.executionMode ??
          getDeepBookAgentConfig(agent.metadata).executionMode,
      };
      const externalRunId = `deepbook-${config.executionMode}-${now.toISOString()}-${randomUUID().slice(0, 8)}`;
      const consoleLines = [
        {
          timestamp: now.toISOString(),
          level: "info" as const,
          message: "Run requested from DeepBook Agent Console.",
        },
        {
          timestamp: now.toISOString(),
          level: "info" as const,
          message: "Waiting for apps/deepbook-agent to claim the job.",
        },
      ];

      const [run] = await database.db
        .insert(schema.agentRuns)
        .values({
          organizationId: scope.organizationId,
          projectId: scope.projectId,
          agentId: agent.id,
          externalRunId,
          status: "queued",
          strategy: null,
          startedAt: now,
          metadata: {
            product: DEEPBOOK_PRODUCT,
            venue: DEEPBOOK_VENUE,
            queue_status: "queued",
            requested_at: now.toISOString(),
            execution_mode: config.executionMode,
            config_snapshot: config,
            console_lines: consoleLines,
          },
        })
        .returning({
          id: schema.agentRuns.id,
          externalRunId: schema.agentRuns.externalRunId,
          status: schema.agentRuns.status,
          metadata: schema.agentRuns.metadata,
          startedAt: schema.agentRuns.startedAt,
          createdAt: schema.agentRuns.createdAt,
        });

      if (!run) {
        throw new Error("Failed to request DeepBook Predict run.");
      }

      return { run: toDeepBookRunJob(run) };
    },
  );

  app.post(
    "/v1/deepbook/jobs/claim",
    {
      schema: {
        tags: ["DeepBook Predict"],
        summary: "Claim the next queued DeepBook Predict job",
        description:
          "Used by the separately deployed `apps/deepbook-agent` runner. Authenticate with a project ingestion API key.",
        security: bearerSecurity,
        body: claimDeepBookJobBodySchema,
        response: {
          200: claimDeepBookJobResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const scope = await authenticateIngestionScope(
        request.headers.authorization,
      );
      const input = claimDeepBookJobSchema.parse(request.body ?? {});
      const now = new Date();
      const [queuedRun] = await database.db
        .select({
          id: schema.agentRuns.id,
          externalRunId: schema.agentRuns.externalRunId,
          status: schema.agentRuns.status,
          metadata: schema.agentRuns.metadata,
          startedAt: schema.agentRuns.startedAt,
          createdAt: schema.agentRuns.createdAt,
        })
        .from(schema.agentRuns)
        .where(
          and(
            eq(schema.agentRuns.organizationId, scope.organizationId),
            eq(schema.agentRuns.projectId, scope.projectId),
            eq(schema.agentRuns.status, "queued"),
            sql`${schema.agentRuns.metadata}->>'product' = ${DEEPBOOK_PRODUCT}`,
            sql`${schema.agentRuns.metadata}->>'queue_status' = 'queued'`,
          ),
        )
        .orderBy(asc(schema.agentRuns.createdAt))
        .limit(1);

      if (!queuedRun) {
        return { job: null };
      }

      const metadata = asRecord(queuedRun.metadata) ?? {};
      const consoleLines = [
        ...getConsoleLines(metadata),
        {
          timestamp: now.toISOString(),
          level: "info" as const,
          message: `Claimed by ${input.runnerId}.`,
        },
      ];
      const [claimedRun] = await database.db
        .update(schema.agentRuns)
        .set({
          status: "running",
          metadata: {
            ...metadata,
            queue_status: "claimed",
            claimed_at: now.toISOString(),
            runner_id: input.runnerId,
            console_lines: consoleLines,
          },
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.agentRuns.id, queuedRun.id),
            eq(schema.agentRuns.organizationId, scope.organizationId),
            eq(schema.agentRuns.projectId, scope.projectId),
            eq(schema.agentRuns.status, "queued"),
          ),
        )
        .returning({
          id: schema.agentRuns.id,
          externalRunId: schema.agentRuns.externalRunId,
          status: schema.agentRuns.status,
          metadata: schema.agentRuns.metadata,
          startedAt: schema.agentRuns.startedAt,
          createdAt: schema.agentRuns.createdAt,
        });

      return { job: claimedRun ? toDeepBookRunJob(claimedRun) : null };
    },
  );
}

async function getDeepBookAgent(scope: {
  organizationId: string;
  projectId: string;
}) {
  const [agent] = await database.db
    .select({
      id: schema.agents.id,
      externalId: schema.agents.externalId,
      name: schema.agents.name,
      metadata: schema.agents.metadata,
      updatedAt: schema.agents.updatedAt,
    })
    .from(schema.agents)
    .where(
      and(
        eq(schema.agents.organizationId, scope.organizationId),
        eq(schema.agents.projectId, scope.projectId),
        eq(schema.agents.externalId, DEEPBOOK_AGENT_EXTERNAL_ID),
      ),
    )
    .limit(1);

  return agent;
}

function toDeepBookConfigResponse(
  agent:
    | {
        id: string;
        externalId: string | null;
        name: string;
        metadata: Record<string, unknown>;
        updatedAt: Date;
      }
    | undefined,
) {
  return {
    agent: {
      id: agent?.id ?? null,
      externalId: DEEPBOOK_AGENT_EXTERNAL_ID,
      name: agent?.name ?? DEEPBOOK_AGENT_NAME,
    },
    config: getDeepBookAgentConfig(agent?.metadata),
    updatedAt: agent?.updatedAt?.toISOString() ?? null,
  };
}

async function ensureDeepBookAgent(
  scope: { organizationId: string; projectId: string },
  now: Date,
) {
  const existingAgent = await getDeepBookAgent(scope);

  if (existingAgent) {
    return existingAgent;
  }

  const [agent] = await database.db
    .insert(schema.agents)
    .values({
      organizationId: scope.organizationId,
      projectId: scope.projectId,
      externalId: DEEPBOOK_AGENT_EXTERNAL_ID,
      name: DEEPBOOK_AGENT_NAME,
      status: "unknown",
      mode: "long_running",
      expectedCheckInSeconds: 300,
      tags: getDeepBookAgentTags(),
      metadata: {
        [DEEPBOOK_AGENT_CONFIG_METADATA_KEY]: defaultDeepBookAgentConfig,
        product: DEEPBOOK_PRODUCT,
        venue: DEEPBOOK_VENUE,
      },
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: schema.agents.id,
      externalId: schema.agents.externalId,
      name: schema.agents.name,
      metadata: schema.agents.metadata,
      updatedAt: schema.agents.updatedAt,
    });

  if (!agent) {
    throw new Error("Failed to create DeepBook Predict agent.");
  }

  return agent;
}

function toDeepBookRunJob(run: {
  id: string;
  externalRunId: string | null;
  status: string;
  metadata: Record<string, unknown>;
  startedAt: Date;
  createdAt: Date;
}) {
  const metadata = asRecord(run.metadata) ?? {};
  const config = getDeepBookAgentConfig({
    [DEEPBOOK_AGENT_CONFIG_METADATA_KEY]: metadata.config_snapshot,
  });

  return {
    id: run.id,
    externalRunId: run.externalRunId ?? `deepbook-run-${run.id}`,
    status: normalizeRunStatus(run.status),
    executionMode: config.executionMode,
    config,
    consoleLines: getConsoleLines(metadata),
    createdAt: run.createdAt.toISOString(),
  };
}

function getDeepBookAgentConfig(metadata: unknown): DeepBookAgentConfig {
  const storedConfig = asRecord(metadata)?.[DEEPBOOK_AGENT_CONFIG_METADATA_KEY];
  const parsedConfig = deepBookAgentConfigSchema.safeParse(storedConfig);

  return parsedConfig.success ? parsedConfig.data : defaultDeepBookAgentConfig;
}

function getConsoleLines(metadata: Record<string, unknown>) {
  const lines = metadata.console_lines;

  if (!Array.isArray(lines)) {
    return [];
  }

  return lines.flatMap((line) => {
    const record = asRecord(line);
    const timestamp = record?.timestamp;
    const message = record?.message;
    const level = record?.level;

    if (typeof timestamp !== "string" || typeof message !== "string") {
      return [];
    }

    return [
      {
        timestamp,
        level:
          level === "warning" || level === "error" || level === "info"
            ? level
            : "info",
        message,
      },
    ];
  });
}

function normalizeRunStatus(status: string) {
  if (
    status === "queued" ||
    status === "running" ||
    status === "completed" ||
    status === "failed"
  ) {
    return status;
  }

  return "running";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}

function getDeepBookAgentTags() {
  return ["trading", "sui", "deepbook", "predict"];
}
