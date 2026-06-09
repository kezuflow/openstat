# OpenStat DeepBook Predict Implementation Tasklist

This tasklist turns `docs/openstat-deepbook-implementation-plan.md` into
small, commit-sized work items.

Keep each change scoped. Prefer existing dashboard, backend, ingestion, SDK,
and deployment patterns before adding new abstractions.

## Open Questions

Answer these before or during Phase 1 so the polish work lands in the right
shape.

- [ ] Should first-time users land on a guided setup screen, or should the
      existing dashboard show stronger empty states inline?
- [ ] Should OpenStat automatically create a default workspace/project for new
      users, or should users explicitly create/select both?
- [ ] Which dashboard surface should be the main "wow" moment for the demo:
      run timeline, DeepBook Predict Agent Desk, or audit proof?
- [ ] Should demo data be globally available as a public demo, created per
      workspace by seed script, or both?
- [ ] Should API key snippets emphasize JavaScript first, Python first, or show
      both equally?
- [ ] Should the DeepBook Predict agent demo be replay-only, paper trading, Sui
      testnet execution, or a mix of replay plus optional testnet execution?
- [ ] Should `/deepbook` be a polished public product page, a live demo page, or
      a compact hybrid of both?
- [ ] Should DeepBook be branded as `DeepBook Predict Agent Desk`,
      `OpenStat for DeepBook Predict`, or another product name?
- [ ] Which prediction market should anchor the demo?
- [ ] Should we keep Mantle/Base/BNB audit surfaces visible during the DeepBook
      push, or reduce visual emphasis on them until after Sui Overflow?

## Phase 1: Polish Onboarding And API Keys

Goal: a new user can understand how to connect an agent without reading source
code.

- [x] Audit the current signed-in first-run dashboard flow.
- [x] Audit the current workspace/project bootstrap flow.
- [x] Audit the current API key create, display, copy, revoke, and empty states.
- [x] Define the preferred first-run path in copy:
      `Create workspace -> Create project -> Create API key -> Install SDK -> Send first event`.
- [ ] Add or improve the no-workspace state.
- [ ] Add or improve the no-project state.
- [x] Add or improve the no-API-key state.
- [x] Add or improve the no-agent state.
- [x] Add or improve the no-event state.
- [x] Add or improve the no-run state.
- [x] Add or improve the no-trade state.
- [x] Add JS install and heartbeat snippets near API key creation.
- [x] Add Python install and heartbeat snippets near API key creation.
- [x] Ensure the API key secret is shown only once after creation.
- [x] Ensure copy-to-clipboard success and failure states are clear.
- [x] Ensure revoke confirmation copy is clear and difficult to misread.
- [x] Show API key prefix, created date, last-used date, and revoked state.
- [x] Confirm API key create/revoke behavior remains project-scoped.
- [ ] Add or update API key route tests if response behavior changes.
- [ ] Add or update dashboard smoke coverage if the repo already has a pattern
      for it.
- [ ] Verify the API Keys page in browser at desktop width.
- [ ] Verify the API Keys page in browser at mobile width.

Acceptance checks:

- [ ] A new user can create an API key from the dashboard.
- [x] A new user sees exact JS and Python next steps after creating a key.
- [x] Empty states point to the next useful action.
- [ ] API key auth error codes remain stable.

Suggested commit slices:

- [x] `fix(web): clarify dashboard empty states`
- [x] `feat(web): add api key setup snippets`
- [ ] `test(backend): preserve api key lifecycle behavior`

## Phase 2: Polish Run Timeline And Demo Data

Goal: OpenStat can show one complete decision-to-outcome story beautifully and
reliably before DeepBook-specific work begins.

- [ ] Audit current run detail and inspector behavior.
- [x] Audit current seeded demo data in `apps/backend/src/scripts/seed-dev.ts`.
- [x] Define the canonical demo run:
      market context, strategy evaluation, strategy selection, decision, risk
      check, position proposal, simulated or testnet execution, settlement, PnL,
      chain transaction, audit insight, audit anchor, completion.
- [x] Add or update seed data for a complete run timeline.
- [x] Ensure demo data includes at least one successful run.
- [x] Ensure demo data includes at least one risk-rejected or warning run.
- [ ] Ensure demo data includes at least one failed or reverted action if useful
      for audit storytelling.
