#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createOpenStatClient } from "./index.js";

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  await main(process.argv.slice(2));
}

export async function main(args: string[]) {
  if (args.includes("--help") || args.length === 0) {
    printUsage();
    return;
  }

  const command = args[0];

  if (command === "observe") {
    await observeTransaction(args.slice(1));
  } else if (command === "exec") {
    await executeObservedCommand(args.slice(1));
  } else {
    throw new Error(`Unknown openstat-realclaw command: ${command}`);
  }
}

export async function observeTransaction(commandArgs: string[]) {
  const transactionHash = getRequiredOption(commandArgs, "--tx-hash");
  const chainId = getChainId(getOption(commandArgs, "--chain-id") ?? "5003");

  await getClient().recordChainTransaction({
    action: getOption(commandArgs, "--action") ?? "realclaw_observed_action",
    agent: {
      name: getOption(commandArgs, "--agent") ?? "realclaw",
      tags: ["realclaw"],
    },
    chain: "mantle",
    chainId,
    runId: getOption(commandArgs, "--run-id"),
    status: "submitted",
    txHash: getTransactionHash(transactionHash),
  });

  console.info(`Observed Mantle transaction ${transactionHash}.`);
}

export async function executeObservedCommand(commandArgs: string[]) {
  const separatorIndex = commandArgs.indexOf("--");

  if (separatorIndex === -1 || separatorIndex === commandArgs.length - 1) {
    throw new Error("Provide a wrapped command after `--`.");
  }

  const wrapperArgs = commandArgs.slice(0, separatorIndex);
  const childArgs = commandArgs.slice(separatorIndex + 1);
  const previewOnly = wrapperArgs.includes("--dry-run");
  const confirmed = wrapperArgs.includes("--confirm");
  const fixture = wrapperArgs.includes("--fixture");
  const runId = getOption(wrapperArgs, "--run-id") ?? `realclaw_${Date.now()}`;
  const action =
    getOption(wrapperArgs, "--action") ?? "realclaw_wrapped_action";

  assertExactlyOneSafetyFlag({ confirmed, previewOnly });

  if (previewOnly && !childArgs.includes("--dry-run")) {
    childArgs.push("--dry-run");
  }

  if (confirmed && !childArgs.includes("--confirm")) {
    childArgs.push("--confirm");
  }

  const startedAt = Date.now();

  try {
    const output = fixture
      ? getFixtureOutput({ confirmed })
      : await runCommand(childArgs);

    await recordSafeToolCall({
      action,
      durationMs: Date.now() - startedAt,
      runId,
      status: previewOnly ? "dry_run" : "confirmed",
    });

    if (previewOnly) {
      console.info("Dry run complete. No transaction telemetry was emitted.");
      return;
    }

    const transactionHash = findTransactionHash(output);

    if (!transactionHash) {
      console.warn(
        "Wrapped command completed without a transaction hash; nothing was emitted.",
      );
      return;
    }

    await observeTransaction([
      "--tx-hash",
      transactionHash,
      "--chain-id",
      getOption(wrapperArgs, "--chain-id") ?? "5000",
      "--action",
      action,
      "--run-id",
      runId,
    ]);
  } catch (error) {
    await recordSafeToolCall({
      action,
      durationMs: Date.now() - startedAt,
      runId,
      status: "failed",
    });
    throw error;
  }
}

export function assertExactlyOneSafetyFlag(options: {
  confirmed: boolean;
  previewOnly: boolean;
}) {
  if (options.previewOnly === options.confirmed) {
    throw new Error(
      "Wrapped execution requires exactly one of `--dry-run` or `--confirm`.",
    );
  }
}

function getClient() {
  return createOpenStatClient({
    apiKey: getRequiredEnvironmentVariable("OPENSTAT_API_KEY"),
    endpoint: process.env.OPENSTAT_ENDPOINT ?? process.env.OPENSTAT_API_URL,
    environment: process.env.OPENSTAT_ENVIRONMENT ?? "development",
    serviceName: process.env.OPENSTAT_SERVICE_NAME ?? "realclaw",
  });
}

async function recordSafeToolCall(options: {
  action: string;
  durationMs: number;
  runId: string;
  status: string;
}) {
  if (!process.env.OPENSTAT_API_KEY) {
    return;
  }

  await getClient().recordToolCall({
    runId: options.runId,
    status: options.status,
    summary: `${options.action} ${options.status} in ${options.durationMs}ms.`,
    toolName: "openstat-realclaw",
  });
}

function getFixtureOutput(options: { confirmed: boolean }) {
  return options.confirmed
    ? `Fixture transaction: 0x${"a".repeat(64)}`
    : "Fixture dry run completed without broadcast.";
}

function runCommand(commandArgs: string[]) {
  return new Promise<string>((resolve, reject) => {
    const [executable, ...childArgs] = commandArgs;

    if (!executable) {
      reject(new Error("Wrapped command is required."));
      return;
    }

    const child = spawn(executable, childArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Wrapped command exited with code ${code}.`));
      }
    });
  });
}

export function findTransactionHash(output: string) {
  return output.match(/0x[0-9a-f]{64}/iu)?.[0];
}

function getTransactionHash(value: string): `0x${string}` {
  if (!/^0x[0-9a-f]{64}$/iu.test(value)) {
    throw new Error("Transaction hash must be a 32-byte hex value.");
  }

  return value as `0x${string}`;
}

function getChainId(value: string) {
  if (value !== "5000" && value !== "5003") {
    throw new Error("Mantle chain ID must be 5000 or 5003.");
  }

  return Number(value) as 5000 | 5003;
}

function getOption(commandArgs: string[], name: string) {
  const index = commandArgs.indexOf(name);
  return index === -1 ? undefined : commandArgs[index + 1];
}

function getRequiredOption(commandArgs: string[], name: string) {
  const value = getOption(commandArgs, name);

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function getRequiredEnvironmentVariable(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function printUsage() {
  console.info(`Usage:
  openstat-realclaw observe --tx-hash 0x... [--chain-id 5003] [--run-id run_...]
  openstat-realclaw exec --dry-run -- <byreal command>
  openstat-realclaw exec --confirm [--chain-id 5000] -- <byreal command>
  openstat-realclaw exec --fixture --dry-run -- fixture
  openstat-realclaw exec --fixture --confirm -- fixture`);
}
