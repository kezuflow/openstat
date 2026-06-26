# AGENTS.md

This file applies to the entire repository. Keep it current when project
structure, commands, environment requirements, or architectural conventions
change.

## Project Snapshot

OpenStat is a PNPM/Turborepo monorepo for an API-first telemetry and monitoring
product for autonomous agents.

- `apps/web`: Next.js dashboard app, currently on port `3000`.
- `apps/docs`: Next.js docs app, currently on port `3001`.
- `apps/backend`: Fastify API server, currently on port `4000`.
- `packages/auth`: authentication helpers.
- `packages/db`: Drizzle schema, migrations, and database utilities.
- `packages/ingestion`: ingestion, projections, analytics, and optional
  integration adapters under `src/integrations/*`.
- `packages/schemas`: shared Zod contracts.
- `packages/sdk-js`: public `openstat` JavaScript SDK and bundled
  `openstat-realclaw` wrapper.
- `sdks/python`: Python SDK distribution (`openstat-sdk`) with `openstat`
  import path for trading-agent telemetry.
- `packages/ui`: shared React component package exported as `@repo/ui/*`.
- `packages/contracts`: Hardhat workspace for optional onchain audit anchors.
- `deploy/tencent-cloud`: Tencent Cloud Serverless Cloud Function proof verifier
  for Mantle audit proofs.
- `packages/eslint-config`: shared ESLint configs.
- `packages/typescript-config`: shared TypeScript configs.

The stable product/system architecture lives in
`docs/architecture/openstat-system-design.md`. Read it before making
architecture, ingestion, SDK, analytics, or trading-domain changes.

The production architecture and operational readiness direction lives in
`docs/architecture/openstat-production-system-design.md`. Read it before making
deployment, security, retention, billing, quota, scaling, or operations changes.

## Tooling

- Use Node.js `>=22.13`.
- Use PNPM, not npm or yarn. The root package manager is `pnpm@11.9.0`.
- TypeScript is strict and uses `NodeNext` module resolution in shared config.
- Formatting is Prettier via the root `format` script.
- Linting is ESLint 9 via shared repo configs.

## Root Commands

Run commands from the repository root unless a package-specific command is more
appropriate.

```sh
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm check-types
pnpm format
```

Useful filtered commands:

```sh
pnpm --filter web dev
pnpm --filter docs dev
pnpm --filter backend dev
pnpm --filter backend test
pnpm --filter backend test:integration
pnpm --filter backend seed:dev
pnpm --filter @openstat/contracts test
pnpm --filter @openstat/contracts deploy:mantle-sepolia
node deploy/tencent-cloud/proof-verifier/local-invoke.js mantle-demo-run
pnpm --filter openstat build
```

## Environment

Backend environment defaults live in `apps/backend/src/config/env.ts`, and the
example file is `apps/backend/.env.example`. Web environment defaults are shown
in `apps/web/.env.example`.

Default local services:

- API: `http://localhost:4000`
- Web app: `http://localhost:3000`
- Docs app: `http://localhost:3001`
- Postgres: `postgres://openstat:openstat@localhost:5432/openstat`
- Redis: `redis://localhost:6379`
- Mantle mainnet RPC: `https://rpc.mantle.xyz`
- Mantle Sepolia RPC: `https://rpc.sepolia.mantle.xyz`
- Base mainnet RPC: `https://mainnet.base.org`
- Base Sepolia RPC: `https://sepolia.base.org`
- BNB Chain mainnet RPC: `https://bsc-dataseed.bnbchain.org`
- BNB Chain testnet RPC: `https://data-seed-prebsc-1-s1.bnbchain.org:8545`

Chain receipt reconciliation is optional and read-only. Mantle is enabled by
default; Base and BNB Chain adapters are opt-in through
`BASE_RECONCILIATION_ENABLED` and `BNB_RECONCILIATION_ENABLED`. Configure
provider-specific RPC URLs in deployed environments when available. Never store
RPC API keys, wallet private keys, or signing credentials in telemetry or
committed files.

Mantle anchor indexing is also optional. Enable
`MANTLE_ANCHOR_INDEXING_ENABLED` only after setting
`MANTLE_SEPOLIA_ANCHOR_CONTRACT_ADDRESS` and, for initial backfill,
`MANTLE_ANCHOR_INDEX_START_BLOCK`.

The Tencent Cloud proof verifier is a standalone SCF deployment package under
`deploy/tencent-cloud/proof-verifier`. It verifies public Mantle Sepolia proof
transactions through Mantle RPC and does not require OpenStat database access or
project secrets.

For the hosted `*.openstat.online` deployment, the backend resolves the shared
Better Auth cookie domain as `.openstat.online`. Set
`BETTER_AUTH_COOKIE_DOMAIN` explicitly for custom split web/API deployments
that need shared session cookies.
Better Auth session checks use a short-lived signed cookie cache to avoid a
database lookup on every dashboard refresh while keeping revocation lag small.

For split web/API deployments, do not leave web API variables pointed at
`localhost`. Set `apps/web` `NEXT_PUBLIC_OPENSTAT_API_URL` to the public backend
origin, and set backend `APP_WEB_URL`, `API_PUBLIC_URL`, and `BETTER_AUTH_URL`
to the deployed web/API origins.

