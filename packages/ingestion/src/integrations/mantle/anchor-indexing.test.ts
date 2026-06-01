import { schema } from "@openstat/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { indexMantleAuditAnchors } from "./anchor-indexing.js";

const state = vi.hoisted(() => ({
  getMantleAuditAnchorLogs: vi.fn(),
  getMantleBlockNumber: vi.fn(),
}));

vi.mock("./rpc.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./rpc.js")>();

  return {
    ...actual,
    getMantleAuditAnchorLogs: state.getMantleAuditAnchorLogs,
    getMantleBlockNumber: state.getMantleBlockNumber,
  };
});

describe("indexMantleAuditAnchors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.getMantleBlockNumber.mockResolvedValue(42n);
  });

  it("matches an insight, inserts an anchor, and advances the cursor", async () => {
    const inserts: Array<{ table: unknown; values: unknown }> = [];
    const telemetryDigest = `0x${"a".repeat(64)}`;
    const insightDigest = `0x${"b".repeat(64)}`;
    const transactionHash = `0x${"c".repeat(64)}`;
    state.getMantleAuditAnchorLogs.mockResolvedValue([
      {
        args: {
          anchoredAt: 1_800_000_000n,
          insightDigest,
          outcome: 1,
          runRef: `0x${"d".repeat(64)}`,
          submitter: "0x0000000000000000000000000000000000000001",
          telemetryDigest,
        },
        blockNumber: 42n,
        logIndex: 0,
        transactionHash,
      },
    ]);
    const db = {
      insert: (table: unknown) => ({
        values: (values: unknown) => {
          inserts.push({ table, values });
          return {
            onConflictDoNothing: async () => undefined,
            onConflictDoUpdate: async () => undefined,
          };
        },
      }),
      select: () => ({
        from: (table: unknown) => ({
          where: () => ({
            limit: async () =>
              table === schema.chainIndexCursors
                ? []
                : [
                    {
                      agentId: null,
                      createdAt: new Date(),
                      externalRunId: "run_demo",
                      id: "insight-id",
                      organizationId: "organization-id",
                      projectId: "project-id",
                    },
                  ],
            orderBy: () => ({
              limit: async () => [
                {
                  agentId: null,
                  createdAt: new Date(),
                  externalRunId: "run_demo",
                  id: "insight-id",
                  organizationId: "organization-id",
                  projectId: "project-id",
                },
              ],
            }),
          }),
        }),
      }),
    };

    await expect(
      indexMantleAuditAnchors({
        contractAddress: "0x0000000000000000000000000000000000000002",
        db: db as never,
        fromBlock: 42n,
      }),
    ).resolves.toEqual({
      indexed: 1,
      matched: 1,
      unmatched: 0,
    });
    expect(inserts.some((insert) => insert.table === schema.auditAnchors)).toBe(
      true,
    );
    expect(
      inserts.some((insert) => insert.table === schema.chainIndexCursors),
    ).toBe(true);
  });
});
