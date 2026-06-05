# OpenStat

OpenStat is an API-first telemetry, analytics, and verification platform for
autonomous agents.

It started as a monitoring MVP for AI trading agents. It has grown into a
monorepo product with native ingestion, OpenTelemetry-compatible endpoints,
worker projections, an authenticated dashboard, public TypeScript and Python
SDKs, and optional onchain audit adapters for agent actions.

The current focus is decision-to-outcome observability: see what an agent saw,
what it decided, which tools or models it used, what risk checks ran, which
orders or chain transactions followed, and how the run settled.

## What OpenStat Does

- Accepts native JSON telemetry from agents through API-key scoped ingestion.
- Accepts OTLP/HTTP traces, logs, and metrics for interoperability.
- Normalizes and redacts raw telemetry before projecting dashboard-ready data.
- Tracks agent runs, decisions, risk checks, orders, fills, positions, PnL,
  heartbeats, LLM usage, notifications, and event timelines.
- Provides cursor-paginated read APIs for dashboard tables and inspectors.
- Ships SDK helpers for TypeScript and Python agents.
- Supports optional chain receipt reconciliation and audit insight anchoring.
- Keeps private telemetry off-chain; only safe digests and summaries are used
  for verification flows.

## Current Product Surface

### Dashboard

`apps/web` is the authenticated Next.js dashboard. It includes overview, agents,
runs, trades, notifications, API keys, settings, inspectors, and audit views.
The Runs page uses cursor pagination and run lifecycle events to move work from
Executing to Settled.

### API And Worker

`apps/backend` is a Fastify API server. It handles auth, API keys, ingestion,
read APIs, OpenAPI schemas, workspace initialization, and dashboard session
scope.

The worker consumes the ingestion outbox, applies redaction, normalizes signals,
updates projections, refreshes notifications, reconciles optional chain
receipts, and powers dashboard reads.

### SDKs

The public JavaScript SDK is published as `openstat` from `packages/sdk-js`.
It also bundles the `openstat-realclaw` wrapper for guarded RealClaw/Byreal
style telemetry.

The Python SDK is published as `openstat-sdk` from `sdks/python`, while the
import path remains `openstat`.

```sh
npm install openstat
pip install openstat-sdk
```

### Chain Audit Adapters

OpenStat can correlate off-chain agent telemetry with independently verified
on-chain activity. Mantle is the first adapter, with Base and BNB Chain
registered as opt-in EVM receipt reconciliation targets.

Chain behavior lives under `packages/ingestion/src/integrations/*`; core
ingestion remains chain-agnostic.

### Mantle Hackathon Proof

For The Turing Test Hackathon 2026, OpenStat targets the **AI Alpha & Data /
Data & Analytics** path. The submission uses `OpenStatAuditAnchor` on Mantle
Sepolia as the AI-powered on-chain function: OpenStat analyzes a redacted agent
run, produces an Audit Copilot insight, and anchors only the run reference,
telemetry digest, insight digest, and outcome on-chain.

Hackathon documentation checklist: this README includes local setup
instructions, a repository architecture overview, and the deployed Mantle
Sepolia `OpenStatAuditAnchor` contract address.

The public demo should show:

```text
agent run telemetry
  -> redacted OpenStat audit input
  -> Audit Copilot insight
  -> OpenStatAuditAnchor.anchorAudit(...)
  -> Mantle Sepolia receipt and explorer link
  -> dashboard proof status
```

Contract commands live in `packages/contracts`:

```sh
pnpm --filter @openstat/contracts deploy:mantle-sepolia
pnpm --filter @openstat/contracts deploy:mantle-sepolia -- --confirm
pnpm --filter @openstat/contracts verify:mantle-sepolia -- 0x...
pnpm --filter @openstat/contracts demo:anchor-mantle-sepolia -- --run-id mantle-demo-run
```

Backend deployments should enable anchor indexing only after the contract is
deployed and the start block is known:

