# OpenStat For Mantle Atomic Implementation Tasklist

## Goal

Submit OpenStat to The Turing Test Hackathon 2026 under **AI Alpha & Data**,
specifically the **Data & Analytics** path.

Build an optional Mantle verification module that correlates an agent's
off-chain reasoning and telemetry with independently verified on-chain actions.
Do not change OpenStat's core identity: it remains an API-first observability and
analytics product for autonomous agents.

One-line pitch:

> OpenStat is the analytics and verification layer for AI agents on Mantle:
> see what an agent thought, what it executed on-chain, and whether the outcome
> matched its intent.

Official submission deadline: **June 15, 2026 at 15:59 UTC**.

Read `docs/plans/openstat-mantle-hackathon-plan.md` before starting any phase.

## Audit Status: June 1, 2026

The initial implementation pass is complete for the local, non-broadcast
surface:

- Contract workspace, immutable audit anchor contract, local tests, read script,
  dry-run deployment guard, and bytecode-presence check.
- Generic chain telemetry schemas, database migration, TypeScript and Python SDK
  helpers, projection, adapter registry, Alchemy-compatible receipt
  reconciliation, and safe RPC error summaries. Mantle, Base, and BNB Chain are
  registered sibling adapters; only explicitly configured worker targets poll
  RPC endpoints.
- Mantle Sepolia anchor-log indexing with bounded ranges, persisted cursors,
  idempotent inserts, and worker opt-in configuration.
- Canonical redacted run-audit input, deterministic Audit Copilot fixture,
  digest persistence, and authenticated audit routes.
- The `openstat-realclaw` CLI and RealClaw skill bundled inside the public
  `openstat` SDK package. The wrapper enforces exactly one of `--dry-run` or
  `--confirm`, avoids shell execution, records allowlisted tool telemetry, and
  supports a deterministic fixture.
- Dashboard receipt, insight, and proof columns.

Validated locally on June 1, 2026:

```sh
pnpm --filter openstat test
pnpm --filter @openstat/ingestion test
pnpm --filter backend test -- audit.test.ts
pnpm --filter web check-types
pnpm --filter web lint
pnpm --filter web build
```

Still gated or deliberately pending:

- Broadcast the Mantle Sepolia deployment only after explicit approval, verify
  the source on Mantle Explorer, and record the deployed address and explorer
  URL.
- Add and execute the harmless Sepolia demo anchor walkthrough, then verify
  indexed proof data end to end in the authenticated dashboard.
- Run database-backed integration tests against disposable Postgres and repeat
  the full monorepo acceptance pass from a clean checkout.
- Deploy the public frontend and backend, configure secret Alchemy RPC URLs,
  record the video, and complete the DoraHacks submission package.
- Treat live Byreal-managed wallet execution and a live model adapter as
  optional credibility upgrades. Fixture mode remains the repeatable demo
  baseline.

## Working Rules

- Treat each checkbox as one small commit unless the checkbox is only a
  verification command.
- Use Conventional Commits with a scope, for example:
  `feat(mantle): add audit anchor contract`.
- Complete phases in order. Do not start UI work before the backend read payload
  exists.
- Keep Mantle integration optional. Existing non-chain ingestion must continue
  to work when Mantle environment variables are absent.
- Keep Postgres canonical. Redis may wake workers but must not become the source
  of truth for chain state.
- Never store wallet private keys, Byreal agent tokens, Privy proxy
  credentials, or Alchemy API keys in Postgres, telemetry, logs, fixtures, or
  committed files.
- Never put prompts, raw tool payloads, secrets, account identifiers, or raw
  order payloads on-chain.
- Never broadcast a real transaction without explicit user approval immediately
  before the broadcast command.
- Use Mantle Sepolia for repeatable contract deployment and demo actions.
- Treat live Byreal-managed Mantle mainnet execution as optional until
  credentials are available.
- Preserve the upstream `evm-cli` safety contract: run `--dry-run` first and use
  `--confirm` only after the preview has been reviewed.
- Do not patch upstream Byreal repositories for the first submission. Wrap
  their published CLIs from OpenStat.

## Scope Boundaries

### Required For Submission

