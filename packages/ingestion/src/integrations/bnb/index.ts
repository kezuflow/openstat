import { bsc, bscTestnet } from "viem/chains";

import { createEvmChainTransactionAdapter } from "../evm/adapter.js";

export const bnbChainTransactionAdapters = [
  createEvmChainTransactionAdapter({ chain: "bnb", network: bsc }),
  createEvmChainTransactionAdapter({ chain: "bnb", network: bscTestnet }),
] as const;
