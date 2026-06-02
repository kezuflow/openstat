# OpenStat

OpenStat is a telemetry and monitoring stack for autonomous agents, with an
early focus on AI trading agents.

It gives agent builders a way to collect decision, risk, order, fill, heartbeat,
LLM usage, and PnL telemetry; process it through a backend worker; and inspect
agent behavior in a dashboard.

## Status

OpenStat is in early MVP development.

The current codebase includes:

- A Fastify backend API with auth, API keys, native JSON ingestion, read APIs,
  OTLP/HTTP ingestion, and OpenAPI schemas.
- A worker path for normalizing, redacting, and projecting ingested events.
- Configurable retention sweeps for raw and derived telemetry.
- Postgres schema and Drizzle migrations.
- A Next.js dashboard with overview, agents, runs, trades, alerts, settings, and
  API key pages.
- TypeScript and Python SDK helpers for sending native OpenStat telemetry and
  configuring OTLP/HTTP exporters.
- Hetzner Docker Compose deployment notes, backup scripts, and operations
  runbooks.

Still planned:

- Production-grade SDK instrumentation packages beyond the early-access helper
  clients.
- More complete dashboard management flows.
- End-to-end validation on a fresh production-like deployment.

## OpenStat For Mantle

The optional Mantle module correlates an autonomous agent run with its Mantle
transaction receipts, a deterministic redacted audit insight, and an onchain
audit commitment. OpenStat remains the analytics layer: it does not custody
wallets or sign transactions from the backend.

The public `openstat` JavaScript package includes the `openstat-realclaw`
wrapper. Preview a Byreal-style command before any write:

```sh
openstat-realclaw exec --dry-run -- <byreal-command> <args>
openstat-realclaw exec --fixture --dry-run -- fixture
```

The repeatable local fixture emits allowlisted tool and chain telemetry without
a wallet. A real `--confirm` command must only be run after reviewing its dry
run and explicitly approving the write.

Mantle receipt reconciliation works with the public RPC endpoints by default.
For deployed environments, set `MANTLE_MAINNET_RPC_URL` and
`MANTLE_SEPOLIA_RPC_URL` to secret Alchemy endpoints. Enable anchor indexing
only after deploying and verifying `OpenStatAuditAnchor` on Mantle Sepolia.

The same read-only receipt worker supports registered Base and BNB Chain
adapters. Set `BASE_RECONCILIATION_ENABLED=true` or
`BNB_RECONCILIATION_ENABLED=true` and replace the corresponding public RPC
defaults with hosted provider URLs in deployed environments.

See `packages/contracts/README.md` for non-broadcast deployment preparation.

## Repository Layout

```text
apps/
  backend/        Fastify API server and ingestion worker
  web/            Next.js dashboard app
  docs/           Next.js docs app
packages/
  auth/           API key and auth helpers
  contracts/      Optional Mantle audit anchor contract workspace
  db/             Drizzle schema, migrations, and database utilities
  ingestion/      Core ingestion plus optional integrations/* adapters
  schemas/        Shared Zod contracts
  sdk-js/         TypeScript OpenStat SDK
  ui/             Shared React UI components
  eslint-config/  Shared ESLint configuration
  typescript-config/
sdks/
  python/         Python OpenStat SDK
deploy/
  hetzner/        Single-VPS deployment template and runbooks
docs/
  plans/          System design and implementation notes
```

## Prerequisites

- Node.js 18 or newer
- PNPM 9
- Postgres, if running the backend locally
- Redis, optional but recommended for local worker signaling

The repo uses PNPM workspaces and Turborepo.

## Local Development

Install dependencies:

```sh
pnpm install
```

Create a backend env file:

```sh
cp apps/backend/.env.example apps/backend/.env
```

On Windows PowerShell:

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
```

The default backend values expect:

```text
Postgres: postgres://openstat:openstat@localhost:5432/openstat
Redis:    redis://localhost:6379
API:      http://localhost:4000
Web:      http://localhost:3000
Docs:     http://localhost:3001
```

Run the whole monorepo:

```sh
pnpm dev
```

Or run apps individually:

```sh
pnpm --filter backend dev
pnpm --filter backend worker
pnpm --filter web dev
pnpm --filter docs dev
```

Run database migrations:

```sh
pnpm --filter @openstat/db db:migrate
```

Seed local demo data:

```sh
pnpm --filter backend seed:dev
```

The web app uses `NEXT_PUBLIC_OPENSTAT_API_URL` and defaults to
`http://localhost:4000`. Dashboard pages read through the signed-in Better Auth
session.

## Useful Commands

```sh
pnpm build
pnpm lint
pnpm check-types
pnpm format
pnpm --filter backend test
pnpm --filter backend test:integration
```

Integration tests require `OPENSTAT_INTEGRATION_DATABASE_URL` to point at a
disposable Postgres database.

## Ingestion

Native ingestion endpoints:

```text
POST /v1/ingest/events
POST /v1/ingest/batch
POST /v1/ingest/heartbeat
```

OTLP/HTTP ingestion endpoints:

```text
POST /v1/traces
POST /v1/logs
POST /v1/metrics
```

Requests are authenticated with:

```text
Authorization: Bearer ostat_...
```

Run lifecycle events settle rows on the Runs dashboard. Emit them as normalized
`completion` events that share the same `run_id` as the trading events:

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
`agent_runs.ended_at`, which moves dashboard runs out of Executing.

The TypeScript SDK lives in `packages/sdk-js`, and the Python SDK lives in
`sdks/python`.

## Deployment

The `deploy/hetzner` directory contains a single-VPS Docker Compose template for:

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
secret before deploying.

For early-access launch, complete
`deploy/hetzner/LAUNCH_CHECKLIST.md` and run:

```sh
deploy/hetzner/scripts/check-openstat.sh
```

## Security And Privacy

OpenStat is designed to redact sensitive telemetry by default. The ingestion
pipeline treats prompts, tool arguments/results, account identifiers, secrets,
and raw order payloads as sensitive fields.

Do not commit real `.env` files, production credentials, private keys, customer
data, or production backup details.

## Contributing

Contributions are welcome while the project takes shape. Please keep changes
small and scoped, follow the existing package boundaries, and include tests when
changing backend behavior, auth, ingestion, validation, or response shapes.

Before opening a pull request, run the relevant checks:

```sh
pnpm lint
pnpm check-types
pnpm --filter backend test
```

## License

OpenStat is licensed under the MIT License. See `LICENSE` for details.