- [x] Ensure event timestamps produce a coherent timeline order.
- [x] Ensure run lifecycle events settle terminal run states.
- [ ] Improve timeline grouping for decision, risk, order, fill, PnL, chain, and
      completion events.
- [x] Improve event labels so the timeline reads like an agent story instead of
      raw database rows.
- [x] Surface redacted reasoning summaries without exposing prompts or raw tool
      payloads.
- [ ] Link run timeline items to trade, event, or onchain inspectors where
      available.
- [ ] Add or update projection tests for the demo event sequence.
- [x] Add or update read API tests for run timeline fields if behavior changes.
- [ ] Add or update redaction tests if new demo fields are introduced.
- [ ] Verify the Runs page in browser at desktop width.
- [ ] Verify the Runs page in browser at mobile width.
- [ ] Verify the run inspector or detail view with seeded demo data.

Acceptance checks:

- [x] Seed data produces a complete run that makes sense to a first-time viewer.
- [ ] The run timeline clearly shows decision, risk, execution, outcome, and
      audit.
- [x] Sensitive fields are redacted by default.
- [x] Backend tests pass for changed projection/read behavior.

Suggested commit slices:

- [x] `feat(backend): seed complete agent run demo`
- [x] `feat(web): polish run timeline storytelling`
- [ ] `test(ingestion): cover demo run projections`

## Phase 3: Polish Deployment And Operations

Goal: the 4 vCPU / 8 GB RAM / 80 GB SSD VPS can run OpenStat core services
without also carrying the DeepBook Predict agent runner.

Target core stack:

```text
backend API
worker
Postgres
Redis
Caddy
```

- [x] Audit `deploy/hetzner` compose, env examples, and runbooks.
- [x] Document the target VPS size in deployment docs.
- [ ] Add or verify container health checks for API and worker.
- [x] Add or verify Postgres health check.
- [x] Add or verify Redis health check.
- [x] Add or verify Caddy health or readiness guidance.
- [x] Add Docker memory or restart guidance if missing.
- [x] Add Postgres backup command/runbook if missing.
- [x] Add restore drill command/runbook if missing.
- [x] Add log rotation guidance for API, worker, Caddy, Postgres, and Redis.
- [x] Add disk usage monitoring guidance.
- [x] Add worker batch-size and retry tuning guidance.
- [x] Add retention cleanup guidance for raw telemetry and derived projections.
- [x] Confirm `.env.example` files do not include secrets.
- [x] Confirm split web/API deployment variables are documented.
- [x] Confirm Redis can fail gracefully where the app claims it is optional.
- [ ] Run backend health tests after any health route changes.
- [x] Run deployment docs through Prettier.

Acceptance checks:

- [x] There is a clear deploy path for the upgraded VPS.
- [x] Backups and restore steps are documented.
- [x] OpenStat core services do not depend on the DeepBook Predict agent runner
      being colocated.
- [x] Secrets and private keys are not committed or logged.

Suggested commit slices:

- [x] `docs(infra): document vps deployment target`
- [ ] `chore(infra): add service health checks`
- [ ] `docs(infra): add backup and restore runbook`

## Phase 4: Add DeepBook Predict Product Surfaces

Goal: DeepBook Predict becomes a first-class product area with a public
showroom and an authenticated control room.

Public route:

```text
/deepbook
```

Dashboard route:

```text
/dashboard/deepbook
```

- [ ] Choose final product name.
- [ ] Choose final public page framing: product page, live demo, or hybrid.
- [ ] Add `/deepbook` public route.
- [ ] Add public DeepBook Predict page metadata.
- [ ] Add public DeepBook Predict page CTA to sign in or open dashboard.
- [ ] Add public DeepBook Predict page fallback demo summary if live data is
      unavailable.
- [ ] Add `/dashboard/deepbook` route.
- [ ] Add DeepBook to dashboard sidebar between Trades and Onchain.
- [ ] Pick a lucide icon for DeepBook, likely a chart, activity, or target icon.
- [ ] Add DeepBook Predict loading state.
- [ ] Add DeepBook Predict empty state.
- [ ] Add DeepBook Predict backend-error state.
- [ ] Add DeepBook Predict overview KPIs: active agent, selected market,
      execution mode, exposure, PnL, risk state, settlement state, audit
      verdict.
