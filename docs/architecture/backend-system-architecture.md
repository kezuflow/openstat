# OpenStat Backend System Architecture

This is a top-level view of the current backend architecture and a target
production-grade architecture. It intentionally stays above class/module detail
and focuses on traffic flow, storage, async processing, and operational
boundaries.

## Current Backend Top View

```mermaid
flowchart TB
  Agents["Agent apps, SDKs, HTTP clients"]
  Dashboard["Next.js dashboard<br/>apps/web"]
  Docs["API docs / OpenAPI UI<br/>/docs and /openapi.json"]

  subgraph VPS["Current single-node backend stack"]
    Caddy["Caddy<br/>TLS + reverse proxy"]
    API["Fastify API<br/>apps/backend"]
    Worker["Ingestion worker<br/>apps/backend/src/worker.ts"]
    Postgres[("Postgres<br/>primary data store")]
    Redis[("Redis<br/>present in stack")]
  end

  subgraph APIResponsibilities["API responsibilities"]
    Auth["Better Auth sessions<br/>Google OAuth optional"]
    ApiKeys["API key auth<br/>Bearer ostat_*"]
    Ingest["Native ingestion routes<br/>/v1/ingest/*"]
    Reads["Dashboard read APIs<br/>agents, runs, trades, alerts"]
    OpenAPI["Swagger/OpenAPI"]
  end

  subgraph DatabaseTables["Postgres data model"]
    AuthTables["users, sessions, accounts"]
    WorkspaceTables["organizations, projects, memberships"]
    KeyTables["api_keys"]
    RawTables["ingestion_batches<br/>ingestion_outbox"]
    ProjectionTables["events, agents, runs,<br/>orders, fills, PnL, notifications"]
  end

  Agents -->|"Bearer API key<br/>native JSON telemetry"| Caddy
  Dashboard -->|"session cookie or dashboard API key"| Caddy
  Docs --> Caddy
  Caddy --> API

  API --> Auth
  API --> ApiKeys
  API --> Ingest
  API --> Reads
  API --> OpenAPI

  Auth --> Postgres
  ApiKeys --> Postgres
  Ingest -->|"validate, redact,<br/>insert batch + outbox"| Postgres
  Reads -->|"project-scoped queries"| Postgres
  OpenAPI --> API

  Ingest -. "publish wake-up placeholder<br/>currently no-op" .-> Redis
  Worker -->|"poll + claim pending outbox rows"| Postgres
  Worker -->|"normalize, project,<br/>retry/dead-letter"| Postgres
  Worker -->|"sweep stale/offline agents"| Postgres

  Postgres --> AuthTables
  Postgres --> WorkspaceTables
  Postgres --> KeyTables
  Postgres --> RawTables
  Postgres --> ProjectionTables
```

### Current Flow

1. Agents, SDKs, and HTTP clients send native JSON telemetry to the Fastify API.
2. API key auth resolves the organization and project scope.
3. The ingestion route validates, redacts, stores an `ingestion_batches` row,
   and writes one or more `ingestion_outbox` rows in Postgres.
4. Redis exists in the stack, but the current ingestion publisher is a no-op
   placeholder. The worker still polls Postgres deterministically.
5. The worker claims pending/retryable outbox rows, normalizes events, updates
   projections, records retries/dead letters, and sweeps agent health.
6. Dashboard read routes query projected tables for overview, agents, runs,
   trades, API keys, and notifications.

### Current Operational Shape

- Deployment target: one VPS for API, worker, Postgres, Redis, and Caddy.
- Source of truth: Postgres.
- Async boundary: Postgres outbox.
- Redis role today: installed dependency for future wake-ups/signaling, not the
  durable ingestion queue.
- Readiness check: API verifies Postgres with `select 1`.
- Logging: Docker `json-file` rotation in the Hetzner compose template.

## Future Production-Grade Top View