- Verified `OpenStatAuditAnchor` contract on Mantle Sepolia.
- Alchemy-backed Mantle receipt reconciliation with public-RPC fallback.
- Generic chain transaction telemetry in backend, SDKs, and dashboard.
- RealClaw skill plus wrapper CLI for Byreal Mantle command observation.
- Audit Copilot with deterministic fixture fallback.
- Authenticated dashboard audit trail.
- Public deployment, documented contract address, and demo video.

### Optional After Required Work

- Live Byreal-managed Mantle mainnet transfer.
- WebSocket subscriptions after HTTP polling is stable.
- Solana-side normalization for richer `byreal-cli` actions.
- ERC-8004 organizer-issued identity linkage.
- Mainnet deployment of `OpenStatAuditAnchor`.

## Fixed Technical Decisions

### Chain IDs And RPC Defaults

| Network | Chain ID | Default Public RPC | Preferred Alchemy RPC |
| --- | ---: | --- | --- |
| Mantle Mainnet | `5000` | `https://rpc.mantle.xyz` | `https://mantle-mainnet.g.alchemy.com/v2/<api-key>` |
| Mantle Sepolia | `5003` | `https://rpc.sepolia.mantle.xyz` | `https://mantle-sepolia.g.alchemy.com/v2/<api-key>` |

Use HTTP JSON-RPC polling first. Add WebSocket subscriptions only as an optional
optimization after polling passes integration tests.

### Contract Interface

Create `OpenStatAuditAnchor` with this public function:

```solidity
function anchorAudit(
    bytes32 runRef,
    bytes32 telemetryDigest,
    bytes32 insightDigest,
    uint8 outcome
) external;
```

Use these outcome values:

| Value | Meaning |
| ---: | --- |
| `0` | unknown |
| `1` | pass |
| `2` | warning |
| `3` | fail |

Contract behavior:

- Reject a zero `runRef`.
- Reject a zero `telemetryDigest`.
- Reject a zero `insightDigest`.
- Reject outcomes greater than `3`.
- Allow each caller to anchor a given `runRef` only once.
- Store the caller, digests, outcome, and block timestamp.
- Emit:

```solidity
event AuditAnchored(
    address indexed submitter,
    bytes32 indexed runRef,
    bytes32 indexed telemetryDigest,
    bytes32 insightDigest,
    uint8 outcome,
    uint256 anchoredAt
);
```

### Native Event Contract

Add one normalized OpenStat event type: `chain_transaction`.

Its `data` object must use:

```ts
{
  chain: string;
  chain_id: number;
  tx_hash: `0x${string}`;
  action?: string;
  status?: "submitted" | "confirmed" | "reverted";
  from_address?: `0x${string}`;
  to_address?: `0x${string}`;
}
```

The event-level `run_id`, `agent`, `trace_id`, `span_id`, `tags`, and `metadata`
fields remain the correlation mechanism. Do not add Mantle-only fields to
generic event columns. `chain` must be a normalized integration slug and
`chain_id` must be a positive integer. The registered ingestion adapter
validates the supported chain and network pair before projection.

### Blockchain Adapter Boundary

Add each blockchain as a sibling module under
`packages/ingestion/src/integrations/<chain>`. Mantle, Base, and BNB Chain are
peer integrations. Register projection-facing adapters in
`packages/ingestion/src/integrations/registry.ts` and reuse the generic receipt
reconciler from `packages/ingestion/src/integrations/reconciliation.ts`.

Keep blockchain-specific RPC clients, explorer URL construction, and optional
anchor indexing inside the adapter directory. Do not add chain-specific
branches to core ingestion or the worker.

### Database Tables

Add these generic tables:

- `chain_transactions`
- `audit_insights`
- `audit_anchors`
- `chain_index_cursors`

Use project-scoped indexes and foreign keys. Store addresses and transaction
hashes as lowercase hex strings.

## Phase 0: Baseline And Task Setup

- [ ] Read `AGENTS.md`, `docs/plans/openstat-system-design.md`, and
  `docs/plans/openstat-mantle-hackathon-plan.md`.
- [ ] Run `git status --short` and record unrelated user changes. Do not revert
  them.
- [ ] Run `pnpm check-types`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm --filter backend test`.
- [ ] Confirm Mantle Sepolia returns chain ID `0x138b` from
  `https://rpc.sepolia.mantle.xyz`.
- [ ] Confirm Mantle mainnet returns chain ID `0x1388` from
  `https://rpc.mantle.xyz`.
- [ ] Add a short implementation note to the active PR or commit description:
  required phases are `0-14`; stretch work starts at `Phase 15`.

