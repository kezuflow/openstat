import {
  createPublicClient,
  http,
  TransactionReceiptNotFoundError,
  type Hash,
} from "viem";
import { mantle, mantleSepoliaTestnet } from "viem/chains";

export type MantleChainId = 5000 | 5003;

export const MANTLE_PUBLIC_RPC_URLS = {
  5000: "https://rpc.mantle.xyz",
  5003: "https://rpc.sepolia.mantle.xyz",
} as const satisfies Record<MantleChainId, string>;

export function createMantleRpcClient(options: {
  chainId: MantleChainId;
  rpcUrl?: string;
  timeoutMs?: number;
}) {
  return createPublicClient({
    chain: getMantleChain(options.chainId),
    transport: http(options.rpcUrl ?? MANTLE_PUBLIC_RPC_URLS[options.chainId], {
      timeout: options.timeoutMs,
    }),
  });
}

export async function getMantleTransactionReceipt(options: {
  chainId: MantleChainId;
  rpcUrl?: string;
  timeoutMs?: number;
  transactionHash: Hash;
}) {
  const client = createMantleRpcClient(options);

  try {
    return await client.getTransactionReceipt({
      hash: options.transactionHash,
    });
  } catch (error) {
    if (error instanceof TransactionReceiptNotFoundError) {
      return undefined;
    }

    throw error;
  }
}

export function getMantleExplorerTransactionUrl(
  chainId: MantleChainId,
  transactionHash: Hash,
) {
  const explorerOrigin =
    chainId === 5000
      ? "https://mantlescan.xyz"
      : "https://sepolia.mantlescan.xyz";

  return `${explorerOrigin}/tx/${transactionHash}`;
}

function getMantleChain(chainId: MantleChainId) {
  return chainId === 5000 ? mantle : mantleSepoliaTestnet;
}
