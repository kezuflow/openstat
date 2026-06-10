import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerErrorHandler } from "../plugins/errors.js";
import { registerDeepBookRoutes } from "./deepbook.js";

const state = vi.hoisted(() => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
  requireSessionScope: vi.fn(),
}));

vi.mock("../context.js", () => ({
  database: {
    db: state.db,
  },
}));

vi.mock("../auth-scope.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../auth-scope.js")>();

  return {
    ...actual,
    requireSessionScope: state.requireSessionScope,
  };
});

const scope = {
  organizationId: "org_test",
  projectId: "project_test",
};

const savedConfig = {
  market: "DEEP/USDC",
  network: "testnet",
  executionMode: "paper",
  maxExposureUsd: 1_500,
  maxSlippageBps: 25,
  settlementWindow: "24h",
  strategyCandidates: [
    {
      name: "range-mean-reversion",
      enabled: true,
      maxWeight: 60,
    },
    {
      name: "breakout-follow",
      enabled: true,
      maxWeight: 40,
    },
    {
      name: "liquidity-neutral",
      enabled: false,
      maxWeight: 0,
    },
  ],
} as const;

describe("deepbook routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.requireSessionScope.mockResolvedValue(scope);
  });

  it("returns default DeepBook agent config when no project agent exists", async () => {
    mockSelectResult([]);

    const app = await createApp();
    const response = await app.inject({
      method: "GET",
      url: "/v1/deepbook/config",
    });
    const body = response.json<{
      agent: { id: string | null; externalId: string; name: string };
      config: typeof savedConfig;
      updatedAt: string | null;
    }>();

    expect(response.statusCode).toBe(200);
    expect(state.requireSessionScope).toHaveBeenCalledOnce();
    expect(body.agent).toEqual({
      id: null,
      externalId: "deepbook-predict-v1",
      name: "DeepBook Predict Agent",
    });
    expect(body.config.market).toBe("SUI/USDC");
    expect(body.config.executionMode).toBe("paper");
    expect(body.config.strategyCandidates).toHaveLength(3);
    expect(body.updatedAt).toBeNull();

    await app.close();
  });

  it("creates a scoped DeepBook agent config without storing secrets", async () => {
    mockSelectResult([]);
    const returning = vi.fn().mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000001",
        externalId: "deepbook-predict-v1",
        name: "DeepBook Predict Agent",
        metadata: {
          deepbook_config: savedConfig,
          deepbook_config_updated_at: "2026-06-10T00:00:00.000Z",
          product: "deepbook-predict",
          venue: "deepbook",
        },
        updatedAt: new Date("2026-06-10T00:00:00.000Z"),
      },
    ]);
    const values = vi.fn().mockReturnValue({ returning });

    state.db.insert.mockReturnValue({ values });

    const app = await createApp();
    const response = await app.inject({
      method: "PUT",
      url: "/v1/deepbook/config",
      payload: savedConfig,
    });
    const body = response.json<{ config: typeof savedConfig }>();

    expect(response.statusCode).toBe(200);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: scope.organizationId,
        projectId: scope.projectId,
        externalId: "deepbook-predict-v1",
        metadata: expect.objectContaining({
          deepbook_config: savedConfig,
          product: "deepbook-predict",
          venue: "deepbook",
        }),
      }),
    );
    expect(JSON.stringify(values.mock.calls[0]?.[0])).not.toMatch(
      /private|secret|key/iu,
    );
    expect(body.config.market).toBe("DEEP/USDC");

    await app.close();
  });

  it("updates an existing scoped DeepBook agent config", async () => {
    mockSelectResult([
      {
        id: "00000000-0000-4000-8000-000000000001",
        externalId: "deepbook-predict-v1",
        name: "DeepBook Predict Agent",
        metadata: {
          preserved: true,
          deepbook_config: {
            ...savedConfig,
            market: "SUI/USDC",
          },
        },
        updatedAt: new Date("2026-06-09T00:00:00.000Z"),
      },
    ]);
    const returning = vi.fn().mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000001",
        externalId: "deepbook-predict-v1",
        name: "DeepBook Predict Agent",
        metadata: {
          preserved: true,
          deepbook_config: savedConfig,
        },
        updatedAt: new Date("2026-06-10T00:00:00.000Z"),
      },
    ]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });

    state.db.update.mockReturnValue({ set });

    const app = await createApp();
    const response = await app.inject({
      method: "PUT",
      url: "/v1/deepbook/config",
      payload: savedConfig,
    });

    expect(response.statusCode).toBe(200);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["trading", "sui", "deepbook", "predict"],
        metadata: expect.objectContaining({
          preserved: true,
          deepbook_config: savedConfig,
        }),
      }),
    );
    expect(where).toHaveBeenCalledOnce();

    await app.close();
  });

  it("rejects configs with overallocated enabled strategy weights", async () => {
    mockSelectResult([]);

    const app = await createApp();
    const response = await app.inject({
      method: "PUT",
      url: "/v1/deepbook/config",
      payload: {
        ...savedConfig,
        strategyCandidates: [
          {
            name: "range-mean-reversion",
            enabled: true,
            maxWeight: 80,
          },
          {
            name: "breakout-follow",
            enabled: true,
            maxWeight: 80,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(state.db.insert).not.toHaveBeenCalled();
    expect(state.db.update).not.toHaveBeenCalled();

    await app.close();
  });
});

function mockSelectResult(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });

  state.db.select.mockReturnValue({ from });
}

async function createApp() {
  const app = Fastify({ logger: false });

  await registerErrorHandler(app);
  await registerDeepBookRoutes(app);

  return app;
}