## Phase 1: Contract Workspace

- [ ] Create `packages/contracts/package.json` named `@openstat/contracts`.
- [ ] Add scripts: `compile`, `test`, `check-types`, `deploy:mantle-sepolia`,
  and `verify:mantle-sepolia`.
- [ ] Add compatible locked dependencies for Hardhat 3, TypeScript, `viem`,
  `dotenv`, and the Hardhat verification plugin.
- [ ] Create `packages/contracts/tsconfig.json`.
- [ ] Create `packages/contracts/hardhat.config.ts`.
- [ ] Configure Solidity `0.8.x` with optimizer enabled and a fixed optimizer
  run count.
- [ ] Configure `mantleSepolia` with chain ID `5003` and
  `MANTLE_SEPOLIA_RPC_URL`.
- [ ] Read the deployer account only from `MANTLE_DEPLOYER_PRIVATE_KEY`.
- [ ] Create `packages/contracts/.env.example` with placeholders only.
- [ ] Add `.gitignore` entries for contract artifacts, cache output, and local
  contract `.env` files if the existing rules do not already cover them.
- [ ] Run `pnpm install`.
- [ ] Run `pnpm --filter @openstat/contracts compile`.
- [ ] Commit: `chore(mantle): add audit contract workspace`.

## Phase 2: Audit Anchor Contract

- [ ] Add `packages/contracts/contracts/OpenStatAuditAnchor.sol`.
- [ ] Add the `AuditAnchor` storage struct.
- [ ] Add `mapping(address => mapping(bytes32 => AuditAnchor))`.
- [ ] Implement `anchorAudit(...)` exactly as defined in this tasklist.
- [ ] Add a read function:

```solidity
function getAudit(
    address submitter,
    bytes32 runRef
) external view returns (AuditAnchor memory);
```

- [ ] Add contract tests for one successful anchor.
- [ ] Add contract tests proving the emitted event fields.
- [ ] Add contract tests for zero `runRef`.
- [ ] Add contract tests for zero `telemetryDigest`.
- [ ] Add contract tests for zero `insightDigest`.
- [ ] Add contract tests for outcome `4`.
- [ ] Add contract tests proving the same caller cannot overwrite one `runRef`.
- [ ] Add contract tests proving different callers may use the same `runRef`.
- [ ] Run `pnpm --filter @openstat/contracts test`.
- [ ] Run `pnpm --filter @openstat/contracts compile`.
- [ ] Commit: `feat(mantle): add immutable audit anchor contract`.

## Phase 3: Mantle Sepolia Deployment

Do not execute a broadcast command until the user explicitly approves the
deployment transaction.

- [ ] Add `packages/contracts/scripts/deploy-mantle-sepolia.ts`.
- [ ] Make the deploy script fail fast when the private key or RPC URL is
  missing.
- [ ] Make the deploy script check `eth_chainId` and abort unless it is `5003`.
- [ ] Make the deploy script print the full deployer address, transaction hash,
  and deployed contract address.
- [ ] Add a read-only script that calls `getAudit(...)` for a supplied submitter
  and run reference.
- [ ] Add a dry-run or local-network deployment smoke test.
- [ ] Run the local contract test suite again.
- [ ] Ask for approval immediately before broadcasting the Mantle Sepolia
  deployment transaction.
- [ ] Deploy `OpenStatAuditAnchor` to Mantle Sepolia.
- [ ] Verify source code through the Mantle explorer verification surface. Use
  Standard JSON or multi-file verification if automated Hardhat verification is
  not supported by the current explorer.
- [ ] Record the contract address, deployment transaction hash, explorer URL,
  compiler version, optimizer settings, and deployment date in
  `packages/contracts/README.md`.
- [ ] Commit: `docs(mantle): record verified sepolia audit contract`.

## Phase 4: Shared Chain Schemas

- [ ] Add `chain_transaction` to `normalizedEventTypeSchema` in
  `packages/schemas/src/ingestion.ts`.
- [ ] Add reusable EVM address validation for `0x` plus 40 hex characters.
- [ ] Add reusable EVM transaction hash validation for `0x` plus 64 hex
  characters.
