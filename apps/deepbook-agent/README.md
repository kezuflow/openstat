# DeepBook Predict Agent Runner

Deterministic replay runner for the OpenStat DeepBook Predict demo. Run it from
a laptop, second VPS, or temporary worker host. Do not colocate it with the
OpenStat API/Postgres/Redis VPS.

The runner emits OpenStat telemetry only. It does not require wallet private
keys, does not broadcast transactions, and defaults to dry-run/paper mode.

## Configure

```sh
cp apps/deepbook-agent/.env.example apps/deepbook-agent/.env
```

Set:

```text
OPENSTAT_ENDPOINT=https://api.openstat.online
OPENSTAT_API_KEY=ostat_...
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
DEEPBOOK_NETWORK=testnet
DEEPBOOK_MARKET=SUI/USDC
DEEPBOOK_EXECUTION_MODE=paper
DEEPBOOK_RUNNER_ID=deepbook-agent-vps-01
DEEPBOOK_CLAIM_INTERVAL_MS=5000
```

`DEEPBOOK_EXECUTION_MODE` supports:

- `replay`: deterministic replay with a redacted Sui digest reference.
- `paper`: simulated execution and settlement, no transaction broadcast.

`testnet` execution is intentionally rejected until a future explicit execution
slice adds real transaction handling.

## Run

Print the telemetry without sending:

```sh
pnpm --filter deepbook-agent dry-run
```

Send the replay to OpenStat:

```sh
OPENSTAT_DRY_RUN=false pnpm --filter deepbook-agent replay
```

Claim one queued run from the DeepBook dashboard:

```sh
OPENSTAT_DRY_RUN=false pnpm --filter deepbook-agent replay -- --claim-once
```

Run continuously as a project-scoped VPS worker:

```sh
OPENSTAT_DRY_RUN=false pnpm --filter deepbook-agent claim-loop
```

The claim path calls `/v1/deepbook/jobs/claim`, receives the next queued
dashboard run, evaluates the configured paper/replay strategy flow, and emits
telemetry back through the normal OpenStat ingestion API.

`claim-loop` keeps polling for queued jobs with
`DEEPBOOK_CLAIM_INTERVAL_MS`. Run one worker per OpenStat project/account so
each worker uses a separate project API key, runner ID, logs, and restart
lifecycle.

The runner sleeps between events so it cannot flood ingestion. Increase
`OPENSTAT_REPLAY_DELAY_MS` if you want a slower demo recording.

## Separate VPS

Use `deploy/deepbook-agent` for the multi-project VPS deployment. The compose
file intentionally lives outside the core OpenStat deployment so the agent can
be moved, removed, or scaled independently.

## Telemetry Sequence

The replay emits:

- `heartbeat`
- `market_snapshot`
- `strategy_evaluation`
- `strategy_selected`
- `decision`
- `risk_check`
- `position_proposal`
- `order`
- `fill`
- `position`
- `chain_transaction`
- `settlement`
- `pnl_snapshot`
- `audit_insight`
- `audit_anchor`
- `completion`

Strategy selection happens before the decision event. Execution events are
emitted only after risk approval.
