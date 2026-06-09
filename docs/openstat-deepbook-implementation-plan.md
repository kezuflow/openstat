# OpenStat DeepBook Predict Implementation Plan

## Goal

Polish OpenStat into a credible agent observability product, then add a
DeepBook Predict-specific Agent Desk for the Sui Overflow submission.

Use `docs/openstat-deepbook-implementation-tasklist.md` to keep the work
atomic and commit-sized.

The product shape is:

```text
openstat.online/deepbook
  Public DeepBook Predict Agent Desk showcase and demo page.

openstat.online/dashboard/deepbook
  Authenticated DeepBook Predict control room inside the OpenStat dashboard.

DeepBook agent runner
  Runs outside the OpenStat VPS and sends telemetry to api.openstat.online.
```

The DeepBook Predict agent should be treated as an external instrumented agent.
It does not need to run on the same VPS as the OpenStat API, worker, Postgres,
Redis, and Caddy stack.

The agent flow should be:

```text
observe market
evaluate candidate strategies
select one strategy
propose a prediction-market position
run risk checks
execute according to mode
track settlement and outcome
send the full trace to OpenStat
```

The agent may choose a strategy automatically, but execution must be gated by
mode:

- `replay`: no live market calls; replays a deterministic run.
- `paper`: evaluates live or fixture market context, but only simulates
  positions.
- `testnet`: may submit Sui testnet transactions after risk approval.
- `live`: deferred until after the hackathon demo and requires explicit user
  approval before enabling.

## Recommended Sequence

### 1. Polish onboarding and API keys

Make the first-run product path obvious and reliable:

```text
Create workspace -> Create project -> Create API key -> Install SDK -> Send first event
```

- Improve empty states for no workspace, no project, no API keys, no agents, no
  events, no runs, and no trades.
- Keep API key creation, one-time secret display, copy, revoke, and last-used
  states easy to understand.
- Add JS and Python install snippets directly where users create or inspect API
  keys.
- Make backend and auth failures clear without exposing internal errors.

Acceptance checks:

- A new user can create an API key without reading source code.
- The dashboard tells the user exactly what to do when no telemetry exists.
- API key errors remain stable for clients and tests.

### 2. Polish run timeline and demo data

The run timeline is the core OpenStat proof point. It should show what the
agent saw, why it acted, whether risk approved it, what executed, and how the
run settled.

- Ensure seeded demo data includes a complete decision-to-outcome path:
  decision, risk check, order, fill, PnL, chain transaction, audit verdict, and
  completion.
- Make the run timeline easy to scan from the dashboard and dedicated run
  views.
- Keep sensitive prompt, account, tool payload, and raw order fields redacted by
  default.
- Add or preserve tests around projection, read APIs, and redaction behavior.

Acceptance checks:

- A demo workspace shows a polished complete agent run.
- The timeline makes sense without live agent execution.
- Redaction remains enabled by default.

### 3. Polish deployment and operations on the stronger VPS

Target the core OpenStat stack for the upgraded VPS:

```text
backend API
worker
Postgres
Redis
Caddy
```

Keep the DeepBook Predict agent runner separate or burst-based.

- Document the production deployment path for the 4 vCPU / 8 GB RAM / 80 GB SSD
  VPS.
- Add or verify health checks for API, worker, Postgres, Redis, and disk usage.
- Keep Postgres backups and restore instructions current.
- Add log rotation, retention cleanup, and worker batch limits.
- Keep Redis optional where practical for local or demo resilience.

Acceptance checks:

- The VPS can run OpenStat core services without the DeepBook Predict agent
  competing for resources.
- There is a known backup and restore path.
- Disk, memory, and worker failures are visible enough to diagnose.

### 4. Add DeepBook Predict as a sidebar product area

DeepBook Predict should be a first-class dashboard product area, not hidden
under the generic Onchain page.

Add:

```text
/deepbook
/dashboard/deepbook
```

Recommended sidebar order:

```text
Dashboard
Agents
Events
Runs
Trades
DeepBook
Onchain
Alerts
API Keys
Settings
```

The public page should act as the showroom. The authenticated dashboard page
should act as the control room.

Dashboard surfaces:

- Agent status and selected Sui/DeepBook Predict market.
- Live or replayed DeepBook Predict run timeline.
- Strategy candidates, selected strategy, risk state, and current exposure.
- Prediction position, execution mode, settlement status, PnL, and audit
  verdict.
- Link from DeepBook Predict run details back to generic OpenStat run and trade
  inspectors where the existing data model applies.

Acceptance checks:

- The sidebar link is visible and routes to `/dashboard/deepbook`.
- The public `/deepbook` page explains the product and points into the
  dashboard.
- DeepBook Predict views reuse existing OpenStat data contracts where possible.

### 5. Add the DeepBook Predict agent runner

The agent runner is a separate service or script that uses the OpenStat SDK and
sends telemetry to the hosted API.

Minimum environment:

```text
OPENSTAT_ENDPOINT=https://api.openstat.online
OPENSTAT_API_KEY=ostat_...
SUI_RPC_URL=...
DEEPBOOK_NETWORK=testnet
DEEPBOOK_MARKET=SUI/USDC
DEEPBOOK_EXECUTION_MODE=paper
```

Required event flow:

```text
market snapshot
strategy evaluation
strategy selection
decision
risk_check
position proposal
position execution or simulated_position
settlement or simulated_settlement
pnl_snapshot
chain_transaction
completion
```

Start with replay or paper mode. Add optional Sui testnet execution only after
the demo is reliable.

Acceptance checks:

- The agent can run outside the OpenStat VPS.
- The agent emits DeepBook Predict/Sui metadata on every relevant event.
- A deterministic replay command can seed a polished demo run.
- Live DeepBook Predict execution is deferred until after the submission demo.

### 6. Polish docs quickstart and submission docs

After the product path exists, document the exact journey judges and builders
should follow.

- Update the public docs quickstart for JS and Python.
- Add DeepBook Predict Agent Desk setup and replay instructions.
- Add the Sui Overflow submission summary, demo URL, repo URL, and video script.
- Make security boundaries explicit: no committed secrets, no private keys in
  telemetry, no raw prompts or account identifiers in public proofs.

Acceptance checks:

- A builder can instrument a simple agent from the docs.
- A judge can understand the DeepBook Predict demo without repo spelunking.
- The submission copy matches the actual running product.

## Defer Until After The Demo

- Full billing integration.
- Mainnet autonomous trading.
- Local LLM hosting.
- Complex team roles and permissions.
- Many chain-specific dashboard branches.
- Full OTLP protobuf completeness beyond the current product need.

## Validation Commands

Run narrower commands while changing one area and broader commands before
deployment or submission.

```sh
pnpm --filter backend test
pnpm --filter openstat test
pnpm --filter openstat build
pnpm --filter web build
pnpm lint
pnpm check-types
```

Use browser verification after meaningful dashboard changes.