```text
MANTLE_SEPOLIA_ANCHOR_CONTRACT_ADDRESS=0x1f5a3354dc01beb89ba7de1a01d04295274a737a
MANTLE_ANCHOR_INDEXING_ENABLED=true
MANTLE_ANCHOR_INDEX_START_BLOCK=39493235
MANTLE_SEPOLIA_RPC_URL=https://rpc.sepolia.mantle.xyz
```

Deployed Mantle Sepolia proof:

- Contract address:
  `0x1f5a3354dc01beb89ba7de1a01d04295274a737a`
- Contract explorer:
  `https://sepolia.mantlescan.xyz/address/0x1f5a3354dc01beb89ba7de1a01d04295274a737a`
- Deployment transaction:
  `https://sepolia.mantlescan.xyz/tx/0x05218e9b32c615c0c616e88efd7efc9b5f7bbf84ff388e73dc4b7b14c2ddc956`
- Audit proof transaction:
  `https://sepolia.mantlescan.xyz/tx/0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b`
- Dashboard proof view:
  `https://openstat.online/dashboard/onchain/mantle`

See `docs/hackathon/mantle-submission.md` for the submission checklist.

## Repository Layout

```text
apps/
  backend/        Fastify API, read routes, ingestion routes, worker entrypoint
  web/            Next.js dashboard app deployed from apps/web
  docs/           Next.js docs app
packages/
  auth/           Better Auth and API-key auth helpers
  contracts/      Hardhat workspace for optional audit anchor contracts
  db/             Drizzle schema, migrations, and database utilities
  ingestion/      Normalization, projection, analytics, redaction, integrations
  schemas/        Shared Zod contracts
  sdk-js/         Public openstat JavaScript SDK
  ui/             Shared React UI components
  eslint-config/  Shared ESLint config
  typescript-config/
sdks/
  python/         Public openstat-sdk Python package
deploy/
  hetzner/        Docker Compose deployment, Caddy config, operations scripts
docs/
  architecture/   Architecture notes
  plans/          System design, tasklists, and launch planning
```

## Architecture

OpenStat is Postgres-first for the MVP. Native and OTLP events are accepted by
the API, stored quickly as ingestion batches and outbox rows, then processed by
a separate worker.

```text
Agent / SDK / OTLP exporter
  -> Fastify API
  -> Postgres ingestion_batches + ingestion_outbox
  -> Worker normalization + redaction
  -> Project-scoped projection tables
  -> Dashboard read APIs
  -> Next.js dashboard
```

Core projection tables include:

- `events`
- `agents`
- `agent_runs`
- `trading_decisions`
- `risk_checks`
- `orders`
- `fills`
- `positions`
- `pnl_snapshots`
- `llm_usage`
- `notifications`
- `chain_transactions`
- `audit_insights`
- `audit_anchors`

The design direction lives in
`docs/plans/openstat-system-design.md`.

## Local Development

Prerequisites:

- Node.js 18 or newer
- PNPM 9
- Postgres for backend development
- Redis for worker signaling and project cache invalidation

Install dependencies:

```sh
pnpm install
```

Create a backend environment file:

```sh
cp apps/backend/.env.example apps/backend/.env
```

