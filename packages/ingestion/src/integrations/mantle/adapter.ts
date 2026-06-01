import type { ChainTransactionAdapter } from "../types.js";
import { getEvmTransactionHash, normalizeEvmReceipt } from "../evm/receipt.js";
import {
  getMantleExplorerTransactionUrl,
  getMantleTransactionReceipt,
  type MantleChainId,
} from "./rpc.js";

const mantleChainIds = [5000, 5003] as const satisfies readonly MantleChainId[];

export const mantleChainTransactionAdapters: readonly ChainTransactionAdapter[] =
  mantleChainIds.map((chainId) => ({
    chain: "mantle",
    chainId,
    getExplorerTransactionUrl: (transactionHash) =>
      getMantleExplorerTransactionUrl(
        chainId,
        getEvmTransactionHash(transactionHash),
      ),
    getTransactionReceipt: async (options) => {
      const receipt = await getMantleTransactionReceipt({
        ...options,
        chainId,
        transactionHash: getEvmTransactionHash(options.transactionHash),
      });

      return receipt ? normalizeEvmReceipt(receipt) : undefined;
    },
  }));
