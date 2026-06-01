import { base, baseSepolia } from "viem/chains";

import { createEvmChainTransactionAdapter } from "../evm/adapter.js";

export const baseChainTransactionAdapters = [
  createEvmChainTransactionAdapter({ chain: "base", network: base }),
  createEvmChainTransactionAdapter({ chain: "base", network: baseSepolia }),
] as const;