- [ ] Add DeepBook Predict run timeline panel.
- [ ] Add DeepBook Predict market snapshot panel.
- [ ] Add DeepBook Predict strategy selector/evaluator panel.
- [ ] Add DeepBook Predict risk gate panel.
- [ ] Add DeepBook Predict positions/executions table.
- [ ] Add DeepBook Predict settlement/outcome panel.
- [ ] Add DeepBook Predict audit summary panel.
- [ ] Add links from DeepBook Predict rows to generic run/trade/onchain
      inspectors where the existing data model applies.
- [ ] Reuse existing dashboard data components where practical.
- [ ] Keep DeepBook-specific CSS prefixed with `deepbook-`.
- [ ] Avoid styling collisions with HeroUI BEM classes.
- [ ] Verify `/deepbook` in browser at desktop width.
- [ ] Verify `/deepbook` in browser at mobile width.
- [ ] Verify `/dashboard/deepbook` in browser at desktop width.
- [ ] Verify `/dashboard/deepbook` in browser at mobile width.

Acceptance checks:

- [ ] The public page explains the DeepBook Predict Agent Desk in under one
      viewport.
- [ ] The sidebar link is visible and active on `/dashboard/deepbook`.
- [ ] The dashboard page works with no data, demo data, and backend errors.
- [ ] The page feels like an operations desk, not a landing-page hero pasted
      into the dashboard.

Suggested commit slices:

- [ ] `feat(web): add deepbook public page`
- [ ] `feat(web): add deepbook dashboard route`
- [ ] `feat(web): add deepbook sidebar navigation`

## Phase 5: Add Sui And DeepBook Predict Telemetry Support

Goal: the backend can recognize DeepBook Predict/Sui telemetry cleanly without
hardcoding Sui-specific branches into generic ingestion.

- [ ] Define DeepBook Predict event metadata conventions.
- [ ] Define Sui chain transaction metadata conventions.
- [ ] Decide whether Sui transaction support starts as generic telemetry only
      or a dedicated adapter under `packages/ingestion/src/integrations/sui`.
- [ ] Add Sui adapter directory if dedicated receipt reconciliation is in scope.
- [ ] Register the Sui adapter in the chain integration registry if needed.
- [ ] Add Sui explorer URL helper for transaction digests.
- [ ] Add Sui transaction status mapping if receipt reconciliation is in scope.
- [ ] Add tests for Sui adapter explorer URLs and status mapping if implemented.
- [ ] Ensure DeepBook Predict fields project into existing run/trade/event
      surfaces.
- [ ] Ensure metadata includes:
      `product`, `venue`, `chain`, `network`, `market`, `strategy`, and
      `execution_mode`.
- [ ] Ensure event data can represent strategy candidates, selected strategy,
      position proposal, settlement state, and outcome.
- [ ] Ensure any wallet address or account identifiers are redacted or safely
      summarized by default.
- [ ] Update OpenAPI schemas if backend response shapes change.
- [ ] Update backend route tests if new read endpoints are added.

Acceptance checks:

- [ ] DeepBook Predict/Sui events can be ingested through existing OpenStat
      APIs.
- [ ] DeepBook Predict/Sui data appears in the dashboard without leaking
      secrets.
- [ ] Any Sui-specific adapter is isolated under `packages/ingestion/src/integrations/sui`.
- [ ] Existing Mantle/Base/BNB behavior does not regress.

Suggested commit slices:

- [ ] `feat(ingestion): add deepbook predict telemetry conventions`
- [ ] `feat(ingestion): add sui transaction adapter`
- [ ] `test(ingestion): cover sui transaction mapping`

## Phase 6: Add The DeepBook Predict Agent Runner

Goal: the agent runner can run outside the OpenStat VPS and send deterministic
demo telemetry to `api.openstat.online`.

Minimum environment:

```text
OPENSTAT_ENDPOINT=https://api.openstat.online
OPENSTAT_API_KEY=ostat_...
SUI_RPC_URL=...
DEEPBOOK_NETWORK=testnet
DEEPBOOK_MARKET=SUI/USDC
DEEPBOOK_EXECUTION_MODE=paper
```

