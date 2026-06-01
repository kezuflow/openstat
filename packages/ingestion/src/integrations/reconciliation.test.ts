import { beforeEach, describe, expect, it, vi } from "vitest";

import { reconcilePendingChainTransactions } from "./reconciliation.js";

const state = vi.hoisted(() => ({
  getMantleTransactionReceipt: vi.fn(),
}));

vi.mock("./mantle/rpc.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mantle/rpc.js")>();

  return {
    ...actual,
    getMantleTransactionReceipt: state.getMantleTransactionReceipt,
  };
});

const transactionHash = `0x${"a".repeat(64)}`;

describe("reconcilePendingChainTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("continues reconciling when one RPC lookup fails", async () => {
    const updates: unknown[] = [];
    const onError = vi.fn();
    const db = createDb(
      [
        createTransaction("00000000-0000-4000-8000-000000000001"),
        createTransaction("00000000-0000-4000-8000-000000000002"),
      ],
      updates,
    );
    state.getMantleTransactionReceipt
      .mockRejectedValueOnce(new Error("Hosted RPC URL must stay private."))
      .mockResolvedValueOnce(undefined);

    await expect(
      reconcilePendingChainTransactions({
        db,
        onError,
        targets: [{ chain: "mantle", chainId: 5003 }],
      }),
    ).resolves.toEqual({
      checked: 1,
      confirmed: 0,
      failed: 1,
      pending: 1,
      reverted: 0,
    });
    expect(onError).toHaveBeenCalledWith({
      chain: "mantle",
      chainId: 5003,
      error: expect.any(Error),
      transactionHash,
    });
    expect(updates).toHaveLength(1);
  });
});

function createDb(rows: unknown[], updates: unknown[]) {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => rows),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((values) => {
        updates.push(values);

        return {
          where: vi.fn(async () => undefined),
        };
      }),
    })),
  } as never;
}

function createTransaction(id: string) {
  return {
    chain: "mantle",
    chainId: 5003,
    id,
    transactionHash,
  };
}