- [ ] Add `chainTransactionDataSchema` with the fixed native event contract.
- [ ] Add `chain_transaction` to `normalizedEventDataSchemas`.
- [ ] Export the inferred chain transaction types.
- [ ] Add schema tests for a valid Mantle Sepolia transaction event.
- [ ] Add schema tests for chain ID `5000`.
- [ ] Add schema tests rejecting an unsupported chain ID.
- [ ] Add schema tests rejecting malformed addresses.
- [ ] Add schema tests rejecting malformed transaction hashes.
- [ ] Run `pnpm --filter backend test`.
- [ ] Run `pnpm check-types`.
- [ ] Commit: `feat(schemas): add chain transaction telemetry contract`.

## Phase 5: Database Foundation

- [ ] Add a `chain_receipt_status` enum with `submitted`, `confirmed`, and
  `reverted`.
- [ ] Add `chain_transactions` to `packages/db/src/schema.ts`.
- [ ] Include organization ID, project ID, optional agent ID, optional source
  event ID, external run ID, chain name, chain ID, transaction hash, action,
  receipt status, from address, to address, block number, gas used, explorer
  URL, sanitized receipt JSON, submitted timestamp, confirmed timestamp, last
  checked timestamp, and standard timestamps.
- [ ] Add a unique index on project ID, chain ID, and transaction hash.
- [ ] Add an index for pending receipt reconciliation.
- [ ] Add an index for project-scoped run audit-trail reads.
- [ ] Add `audit_insights` with organization ID, project ID, optional agent ID,
  external run ID, optional chain transaction ID, provider, model, verdict,
  risk score, summary, anomaly flags, telemetry digest, insight digest,
  redacted analysis JSON, and timestamps.
- [ ] Add `audit_anchors` with organization ID, project ID, optional agent ID,
  external run ID, optional audit insight ID, chain ID, contract address,
  anchoring transaction hash, submitter address, telemetry digest, insight
  digest, outcome, block number, log index, explorer URL, anchored timestamp,
  metadata, and standard timestamps.
- [ ] Add a unique index on chain ID, contract address, anchoring transaction
  hash, and log index.
- [ ] Add `chain_index_cursors` keyed by chain ID, contract address, and event
  topic with the last indexed block.
- [ ] Generate a Drizzle migration with
  `pnpm --filter @openstat/db db:generate`.
- [ ] Inspect the generated SQL. Do not hand-edit generated snapshots.
- [ ] Run `pnpm check-types`.
- [ ] Commit: `feat(db): add chain audit persistence`.

## Phase 6: Worker Projection For Chain Transactions

- [ ] Add a `chain_transaction` case to the native event projection switch in
  `packages/ingestion/src/index.ts`.
- [ ] Normalize transaction hashes and addresses to lowercase.
- [ ] Upsert into `chain_transactions` by project ID, chain ID, and transaction
  hash.
- [ ] Preserve existing receipt fields when a repeated submitted event arrives.
- [ ] Allow a later confirmed or reverted event to advance receipt status.
- [ ] Never allow a submitted event to downgrade a confirmed or reverted row.
- [ ] Set Mantle explorer URLs based on chain ID.
- [ ] Add integration coverage for one submitted chain transaction projection.
- [ ] Add integration coverage for idempotent repeated projection.
- [ ] Add integration coverage for status advancement.
- [ ] Run `pnpm --filter backend test`.
- [ ] Run `pnpm --filter backend test:integration` when disposable Postgres is
  available.
- [ ] Commit: `feat(ingestion): project chain transaction events`.

## Phase 7: SDK Parity

### TypeScript SDK

- [ ] Add `chain_transaction` to the TypeScript `NativeEvent` union.
- [ ] Add `recordChainTransaction(...)` to `packages/sdk-js/src/index.ts`.
- [ ] Require `chain: "mantle"`, `chainId`, `txHash`, and event context.
- [ ] Accept optional action, status, from address, and to address.
- [ ] Emit snake-case wire fields matching the shared schema.
- [ ] Add TypeScript SDK tests for Mantle Sepolia and Mantle mainnet payloads.
- [ ] Add TypeScript SDK tests proving run ID and agent context are preserved.

### Python SDK

- [ ] Add `record_chain_transaction(...)` to
  `sdks/python/src/openstat/client.py`.
- [ ] Match the TypeScript helper fields and snake-case wire shape.
- [ ] Add pytest coverage matching the TypeScript SDK tests.

### Verification

