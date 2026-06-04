import "dotenv/config";

import { createHash } from "node:crypto";

import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  isHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mantleSepoliaTestnet } from "viem/chains";

import { readAuditAnchorArtifact } from "./contract-artifact.js";

const contractAddress = process.env.MANTLE_SEPOLIA_ANCHOR_CONTRACT_ADDRESS as
  | Hex
  | undefined;
const privateKey = process.env.MANTLE_DEPLOYER_PRIVATE_KEY as Hex | undefined;
const rpcUrl =
  process.env.MANTLE_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.mantle.xyz";
const confirmed = process.argv.includes("--confirm");

if (!contractAddress || !isAddress(contractAddress)) {
  throw new Error("MANTLE_SEPOLIA_ANCHOR_CONTRACT_ADDRESS is required.");
}
if (!privateKey) {
  throw new Error("MANTLE_DEPLOYER_PRIVATE_KEY is required.");
}

const options = parseOptions(process.argv.slice(2));
const runId = options.runId ?? "mantle-demo-run";
const runRef = options.runRef ?? digest(`openstat:run:${runId}`);
const telemetryDigest =
  options.telemetryDigest ??
  digest({
    agent: "mantle-demo-agent",
    chain: "mantle-sepolia",
    events: ["heartbeat", "decision", "risk_check", "chain_transaction"],
    runId,
  });
const insightDigest =
  options.insightDigest ??
  digest({
    analyzer: "openstat-deterministic-v1",
    outcome: "pass",
    runId,
    summary: "Demo run has complete intent, risk, and chain context.",
  });
const outcome = options.outcome ?? 1;

assertBytes32("runRef", runRef);
assertBytes32("telemetryDigest", telemetryDigest);
assertBytes32("insightDigest", insightDigest);
if (!Number.isInteger(outcome) || outcome < 0 || outcome > 3) {
  throw new Error("Pass --outcome as 0, 1, 2, or 3.");
}

const account = privateKeyToAccount(privateKey);
const transport = http(rpcUrl);
const publicClient = createPublicClient({
  chain: mantleSepoliaTestnet,
  transport,
});
const chainId = await publicClient.getChainId();

if (chainId !== mantleSepoliaTestnet.id) {
  throw new Error(
    `Expected Mantle Sepolia chain ID 5003, received ${chainId}.`,
  );
}

const artifact = await readAuditAnchorArtifact();
const existingAudit = await publicClient.readContract({
  abi: artifact.abi,
  address: contractAddress,
  functionName: "getAudit",
  args: [account.address, runRef],
});

if (isAnchored(existingAudit)) {
  throw new Error(
    `Run ${runId} is already anchored for ${account.address}. Use a different --run-id.`,
  );
}

const estimatedGas = await publicClient.estimateContractGas({
  abi: artifact.abi,
  account,
  address: contractAddress,
  functionName: "anchorAudit",
  args: [runRef, telemetryDigest, insightDigest, outcome],
});

console.info({
  chainId,
  contractAddress,
  deployer: account.address,
  estimatedGas: estimatedGas.toString(),
  insightDigest,
  outcome,
  runId,
  runRef,
  telemetryDigest,
});

if (!confirmed) {
  console.log("Dry run only. Re-run with --confirm to broadcast demo anchor.");
  process.exit(0);
}

const walletClient = createWalletClient({
  account,
  chain: mantleSepoliaTestnet,
  transport,
});
const hash = await walletClient.writeContract({
  abi: artifact.abi,
  address: contractAddress,
  functionName: "anchorAudit",
  args: [runRef, telemetryDigest, insightDigest, outcome],
});

console.log(`Anchor transaction: ${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });

console.info({
  blockNumber: receipt.blockNumber.toString(),
  explorerUrl: `https://sepolia.mantlescan.xyz/tx/${hash}`,
  gasUsed: receipt.gasUsed.toString(),
  status: receipt.status,
  transactionHash: hash,
});

function parseOptions(args: string[]) {
  const options: {
    insightDigest?: Hex;
    outcome?: number;
    runId?: string;
    runRef?: Hex;
    telemetryDigest?: Hex;
  } = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];

    if (arg === "--confirm") {
      continue;
    }
    if (!value) {
      throw new Error(`Missing value for ${arg}.`);
    }

    if (arg === "--run-id") {
      options.runId = value;
      index += 1;
      continue;
    }
    if (arg === "--run-ref") {
      options.runRef = value as Hex;
      index += 1;
      continue;
    }
    if (arg === "--telemetry-digest") {
      options.telemetryDigest = value as Hex;
      index += 1;
      continue;
    }
    if (arg === "--insight-digest") {
      options.insightDigest = value as Hex;
      index += 1;
      continue;
    }
    if (arg === "--outcome") {
      options.outcome = Number(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}.`);
  }

  return options;
}

function assertBytes32(name: string, value: Hex) {
  if (!isHex(value, { strict: true }) || value.length !== 66) {
    throw new Error(`${name} must be a 32-byte hex value.`);
  }
}

function digest(value: unknown) {
  return `0x${createHash("sha256").update(stableJson(value)).digest("hex")}` as Hex;
}

function isAnchored(audit: unknown) {
  if (!Array.isArray(audit) || audit.length < 5) {
    return false;
  }

  return typeof audit[4] === "bigint" && audit[4] !== 0n;
}

function stableJson(value: unknown): string {
  if (value === undefined) {
    return "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, nestedValue]) => nestedValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, nestedValue]) =>
          `${JSON.stringify(key)}:${stableJson(nestedValue)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
