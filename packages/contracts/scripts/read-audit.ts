import "dotenv/config";

import { createPublicClient, http, isAddress, isHex } from "viem";
import { mantleSepoliaTestnet } from "viem/chains";

import { readAuditAnchorArtifact } from "./contract-artifact.js";

const [contractAddress, submitter, runRef] = process.argv.slice(2);

if (!contractAddress || !isAddress(contractAddress)) {
  throw new Error("Pass a valid contract address as the first argument.");
}
if (!submitter || !isAddress(submitter)) {
  throw new Error("Pass a valid submitter address as the second argument.");
}
if (!runRef || !isHex(runRef, { strict: true }) || runRef.length !== 66) {
  throw new Error("Pass a bytes32 run reference as the third argument.");
}

const client = createPublicClient({
  chain: mantleSepoliaTestnet,
  transport: http(
    process.env.MANTLE_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.mantle.xyz",
  ),
});
const artifact = await readAuditAnchorArtifact();
const audit = await client.readContract({
  abi: artifact.abi,
  address: contractAddress,
  functionName: "getAudit",
  args: [submitter, runRef],
});

console.log(audit);