On Windows PowerShell:

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
```

Default local services:

```text
API:      http://localhost:4000
Web:      http://localhost:3000
Docs:     http://localhost:3001
Postgres: postgres://openstat:openstat@localhost:5432/openstat
Redis:    redis://localhost:6379
```

Run everything:

```sh
pnpm dev
```

Run individual apps:

```sh
pnpm --filter backend dev
pnpm --filter backend worker:dev
pnpm --filter web dev
pnpm --filter docs dev
```

Run migrations and seed demo data:

```sh
pnpm --filter @openstat/db db:migrate
pnpm --filter backend seed:dev
```

## Ingestion

Native ingestion endpoints:

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

Requests use project-scoped API keys:

```text
Authorization: Bearer ostat_...
```

Run lifecycle events settle rows on the Runs dashboard. Emit normalized
`completion` events with the same `run_id` used by related decisions, orders,
fills, positions, PnL snapshots, and chain transactions.

```json
{
  "type": "completion",
  "run_id": "run_123",
  "agent": { "id": "paper-openrouter-dev-1", "name": "Paper Trader" },
  "data": {
    "status": "completed",
    "summary": "Run completed."
  },
  "metadata": {
    "kind": "run_lifecycle",
    "run_status": "completed",
    "strategy": "openstat-paper-v1",
    "symbols": ["AAPL", "BTC-USD"]
  }
}
```

Supported lifecycle statuses are `running`, `completed`,
`completed_with_rejection`, and `failed`. Terminal statuses set
`agent_runs.ended_at`.

## Dashboard Deployment

The dashboard app deploys from `apps/web`, typically on Vercel.

Important web variable:

```text
NEXT_PUBLIC_OPENSTAT_API_URL=https://api.example.com
```

For split web/API deployments, set backend origins too:

```text
API_PUBLIC_URL=https://api.example.com
BETTER_AUTH_URL=https://api.example.com
APP_WEB_URL=https://app.example.com
BETTER_AUTH_COOKIE_DOMAIN=.example.com
```

`apps/web/vercel.json` uses a short ignored-build command:

```sh
node scripts/ignore-build.mjs
```

The script skips Vercel builds for unrelated commits and runs builds when
dashboard, backend/API contract, ingestion, shared UI/config, or root workspace
files change.

## Backend Deployment

`deploy/hetzner` contains the single-VPS Docker Compose deployment used by the
current production path:

- API
- worker
- Postgres
- Redis
- Caddy

Start with:

```sh
docker compose -f deploy/hetzner/docker-compose.yml --env-file deploy/hetzner/.env up -d --build
```

Copy `deploy/hetzner/.env.example` to `deploy/hetzner/.env` and replace every
secret before deploying. Complete `deploy/hetzner/LAUNCH_CHECKLIST.md` before a
fresh launch.

## SDK Releases

Publishing is tag-driven.

```text
npm-sdk-v*
python-sdk-v*
```

JavaScript SDK checks:

```sh
pnpm --filter openstat check-types
pnpm --filter openstat lint
pnpm --filter openstat test
pnpm --filter openstat build
```

Python SDK checks:

```sh
python -m pip install -e "sdks/python[test]"
python -m pytest sdks/python
python -m build sdks/python
python -m twine check sdks/python/dist/*
```

PyPI package:

```text
openstat-sdk
```

Python import path:

```python
from openstat import OpenStatClient
```

## Useful Commands

```sh
pnpm build
pnpm lint
pnpm check-types
pnpm format
pnpm --filter backend test
pnpm --filter backend test:integration
pnpm --filter @openstat/contracts test
```

Integration tests require `OPENSTAT_INTEGRATION_DATABASE_URL` to point at a
disposable Postgres database.

## Security And Privacy

OpenStat redacts sensitive telemetry by default. The ingestion pipeline treats
prompts, tool arguments/results, account identifiers, secrets, and raw order
payloads as sensitive.

Never commit real `.env` files, API keys, wallet private keys, signing
credentials, customer data, or production backup details.

Onchain audit flows publish digests and safe summaries only. OpenStat does not
custody wallets or sign transactions from the backend.

## Current Status

OpenStat has moved beyond the initial repo-recovery plan and now has a usable
MVP path:

- Native ingestion and worker projection are in place.
- Auth, API keys, project scoping, and dashboard reads are implemented.
- Dashboard pages cover overview, agents, runs, trades, notifications, API
  keys, settings, and inspectors.
- TypeScript and Python SDKs are published.
- Hetzner deployment and Vercel dashboard deployment are documented.
- Mantle/Base/BNB receipt adapters are structured as optional integrations.

Still active future work:

- Full OTLP protobuf decoding and fixture coverage.
- Broader dashboard management flows.
- Production-grade SDK instrumentation packages beyond helper clients.
- End-to-end validation on fresh production-like infrastructure and restore
  drills.

## License

OpenStat is licensed under the MIT License. See `LICENSE` for details.
