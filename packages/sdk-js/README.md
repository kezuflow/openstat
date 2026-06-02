# openstat

TypeScript helpers for sending native OpenStat telemetry from AI trading agents.

```sh
npm install openstat
```

Version `1.2.0` adds first-class run lifecycle helpers so Runs dashboard rows
can move from executing to settled or review without hand-written metadata.

```ts
import { createOpenStatClient } from "openstat";

const openstat = createOpenStatClient({
  apiKey: process.env.OPENSTAT_API_KEY!,
  endpoint: process.env.OPENSTAT_ENDPOINT ?? "https://api.openstat.online",
  serviceName: "paper-trader",
  environment: "production",
});

const run = openstat.startAgentRun({ strategy: "breakout" });

await openstat.recordRunLifecycle({
  runId: run.runId,
  agent: { id: "agent-1", name: "Paper Trader" },
  status: "running",
  strategy: "breakout",
  symbols: ["BTC-USD"],
  summary: "Run started.",
});

await openstat.recordDecision({
  runId: run.runId,
  agent: { id: "agent-1", name: "Paper Trader" },
  strategy: "breakout",
  symbol: "BTC-USD",
  venue: "paper",
  action: "enter_long",
  confidence: 82,
  rationaleSummary: "Momentum and risk budget aligned.",
});

await openstat.recordRunLifecycle({
  runId: run.runId,
  agent: { id: "agent-1", name: "Paper Trader" },
  status: "completed",
  strategy: "breakout",
  symbols: ["BTC-USD"],
  summary: "Run completed.",
});
```

`endpoint` defaults to `https://api.openstat.online`. Set `OPENSTAT_ENDPOINT`
only when sending telemetry to a local or private OpenStat API.

Native helpers are available for run lifecycle markers, decisions, risk checks,
orders, fills, positions, PnL snapshots, heartbeats, errors, model usage, and
tool calls. Use `recordRunLifecycle({ status: "completed" })` or
`recordRunLifecycle({ status: "failed" })` to settle the matching run on the
OpenStat Runs dashboard.

Mantle-aware agents can record a transaction without changing the core event
model:

```ts
await openstat.recordChainTransaction({
  chain: "mantle",
  chainId: 5003,
  txHash: "0x...",
  runId: run.runId,
  action: "anchor_audit",
});
```

The package also ships `openstat-realclaw` for observing RealClaw or
Byreal-style commands. Use `openstat-realclaw exec --dry-run -- <command>`
before any explicitly approved `--confirm` execution.

For OpenTelemetry exporters, use `createOpenTelemetryHttpConfig` to get the
OTLP/HTTP endpoints and authorization headers for traces, logs, and metrics.
