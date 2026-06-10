# OpenStat Production System Design

This document extends `docs/architecture/openstat-system-design.md` with the
production concerns required to run OpenStat as a hosted service.

The current production target is the hosted OpenStat deployment:

```text
openstat.online
api.openstat.online
```

The near-term infrastructure target is:

```text
Vercel
  apps/web dashboard

Hetzner VPS
  Fastify API
  ingestion worker
  Postgres
  Redis
  Caddy

External runtimes
  customer agents
  trading-agent workers
  EVM RPC providers
  LLM API providers
```

Trading-agent workers and other high-volume external runtimes must remain
outside the core OpenStat VPS unless a future deployment explicitly provisions
separate capacity for them.

## Current Product Decisions

- Billing is not part of the Mantle Turing hackathon production scope.
- Product quotas are not part of the Mantle Turing hackathon production scope.
- Retention does not vary by plan during the current production phase.
- Hosted workspaces are effectively single-user for the demo and early
  production path.
- Trading-agent demos should start with replay or paper mode before any
  testnet transaction path.

## Production Goals

OpenStat production should optimize for trustworthy ingestion, correct project
scoping, private telemetry handling, and recoverable operations before raw
scale.

Near-term goals:

- Keep the API available for hosted dashboard and SDK traffic.
- Accept telemetry quickly and durably into Postgres.
- Keep worker lag small enough that dashboard views feel current.
- Keep project/org isolation strict.
- Redact sensitive telemetry by default.
- Keep backups and restore drills real, not aspirational.
- Keep the deployment simple enough to operate during the Mantle Turing
  hackathon push.

Non-goals for the current production phase:

- Mainnet autonomous trading execution inside OpenStat infrastructure.
- Local LLM hosting.
- Multi-region active-active deployment.
- Full OLAP-scale analytics.
- Complex enterprise billing, RBAC, or compliance workflows.

## Service-Level Targets

These are operating targets, not contractual SLAs.

- API health endpoint uptime: 99% monthly target during early access.
- Dashboard page API latency: p95 under 1.5 seconds for normal project sizes.
- Ingestion API latency: p95 under 500 ms for accepted native batches under the
  configured body limit.
- Worker lag: newest pending outbox row should usually be under 5 minutes old.
- Dead-lettered rows: zero is the target; any dead-lettered row should trigger
  review.
- Backup freshness: latest successful backup should be less than 26 hours old.
- Restore readiness: complete one restore drill before trusting production
  trading-agent telemetry.

If these targets are missed repeatedly, prioritize reliability work over new
features.

## Capacity Plan

### Current Single-VPS Target

The immediate VPS target is:

```text
4 vCPU
8 GB RAM
80 GB SSD
20 TB traffic
```

This is intended to run:

```text
backend API
worker
Postgres
Redis
Caddy
```

It is not intended to run:

```text
always-on trading-agent workers
local LLMs
heavy backtests
high-volume indexing jobs
```

### Resource Guardrails

- Keep Redis as cache/signaling only; Postgres remains the source of truth.
- Keep Redis memory capped and eviction TTL-based.
- Keep worker batch sizes conservative until Postgres headroom is known.
- Keep ingestion body limits enabled.
- Keep raw telemetry retention bounded.
- Keep demo/replay traffic rate-limited so it cannot flood production.

### Split Triggers

Move Postgres to a separate managed database or private VPS when any of these
become recurring:

- Disk usage exceeds 70% after retention cleanup.
- Backup or restore time becomes operationally uncomfortable.
- Postgres memory pressure affects API latency.
- Worker writes compete with dashboard reads.
- Production usage needs PITR/WAL guarantees beyond nightly dump backups.

Move Redis to a managed service or second host when:

- Redis memory pressure causes frequent evictions of useful keys.
- Redis connection errors become a frequent source of degraded readiness.
- Cache/signaling traffic competes with API or worker CPU.

Introduce ClickHouse or another OLAP store only after Postgres projections and
indexes are no longer enough for analytics queries.

## Deployment Topology

### Web

`apps/web` runs on Vercel and calls the public backend origin through
`NEXT_PUBLIC_OPENSTAT_API_URL`.

For `*.openstat.online`:

```text
NEXT_PUBLIC_OPENSTAT_API_URL=https://api.openstat.online
```

### Backend

`apps/backend` runs as two commands from the same Docker image:

```text
pnpm --filter backend start
pnpm --filter backend worker
```

The API and worker share:

- `DATABASE_URL`
- `REDIS_URL`
- auth configuration
- retention configuration
- chain reconciliation configuration

The worker owns background projection, notification refresh, chain receipt
reconciliation, retention sweeps, and dead-letter handling.

### Reverse Proxy

Caddy terminates TLS and forwards API traffic to the backend container. Only
SSH, HTTP, and HTTPS should be open on the public firewall.

Postgres and Redis must not expose public ports.

## Data Architecture

OpenStat uses Postgres as the production source of truth for the current phase.

Durable tables include:

