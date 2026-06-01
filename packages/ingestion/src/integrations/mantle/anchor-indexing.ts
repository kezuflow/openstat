import { schema, type Database } from "@openstat/db";
import { and, desc, eq } from "drizzle-orm";
import { keccak256, toBytes, type Address, type Hash, type Hex } from "viem";

import {
  getMantleAuditAnchorLogs,
  getMantleBlockNumber,
  getMantleExplorerTransactionUrl,
} from "./rpc.js";

const chainId = 5003 as const;
const auditAnchoredTopic = keccak256(
  toBytes("AuditAnchored(address,bytes32,bytes32,bytes32,uint8,uint256)"),
);

export async function indexMantleAuditAnchors(options: {
  contractAddress: string;
  db: Database["db"];
  fromBlock?: bigint;
  maxBlockRange?: bigint;
  rpcUrl?: string;
  timeoutMs?: number;
}) {
  const contractAddress = options.contractAddress.toLowerCase() as Address;
  const latestBlock = await getMantleBlockNumber({
    chainId,
    rpcUrl: options.rpcUrl,
    timeoutMs: options.timeoutMs,
  });
  const [cursor] = await options.db
    .select()
    .from(schema.chainIndexCursors)
    .where(
      and(
        eq(schema.chainIndexCursors.chainId, chainId),
        eq(schema.chainIndexCursors.contractAddress, contractAddress),
        eq(schema.chainIndexCursors.eventTopic, auditAnchoredTopic),
      ),
    )
    .limit(1);
  const fromBlock = cursor
    ? BigInt(cursor.lastIndexedBlock) + 1n
    : (options.fromBlock ?? latestBlock);

  if (fromBlock > latestBlock) {
    return { indexed: 0, matched: 0, unmatched: 0 };
  }

  const maxBlockRange = options.maxBlockRange ?? 1_000n;
  const toBlock =
    fromBlock + maxBlockRange - 1n < latestBlock
      ? fromBlock + maxBlockRange - 1n
      : latestBlock;
  const logs = await getMantleAuditAnchorLogs({
    address: contractAddress,
    chainId,
    fromBlock,
    rpcUrl: options.rpcUrl,
    timeoutMs: options.timeoutMs,
    toBlock,
  });
  const result = {
    indexed: logs.length,
    matched: 0,
    unmatched: 0,
  };

  for (const log of logs) {
    const args = log.args;
    const insightDigest = args.insightDigest;
    const telemetryDigest = args.telemetryDigest;

    if (
      !args.submitter ||
      !args.runRef ||
      !insightDigest ||
      !telemetryDigest ||
      args.outcome === undefined ||
      args.anchoredAt === undefined ||
      log.blockNumber === null ||
      log.logIndex === null ||
      !log.transactionHash
    ) {
      result.unmatched += 1;
      continue;
    }

    const [insight] = await options.db
      .select()
      .from(schema.auditInsights)
      .where(
        and(
          eq(schema.auditInsights.telemetryDigest, telemetryDigest),
          eq(schema.auditInsights.insightDigest, insightDigest),
        ),
      )
      .orderBy(desc(schema.auditInsights.createdAt))
      .limit(1);

    if (!insight) {
      result.unmatched += 1;
      continue;
    }

    await options.db
      .insert(schema.auditAnchors)
      .values({
        agentId: insight.agentId,
        anchoredAt: new Date(Number(args.anchoredAt) * 1_000),
        auditInsightId: insight.id,
        blockNumber: log.blockNumber.toString(),
        chainId,
        contractAddress,
        explorerUrl: getMantleExplorerTransactionUrl(
          chainId,
          log.transactionHash,
        ),
        externalRunId: insight.externalRunId,
        insightDigest: insightDigest.toLowerCase() as Hex,
        logIndex: log.logIndex,
        metadata: {
          runRef: args.runRef,
        },
        organizationId: insight.organizationId,
        outcome: Number(args.outcome),
        projectId: insight.projectId,
        submitterAddress: args.submitter.toLowerCase(),
        telemetryDigest: telemetryDigest.toLowerCase() as Hex,
        transactionHash: log.transactionHash.toLowerCase() as Hash,
      })
      .onConflictDoNothing();
    result.matched += 1;
  }

  await options.db
    .insert(schema.chainIndexCursors)
    .values({
      chainId,
      contractAddress,
      eventTopic: auditAnchoredTopic,
      lastIndexedBlock: toBlock.toString(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        schema.chainIndexCursors.chainId,
        schema.chainIndexCursors.contractAddress,
        schema.chainIndexCursors.eventTopic,
      ],
      set: {
        lastIndexedBlock: toBlock.toString(),
        updatedAt: new Date(),
      },
    });

  return result;
}
