import "dotenv/config";

import { createPublicClient, http, isAddress } from "viem";
import { mantleSepoliaTestnet } from "viem/chains";

const contractAddress =
  process.argv[2] ?? process.env.MANTLE_SEPOLIA_ANCHOR_CONTRACT_ADDRESS;

if (!contractAddress || !isAddress(contractAddress)) {
  throw new Error(
    "Pass a valid contract address or set MANTLE_SEPOLIA_ANCHOR_CONTRACT_ADDRESS.",
  );
}

const client = createPublicClient({
  chain: mantleSepoliaTestnet,
  transport: http(
    process.env.MANTLE_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.mantle.xyz",
  ),
});
const chainId = await client.getChainId();

if (chainId !== mantleSepoliaTestnet.id) {
  throw new Error(
    `Expected Mantle Sepolia chain ID 5003, received ${chainId}.`,
  );
}

const bytecode = await client.getCode({
  address: contractAddress,
});

if (!bytecode || bytecode === "0x") {
  throw new Error(`No contract bytecode found at ${contractAddress}.`);
}

console.info({
  chainId,
  contractAddress,
  deployedBytecodeBytes: (bytecode.length - 2) / 2,
});