- [ ] Add one chain-transaction example to both SDK READMEs.
- [ ] Run `pnpm --dir packages/sdk-js test`.
- [ ] Run Python SDK `pytest`.
- [ ] Run `pnpm check-types`.
- [ ] Commit: `feat(sdk): add chain transaction telemetry helpers`.

## Phase 8: Mantle RPC Adapter

- [ ] Add `viem` as a dependency of the package that owns ingestion logic.
- [ ] Add `packages/ingestion/src/integrations/mantle/rpc.ts`.
- [ ] Export chain metadata for Mantle mainnet `5000` and Mantle Sepolia `5003`.
- [ ] Implement a client factory using an explicitly supplied RPC URL.
- [ ] Implement `getTransactionReceipt(txHash)`.
- [ ] Implement `getBlockNumber()`.
- [ ] Implement `getAuditAnchorLogs({ address, fromBlock, toBlock })`.
- [ ] Implement explorer URL helpers for transaction and contract links.
- [ ] Add a timeout around RPC calls.
- [ ] Do not log full RPC URLs because Alchemy URLs contain API keys.
- [ ] Add unit tests with mocked JSON-RPC responses.
- [ ] Add tests for pending, confirmed, and reverted receipts.
- [ ] Add tests proving URL helpers select the correct network.
- [ ] Run `pnpm check-types`.
- [ ] Commit: `feat(mantle): add rpc monitoring adapter`.

## Phase 9: Backend Mantle Configuration

- [ ] Add optional backend environment variables:

```text
MANTLE_MAINNET_RPC_URL=
MANTLE_SEPOLIA_RPC_URL=
MANTLE_SEPOLIA_ANCHOR_CONTRACT_ADDRESS=
MANTLE_RECONCILIATION_ENABLED=true
MANTLE_ANCHOR_INDEXING_ENABLED=false
CHAIN_RECONCILIATION_INTERVAL_MS=15000
CHAIN_RPC_TIMEOUT_MS=10000
BASE_RECONCILIATION_ENABLED=false
BASE_MAINNET_RPC_URL=
BASE_SEPOLIA_RPC_URL=
BNB_RECONCILIATION_ENABLED=false
BNB_MAINNET_RPC_URL=
BNB_TESTNET_RPC_URL=
```

- [ ] Default absent RPC URLs to public endpoints and poll only explicitly
  enabled chain adapters.
- [ ] Validate the optional anchor contract address as an EVM address.
- [ ] Add placeholders to `apps/backend/.env.example`.
- [ ] Add placeholders to `deploy/hetzner/.env.example`.
- [ ] Update `AGENTS.md` environment documentation.
- [ ] Add configuration tests for defaults and invalid addresses.
- [ ] Run `pnpm --filter backend test`.
- [ ] Commit: `feat(backend): configure mantle rpc monitoring`.

## Phase 10: Receipt Reconciliation

- [ ] Add `reconcilePendingChainTransactions(...)` to the ingestion package.
- [ ] Query only submitted rows whose last check is older than the configured
  poll interval.
- [ ] Limit each worker pass to a fixed batch size.
- [ ] Select RPC client by stored chain ID.
- [ ] Leave rows submitted when a receipt is not available yet.
- [ ] Update confirmed rows with block number, gas used, from address, to
  address, sanitized receipt JSON, explorer URL, checked timestamp, and
  confirmed timestamp.
- [ ] Update reverted rows with the same receipt metadata and status
  `reverted`.
- [ ] Treat RPC errors as retryable. Log a safe summary without API keys.
- [ ] Call reconciliation from `apps/backend/src/worker.ts`.
- [ ] Throttle reconciliation so it does not run more often than configured.
- [ ] Add integration tests for pending, confirmed, reverted, and transient RPC
  error behavior.
- [ ] Run `pnpm --filter backend test`.
- [ ] Run integration tests when disposable Postgres is available.
- [ ] Commit: `feat(worker): reconcile mantle transaction receipts`.

## Phase 11: Audit Anchor Indexing

- [ ] Add the deployed Sepolia contract ABI to the ingestion package.
- [ ] Add `indexAuditAnchorLogs(...)`.
- [ ] Read the cursor for chain ID `5003`, contract address, and the
  `AuditAnchored` topic.
- [ ] Poll logs in bounded block ranges.
- [ ] Decode `AuditAnchored` logs with `viem`.
- [ ] Match a decoded log to an existing `audit_insights` row by telemetry
  digest and insight digest.
