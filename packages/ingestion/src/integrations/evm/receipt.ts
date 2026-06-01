import type { Hash, TransactionReceipt } from "viem";

import type { ChainTransactionReceipt } from "../types.js";

export function getEvmTransactionHash(transactionHash: string): Hash {
  const normalized = transactionHash.toLowerCase();

  if (!/^0x[0-9a-f]{64}$/u.test(normalized)) {
    throw new Error("Invalid EVM transaction hash.");
  }

  return normalized as Hash;
}

export function normalizeEvmReceipt(
  receipt: TransactionReceipt,
): ChainTransactionReceipt {
  return {
    blockNumber: receipt.blockNumber.toString(),
    fromAddress: receipt.from.toLowerCase(),
    gasUsed: receipt.gasUsed.toString(),
    raw: {
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
    },
    status: receipt.status === "success" ? "confirmed" : "reverted",
    toAddress: receipt.to?.toLowerCase(),
  };
}
