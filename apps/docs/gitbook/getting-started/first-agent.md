# Your first agent

After installing an SDK, send a heartbeat and one complete run. This gives the
dashboard enough context to show whether the agent is online, what it attempted,
which risk gate ran, what execution happened, and how the run ended.

## Recommended run flow

```text
heartbeat
  -> run started
  -> decision
  -> risk check
  -> order or tool call
  -> fill, position, or chain transaction
  -> PnL or outcome snapshot
  -> run completed, failed, or completed with rejection
```

Use the same `runId` for every event in a single agent run. That is how
OpenStat builds the timeline.

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
  expectedCheckInSeconds: 60,
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

await openstat.recordRiskCheck({
  runId: run.runId,
  agent,
  result: "approved",
  reason: "Position is within the configured risk budget.",
});

await openstat.recordOrder({
  runId: run.runId,
  agent,
  strategy: "breakout",
  symbol: "BTC-USD",
  venue: "paper",
  side: "buy",
  orderType: "limit",
  quantity: "0.10",
  price: "62500",
  status: "filled",
});

await openstat.recordFill({
  runId: run.runId,
  agent,
  strategy: "breakout",
  symbol: "BTC-USD",
  venue: "paper",
  side: "buy",
  quantity: "0.10",
  price: "62500",
  status: "filled",
});

await openstat.recordPnlSnapshot({
  runId: run.runId,
  agent,
  strategy: "breakout",
  symbol: "BTC-USD",
  realizedPnl: "18.42",
  unrealizedPnl: "0",
  equity: "10018.42",
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
    expected_check_in_seconds=60,
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

client.record_risk_check(
    run_id=run_id,
    agent=agent,
    result="approved",
    reason="Position is within the configured risk budget.",
)

client.record_order(
    run_id=run_id,
    agent=agent,
    strategy="breakout",
    symbol="BTC-USD",
    venue="paper",
    side="buy",
    order_type="limit",
    quantity="0.10",
    price="62500",
    status="filled",
)

client.record_fill(
    run_id=run_id,
    agent=agent,
    strategy="breakout",
    symbol="BTC-USD",
    venue="paper",
    side="buy",
    quantity="0.10",
    price="62500",
    status="filled",
)

client.record_pnl_snapshot(
    run_id=run_id,
    agent=agent,
    strategy="breakout",
    symbol="BTC-USD",
    realized_pnl="18.42",
    unrealized_pnl="0",
    equity="10018.42",
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
- risk checks
- orders, fills, positions, and PnL
- chain activity if you emit transaction events
- alert and review surfaces
- audit proof status when a run is anchored

## Redaction guidance

Keep telemetry inspectable but safe. Send summaries and stable identifiers, not
raw secrets. Avoid sending:

- API keys
- private keys or wallet seed phrases
- raw model prompts
- raw tool arguments or results
- personal account identifiers
- unredacted order payloads
