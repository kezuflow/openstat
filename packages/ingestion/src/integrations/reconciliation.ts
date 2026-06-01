import { schema, type Database } from "@openstat/db";
import { and, eq, isNull, lt, or } from "drizzle-orm";

import { getChainTransactionAdapter } from "./registry.js";
import type { ChainReconciliationTarget } from "./types.js";

export async function reconcilePendingChainTransactions(options: {
  db: Database["db"];
  limit?: number;
  now?: Date;
  onError?: (options: {
    chain: string;
    chainId: number;
    error: unknown;
    transactionHash: string;
  }) => void;
  pollIntervalMs?: number;
  targets: readonly ChainReconciliationTarget[];
  timeoutMs?: number;
}) {
  const result = {
    checked: 0,
    confirmed: 0,
    failed: 0,
    pending: 0,
    reverted: 0,
  };

  if (options.targets.length === 0) {
    return result;
  }

  const targets = new Map(
    options.targets.map((target) => [getTargetKey(target), target]),
  );
  const targetFilter = or(
    ...options.targets.map((target) =>
      and(
        eq(schema.chainTransactions.chain, target.chain),
        eq(schema.chainTransactions.chainId, target.chainId),
      ),
    ),
  );

  if (!targetFilter) {
    return result;
  }

  const now = options.now ?? new Date();
  const pollIntervalMs = options.pollIntervalMs ?? 15_000;
  const rows = await options.db
    .select()
    .from(schema.chainTransactions)
    .where(
      and(
        eq(schema.chainTransactions.status, "submitted"),
        targetFilter,
        or(
          isNull(schema.chainTransactions.lastCheckedAt),
          lt(
            schema.chainTransactions.lastCheckedAt,
            new Date(now.valueOf() - pollIntervalMs),
          ),
        ),
      ),
    )
    .limit(options.limit ?? 100);

  for (const row of rows) {
    const target = targets.get(getTargetKey(row));
    const adapter = getChainTransactionAdapter(row);

    if (!target || !adapter) {
      result.failed += 1;
      continue;
    }

    const transactionHash = row.transactionHash;

    try {
      const receipt = await adapter.getTransactionReceipt({
        rpcUrl: target.rpcUrl,
        timeoutMs: options.timeoutMs,
        transactionHash,
      });
      result.checked += 1;

      if (!receipt) {
        result.pending += 1;
        await options.db
          .update(schema.chainTransactions)
          .set({
            lastCheckedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.chainTransactions.id, row.id));
        continue;
      }

      result[receipt.status] += 1;

      await options.db
        .update(schema.chainTransactions)
        .set({
          blockNumber: receipt.blockNumber,
          confirmedAt: now,
          explorerUrl: adapter.getExplorerTransactionUrl(transactionHash),
          fromAddress: receipt.fromAddress,
          gasUsed: receipt.gasUsed,
          lastCheckedAt: now,
          receipt: receipt.raw,
          status: receipt.status,
          toAddress: receipt.toAddress,
          updatedAt: now,
        })
        .where(eq(schema.chainTransactions.id, row.id));
    } catch (error) {
      result.failed += 1;
      options.onError?.({
        chain: row.chain,
        chainId: row.chainId,
        error,
        transactionHash,
      });
      continue;
    }
  }

  return result;
}

export function summarizeChainRpcError(error: unknown) {
  const name = error instanceof Error ? error.name : "UnknownError";

  return `Chain RPC request failed (${name}).`;
}

function getTargetKey(target: { chain: string; chainId: number }) {
  return `${target.chain}:${target.chainId}`;
}
