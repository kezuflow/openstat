import "dotenv/config";

import {
  createPublicClient,
  createWalletClient,
  encodeDeployData,
  http,
  type Hex,
} from "viem";
import { mantleSepoliaTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

import { readAuditAnchorArtifact } from "./contract-artifact.js";

const expectedChainId = 5003;
const rpcUrl =
  process.env.MANTLE_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.mantle.xyz";
const privateKey = process.env.MANTLE_DEPLOYER_PRIVATE_KEY as Hex | undefined;
const confirmed = process.argv.includes("--confirm");

if (!privateKey) {
  throw new Error("MANTLE_DEPLOYER_PRIVATE_KEY is required.");
}

const account = privateKeyToAccount(privateKey);
const transport = http(rpcUrl);
const publicClient = createPublicClient({
  chain: mantleSepoliaTestnet,
  transport,
});
const chainId = await publicClient.getChainId();

if (chainId !== expectedChainId) {
  throw new Error(`Expected chain ID ${expectedChainId}, received ${chainId}.`);
}

console.log(`Network chain ID: ${chainId}`);
console.log(`Deployer: ${account.address}`);

const artifact = await readAuditAnchorArtifact();
const estimatedGas = await publicClient.estimateGas({
  account,
  data: encodeDeployData({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
  }),
});

console.log(`Estimated deployment gas: ${estimatedGas}`);

if (!confirmed) {
  console.log("Dry run only. Re-run with --confirm to broadcast deployment.");
  process.exit(0);
}

const walletClient = createWalletClient({
  account,
  chain: mantleSepoliaTestnet,
  transport,
});
const hash = await walletClient.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
});

console.log(`Deployment transaction: ${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });

if (!receipt.contractAddress) {
  throw new Error("Deployment receipt did not include a contract address.");
}

console.log(`Contract address: ${receipt.contractAddress}`);
