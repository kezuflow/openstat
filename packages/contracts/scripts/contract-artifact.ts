import { readFile } from "node:fs/promises";

const artifactPath = new URL(
  "../artifacts/contracts/OpenStatAuditAnchor.sol/OpenStatAuditAnchor.json",
  import.meta.url,
);

export async function readAuditAnchorArtifact() {
  const artifact = JSON.parse(await readFile(artifactPath, "utf8")) as {
    abi: readonly unknown[];
    bytecode: `0x${string}`;
  };

  return artifact;
}
