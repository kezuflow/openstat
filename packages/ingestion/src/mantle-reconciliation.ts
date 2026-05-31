import { schema, type Database } from "@openstat/db";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import type { Hash, TransactionReceipt } from "viem";

import {
  getMantleExplorerTransactionUrl,
  getMantleTransactionReceipt,
  type MantleChainId,
} from "./mantle-rpc.js";

export async function reconcileMantleTransactions(options: {
  db: Database["db"];
  limit?: number;
  now?: Date;
  pollIntervalMs?: number;
  rpcUrls?: Partial<Record<MantleChainId, string>>;
  timeoutMs?: number;
}) {
  const now = options.now ?? new Date();
  const pollIntervalMs = options.pollIntervalMs ?? 15_000;
  const rows = await options.db
    .select()
    .from(schema.chainTransactions)
    .where(
      and(
        eq(schema.chainTransactions.chain, "mantle"),
        eq(schema.chainTransactions.status, "submitted"),
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

  const result = {
    checked: 0,
    confirmed: 0,
    pending: 0,
    reverted: 0,
  };

  for (const row of rows) {
    const chainId = getMantleChainId(row.chainId);
    const transactionHash = row.transactionHash as Hash;
    const receipt = await getMantleTransactionReceipt({
      chainId,
      rpcUrl: options.rpcUrls?.[chainId],
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

    const status = receipt.status === "success" ? "confirmed" : "reverted";
    result[status] += 1;

    await options.db
      .update(schema.chainTransactions)
      .set({
        blockNumber: receipt.blockNumber.toString(),
        confirmedAt: now,
        explorerUrl: getMantleExplorerTransactionUrl(chainId, transactionHash),
        fromAddress: receipt.from.toLowerCase(),
        gasUsed: receipt.gasUsed.toString(),
        lastCheckedAt: now,
        receipt: serializeReceipt(receipt),
        status,
        toAddress: receipt.to?.toLowerCase(),
        updatedAt: now,
      })
      .where(eq(schema.chainTransactions.id, row.id));
  }

  return result;
}

function getMantleChainId(chainId: number): MantleChainId {
  if (chainId !== 5000 && chainId !== 5003) {
    throw new Error(`Unsupported Mantle chain ID: ${chainId}`);
  }

  return chainId;
}

function serializeReceipt(receipt: TransactionReceipt) {
  return {
    blockHash: receipt.blockHash,
    blockNumber: receipt.blockNumber.toString(),
    contractAddress: receipt.contractAddress,
    cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
    effectiveGasPrice: receipt.effectiveGasPrice.toString(),
    from: receipt.from,
    gasUsed: receipt.gasUsed.toString(),
    status: receipt.status,
    to: receipt.to,
    transactionHash: receipt.transactionHash,
    transactionIndex: receipt.transactionIndex,
    type: receipt.type,
  };
}
