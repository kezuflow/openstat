import { baseChainTransactionAdapters } from "./base/index.js";
import { bnbChainTransactionAdapters } from "./bnb/index.js";
import { mantleChainTransactionAdapters } from "./mantle/adapter.js";
import type { ChainTransactionAdapter } from "./types.js";

const chainTransactionAdapters = new Map(
  [
    ...baseChainTransactionAdapters,
    ...bnbChainTransactionAdapters,
    ...mantleChainTransactionAdapters,
  ].map((adapter) => [getAdapterKey(adapter), adapter]),
);

export function getChainTransactionAdapter(options: {
  chain: string;
  chainId: number;
}) {
  return chainTransactionAdapters.get(getAdapterKey(options));
}

export function getChainTransactionExplorerUrl(options: {
  chain: string;
  chainId: number;
  transactionHash: string;
}) {
  return getChainTransactionAdapter(options)?.getExplorerTransactionUrl(
    options.transactionHash,
  );
}

function getAdapterKey(
  options: Pick<ChainTransactionAdapter, "chain" | "chainId">,
) {
  return `${options.chain}:${options.chainId}`;
}
