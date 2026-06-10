# OpenStat: AI Agent Proofs on Mantle

OpenStat is the team's dedicated **Mantle Turing Test Hackathon 2026**
submission for two tracks:

- **AI Trading & Strategy**
- **AI DevTools**

The project is **AI Agent Proofs on Mantle**: an autonomous-agent verification
tool that records what an agent tried to do, reconciles the submitted Mantle
transaction, generates a redacted AI audit verdict, and anchors privacy-safe
audit commitments through `OpenStatAuditAnchor` on Mantle Sepolia.

## DoraHacks AI Review Summary

This repository is not a concept deck. It contains a working Mantle-focused
product path:

- **Tracks:** AI Trading & Strategy; AI DevTools.
- **Network:** Mantle Sepolia.
- **On-chain contract:** `OpenStatAuditAnchor`.
- **Contract address:** `0x1f5a3354dc01beb89ba7de1a01d04295274a737a`.
- **Public proof transaction:**
  `0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b`.
- **Tencent Cloud integration:** `deploy/tencent-cloud/proof-verifier` contains
  a Tencent Cloud Serverless Cloud Function verifier for the Mantle proof
  transaction.
- **Tencent Cloud verifier URL:**
  `https://1442161061-1eo7ds24yh.eu-frankfurt.tencentscf.com?runId=mantle-demo-run`.
- **Hosted product:** `https://openstat.online`.
- **Mantle proof dashboard:** `https://openstat.online/dashboard/onchain/mantle`.
- **Visible dashboard proof:** the on-chain transactions table shows
  `0x22f6e966...cdbaad4b` as `confirmed` on Mantle Sepolia with action
  `anchor_audit`, run `mantle-demo-run`, Audit Copilot verdict `pass`, and an
  anchored MantleScan proof link.

Core functionality runs end-to-end on Mantle:

```text
agent run telemetry
  -> Mantle transaction submitted by the agent workflow
  -> Mantle RPC receipt reconciliation
  -> redacted AI audit insight
  -> telemetryDigest + insightDigest
  -> OpenStatAuditAnchor.anchorAudit(...) on Mantle Sepolia
  -> MantleScan-verifiable proof transaction
  -> Tencent Cloud SCF proof-verifier endpoint
  -> OpenStat dashboard proof view
```

## Mantle Turing Scorecard Fit

OpenStat fits the Mantle Turing scorecard as agent verification infrastructure:

- **Technical, 30% / 15 pts general:** production-style PNPM/Turborepo
  monorepo with Fastify API, worker projections, Drizzle/Postgres schema,
  authenticated dashboard, SDKs, contract tests, route tests, lint, type checks,
  and production web build.
- **Ecosystem fit, 20% / 10 pts general:** this submission uses Mantle Sepolia
  as the proof layer. Submitted Mantle transaction hashes are reconciled through
  Mantle RPC and linked to MantleScan. Redacted audit commitments are anchored
  on Mantle Sepolia.
- **Business potential, 20% / 10 pts general:** agent teams need trust,
  incident review, investor/customer proof, and compliance-friendly logs before
  autonomous on-chain execution can be adopted in production.
- **Innovation, 20% / 10 pts general:** instead of publishing raw prompts or
  private telemetry on-chain, OpenStat hashes redacted telemetry and structured
  audit output, then commits only privacy-safe proofs to Mantle.
- **User experience, 10% / 5 pts general:** hosted dashboard, API-key onboarding,
  JavaScript/Python SDKs, OpenAPI routes, and explorer links reduce Web3
  onboarding friction for Web2 agent developers.
- **AI DevTools track fit, 50 pts:** OpenStat is an audit and verification tool
  for Mantle builders. Its output is actionable, reproducible, and independently
  checkable through tests, dashboard state, RPC reconciliation, Tencent Cloud
  SCF verifier output, and MantleScan proof links.

## AI Trading & Strategy Track Fit

OpenStat's AI Trading & Strategy angle is **transparent, risk-managed AI trading
infrastructure for Mantle agents**. The project is not trying to win by showing
the highest PnL. It matches the BGA scorecard's emphasis on better systems:
market fairness, transparency, explainable strategy, risk controls, and
verifiable outcomes.

- **BGA ethos, 10 pts:** OpenStat reduces information asymmetry by making agent
  decisions, risk checks, transaction status, and audit outcomes visible instead
  of leaving automated trading as a black box.
- **Innovation and technical depth, 10 pts:** OpenStat combines AI-agent
  telemetry, trading decision capture, risk gates, Mantle transaction
  reconciliation, redacted audit analysis, and smart contract proof anchoring in
  one workflow.
- **Strategy design and risk management, 7.5 pts:** the product records
  strategy selection, rationale summaries, confidence, exposure checks, slippage
  checks, rejection states, order/fill data, PnL snapshots, and terminal run
  status so trading-agent behavior is explainable and defensible.
- **Transparency and verifiability, 7.5 pts:** every important step can be
  inspected: what the agent saw, what it decided, whether risk approved it, what
  Mantle transaction was submitted, what receipt was reconciled, and what audit
  proof was anchored.
