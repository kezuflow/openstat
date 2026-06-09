# OpenStat System Design: Analytics for AI Trading Agents

## Summary

OpenStat is a PostHog-style analytics and observability product for AI trading
agents. The first version is an OpenTelemetry-compatible ingestion edge with an
OpenStat-native analytics core.

Python SDKs, TypeScript SDKs, native JSON ingestion, and OTLP/HTTP clients send
telemetry into the backend. The API accepts batches quickly into Postgres and an
outbox. A separate worker normalizes, redacts, projects, alerts, and powers the
dashboard.

The MVP centers on decision-to-trade observability: market context, model
reasoning, tool calls, risk checks, orders, fills, position/PnL, and final
outcome per agent run.

Optional chain adapters extend that core model with verified transaction
receipts. Agents emit generic `chain_transaction` telemetry, workers reconcile
receipts through configured chain adapters, and safe audit digests may be
anchored onchain without exposing private telemetry.

## Key Interfaces

Native JSON ingestion API:

```text
POST /v1/ingest/events
POST /v1/ingest/batch
POST /v1/ingest/heartbeat
```

OTLP/HTTP endpoints:

```text
POST /v1/traces
POST /v1/logs
POST /v1/metrics
```

- Authenticate with `Authorization: Bearer ostat_...`.
- Use the project API key to select the organization and project.
- Return OTLP-compliant success and partial-success responses on OTLP endpoints.
- Keep OTLP/gRPC out of v1 unless users demand it.

SDKs:

- Build first-class Python and TypeScript SDKs.
- SDKs configure OpenTelemetry export where practical and provide OpenStat
  helpers for `decision`, `risk_check`, `order`, `fill`, `heartbeat`, and
  `metric`.
- SDKs emit standard OTel spans/logs/metrics plus OpenStat trading attributes.

Read APIs:

- Extend agent, event, ingestion batch, notification, and analytics APIs.
- Support decision-to-trade views such as run timelines, trade details,
  strategy breakdowns, symbols, and outcomes.

## Implementation Direction

- Use Postgres first, with project-scoped indexes, raw telemetry retention, and
  aggregate/projection retention.
- Keep raw or redacted telemetry for 30 days by default.
- Keep derived aggregates and trade outcomes for 1 year by default.
- Keep Fastify as the API edge:
  - authenticate
  - rate-limit
  - validate content type and request shape
  - store raw batches/outbox rows
  - return quickly
- Run a separate worker process:
  - claim outbox rows
  - decode OTLP/native events
  - apply redaction
  - normalize signals
  - update projections
  - create notifications
  - retry failures and dead-letter exhausted jobs

Data model direction:

- Store raw ingestion batches separately from normalized telemetry.
- Normalize spans, logs, metrics, and OpenStat events into project-scoped
  tables.
- Project trading-agent tables for:
  - `agent_runs`
  - `trading_decisions`
  - `risk_checks`
  - `orders`
  - `fills`
  - `positions`
  - `pnl_snapshots`
  - `llm_usage`
  - `notifications`
- Use OTel GenAI attributes for provider, model, token usage, tool calls, and AI
  workflow context.
- Add OpenStat trading attributes for strategy, symbol, venue, side, quantity,
  price, order type, fill status, risk result, realized PnL, and unrealized PnL.

Privacy defaults:

- Redact prompts, tool arguments/results, account identifiers, secrets, and raw
  order payloads by default.
- Store structured summaries, hashes, and projections unless a project
  explicitly enables raw capture.
- Make raw capture opt-in and retention-limited.

## Chain And Audit Model

OpenStat keeps chain behavior adapter-based. Core ingestion stores generic
transaction telemetry, while adapter packages know how to reconcile receipts,
statuses, and explorer links for a specific network.

Adapter rules:

- Keep chain-specific behavior under sibling directories in
  `packages/ingestion/src/integrations/*`.
- Register projection-facing chain adapters in
  `packages/ingestion/src/integrations/registry.ts`.
- Reuse the generic receipt reconciler where possible.
- Do not add chain-specific branches to core ingestion or the worker.
- Workers should poll only explicitly configured RPC targets.

Audit rules:

- Correlate off-chain agent telemetry with independently verified on-chain
  activity.
- Keep private telemetry off-chain.
- Publish only safe summaries, digests, and verification metadata in public
  proof flows.
- Never store RPC API keys, wallet private keys, signing credentials, raw
  prompts, or private account identifiers in telemetry or committed files.

## Test Plan

- Unit test API-key auth, payload parsing, signal normalization, redaction,
  trading attribute mapping, and partial-success behavior.
- Route test native ingestion and OTLP traces/logs/metrics.
- Route test missing API keys, invalid API keys, project scoping, bad content
  types, and validation failures.
- Integration test accept -> outbox -> claim -> normalize -> project -> query.
- SDK test Python and TypeScript helpers for correct OTel/OpenStat attributes.
- End-to-end MVP scenario:
  - agent receives market context
  - agent calls model and tools
  - agent performs risk check
  - agent places an order
  - broker, exchange, or chain reports execution
  - OpenStat records PnL
  - dashboard shows the full decision timeline

## Assumptions

- V1 targets moderate SaaS scale on Postgres before adding ClickHouse or another
  OLAP store.
- OTLP/HTTP is the v1 standard protocol; OTLP/gRPC is deferred.
- OpenTelemetry is the interoperability format, not the only internal schema.
- Dashboard MVP prioritizes decision timelines and trade outcomes over a
  generic event explorer.
- Collector support is optional: users can send directly from SDKs/exporters or
  route through an OpenTelemetry Collector.
