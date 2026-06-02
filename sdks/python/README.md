# openstat Python SDK

Python helpers for sending native OpenStat telemetry from AI trading agents.

```sh
pip install openstat-sdk
```

Add editable starter files to an existing Python project:

```sh
openstat init
```

This creates `.env.openstat.example`, `openstat_integration.py`, and
`OPENSTAT.md` in the current directory. Existing files are preserved unless
you run `openstat init --force`.

```python
from openstat import OpenStatClient

client = OpenStatClient(
    api_key="ostat_...",
    endpoint="https://api.openstat.online",
    service_name="paper-trader",
    environment="production",
)

run = client.start_agent_run(strategy="breakout")

client.record_run_lifecycle(
    run_id=run["run_id"],
    agent={"id": "agent-1", "name": "Paper Trader"},
    status="running",
    strategy="breakout",
    symbols=["BTC-USD"],
    summary="Run started.",
)

client.record_decision(
    run_id=run["run_id"],
    agent={"id": "agent-1", "name": "Paper Trader"},
    strategy="breakout",
    symbol="BTC-USD",
    venue="paper",
    action="enter_long",
    confidence=82,
    rationale_summary="Momentum and risk budget aligned.",
)

client.record_run_lifecycle(
    run_id=run["run_id"],
    agent={"id": "agent-1", "name": "Paper Trader"},
    status="completed",
    strategy="breakout",
    symbols=["BTC-USD"],
    summary="Run completed.",
)
```

`endpoint` defaults to `https://api.openstat.online`. Set
`OPENSTAT_ENDPOINT=http://localhost:4000` only when sending telemetry to a local
OpenStat API during development.

Use `record_run_lifecycle(status="completed")` or
`record_run_lifecycle(status="failed")` to settle the matching run on the
OpenStat Runs dashboard. Lifecycle events share the same `run_id` as decisions,
risk checks, orders, fills, positions, and PnL snapshots.

Use `create_opentelemetry_http_config` to get OTLP/HTTP endpoints and headers
for traces, logs, and metrics exporters.
