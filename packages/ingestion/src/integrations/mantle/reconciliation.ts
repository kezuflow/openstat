import type { Database } from "@openstat/db";

import { reconcilePendingChainTransactions } from "../reconciliation.js";
import type { MantleChainId } from "./rpc.js";

export async function reconcileMantleTransactions(options: {
  db: Database["db"];
  limit?: number;
  now?: Date;
  pollIntervalMs?: number;
  rpcUrls?: Partial<Record<MantleChainId, string>>;
  timeoutMs?: number;
}) {
  return reconcilePendingChainTransactions({
    ...options,
    targets: [
      { chain: "mantle", chainId: 5000, rpcUrl: options.rpcUrls?.[5000] },
      { chain: "mantle", chainId: 5003, rpcUrl: options.rpcUrls?.[5003] },
    ],
  });
}
