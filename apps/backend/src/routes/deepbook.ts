import { schema } from "@openstat/db";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireSessionScope } from "../auth-scope.js";
import { database } from "../context.js";
import {
  deepBookAgentConfigResponseSchema,
  deepBookAgentConfigSchema as deepBookAgentConfigOpenApiSchema,
  errorResponseSchema,
  sessionCookieSecurity,
} from "../openapi/schemas.js";

const DEEPBOOK_AGENT_EXTERNAL_ID = "deepbook-predict-v1";
const DEEPBOOK_AGENT_NAME = "DeepBook Predict Agent";
const DEEPBOOK_AGENT_CONFIG_METADATA_KEY = "deepbook_config";

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

function getDeepBookAgentConfig(metadata: unknown): DeepBookAgentConfig {
  const storedConfig = asRecord(metadata)?.[DEEPBOOK_AGENT_CONFIG_METADATA_KEY];
  const parsedConfig = deepBookAgentConfigSchema.safeParse(storedConfig);

  return parsedConfig.success ? parsedConfig.data : defaultDeepBookAgentConfig;
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
