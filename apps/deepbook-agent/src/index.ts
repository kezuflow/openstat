import { createOpenStatClient } from "openstat";

import {
  type DeepBookAgentConfig,
  type DeepBookExecutionMode,
  buildDeepBookReplayEvents,
} from "./replay.js";

const args = new Set(process.argv.slice(2));
const claimLoop = args.has("--claim-loop");
const claimOnce = args.has("--claim-once");
const dryRun = args.has("--dry-run") || process.env.OPENSTAT_DRY_RUN === "true";
const endpoint = process.env.OPENSTAT_ENDPOINT ?? "https://api.openstat.online";
const apiKey = process.env.OPENSTAT_API_KEY;
const claimIntervalMs = parseClaimInterval(
  process.env.DEEPBOOK_CLAIM_INTERVAL_MS,
);
const delayMs = parseDelay(process.env.OPENSTAT_REPLAY_DELAY_MS);

await main();

async function main() {
  if (claimLoop && claimOnce) {
    throw new Error("--claim-loop cannot be combined with --claim-once.");
  }

  if (claimLoop) {
    await runClaimLoop();
    return;
  }

  if (claimOnce) {
    await runClaimedJob();
    return;
  }

  const events = buildDeepBookReplayEvents({
    executionMode: parseExecutionMode(
      process.env.DEEPBOOK_EXECUTION_MODE ?? "paper",
    ),
    market: process.env.DEEPBOOK_MARKET ?? "SUI/USDC",
    network: process.env.DEEPBOOK_NETWORK ?? "testnet",
    suiRpcUrl: process.env.SUI_RPC_URL,
  });

  if (dryRun) {
    console.log(JSON.stringify({ events }, null, 2));
    return;
  }

  await sendEvents(events);
}

async function runClaimLoop() {
  if (dryRun) {
    throw new Error("--claim-loop cannot be combined with --dry-run.");
  }

  if (!apiKey) {
    throw new Error("OPENSTAT_API_KEY is required to claim DeepBook jobs.");
  }

  console.log(
    `claim loop started for ${process.env.DEEPBOOK_RUNNER_ID ?? "deepbook-agent"} every ${claimIntervalMs}ms`,
  );

  for (;;) {
    try {
      await runClaimedJob();
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "unknown claim-loop error",
      );
    }

    await sleep(claimIntervalMs);
  }
}

async function runClaimedJob() {
  if (dryRun) {
    throw new Error("--claim-once cannot be combined with --dry-run.");
  }

  if (!apiKey) {
    throw new Error("OPENSTAT_API_KEY is required to claim DeepBook jobs.");
  }

  const job = await claimDeepBookJob();

  if (!job) {
    console.log("no queued DeepBook job");
    return;
  }

  const events = buildDeepBookReplayEvents({
    config: job.config,
    executionMode: job.executionMode,
    market: job.config.market,
    network: job.config.network,
    runId: job.externalRunId,
    suiRpcUrl: process.env.SUI_RPC_URL,
  });

  await sendEvents([buildClaimedEvent(job), ...events]);
}

async function sendEvents(
  events: ReturnType<typeof buildDeepBookReplayEvents>,
) {
  if (!apiKey) {
    throw new Error("OPENSTAT_API_KEY is required unless --dry-run is set.");
  }

  const client = createOpenStatClient({
    apiKey,
    endpoint,
    environment: process.env.DEEPBOOK_NETWORK ?? "testnet",
    serviceName: "deepbook-predict-agent",
  });

  for (const event of events) {
    await client.sendEvent(event);
    console.log(`sent ${event.type}`);
    await sleep(delayMs);
  }
}

async function claimDeepBookJob(): Promise<DeepBookClaimedJob | undefined> {
  const response = await fetch(
    `${endpoint.replace(/\/$/u, "")}/v1/deepbook/jobs/claim`,
    {
      body: JSON.stringify({
        runnerId: process.env.DEEPBOOK_RUNNER_ID ?? "deepbook-agent",
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(
      `/v1/deepbook/jobs/claim returned ${response.status}: ${await response.text()}`,
    );
  }

  const data = (await response.json()) as { job?: DeepBookClaimedJob | null };

  return data.job ?? undefined;
}

function parseExecutionMode(value: string): DeepBookExecutionMode {
  if (value === "paper" || value === "replay") {
    return value;
  }

  throw new Error("DEEPBOOK_EXECUTION_MODE must be one of: replay, paper.");
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

function parseClaimInterval(value: string | undefined) {
  if (!value) {
    return 5_000;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1_000 || parsed > 60_000) {
    throw new Error(
      "DEEPBOOK_CLAIM_INTERVAL_MS must be an integer from 1000-60000.",
    );
  }

  return parsed;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

type DeepBookClaimedJob = {
  externalRunId: string;
  executionMode: DeepBookExecutionMode;
  config: DeepBookAgentConfig & {
    market: string;
    network: string;
  };
};

function buildClaimedEvent(job: DeepBookClaimedJob) {
  const runnerId = process.env.DEEPBOOK_RUNNER_ID ?? "deepbook-agent";

  return {
    agent: {
      id: "deepbook-predict-v1",
      name: "DeepBook Predict Agent",
      tags: ["deepbook", "predict", "sui"],
    },
    data: {
      runner_id: runnerId,
      status: "claimed",
      summary: `Claimed by ${runnerId}.`,
    },
    metadata: {
      chain: "sui",
      execution_mode: job.executionMode,
      market: job.config.market,
      network: job.config.network,
      product: "deepbook-predict-agent-desk",
      venue: "deepbook-predict",
    },
    run_id: job.externalRunId,
    tags: ["deepbook", "predict", "console"],
    timestamp: Date.now(),
    type: "heartbeat",
  } satisfies ReturnType<typeof buildDeepBookReplayEvents>[number];
}