- [ ] Decide where the agent runner should live in the repo.
- [ ] Decide whether the first runner is TypeScript, Python, or wraps the
      existing AI-TradingAgent.
- [ ] Add an agent runner README.
- [ ] Add an `.env.example` for agent runner configuration.
- [ ] Implement deterministic replay mode.
- [ ] Implement paper trading mode if replay is not enough.
- [ ] Add optional Sui testnet execution only after replay/paper mode is stable.
- [ ] Emit `heartbeat` events.
- [ ] Emit `market_snapshot` or equivalent context events.
- [ ] Emit `strategy_evaluation` events with candidate strategies and scores.
- [ ] Emit `strategy_selected` events with the chosen strategy and reason.
- [ ] Emit `decision` events.
- [ ] Emit `risk_check` events.
- [ ] Emit `position_proposal` events.
- [ ] Emit `position_execution` or `simulated_position` events.
- [ ] Emit `settlement` or `simulated_settlement` events.
- [ ] Emit `pnl_snapshot` events.
- [ ] Emit `chain_transaction` events when applicable.
- [ ] Emit terminal `completion` events.
- [ ] Add rate limits or sleep intervals so the agent cannot flood ingestion.
- [ ] Add a dry-run mode that prints telemetry without sending it.
- [ ] Add tests for event payload construction.
- [ ] Add a one-command demo replay script.
- [ ] Verify replay events appear in `/dashboard/deepbook`.
- [ ] Verify replay events appear in generic Runs and Trades pages.

Acceptance checks:

- [ ] The agent runner can run from a laptop, second VPS, or temporary runtime.
- [ ] The runner does not require access to OpenStat internals.
- [ ] The runner chooses a strategy automatically only after emitting strategy
      evaluation telemetry.
- [ ] The runner executes automatically only in the configured execution mode
      and only after risk approval.
- [ ] Replay mode can seed a polished demo without live market risk.
- [ ] Testnet/live execution remains optional and clearly separated.

Suggested commit slices:

- [ ] `feat(deepbook): add predict agent replay runner`
- [ ] `feat(deepbook): emit openstat telemetry events`
- [ ] `test(deepbook): cover agent payload mapping`

## Phase 7: Polish Docs And Submission Package

Goal: judges and builders can understand the product, run the demo path, and
verify the security boundaries.

- [ ] Update docs quickstart for JavaScript.
- [ ] Update docs quickstart for Python.
- [ ] Add DeepBook Predict Agent Desk docs page.
- [ ] Document `/deepbook` and `/dashboard/deepbook`.
- [ ] Document agent runner replay mode.
- [ ] Document agent runner environment variables.
- [ ] Document Sui RPC and network assumptions.
- [ ] Document no-private-key and no-secrets telemetry rules.
- [ ] Document redaction defaults for prompts, tool payloads, accounts, and raw
      order payloads.
- [ ] Add Sui Overflow submission summary.
- [ ] Add demo script.
- [ ] Add demo video shot list.
- [ ] Add final validation checklist.
- [ ] Run Prettier over changed docs.

Acceptance checks:

- [ ] A builder can instrument a simple agent from the docs.
- [ ] A judge can understand the DeepBook Predict demo from the public page and
      docs.
- [ ] The submission copy matches the running product.
- [ ] Security boundaries are explicit.

Suggested commit slices:

- [ ] `docs(sdk): refresh openstat quickstart`
- [ ] `docs(deepbook): add agent desk guide`
- [ ] `docs(deepbook): add overflow submission package`

## Final Validation

Run these before recording the submission demo:

- [ ] `pnpm --filter backend test`
- [ ] `pnpm --filter openstat test`
- [ ] `pnpm --filter openstat build`
- [ ] `pnpm --filter web build`
- [ ] `pnpm lint`
- [ ] `pnpm check-types`
- [ ] Browser verify `/deepbook`.
- [ ] Browser verify `/dashboard/deepbook`.
- [ ] Browser verify API Keys first-run path.
- [ ] Browser verify Runs with seeded demo data.
- [ ] Run the DeepBook replay agent against staging or production API.
- [ ] Confirm telemetry appears in OpenStat dashboard.
- [ ] Confirm no secrets, private keys, raw prompts, or raw account identifiers
      appear in public output.
