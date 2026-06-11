# OpenStat

OpenStat is an API-first telemetry and verification layer for autonomous agents.
It helps teams capture what an agent saw, decided, executed, and proved without
shipping private prompts, secrets, or raw operational data on-chain.

The product is built for AI trading agents and other high-impact autonomous
systems where a run needs more than logs: it needs scoped telemetry, risk
checks, transaction receipts, audit evidence, and a durable proof trail.

The current focus is decision-to-outcome observability: see what an agent saw,
what it decided, which tools or models it used, what risk checks ran, which
orders or chain transactions followed, and how the run settled.

## Quick Links

- Product: `https://openstat.online`
- Mantle proof dashboard: `https://openstat.online/dashboard/onchain/mantle`
- Mantle proof guide:
  `apps/docs/gitbook/guides/ai-agent-proofs-on-mantle.md`
- Live Tencent Cloud proof verifier:
  `https://1442161061-1eo7ds24yh.eu-frankfurt.tencentscf.com?runId=mantle-demo-run`
- Mantle Sepolia contract:
  `0x1f5a3354dc01beb89ba7de1a01d04295274a737a`
- Demo proof transaction:
  `0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b`

## What OpenStat Does

- Accepts native JSON telemetry from agents through API-key scoped ingestion.
- Accepts OTLP/HTTP traces, logs, and metrics for interoperability.
- Normalizes and redacts raw telemetry before projecting dashboard-ready data.
- Tracks agent runs, decisions, risk checks, orders, fills, positions, PnL,
  heartbeats, LLM usage, notifications, and event timelines.
- Provides cursor-paginated read APIs for dashboard tables and inspectors.
- Ships SDK helpers for TypeScript and Python agents.
- Supports Mantle receipt reconciliation and audit insight anchoring.
- Keeps private telemetry off-chain; only safe digests and summaries are used
  for verification flows.

## Use OpenStat Cloud

OpenStat users start from the hosted dashboard, not by running this repository.

1. Sign in at `https://openstat.online`.
2. Create or select a workspace.
3. Create or select a project.
4. Open the project's API Keys page and create an ingestion key.
5. Store that key in your agent runtime as `OPENSTAT_API_KEY`.
6. Install the SDK for your agent language.
7. Send a heartbeat or run event and confirm it appears in the dashboard.

JavaScript:

```sh
npm install openstat
```

```ts
import { createOpenStatClient } from "openstat";

const openstat = createOpenStatClient({
  apiKey: process.env.OPENSTAT_API_KEY!,
  endpoint: process.env.OPENSTAT_ENDPOINT ?? "https://api.openstat.online",
  serviceName: "my-agent",
  environment: "production",
});

await openstat.sendHeartbeat({
  agent: { id: "agent-1", name: "My Agent" },
  status: "online",
});
```

Python:

```sh
pip install openstat-sdk
```

```python
import os

from openstat import OpenStatClient

client = OpenStatClient(
    api_key=os.environ["OPENSTAT_API_KEY"],
    endpoint=os.environ.get("OPENSTAT_ENDPOINT", "https://api.openstat.online"),
    service_name="my-agent",
    environment="production",
)

client.send_heartbeat(
    agent={"id": "agent-1", "name": "My Agent"},
    status="online",
)
```

Public packages:

- `openstat` on npm: `https://www.npmjs.com/package/openstat`
- `openstat-sdk` on PyPI: `https://pypi.org/project/openstat-sdk/`

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
updates projections, refreshes notifications, reconciles Mantle chain receipts,
indexes Mantle audit anchors, and powers dashboard reads.

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
on-chain activity. Mantle is the first proof network: Mantle transaction hashes
are reconciled through Mantle RPC, linked to MantleScan, and connected to
`OpenStatAuditAnchor` proof records.

Chain behavior lives under `packages/ingestion/src/integrations/*`; core
ingestion remains chain-agnostic, while the current Mantle proof path uses
`packages/ingestion/src/integrations/mantle`.

### Tencent Cloud Proof Verifier

`deploy/tencent-cloud/proof-verifier` contains a Tencent Cloud Serverless Cloud
Function that verifies the public Mantle Sepolia proof transaction directly from
Mantle RPC. It accepts `runId` or `txHash`, checks the transaction receipt,
decodes the `AuditAnchored(...)` event, and returns a JSON proof verdict.

Tencent Cloud hosts the verification endpoint, Mantle stores the proof, and
OpenStat provides the agent telemetry, audit digest, and dashboard context.

Live verifier:

```text
https://1442161061-1eo7ds24yh.eu-frankfurt.tencentscf.com?runId=mantle-demo-run
```

### Deployed Audit Proof

The current public onchain audit proof deployment is:

- Contract address:
  `0x1f5a3354dc01beb89ba7de1a01d04295274a737a`
- Explorer:
  `https://sepolia.mantlescan.xyz/address/0x1f5a3354dc01beb89ba7de1a01d04295274a737a`

## Repository Layout

```text
apps/
  backend/        Fastify API, read routes, ingestion routes, worker entrypoint
  web/            Next.js dashboard app deployed from apps/web
  docs/           Next.js docs app
packages/
  auth/           Better Auth and API-key auth helpers
  contracts/      Hardhat workspace for Mantle audit anchor contracts
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
  tencent-cloud/  Tencent Cloud SCF proof verifier for Mantle audit proofs
docs/
  architecture/   Architecture notes, system design, and production design
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

The stable product/system architecture lives in
`docs/architecture/openstat-system-design.md`. Production architecture and
operational readiness direction lives in
`docs/architecture/openstat-production-system-design.md`.

## Repository Development

This section is for contributors running the OpenStat monorepo locally. Users
integrating agents should start with `Use OpenStat Cloud` above.

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
- Mantle receipt reconciliation, audit insight generation, and Mantle Sepolia
  proof anchoring are implemented.

Still active future work:

- Full OTLP protobuf decoding and fixture coverage.
- Broader dashboard management flows.
- Production-grade SDK instrumentation packages beyond helper clients.
- End-to-end validation on fresh production-like infrastructure and restore
  drills.

## License

OpenStat is licensed under the MIT License. See `LICENSE` for details.