Do not commit real `.env` files or secrets. `.env` files are intentionally
ignored.

## Backend Conventions

- Edit backend source under `apps/backend/src`; treat `apps/backend/dist` as
  generated build output.
- Keep relative TypeScript imports ESM-compatible. Existing backend source uses
  `.js` extensions in relative imports, for example `./app.js`.
- Register Fastify routes from `apps/backend/src/app.ts`.
- Keep request validation at route boundaries with Zod schemas and Fastify
  OpenAPI schemas.
- When adding or changing API behavior, update
  `apps/backend/src/openapi/schemas.ts` and route tests together.
- Preserve organization/project scoping through `auth-scope.ts`; do not bypass
  `resolveReadScope`, `requireSessionScope`, or ingestion auth helpers.
- Keep API error responses stable and route-specific, especially error `code`
  values that tests or clients may rely on.
- Use `app.inject`-style tests for route behavior when possible. Mock database
  and auth dependencies in route unit tests.
- Run `pnpm --filter backend test` after backend route/auth/ingestion changes.
- Run `pnpm --filter backend test:integration` only when Postgres and any
  required local services are available.

## Frontend Conventions

- `apps/web` and `apps/docs` use the Next.js App Router.
- Keep page code in `app/` and package-shared components in `packages/ui/src`.
- Import shared UI components through `@repo/ui/<component>`, matching the
  package export pattern.
- Prefer existing CSS module/global CSS patterns before adding new styling
  systems.
- `apps/web` uses HeroUI v3 with Tailwind CSS v4. Keep
  `@import "tailwindcss";` before `@import "@heroui/styles";` in global CSS.
- When using HeroUI components, follow HeroUI v3 principles: semantic variants
  (`primary`, `secondary`, `tertiary`, `danger`), compound composition, and theme
  tokens before custom slot styling.
- Do not define app-owned global CSS selectors that collide with HeroUI BEM
  classes such as `.button`, `.modal`, `.input`, `.label`, `.textfield`,
  `.field-error`, `.card`, `.chip`, `.tabs`, `.popover`, `.drawer`, `.surface`,
  or `.tooltip`. Prefix app-specific classes by feature, for example
  `.landing-*`, `.dashboard-*`, or `.signin-*`.
- Do not hand-roll borders, radius, focus rings, or field surfaces for HeroUI
  primitives. Prefer HeroUI theme variables such as `--accent`,
  `--accent-foreground`, `--surface`, `--overlay`, `--field-*`, `--focus`, and
  `--radius`; add component-specific CSS only for layout, spacing, and genuinely
  product-specific composition.
- Do not add app-owned `font-size`, `font-weight`, or `line-height` overrides to
  HeroUI primitives or reusable controls by default. Use HeroUI component
  sizing, variants, and typography defaults first; add custom typography only
  for page-level editorial content or a deliberately scoped product exception.
- After meaningful UI changes, run the relevant filtered dev server and verify
  the page in a browser when practical.

## Package Boundaries

- `packages/ui` should stay framework-light and reusable by both Next apps.
- Shared TypeScript and ESLint changes affect the whole monorepo; run broader
  validation after editing them.
- Avoid importing app-specific code from shared packages.
- Avoid editing `node_modules`, `.turbo`, `.next`, or other generated/cache
  directories.
- Keep Mantle-specific behavior under
  `packages/ingestion/src/integrations/mantle`. Persist generic chain
  transaction telemetry so later chain integrations use sibling adapter
  directories without changing the core event model. Register
  projection-facing chain adapters in
  `packages/ingestion/src/integrations/registry.ts` and reuse the generic
  receipt reconciler. Do not add chain-specific branches to core ingestion or
  the worker. Mantle, Base, and BNB Chain are registered EVM adapters; workers
  should poll only explicitly configured RPC targets.
- The public JavaScript SDK remains the `openstat` package. Ship agent wrappers
  such as `openstat-realclaw` inside it instead of creating a competing SDK
  package identity.
- The Python SDK is published as `openstat-sdk` because PyPI's `openstat` name
  is owned by an unrelated package. Keep the import path as `openstat`.
- Contract deployment commands default to dry-run behavior. Never broadcast a
  deployment or transaction without explicit user approval immediately before
  the broadcast command.

## Commit Messages

Use Conventional Commits with a scope:

```text
type(scope): summary
```

Common types:

- `feat`: new user-facing or product capability.
- `fix`: bug fix.
- `docs`: documentation-only change.
- `test`: tests only.
- `refactor`: behavior-preserving code change.
- `chore`: repo maintenance.

Recommended scopes include `backend`, `web`, `docs`, `ui`, `ingestion`, `sdk`,
`infra`, `repo`, and `plan`.

Examples:

```text
feat(ingestion): add OTLP traces endpoint
fix(backend): preserve project scope in read queries
docs(plan): add OpenStat system design
chore(repo): document commit message convention
```

## Change Hygiene

- Keep edits scoped to the user request.
- Prefer existing repo patterns over new abstractions.
- Add tests when changing backend behavior, authorization, data scoping,
  validation, or response shapes.
- If generated files appear after builds, do not commit or hand-edit them unless
  the project policy changes.
- Update this file when new packages, services, scripts, ports, or verification
  steps are added.
