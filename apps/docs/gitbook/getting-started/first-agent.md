# Your first agent

After installing an SDK, send a heartbeat and a few run events. This gives the
dashboard enough context to show whether the agent is online, what it attempted,
and how the run ended.

## Recommended run flow

```text
heartbeat
  -> run started
  -> decision
  -> tool call or chain transaction
  -> run completed, failed, or needs review
```

## JavaScript example

```ts
import { createOpenStatClient } from "openstat";

const openstat = createOpenStatClient({
  apiKey: process.env.OPENSTAT_API_KEY!,
  endpoint: process.env.OPENSTAT_ENDPOINT ?? "https://api.openstat.online",
  serviceName: "paper-trader",
  environment: "production",
});

const run = openstat.startAgentRun({ strategy: "breakout" });
const agent = { id: "agent-1", name: "Paper Trader" };

await openstat.sendHeartbeat({
  agent,
  status: "online",
});

await openstat.recordRunLifecycle({
  runId: run.runId,
  agent,
  status: "running",
  strategy: "breakout",
  symbols: ["BTC-USD"],
  summary: "Run started.",
});

await openstat.recordDecision({
  runId: run.runId,
  agent,
  strategy: "breakout",
  symbol: "BTC-USD",
  venue: "paper",
  action: "enter_long",
  confidence: 82,
  rationaleSummary: "Momentum and risk budget aligned.",
});

await openstat.recordRunLifecycle({
  runId: run.runId,
  agent,
  status: "completed",
  strategy: "breakout",
  symbols: ["BTC-USD"],
  summary: "Run completed.",
});
```

## Python example

```python
import os

from openstat import OpenStatClient

client = OpenStatClient(
    api_key=os.environ["OPENSTAT_API_KEY"],
    endpoint=os.environ.get("OPENSTAT_ENDPOINT", "https://api.openstat.online"),
    service_name="paper-trader",
    environment="production",
)

run = client.start_agent_run(strategy="breakout")
run_id = run["run_id"]
agent = {"id": "agent-1", "name": "Paper Trader"}

client.send_heartbeat(
    agent=agent,
    status="online",
)

client.record_run_lifecycle(
    run_id=run_id,
    agent=agent,
    status="running",
    strategy="breakout",
    symbols=["BTC-USD"],
    summary="Run started.",
)

client.record_decision(
    run_id=run_id,
    agent=agent,
    strategy="breakout",
    symbol="BTC-USD",
    venue="paper",
    action="enter_long",
    confidence=82,
    rationale_summary="Momentum and risk budget aligned.",
)

client.record_run_lifecycle(
    run_id=run_id,
    agent=agent,
    status="completed",
    strategy="breakout",
    symbols=["BTC-USD"],
    summary="Run completed.",
)
```

## What appears in OpenStat

The dashboard uses these events to build:

- agent status
- run timeline
- decision history
- trading and chain activity
- alert and review surfaces
- audit proof status when a run is anchored