- auth users, sessions, organizations, projects, memberships
- API keys
- raw ingestion batches
- ingestion outbox rows
- normalized events
- spans, logs, and metrics
- agents and heartbeats
- runs, decisions, risk checks, orders, fills, positions, and PnL snapshots
- notifications
- chain transactions
- audit insights and audit anchors

Design rules:

- Every user-facing read must be scoped by organization and project.
- Ingestion API keys select exactly one project scope.
- Raw batches and normalized/projected records must remain linked enough to
  audit worker behavior.
- Projection writes must be idempotent where the sender provides stable ids.
- Dashboard queries must use project-scoped indexes.

## Data Lifecycle

Default retention:

- Raw or redacted telemetry: 30 days.
- Derived aggregates and trade outcomes: 365 days.

Production requirements:

- Retention sweeps should run in production.
- Retention sweeps must not delete active auth, organization, project, API key,
  or billing records.
- Derived records may outlive raw telemetry but must not contain sensitive raw
  prompts, tool payloads, account identifiers, or secrets.
- Customer data export and deletion flows are future production requirements.

Current decision:

- Use fixed retention during the current production phase. Do not vary
  retention by billing plan until billing exists.

## Security Model

### Authentication And Sessions

- Hosted dashboard users authenticate through Better Auth.
- Production must require a strong `BETTER_AUTH_SECRET`.
- Production email-password auth must use provider-backed email delivery, not
  log-only delivery.
- For hosted `*.openstat.online`, shared session cookies use
  `.openstat.online` as the cookie domain.
- Split web/API deployments must set `APP_WEB_URL`, `API_PUBLIC_URL`,
  `BETTER_AUTH_URL`, and `BETTER_AUTH_COOKIE_DOMAIN` intentionally.

### API Keys

- API keys use the `ostat_...` plaintext format.
- Only a prefix and secret hash should be stored.
- API keys are scoped to one organization/project.
- API keys may be revoked and may expire.
- Missing, invalid, revoked, expired, and wrong-scope keys should return stable
  route-specific error codes.
- API key secrets should be displayed only once after creation.

### Ingestion Abuse Controls

- Enforce request body limits.
- Enforce ingestion rate limits.
- Keep route validation at the API boundary.
- Reject project overrides that do not match the authenticated API key.
- Do not treat Redis rate limiting as the only protection; Redis failures should
  degrade safely.

Current decision:

- Do not implement product quotas or billing-driven overages during the Mantle
  Turing hackathon production phase.
- Keep technical abuse controls such as request body limits and rate limits.
  These protect the service; they are not product-plan quotas.

### Secrets And Private Data

Never store these in telemetry or committed files:

- wallet private keys
- signing credentials
- RPC API keys
- OpenStat API keys
- raw prompts when raw capture is disabled
- raw tool arguments/results when redaction is enabled
- private account identifiers
- raw order payloads

Secret-bearing runtime values belong in deployment environment variables or the
customer agent environment, not in OpenStat events.

## Privacy And Redaction

Redaction is enabled by default. OpenStat should preserve useful operational
summaries while removing sensitive payload details.

Default sensitive classes:

- prompts
- tool arguments/results
- secrets/tokens/API keys
- private account identifiers
- raw order payloads
- wallet private keys or signing material

Safe data classes:

- structured summaries
- event types
- timestamps
- provider/model names
- token counts
- strategy names
- symbols/markets
- side, quantity, price, order type, status, and PnL when not tied to a private
  account identifier
- cryptographic digests of redacted audit inputs

Raw capture must be explicit, project-scoped, and retention-limited.

## Multi-Tenancy

OpenStat is organization/project scoped.

Rules:

- Every dashboard read must resolve a session scope.
- Every ingestion write must resolve an API-key scope.
- Do not bypass `resolveReadScope`, `requireSessionScope`, or ingestion auth
  helpers.
- Tests should cover cross-project isolation whenever backend route behavior
  changes.
- Background workers must preserve organization/project ids on every projected
  row.
- Cache keys must include project or organization identifiers where applicable.

Current decision:

- Keep workspaces effectively single-user for the demo and early hosted product
  path.

Open question:

- What support/admin access policy should exist for production customer data?

## Observability For OpenStat Itself

OpenStat must observe its own ingestion path.

Track:

- API request rate, latency, and 5xx rate
- ingestion accepted/rejected counts
- ingestion rate-limit hits
- worker processed/retryable/dead-letter counts
- oldest pending outbox age
- Redis health and cache error counters
- Postgres health and disk usage
- backup freshness
- auth failures
- Sentry errors and release/environment metadata

Near-term monitors:

- `GET /health`
- `GET /ready`
- external uptime checks for API and web
- VPS disk threshold at 80% warning and 90% urgent
- backup age greater than 26 hours
- worker pending rows older than 5 minutes
- any dead-letter row

Operational runbooks live under `deploy/hetzner`.

## Backup And Disaster Recovery

Current MVP backup:

- Nightly `pg_dump`.
- Keep local backups for the configured retention window.
- Sync backups offsite with encrypted object storage or an encrypted storage
  box.

Before relying on production trading telemetry:

