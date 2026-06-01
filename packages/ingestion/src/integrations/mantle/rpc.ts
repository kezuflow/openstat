import {
  createPublicClient,
  http,
  parseAbiItem,
  TransactionReceiptNotFoundError,
  type Address,
  type Hash,
} from "viem";
import { mantle, mantleSepoliaTestnet } from "viem/chains";

// Keep provider-specific transport details behind the Mantle integration.
export type MantleChainId = 5000 | 5003;

export const MANTLE_PUBLIC_RPC_URLS = {
  5000: "https://rpc.mantle.xyz",
  5003: "https://rpc.sepolia.mantle.xyz",
} as const satisfies Record<MantleChainId, string>;

export const AUDIT_ANCHORED_EVENT = parseAbiItem(
  "event AuditAnchored(address indexed submitter, bytes32 indexed runRef, bytes32 indexed telemetryDigest, bytes32 insightDigest, uint8 outcome, uint256 anchoredAt)",
);

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

export async function getMantleBlockNumber(options: {
  chainId: MantleChainId;
  rpcUrl?: string;
  timeoutMs?: number;
}) {
  return createMantleRpcClient(options).getBlockNumber();
}

export async function getMantleAuditAnchorLogs(options: {
  address: Address;
  chainId: MantleChainId;
  fromBlock: bigint;
  rpcUrl?: string;
  timeoutMs?: number;
  toBlock: bigint;
}) {
  return createMantleRpcClient(options).getLogs({
    address: options.address,
    event: AUDIT_ANCHORED_EVENT,
    fromBlock: options.fromBlock,
    toBlock: options.toBlock,
  });
}

export function getMantleExplorerTransactionUrl(
  chainId: MantleChainId,
  transactionHash: Hash,
) {
  return `${getMantleExplorerOrigin(chainId)}/tx/${transactionHash}`;
}

export function getMantleExplorerContractUrl(
  chainId: MantleChainId,
  contractAddress: Address,
) {
  return `${getMantleExplorerOrigin(chainId)}/address/${contractAddress}`;
}

export function summarizeMantleRpcError(error: unknown) {
  const name = error instanceof Error ? error.name : "UnknownError";

  return `Mantle RPC request failed (${name}).`;
}

function getMantleChain(chainId: MantleChainId) {
  return chainId === 5000 ? mantle : mantleSepoliaTestnet;
}

function getMantleExplorerOrigin(chainId: MantleChainId) {
  return chainId === 5000
    ? "https://mantlescan.xyz"
    : "https://sepolia.mantlescan.xyz";
}
