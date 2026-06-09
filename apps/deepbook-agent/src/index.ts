import { createOpenStatClient } from "openstat";

import {
  type DeepBookExecutionMode,
  buildDeepBookReplayEvents,
} from "./replay.js";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || process.env.OPENSTAT_DRY_RUN === "true";
const endpoint = process.env.OPENSTAT_ENDPOINT ?? "https://api.openstat.online";
const apiKey = process.env.OPENSTAT_API_KEY;
const market = process.env.DEEPBOOK_MARKET ?? "SUI/USDC";
const network = process.env.DEEPBOOK_NETWORK ?? "testnet";
const executionMode = parseExecutionMode(
  process.env.DEEPBOOK_EXECUTION_MODE ?? "paper",
);
const delayMs = parseDelay(process.env.OPENSTAT_REPLAY_DELAY_MS);

const events = buildDeepBookReplayEvents({
  executionMode,
  market,
  network,
  suiRpcUrl: process.env.SUI_RPC_URL,
});

if (dryRun) {
  console.log(JSON.stringify({ events }, null, 2));
} else {
  if (!apiKey) {
    throw new Error("OPENSTAT_API_KEY is required unless --dry-run is set.");
  }

  const client = createOpenStatClient({
    apiKey,
    endpoint,
    environment: network,
    serviceName: "deepbook-predict-agent",
  });

  for (const event of events) {
    await client.sendEvent(event);
    console.log(`sent ${event.type}`);
    await sleep(delayMs);
  }
}

function parseExecutionMode(value: string): DeepBookExecutionMode {
  if (value === "paper" || value === "replay" || value === "testnet") {
    return value;
  }

  throw new Error(
    "DEEPBOOK_EXECUTION_MODE must be one of: replay, paper, testnet.",
  );
}

function parseDelay(value: string | undefined) {
  if (!value) {
    return 750;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 60_000) {
    throw new Error(
      "OPENSTAT_REPLAY_DELAY_MS must be an integer from 0-60000.",
    );
  }

  return parsed;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
