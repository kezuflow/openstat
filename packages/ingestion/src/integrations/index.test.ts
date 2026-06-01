import { describe, expect, it } from "vitest";

import { getChainTransactionExplorerUrl } from "./index.js";

const transactionHash = `0x${"a".repeat(64)}` as const;

describe("getChainTransactionExplorerUrl", () => {
  it("routes supported Mantle networks through the Mantle adapter", () => {
    expect(
      getChainTransactionExplorerUrl({
        chain: "mantle",
        chainId: 5000,
        transactionHash,
      }),
    ).toBe(`https://mantlescan.xyz/tx/${transactionHash}`);
    expect(
      getChainTransactionExplorerUrl({
        chain: "mantle",
        chainId: 5003,
        transactionHash,
      }),
    ).toBe(`https://sepolia.mantlescan.xyz/tx/${transactionHash}`);
  });

  it("routes Base and BNB Chain networks through sibling EVM adapters", () => {
    expect(
      getChainTransactionExplorerUrl({
        chain: "base",
        chainId: 8453,
        transactionHash,
      }),
    ).toBe(`https://basescan.org/tx/${transactionHash}`);
    expect(
      getChainTransactionExplorerUrl({
        chain: "bnb",
        chainId: 56,
        transactionHash,
      }),
    ).toBe(`https://bscscan.com/tx/${transactionHash}`);
  });

  it("returns undefined for an unregistered integration", () => {
    expect(
      getChainTransactionExplorerUrl({
        chain: "future-chain",
        chainId: 1,
        transactionHash,
      }),
    ).toBeUndefined();
  });

  it("keeps Mantle-specific validation inside the Mantle adapter", () => {
    expect(() =>
      getChainTransactionExplorerUrl({
        chain: "mantle",
        chainId: 5003,
        transactionHash: "not-a-mantle-transaction-hash",
      }),
    ).toThrow("Invalid EVM transaction hash.");
  });
});
