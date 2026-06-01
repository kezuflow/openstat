import {
  createPublicClient,
  http,
  TransactionReceiptNotFoundError,
  type Chain,
} from "viem";

import type { ChainTransactionAdapter } from "../types.js";
import { getEvmTransactionHash, normalizeEvmReceipt } from "./receipt.js";

export function createEvmChainTransactionAdapter(options: {
  chain: string;
  network: Chain;
}): ChainTransactionAdapter {
  return {
    chain: options.chain,
    chainId: options.network.id,
    getExplorerTransactionUrl: (transactionHash) =>
      `${getExplorerOrigin(options.network)}/tx/${getEvmTransactionHash(transactionHash)}`,
    getTransactionReceipt: async ({ rpcUrl, timeoutMs, transactionHash }) => {
      const client = createPublicClient({
        chain: options.network,
        transport: http(rpcUrl, { timeout: timeoutMs }),
      });

      try {
        const receipt = await client.getTransactionReceipt({
          hash: getEvmTransactionHash(transactionHash),
        });

        return normalizeEvmReceipt(receipt);
      } catch (error) {
        if (error instanceof TransactionReceiptNotFoundError) {
          return undefined;
        }

        throw error;
      }
    },
  };
}

function getExplorerOrigin(network: Chain) {
  const explorerUrl = network.blockExplorers?.default.url;

  if (!explorerUrl) {
    throw new Error(`Missing explorer URL for EVM chain ID ${network.id}.`);
  }

  return explorerUrl.replace(/\/$/u, "");
}
