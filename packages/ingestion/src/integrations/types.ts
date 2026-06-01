export type ChainTransactionAdapter = {
  chain: string;
  chainId: number;
  getExplorerTransactionUrl: (transactionHash: string) => string;
  getTransactionReceipt: (options: {
    rpcUrl?: string;
    timeoutMs?: number;
    transactionHash: string;
  }) => Promise<ChainTransactionReceipt | undefined>;
};

export type ChainTransactionReceipt = {
  blockNumber?: string;
  fromAddress?: string;
  gasUsed?: string;
  raw: Record<string, unknown>;
  status: "confirmed" | "reverted";
  toAddress?: string;
};

export type ChainReconciliationTarget = {
  chain: string;
  chainId: number;
  rpcUrl?: string;
};