- [ ] Insert one project-scoped `audit_anchors` row for matched logs.
- [ ] Ignore unmatched external logs after safe structured logging.
- [ ] Advance the cursor only after the current bounded range is processed.
- [ ] Make repeated indexing idempotent through the unique index.
- [ ] Invoke anchor indexing from the worker only when
  `MANTLE_ANCHOR_INDEXING_ENABLED=true` and a contract address is configured.
- [ ] Add integration tests for matched logs, unmatched logs, repeated logs,
  and cursor advancement.
- [ ] Run `pnpm --filter backend test`.
- [ ] Run integration tests when disposable Postgres is available.
- [ ] Commit: `feat(worker): index mantle audit anchor events`.

## Phase 12: Audit Copilot

### Structured Contract

- [ ] Add a Zod schema for:

```ts
{
  verdict: "pass" | "warning" | "fail";
  risk_score: number; // integer 0-100
  summary: string; // max 2000 characters
  anomaly_flags: string[]; // max 20 short items
}
```

- [ ] Add optional backend environment variables:

```text
AUDIT_COPILOT_MODE=fixture
AUDIT_COPILOT_BASE_URL=
AUDIT_COPILOT_API_KEY=
AUDIT_COPILOT_MODEL=
```

- [ ] Allow `fixture`, `live`, and `disabled` modes.
- [ ] Default to `fixture` in development and test.
- [ ] Default to `disabled` in production unless explicitly configured.

### Analysis Service

- [ ] Add an audit input builder that reads one project-scoped run timeline and
  related chain transactions.
- [ ] Reuse OpenStat redaction helpers before building any model request.
- [ ] Include safe telemetry summaries and sanitized receipt fields only.
- [ ] Add deterministic fixture output for tests and public-demo fallback.
- [ ] Add an OpenAI-compatible HTTP adapter for live mode.
- [ ] Validate model responses with the structured Zod schema.
- [ ] Compute `telemetryDigest` from canonical redacted input JSON.
- [ ] Compute `insightDigest` from canonical validated insight JSON.
- [ ] Insert one `audit_insights` row.
- [ ] Add tests for redaction, stable digests, fixture mode, disabled mode,
  malformed model output, and request failure.
- [ ] Run `pnpm --filter backend test`.
- [ ] Commit: `feat(analytics): add audit copilot insights`.

## Phase 13: Backend Read APIs

- [ ] Add `GET /v1/mantle/runs/:runId/audit`.
- [ ] Scope the read through `resolveReadScope`.
- [ ] Return the run, timeline events, chain transactions, latest audit
  insight, and matched anchor.
- [ ] Add stable `RUN_AUDIT_NOT_FOUND` behavior when the scoped run does not
  exist.
- [ ] Add `POST /v1/mantle/runs/:runId/audit-insights`.
- [ ] Scope the write through the existing authenticated session or API-key
  scope helper.
- [ ] Generate one Audit Copilot insight and return its digests.
- [ ] Add OpenAPI schemas for both routes.
- [ ] Add route tests for success, missing auth, project isolation, missing run,
  fixture insight generation, and redacted output.
- [ ] Run `pnpm --filter backend test`.
- [ ] Commit: `feat(backend): expose mantle run audit APIs`.

## Phase 14: RealClaw And Byreal Wrapper

### Package

Bundle the wrapper into the public `openstat` SDK package. Do not create a
competing SDK identity.

- [x] Add the `openstat-realclaw` bin entry to `packages/sdk-js/package.json`.
- [x] Add the wrapper implementation under `packages/sdk-js/src`.
- [x] Reuse the existing SDK build, typecheck, and test scripts.
- [x] Invoke upstream CLIs with Node child-process APIs. Do not shell-build
  command strings.

### Mantle Wrapper

- [x] Add generic `openstat-realclaw exec --dry-run|--confirm -- <command>`.
- [x] Delegate caller-supplied Byreal-style commands without shell execution.
- [x] Pass through `--dry-run` and `--confirm` exactly.
- [x] Refuse execution when neither or both safety flags are supplied.
- [x] Record a safe OpenStat tool-call event around the delegated command.
- [x] Parse a full `0x` transaction hash from confirmed upstream output.
- [x] Emit `recordChainTransaction(...)` after a transaction hash is available.
- [x] Capture structured allowlisted fields only. Do not store raw stdout,
  stderr, environment variables, or credential files as telemetry.