- Complete a restore drill.
- Record restore steps and outcome.
- Add WAL/PITR with pgBackRest or WAL-G if customer data or revenue depends on
  tighter recovery guarantees.

Targets:

- MVP RPO: up to 24 hours until PITR is enabled.
- MVP RTO: same-day manual restore.
- Production target RPO after PITR: under 1 hour.
- Production target RTO after practiced restore: under 4 hours.

Definitions:

- RPO, or recovery point objective, is how much data the service can afford to
  lose after a disaster. A 24-hour RPO means the latest nightly backup is the
  recovery point.
- RTO, or recovery time objective, is how long the service can afford to be down
  while it is restored.

Current target:

- MVP RPO: up to 24 hours until PITR is enabled.
- MVP RTO: same-day manual restore.

## Billing, Plans, And Quotas

Billing is not required for the Mantle Turing demo or the current production phase.
The architecture still tracks future billing boundaries because ingestion and
retention directly cost money.

Initial packaging proposal:

```text
Free
  development projects
  low monthly event volume
  shorter retention

Pro
  production agents
  higher event volume
  longer derived retention
  API key management

Team
  multiple users/projects
  higher limits
  audit/export features
  priority retention and support
```

Quota dimensions:

- monthly accepted events
- ingestion request rate
- projects per organization
- API keys per project
- raw telemetry retention days
- derived retention days
- audit insight generation count
- chain reconciliation volume

Current decision:

- Do not enforce product quotas before billing exists.
- Treat hackathon demo traffic as first-party demo traffic, protected by
  technical rate limits rather than product quotas.

Open question:

- Should audit insight generation be metered separately from raw events when
  billing eventually exists?

## Schema And API Versioning

Production integrations need stable contracts.

Rules:

- Keep ingestion endpoints backwards compatible wherever practical.
- Add schema versions to event metadata when introducing breaking telemetry
  conventions.
- Keep API error codes stable.
- Update OpenAPI schemas and route tests with API behavior changes.
- SDKs should accept additive backend changes without requiring immediate
  customer upgrades.
- Deprecate fields before removing them from public responses.

Open questions:

- Should OpenStat publish a formal event schema reference in docs before the
  Mantle Turing submission?

## Mantle Turing Production Notes

Mantle proof anchoring should stay a verification layer on top of OpenStat's
generic telemetry model, not a special case inside core ingestion.

Rules:

- Mantle-specific behavior belongs under
  `packages/ingestion/src/integrations/mantle` or `packages/contracts`.
- Agent events should still ingest through normal OpenStat APIs.
- Chain receipt reconciliation stays optional and read-only.
- Contract deployment and transaction broadcasts require explicit approval.
- The OpenStat backend must not custody wallets or sign transactions.
- Trading agents may select strategies automatically, but should emit decision
  and risk telemetry before submitting orders or proof anchors.
- Automatic execution is allowed only in the configured execution mode and only
  after a passing risk check.

Required Mantle proof metadata:

```text
chain=mantle
network=<mainnet|sepolia>
tx_hash=<transaction-hash>
action=<agent-action>
run_id=<openstat-run-id>
audit_status=<pass|warn|fail>
```

Open questions:

- Should the public docs include a dedicated Mantle Sepolia receipt walkthrough?
- Should proof anchoring support mainnet after the hackathon demo path is stable?

## Incident Response

Minimum incident process:

1. Confirm whether the issue affects web, API, worker, database, Redis, or
   external dependencies.
2. Check `/health`, `/ready`, Compose service status, logs, disk, and backup
   freshness.
3. Stop non-essential background work before risking data loss.
4. Preserve logs and failing payload examples without exposing secrets.
5. Roll back application code if the issue follows a deploy and no migration
   rollback is required.
6. Restore from backup only after confirming the database state cannot be
   repaired safely.
7. Record the incident, impact, root cause, and follow-up task.

Urgent conditions:

- API unavailable.
- Postgres unavailable.
- Disk above 90%.
- Latest backup older than 26 hours.
- Dead-lettered ingestion rows with customer impact.
- Evidence of cross-project data exposure.
- Any secret committed or exposed through telemetry.

## Production Readiness Checklist

- [ ] Hosted API uses production auth secrets.
- [ ] Hosted auth email provider is configured.
- [ ] Dashboard and API origins are non-localhost.
- [ ] CORS and cookie domain are configured for deployment topology.
- [ ] Postgres and Redis are private to the VPS network.
- [ ] `/health` and `/ready` are externally monitored.
- [ ] Backups run nightly.
- [ ] Backups are copied offsite with encryption.
- [ ] Restore drill has succeeded.
- [ ] Retention sweeps are enabled.
- [ ] API key lifecycle is tested.
- [ ] Project scoping is tested on every changed read/write path.
- [ ] Redaction defaults are tested.
- [ ] Worker lag and dead letters are visible.
- [ ] Disk usage alerts exist.
- [ ] Sentry or equivalent error reporting is configured.
- [ ] External trading-agent workers are isolated from the core OpenStat VPS.
- [ ] Replay or paper mode works without live trading risk.