```mermaid
flowchart TB
  Agents["Agent apps<br/>Python SDK, TS SDK, OTLP clients"]
  Browser["Dashboard users"]
  CI["CI/CD pipeline"]

  subgraph Edge["Edge and traffic management"]
    DNS["DNS"]
    CDN["CDN / WAF"]
    LB["Load balancer"]
    RateLimit["Global rate limiting<br/>abuse controls"]
  end

  subgraph AppTier["Stateless application tier"]
    APIA["API instance A"]
    APIB["API instance B"]
    APIN["API instance N"]
    Web["Dashboard web<br/>Vercel or app cluster"]
  end

  subgraph AsyncTier["Async processing tier"]
    Queue["Redis or managed queue<br/>wake-ups, leases, backpressure"]
    WorkerA["Worker pool<br/>normalization"]
    WorkerB["Worker pool<br/>projection"]
    Scheduler["Schedulers<br/>retention, health sweeps"]
  end

  subgraph DataTier["Data tier"]
    PGPrimary[("Postgres primary<br/>transactional source of truth")]
    PGReplica[("Postgres read replica")]
    ObjectStore[("Object storage<br/>raw payload archive, exports")]
    Warehouse[("OLAP store, optional<br/>ClickHouse/Timescale later")]
  end

  subgraph Ops["Operations and security"]
    Secrets["Secrets manager"]
    Observability["Logs, metrics, traces, alerts"]
    Backups["Encrypted backups<br/>WAL/PITR restore drills"]
    IAM["Least-privilege IAM<br/>network isolation"]
  end

  Agents --> DNS --> CDN --> LB
  Browser --> DNS
  CDN --> RateLimit --> LB
  LB --> APIA
  LB --> APIB
  LB --> APIN
  Browser --> Web --> LB

  APIA --> PGPrimary
  APIB --> PGPrimary
  APIN --> PGPrimary
  APIA --> Queue
  APIB --> Queue
  APIN --> Queue

  Queue --> WorkerA
  Queue --> WorkerB
  WorkerA --> PGPrimary
  WorkerB --> PGPrimary
  Scheduler --> PGPrimary
  Scheduler --> Queue

  PGPrimary --> PGReplica
  PGPrimary --> Backups
  PGPrimary --> ObjectStore
  PGPrimary -. "derived analytics export" .-> Warehouse
  PGReplica --> Web
  PGReplica --> APIA
  PGReplica --> APIB
  PGReplica --> APIN

  Secrets --> APIA
  Secrets --> APIB
  Secrets --> APIN
  Secrets --> WorkerA
  Secrets --> WorkerB
  Observability --> APIA
  Observability --> APIB
  Observability --> APIN
  Observability --> WorkerA
  Observability --> WorkerB
  Observability --> Queue
  Observability --> PGPrimary
  IAM --> Edge
  IAM --> AppTier
  IAM --> AsyncTier
  IAM --> DataTier
  CI --> AppTier
  CI --> AsyncTier
```

### Future Flow

1. SDKs and OTLP clients enter through DNS, WAF/CDN, load balancing, and global
   abuse controls.
2. API instances stay stateless and horizontally scalable.
3. Ingestion writes an accepted batch/outbox record to Postgres and publishes a
   real queue/wake-up signal.
4. Worker pools consume with backpressure, leases, retries, and dead-letter
   handling.
5. Postgres remains the transactional source of truth, with read replicas for
   dashboard-heavy queries.
6. Raw payload archives and exports move to object storage. High-volume
   analytics can later fan out into an OLAP store.
7. Observability, secrets, backups, restore drills, and network isolation become
   first-class production dependencies.

### Future Production Upgrades

- Replace the current Redis no-op publisher with real queue/wake-up behavior.
- Split API and workers into independently scalable services.
- Add load balancing, WAF/rate limiting, and autoscaling.
- Use private networking between app, queue, and database tiers.
- Add Postgres read replicas, encrypted backups, WAL/PITR, and restore drills.
- Add queue depth, worker lag, dead-letter, API latency, and database health
  alerts.
- Add retention jobs for raw telemetry and derived aggregates.
- Add an object-storage archive for large payloads, exports, and artifacts.
- Add an optional OLAP store only when Postgres projections stop being enough.
- Move secrets out of env files into a managed secret store.
- Add CI/CD deploy gates for lint, types, tests, migrations, and smoke checks.