- [x] Add `--fixture` mode that simulates upstream output without a wallet.

### RealClaw Skill

- [x] Add `packages/sdk-js/skills/openstat-observability/SKILL.md`.
- [ ] Document required environment variables:

```text
OPENSTAT_API_KEY
OPENSTAT_API_URL
OPENSTAT_AGENT_ID
OPENSTAT_RUN_ID
```

- [ ] Tell RealClaw to use the wrapper instead of calling `evm-cli` directly
  when OpenStat observability is enabled.
- [ ] Preserve upstream safety requirements: preview first, full addresses,
  full transaction hashes, and explicit approval before writes.
- [ ] Never instruct users to paste private keys or agent tokens into chat.

### Verification

- [ ] Add unit tests for argument forwarding.
- [x] Add tests for safety-flag refusal.
- [ ] Add tests for fixture dry-run telemetry.
- [x] Add tests for confirmed fixture transaction telemetry.
- [x] Add tests proving secret-looking environment variables are never emitted.
- [x] Run package tests and typecheck.
- [x] Commit: `feat(sdk): bundle realclaw observability wrapper`.

## Phase 15: Dashboard Mantle Audit Trail

- [ ] Add typed frontend payloads for the Mantle run audit API in
  `apps/web/lib/openstat-api.ts`.
- [ ] Add a server helper to fetch one Mantle run audit.
- [ ] Add `Mantle` to dashboard navigation.
- [ ] Add `/dashboard/mantle`.
- [ ] Show latest correlated runs in a table.
- [ ] Show receipt status, chain, action, transaction hash, Audit Copilot
  verdict, risk score, and anchor status.
- [ ] Link full hashes to the correct Mantle explorer.
- [ ] Add an empty state when no chain transactions exist.
- [ ] Add a backend-unavailable partial-data state.
- [ ] Add proof details to the existing inspector summary.
- [ ] Add chain transaction, insight, and anchor rows to inspector timelines.
- [ ] Keep CSS app-prefixed with `.mantle-*` or `.dashboard-mantle-*`.
- [ ] Run `pnpm --filter web check-types`.
- [ ] Run `pnpm --filter web lint`.
- [ ] Run `pnpm --filter web build`.
- [ ] Verify `/dashboard/mantle` in the browser.
- [ ] Commit: `feat(web): add mantle agent audit trail`.

## Phase 16: Frontend Scope Guard

- [ ] Do not add standalone Mantle landing pages or unauthenticated Mantle
  telemetry routes.
- [ ] Keep Mantle UI work inside `/dashboard/mantle` and existing dashboard
  inspectors.

## Phase 17: Demo Executor

- [ ] Add `packages/contracts/scripts/demo-anchor-mantle-sepolia.ts`.
- [ ] Read the contract address and private key from environment variables only.
- [ ] Abort unless RPC chain ID is `5003`.
- [ ] Create a deterministic demo `runRef` from the configured run ID.
- [ ] Read telemetry and insight digests from explicit command arguments or a
  safe backend API response.
- [ ] Print the full contract address, run reference, telemetry digest, insight
  digest, outcome, and estimated transaction request before broadcast.
- [ ] Require an explicit `--confirm` flag before signing or broadcasting.
- [ ] Add a local or mocked dry-run test.
- [ ] Add a demo script that sends heartbeat, decision, risk check, chain
  transaction, and PnL events through the TypeScript SDK.
- [ ] Add fixture mode so the full dashboard flow can be rehearsed without a
  wallet.
- [ ] Ask for approval immediately before broadcasting the Sepolia anchor demo
  transaction.
- [ ] Execute one Sepolia anchor and confirm the worker indexes it.
- [ ] Commit: `feat(demo): add mantle audit anchor walkthrough`.

## Phase 18: Deployment Configuration

- [ ] Add Mantle RPC, anchor contract, and Audit Copilot placeholders
  to deployment environment examples.
- [ ] Add the deployed Sepolia contract address to production configuration.
- [ ] Set `MANTLE_ANCHOR_INDEXING_ENABLED=true` only after the contract address
  is configured.
