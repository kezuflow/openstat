# Sui Overflow Submission Package

This page is the working submission packet for the OpenStat DeepBook Predict
Agent Desk. Use it to prepare the project description, demo recording, and final
validation pass.

## Project summary

OpenStat is an observability and audit dashboard for AI trading agents. For Sui
Overflow, OpenStat adds a DeepBook Predict Agent Desk that turns an agent's
prediction-market run into a clear operational timeline:

- market snapshot
- strategy evaluation
- selected strategy
- decision
- risk approval
- proposed position
- simulated order and fill
- Sui transaction reference
- settlement
- PnL snapshot
- audit insight
- audit anchor readiness

The result is not just "an agent traded." The product shows what the agent saw,
which strategy it selected, why risk allowed or rejected execution, what
execution path happened, and how the final outcome was audited.

## One-line submission copy

OpenStat DeepBook Predict Agent Desk makes AI prediction-market agents
inspectable by turning every strategy choice, risk gate, simulated execution,
settlement, PnL update, and Sui audit reference into a timeline judges can
verify.

## Longer submission copy

OpenStat is an API-first telemetry platform for autonomous agents. The DeepBook
Predict Agent Desk demonstrates how an AI trading agent on Sui can be observed
and audited from strategy selection through settlement. A deterministic replay
runner emits OpenStat telemetry for a DeepBook Predict-style market run,
including market context, candidate strategy scores, selected strategy,
decision, risk check, simulated order/fill, position, Sui transaction reference,
settlement, PnL, and audit evidence.

The demo runs safely in replay or paper mode. It does not require wallet private
keys and does not broadcast transactions. The runner is separate from the core
OpenStat VPS, so OpenStat remains a modular observability product while the
DeepBook integration acts as a removable product layer.

## Track fit

This project fits the DeepBook Predict direction because it focuses on the
agent operations layer around prediction-market activity:

- It shows strategy evaluation before execution.
- It records a risk gate before simulated execution.
- It tracks market, strategy, position, settlement, and PnL context.
- It keeps Sui and DeepBook metadata attached to every relevant event.
- It makes agent behavior inspectable in a dashboard instead of a black-box bot
  log.

It also has an Agentic Web angle: the agent runner is an external actor that
uses OpenStat as a telemetry and audit plane through an API key rather than
being hardcoded into the core app.

## What is live in the product

Public page:

[https://openstat.online/deepbook](https://openstat.online/deepbook)

Authenticated dashboard:

[https://openstat.online/dashboard/deepbook](https://openstat.online/dashboard/deepbook)

Generic views that should also show replay data:

- [https://openstat.online/dashboard/runs](https://openstat.online/dashboard/runs)
- [https://openstat.online/dashboard/trades](https://openstat.online/dashboard/trades)
- [https://openstat.online/dashboard/events](https://openstat.online/dashboard/events)

Runner:

```text
apps/deepbook-agent
```

## Demo command

Use dry-run first:

```sh
pnpm --filter deepbook-agent dry-run
```

Then send replay telemetry to OpenStat:

```sh
OPENSTAT_DRY_RUN=false pnpm --filter deepbook-agent replay
```

Required environment:

```text
OPENSTAT_ENDPOINT=https://api.openstat.online
OPENSTAT_API_KEY=ostat_...
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
DEEPBOOK_NETWORK=testnet
DEEPBOOK_MARKET=SUI/USDC
DEEPBOOK_EXECUTION_MODE=paper
OPENSTAT_REPLAY_DELAY_MS=750
```

For recording, use replay or paper mode. Do not enable testnet execution unless
that mode has been implemented, reviewed, and explicitly approved.

## Demo script

Use this sequence for a two to four minute recording.

1. Open `openstat.online/deepbook`.
2. Say: "OpenStat turns AI trading-agent runs into inspectable timelines. This
   DeepBook Predict desk focuses on a Sui prediction-market agent."
3. Show the public page hero and capability cards.
4. Open `openstat.online/dashboard/deepbook`.
5. Say: "The dashboard shows the selected market, risk state, settlement, and
   run PnL, then breaks down the run timeline."
6. Run the replay command from a terminal outside the OpenStat VPS.
7. Refresh the DeepBook dashboard.
8. Point out the event order: market snapshot, strategy evaluation, selected
   strategy, decision, risk check, position proposal, order, fill, settlement,
   PnL, audit insight, and completion.
9. Open one timeline event inspector.
10. Say: "Notice this is telemetry only. No private keys, API keys, raw prompts,
    or wallet secrets are present."
11. Open the generic Runs page and show the same run appears outside the
    DeepBook-specific view.
12. Open the generic Trades page and show the simulated order/fill.
13. Close with: "The core product is OpenStat. DeepBook is a modular product
    layer that can be removed without rewriting the core telemetry system."

## Video shot list

Capture these shots in order:

1. Public `/deepbook` first viewport.
2. Public `/deepbook` capability section.
3. Dashboard sidebar with DeepBook visible between Trades and Onchain.
4. Empty or pre-replay `/dashboard/deepbook` state.
5. Terminal dry-run command.
6. Terminal replay command.
7. `/dashboard/deepbook` after replay telemetry arrives.
8. Run timeline panel with strategy and risk events visible.
9. Market snapshot and strategy evaluator panels.
10. Risk and audit panel.
11. Executions table.
12. Agent runs table.
13. Event inspector with safe metadata.
14. Generic Runs page showing the same DeepBook run.
15. Generic Trades page showing the simulated execution.
16. API Keys page or docs snippet showing how agents connect.

## Final validation checklist

Run these before recording:

```sh
pnpm --filter backend test
pnpm --filter openstat test
pnpm --filter openstat build
pnpm --filter web build
pnpm lint
pnpm check-types
```

Manual checks:

- Browser verify `/deepbook` on desktop and mobile widths.
- Browser verify `/dashboard/deepbook` on desktop and mobile widths.
- Browser verify API Keys first-run path.
- Browser verify Runs with seeded demo data.
- Run the DeepBook replay agent against staging or production API.
- Confirm replay telemetry appears in `/dashboard/deepbook`.
- Confirm replay telemetry appears in generic Runs, Trades, and Events.
- Confirm no API keys, private keys, wallet secrets, raw prompts, raw tool
  payloads, or raw account identifiers appear in public output.

## Production safety notes

- The OpenStat core VPS should run API, worker, Postgres, Redis, and Caddy.
- The DeepBook runner should run outside that VPS.
- Replay and paper mode do not broadcast transactions.
- Testnet execution is optional and should remain separate from replay/paper
  mode.
- Do not commit `.env` files or secrets.
- Do not store private keys in OpenStat telemetry.

## Removal boundary

DeepBook is intentionally modular. To remove it later, delete:

- `apps/deepbook-agent`
- `apps/web/app/deepbook`
- `apps/web/app/dashboard/deepbook`
- `apps/web/app/features/deepbook`
- `apps/backend/src/scripts/deepbook-demo.ts`

Then remove the sidebar registration and seed-dev imports.