- **Real-world impact, 5 pts:** autonomous trading teams need trust,
  post-incident review, compliance-friendly evidence, and investor/customer
  reporting before agentic finance can scale responsibly.
- **User accessibility and UX, 5 pts:** OpenStat gives builders a hosted
  dashboard, API-key onboarding, JavaScript/Python SDKs, run timelines,
  inspectors, and MantleScan links without requiring users to read raw logs or
  decode transaction receipts manually.
- **Execution and demo quality, 5 pts:** the repo contains working backend,
  dashboard, SDK, worker, ingestion, and contract code; the Mantle Sepolia proof
  contract and demo proof transaction are public.

## AI DevTools Track Fit

OpenStat's AI DevTools angle is **audit and verification infrastructure for
Mantle agent builders**.

- **Sponsor scorecard integration depth, 12 pts:** Mantle is the on-chain proof
  layer, and Tencent Cloud is the serverless verification layer. The
  `deploy/tencent-cloud/proof-verifier` SCF package verifies the public Mantle
  Sepolia audit proof by reading the transaction receipt and decoding the
  `AuditAnchored(...)` event from `OpenStatAuditAnchor`.
- **Optimization or audit output quality, 13 pts:** audit output is structured
  around redacted run context, receipt status, anomaly labels, verdicts,
  telemetry digests, and insight digests. The goal is useful review evidence,
  not generic LLM commentary.
- **Developer productivity impact, 10 pts:** one SDK/API integration gives
  Mantle builders run observability, risk review, transaction reconciliation,
  audit insight generation, and proof anchoring.
- **Verifiability and benchmarking, 10 pts:** the value is independently
  checkable through route tests, SDK tests, ingestion tests, contract tests,
  deterministic digest generation, Tencent Cloud proof-verifier output, and
  public MantleScan links.
- **Execution and demo quality, 5 pts:** the product is deployed, the repo has
  reproducible commands, and the Mantle Sepolia proof transaction demonstrates
  the end-to-end output.

## Submission Links

- Product: `https://openstat.online`.
- Mantle proof dashboard: `https://openstat.online/dashboard/onchain/mantle`.
- Mantle proof docs: `apps/docs/gitbook/guides/ai-agent-proofs-on-mantle.md`.
- Tencent Cloud proof verifier:
  `deploy/tencent-cloud/proof-verifier/README.md`.
- Live Tencent Cloud verifier:
  `https://1442161061-1eo7ds24yh.eu-frankfurt.tencentscf.com?runId=mantle-demo-run`.
- Contract: `0x1f5a3354dc01beb89ba7de1a01d04295274a737a`.
- Contract explorer:
  `https://sepolia.mantlescan.xyz/address/0x1f5a3354dc01beb89ba7de1a01d04295274a737a`
- Demo proof transaction:
  `https://sepolia.mantlescan.xyz/tx/0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b`

## Completion Evidence

The Mantle submission is implemented, deployed, and test-backed. Run these from
the repository root:

```sh
pnpm --filter backend test
pnpm --filter openstat test
pnpm --filter @openstat/contracts test
node deploy/tencent-cloud/proof-verifier/local-invoke.js mantle-demo-run
pnpm --filter web build
pnpm lint
pnpm check-types
```

## Product Overview

OpenStat started as a monitoring MVP for AI trading agents. It has grown into a
monorepo product with native ingestion, OpenTelemetry-compatible endpoints,
worker projections, an authenticated dashboard, public TypeScript and Python
SDKs, and Mantle on-chain audit proof adapters for agent actions.

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
on-chain activity. For this hackathon submission, Mantle is the proof network:
Mantle transaction hashes are reconciled through Mantle RPC, linked to
MantleScan, and connected to `OpenStatAuditAnchor` proof records.

Chain behavior lives under `packages/ingestion/src/integrations/*`; core
ingestion remains chain-agnostic, while the submission path uses
`packages/ingestion/src/integrations/mantle`.

### Tencent Cloud Proof Verifier

`deploy/tencent-cloud/proof-verifier` contains a Tencent Cloud Serverless Cloud
Function that verifies the public Mantle Sepolia proof transaction directly from
Mantle RPC. It accepts `runId` or `txHash`, checks the transaction receipt,
decodes the `AuditAnchored(...)` event, and returns a JSON proof verdict.

This gives the AI DevTools submission a concrete Tencent Cloud integration:
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
`docs/architecture/openstat-production-system-design.md`. This README is the
Mantle Turing Hackathon submission summary for GitHub and automated review.

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
  proof anchoring are implemented for the hackathon submission.

Still active future work:

- Full OTLP protobuf decoding and fixture coverage.
- Broader dashboard management flows.
- Production-grade SDK instrumentation packages beyond helper clients.
- End-to-end validation on fresh production-like infrastructure and restore
  drills.

## License

OpenStat is licensed under the MIT License. See `LICENSE` for details.