- [ ] Configure Alchemy HTTP RPC URLs in deployment secrets.
- [ ] Keep Alchemy API keys out of logs and committed files.
- [ ] Deploy backend API and worker.
- [ ] Deploy the web app.
- [ ] Run `/health`.
- [ ] Run `/ready`.
- [ ] Ingest one fixture or demo chain transaction.
- [ ] Confirm receipt reconciliation appears in the dashboard.
- [ ] Confirm the verified contract explorer link works.
- [ ] Commit documentation-only deployment notes:
  `docs(mantle): document hackathon deployment`.

## Phase 19: End-To-End Acceptance

- [ ] Start from a clean checkout.
- [ ] Run `pnpm install`.
- [ ] Run database migrations.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm check-types`.
- [ ] Run `pnpm build`.
- [ ] Run `pnpm --filter backend test`.
- [ ] Run backend integration tests against disposable Postgres.
- [ ] Run TypeScript SDK tests.
- [ ] Run Python SDK tests.
- [ ] Run contract tests.
- [ ] Run RealClaw wrapper tests.
- [ ] Verify the public frontend is not localhost.
- [ ] Verify the contract is deployed on Mantle Sepolia.
- [ ] Verify the contract source is readable on the explorer.
- [ ] Verify at least one AI-produced insight digest is anchored.
- [ ] Verify the authenticated dashboard presents:
  - decision
  - risk check
  - Byreal or RealClaw-style tool call
  - Mantle transaction
  - reconciled receipt
  - Audit Copilot verdict
  - anchored proof
  - explorer links
- [ ] Verify no secrets or raw sensitive telemetry appear publicly.
- [ ] Verify existing non-chain ingestion still works with all Mantle variables
  absent.

## Phase 20: Submission Package

- [ ] Update the root README with a short OpenStat for Mantle section.
- [ ] Add an architecture diagram showing:

```text
RealClaw or agent
  -> OpenStat SDK and wrapper
  -> OpenStat ingestion
  -> Postgres and worker
  -> Alchemy Mantle RPC reconciliation
  -> Audit Copilot
  -> OpenStatAuditAnchor on Mantle Sepolia
  -> authenticated dashboard
```

- [ ] Document the deployed frontend URL.
- [ ] Document the backend URL.
- [ ] Document the verified contract address and explorer URL.
- [ ] Document setup instructions for fixture mode.
- [ ] Document setup instructions for optional live Byreal Mantle mode.
- [ ] Record a demo video of at least two minutes.
- [ ] Show the dashboard audit trail, Mantle explorer transaction, and verified
  contract in the video.
- [ ] Submit the one-line pitch.
- [ ] Nominate **AI Alpha & Data / Data & Analytics**.
- [ ] Nominate **Agentic Economy** only if the RealClaw wrapper is included in
  the deployed demo.
- [ ] Answer the track questions:
  - Data sources: OpenStat telemetry, Mantle RPC receipts, and audit anchor
    events.
  - AI role: observed agents plus Audit Copilot run analysis.
  - Verifiable value: correlated Mantle receipts and immutable redacted audit
    commitments.
- [ ] Include the open-source repository URL.
- [ ] Include the public demo URL.
- [ ] Include the contract address.
- [ ] Include the demo video URL.

## Phase 21: Stretch Work Only

Do not start these tasks until all Phase 19 acceptance checks pass.

- [ ] Request or obtain Byreal-managed RealClaw Mantle wallet credentials.
- [ ] Add a guarded live mainnet self-transfer rehearsal with explicit user
  approval.
- [ ] Add WebSocket log subscriptions for lower-latency anchor indexing.
- [ ] Add Solana normalization for `byreal-cli` swap and CLMM position actions.
- [ ] Add ERC-8004 registry address and agent ID metadata fields.
- [ ] Display ERC-8004 identity metadata when organizer-issued details are
  available.
- [ ] Deploy `OpenStatAuditAnchor` to Mantle mainnet after Sepolia acceptance.

## Submission Definition Of Done

The submission is ready when:

- OpenStat is still clearly an analytics and observability product.
- One authenticated dashboard run correlates agent intent with a Mantle
  transaction.
- The transaction receipt is independently reconciled through RPC.
- Audit Copilot produces a redacted structured insight.
- The insight digest is anchored through a verified Mantle Sepolia contract.
- The authenticated dashboard has working Mantle explorer links.
- The repository documents architecture, setup, contract address, and demo URL.
- A demo video of at least two minutes is published.
- Existing ingestion and dashboard behavior still pass validation.
