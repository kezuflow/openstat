import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerErrorHandler } from "../plugins/errors.js";
import { registerAuditRoutes } from "./audit.js";

const scope = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  projectId: "00000000-0000-4000-8000-000000000002",
};
const state = vi.hoisted(() => ({
  createChainRunAuditInsight: vi.fn(),
  db: {
    select: vi.fn(),
  },
  getChainRunAudit: vi.fn(),
  resolveReadScope: vi.fn(),
}));

vi.mock("../auth-scope.js", () => ({
  resolveReadScope: state.resolveReadScope,
}));

vi.mock("../context.js", () => ({
  database: {
    db: state.db,
  },
}));

vi.mock("@openstat/ingestion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@openstat/ingestion")>();

  return {
    ...actual,
    createChainRunAuditInsight: state.createChainRunAuditInsight,
    getChainRunAudit: state.getChainRunAudit,
  };
});

describe("audit routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.resolveReadScope.mockResolvedValue(scope);
  });

  it("returns a scoped run audit", async () => {
    state.getChainRunAudit.mockResolvedValue({
      anchor: undefined,
      chainTransactions: [],
      events: [],
      insight: undefined,
      run: { externalRunId: "run_demo" },
    });
    const app = await createApp();
    const response = await app.inject({
      method: "GET",
      url: "/v1/chains/runs/run_demo/audit",
    });

    expect(response.statusCode).toBe(200);
    expect(state.getChainRunAudit).toHaveBeenCalledWith({
      db: state.db,
      externalRunId: "run_demo",
      scope,
    });
  });

  it("returns stable missing-run behavior", async () => {
    state.getChainRunAudit.mockResolvedValue(undefined);
    const app = await createApp();
    const response = await app.inject({
      method: "GET",
      url: "/v1/chains/runs/run_missing/audit",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("RUN_AUDIT_NOT_FOUND");
  });

  it("generates a scoped insight", async () => {
    state.createChainRunAuditInsight.mockResolvedValue({
      anomalyFlags: [],
      externalRunId: "run_demo",
      id: "00000000-0000-4000-8000-000000000003",
      insightDigest: `0x${"a".repeat(64)}`,
      riskScore: 0,
      summary: "Confirmed.",
      telemetryDigest: `0x${"b".repeat(64)}`,
      verdict: "pass",
    });
    const app = await createApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/chains/runs/run_demo/audit-insights",
    });

    expect(response.statusCode).toBe(200);
    expect(state.createChainRunAuditInsight).toHaveBeenCalledWith({
      db: state.db,
      externalRunId: "run_demo",
      scope,
    });
  });

  it("keeps the Mantle run-audit alias available", async () => {
    state.getChainRunAudit.mockResolvedValue({
      anchor: undefined,
      chainTransactions: [],
      events: [],
      insight: undefined,
      run: { externalRunId: "run_demo" },
    });
    const app = await createApp();
    const response = await app.inject({
      method: "GET",
      url: "/v1/mantle/runs/run_demo/audit",
    });

    expect(response.statusCode).toBe(200);
  });
});

async function createApp() {
  const app = Fastify();
  await registerErrorHandler(app);
  await registerAuditRoutes(app);
  return app;
}
