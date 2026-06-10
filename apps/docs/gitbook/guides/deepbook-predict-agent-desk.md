# DeepBook Predict Agent Desk

OpenStat's DeepBook Predict Agent Desk is a Sui Overflow demo surface for
auditing an AI trading agent that evaluates prediction-market strategies before
simulated execution.

The demo shows the agent story end to end:

- market context
- candidate strategy evaluation
- selected strategy and rationale
- decision
- risk gate
- proposed prediction position
- simulated order, fill, and position
- Sui transaction reference in replay or paper mode
- settlement and PnL
- audit insight and anchor readiness

The DeepBook runner is an external instrumented agent. It sends telemetry to
OpenStat through the public API and does not run inside the OpenStat core VPS.

## Product routes

Public showcase:

[https://openstat.online/deepbook](https://openstat.online/deepbook)

Authenticated dashboard:

[https://openstat.online/dashboard/deepbook](https://openstat.online/dashboard/deepbook)

The public page explains the demo and points users into the dashboard. The
dashboard page filters normal OpenStat telemetry into a DeepBook-specific
operations view.

## How it works

```text
DeepBook replay runner
  -> OpenStat API key
  -> api.openstat.online
  -> OpenStat ingestion
  -> generic run, event, trade, PnL, and chain telemetry
  -> /dashboard/deepbook filtered operations view
```

The runner emits normal OpenStat events. The DeepBook dashboard recognizes the
run by metadata and tags such as:

```text
product=deepbook-predict-agent-desk
venue=deepbook-predict
chain=sui
network=testnet
market=SUI/USDC
strategy=deepbook-predict-range-v1
execution_mode=replay|paper|testnet
```

Because the demo uses normal OpenStat ingestion, the same data also appears in
generic Runs, Trades, Events, and audit surfaces where applicable.

## Runner location

The replay runner lives in the repository at:

```text
apps/deepbook-agent
```

Run it from a laptop, a second VPS, or a temporary worker host. Do not colocate
it with the OpenStat API, Postgres, Redis, and worker stack during the
submission demo.

## Configure the runner

Copy the example environment file:

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
OPENSTAT_REPLAY_DELAY_MS=750
```

`OPENSTAT_API_KEY` should be a project ingestion key from the OpenStat
dashboard. Store it in a local `.env` file or a runtime secret store. Do not
commit it.

## Execution modes

The first demo should use replay or paper mode.

- `replay`: deterministic telemetry replay with a redacted Sui digest
  reference.
- `paper`: simulated execution and settlement with no transaction broadcast.
- `testnet`: reserved for a later explicit Sui testnet execution slice.

Replay and paper modes do not require wallet private keys. They do not submit
transactions.

## Run the replay

Print telemetry without sending it:

```sh
pnpm --filter deepbook-agent dry-run
```

Send the replay to OpenStat:

```sh
OPENSTAT_DRY_RUN=false pnpm --filter deepbook-agent replay
```

The runner sleeps between events so it cannot flood ingestion. Increase
`OPENSTAT_REPLAY_DELAY_MS` for a slower recorded demo.

## Telemetry sequence

The replay emits this sequence with one shared run id:

```text
heartbeat
market_snapshot
strategy_evaluation
strategy_selected
decision
risk_check
position_proposal
order
fill
position
chain_transaction
settlement
pnl_snapshot
audit_insight
audit_anchor
completion
```

Strategy selection happens before the decision event. Execution events are
emitted only after the risk check is approved.

## What to check in the dashboard

After sending the replay:

1. Open [https://openstat.online/dashboard/deepbook](https://openstat.online/dashboard/deepbook).
2. Confirm the selected market is `SUI/USDC` unless you changed
   `DEEPBOOK_MARKET`.
3. Confirm the timeline includes market, strategy, risk, execution, settlement,
   PnL, and audit events.
4. Open the generic Runs page and confirm the same run appears there.
5. Open the generic Trades page and confirm the simulated order/fill appears
   there.
6. Inspect event details and confirm no API keys, private keys, raw prompts,
   wallet secrets, or raw account identifiers appear.

## Sui assumptions

For the submission demo:

- Network: Sui testnet.
- Default RPC: `https://fullnode.testnet.sui.io:443`.
- Default market: `SUI/USDC`.
- Execution: replay or paper.
- Wallet private keys: not required.
- Transaction broadcast: not performed in replay or paper mode.

Optional Sui testnet execution should be implemented only after replay and paper
mode are stable and only with explicit operator approval.

## Security boundaries

The runner should send safe telemetry only. Do not send:

- API keys
- wallet private keys or seed phrases
- raw prompts
- raw tool arguments or results
- raw account identifiers
- unredacted order payloads

Use summaries, redacted digest references, stable run ids, strategy names, and
market labels instead.

## FAQ

### Is DeepBook required for core OpenStat?

No. DeepBook is a product layer on top of OpenStat's generic telemetry model.
Core OpenStat can run without the DeepBook runner.

### Does replay mode trade?

No. Replay mode emits deterministic telemetry. It does not broadcast a Sui
transaction.

### Does paper mode need a wallet?

No. Paper mode simulates execution and settlement. It records what the agent
would have done and why.

### Can the DeepBook module be removed later?

Yes. The current implementation is intentionally bounded:

- `apps/deepbook-agent`
- `apps/web/app/deepbook`
- `apps/web/app/dashboard/deepbook`
- `apps/web/app/features/deepbook`
- `apps/backend/src/scripts/deepbook-demo.ts`

After deleting those paths, remove the DeepBook sidebar registration and
seed-dev imports.
