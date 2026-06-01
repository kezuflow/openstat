# OpenStat For Mantle Hackathon Plan

## Summary

Submit OpenStat to The Turing Test Hackathon 2026 under **AI Alpha & Data**,
specifically the **Data & Analytics** path.

OpenStat remains an observability and analytics platform for autonomous agents.
The Mantle work adds an optional verification layer that correlates an agent's
off-chain reasoning and telemetry with independently verified on-chain actions.

One-line pitch:

> OpenStat is the analytics and verification layer for AI agents on Mantle:
> see what an agent thought, what it executed on-chain, and whether the outcome
> matched its intent.

The official DoraHacks submission deadline is June 15, 2026 at 15:59 UTC. The
implementation should also target the first-20 project deployment award with a
verified Mantle Sepolia contract, public frontend demo, deployed contract
address, open-source repository, and demo video of at least two minutes.

## Product Direction

### Core Identity

- Keep OpenStat API-first and agent-framework agnostic.
- Preserve the current ingestion, worker, projection, SDK, and dashboard model.
- Treat Mantle as an optional chain analytics and verification adapter.
- Use a small instrumented agent only as an end-to-end demonstration. Do not
  turn OpenStat into a trading bot or wallet custodian.
- Keep private telemetry off-chain. Store hashes and safe summaries on-chain.

### Hackathon Positioning

- Primary nomination: **AI Alpha & Data / Data & Analytics**.
- Lead with an **Agent Audit Trail**: each agent decision beside its risk check,
  tool call, Mantle transaction, receipt, outcome, PnL, and proof status.
- Add an **Audit Copilot** that analyzes a redacted run plus Mantle receipts and
  returns a structured verdict, risk score, summary, and anomaly flags.
- Secondary nomination: **Agentic Economy** if the RealClaw and Byreal wrapper
  integration is included in the submitted demo.

## Key Changes

### RealClaw And Byreal Adapter

- Add an installable `openstat-observability` RealClaw skill and an
  `openstat-realclaw` wrapper CLI inside the public `openstat` SDK package.
- Wrap Byreal commands without modifying upstream repositories:
  - `openstat-realclaw exec --dry-run -- <byreal-command> <args>` wraps any
    upstream CLI preview without shell-building command strings.
  - `openstat-realclaw exec --confirm -- <byreal-command> <args>` preserves the
    mandatory explicit-confirmation flow for approved writes.
  - `openstat-realclaw observe --tx-hash 0x...` records a known transaction
    hash when another agent surface owns command execution.
- Emit OpenStat telemetry around each tool call: redacted arguments, command
  type, duration, exit status, full transaction hash, chain ID, and receipt
  status.
- Support fixture and dry-run modes first because a Byreal-managed wallet or
  agent token is not currently available.
- Keep live Mantle mainnet execution opt-in. Never store Byreal agent tokens,
  Privy proxy credentials, or wallet private keys in OpenStat.

### Chain Analytics

- Extend shared schemas and both existing SDKs with
  `recordChainTransaction(...)`.
- Add generic persistence for `chain_transactions`, `audit_insights`, and
  `audit_anchors`.
- Keep Mantle-specific RPC, reconciliation, indexing, and run assembly under
  `packages/ingestion/src/integrations/mantle` so future chains can reuse the
  core audit model through sibling adapters.
- Reconcile submitted hashes independently through Mantle RPC. Store receipt
  status, block number, gas usage, addresses, chain ID, and explorer URL.
- Add authenticated read APIs for a correlated audit trail by run ID.
- Add a worker pass for pending receipt reconciliation and anchor-event
  indexing.

### Alchemy RPC Monitoring

- Use Alchemy as the preferred hosted RPC provider, configurable through
  environment variables.
- Configure Mantle mainnet:
  - Chain ID: `5000`
  - HTTP: `https://mantle-mainnet.g.alchemy.com/v2/<api-key>`
  - WebSocket: `wss://mantle-mainnet.g.alchemy.com/v2/<api-key>`
- Configure Mantle Sepolia:
  - Chain ID: `5003`
  - HTTP: `https://mantle-sepolia.g.alchemy.com/v2/<api-key>`
  - WebSocket: `wss://mantle-sepolia.g.alchemy.com/v2/<api-key>`
- Use HTTP JSON-RPC for deterministic receipt reconciliation and historical
  backfill.
- Use WebSocket subscriptions or log polling for fast anchor-event indexing.
- Fall back to Mantle public RPC endpoints when Alchemy credentials are not
  configured.

### Verifiable Proofs

- Add a small `OpenStatAuditAnchor` Solidity contract using a TypeScript
  Hardhat setup and `viem`.
- Deploy and verify the contract on Mantle Sepolia first.
- Expose:

```solidity
function anchorAudit(
    bytes32 runRef,
    bytes32 telemetryDigest,
    bytes32 insightDigest,
    uint8 outcome
) external;
```

- Emit an indexed event containing the caller, run reference, telemetry digest,
  insight digest, outcome, and timestamp.
- Anchor hashes and summaries only. Never publish prompts, raw tool payloads,
  account identifiers, secrets, or raw order payloads.
- Keep signing outside the backend. The demo agent signs Sepolia anchors;
  OpenStat observes and verifies them.

### Audit Copilot And UI

- Add a provider-neutral, OpenAI-compatible Audit Copilot adapter with a
  deterministic fixture fallback for tests and demos.
- Feed it redacted telemetry plus reconciled Mantle receipts.
- Persist the structured insight and its digest before anchoring.
- Add `/dashboard/mantle` for correlated runs, receipt state, proof state, and
  explorer links.
- Add proof details to the existing dashboard inspectors.
- Do not add standalone Mantle landing pages. Keep correlated run data inside
  the authenticated dashboard.

## Demo Flow

1. A RealClaw-style agent reads Mantle state and emits a heartbeat.
2. The agent records a decision and risk check through the OpenStat SDK.
3. `openstat-realclaw` invokes a guarded Byreal Mantle command in dry-run mode.
4. The repeatable public demo executes a harmless Sepolia action and records its
   transaction hash.
5. OpenStat independently reconciles the receipt through Alchemy RPC.
6. Audit Copilot analyzes the redacted telemetry and receipt.
7. The demo agent anchors the redacted audit commitment on Mantle Sepolia.
8. The authenticated dashboard displays intent, execution, receipt, AI verdict,
   proof status, and Mantle Explorer links.

Use a live Byreal-managed Mantle mainnet transfer only after credentials are
obtained. It is an optional credibility upgrade, not a submission blocker.

## Test Plan

- Unit test SDK parity, wrapper argument redaction, Byreal dry-run parsing,
  receipt reconciliation, digest stability, and Copilot schema validation.
- Route test organization and project scoping.
- Contract test audit anchoring and emitted events.
- Integration test:

```text
decision
  -> wrapped tool call
  -> chain transaction
  -> RPC receipt
  -> AI insight
  -> Sepolia anchor
  -> dashboard payload
```

- Verify the contract on Mantle Explorer and deploy the public frontend before
  submission.
- Record a demo video of at least two minutes and document setup, architecture,
  contract address, and explorer URL.

## Delivery Order

1. Add contract workspace, tests, Mantle Sepolia deployment, verification, and
   README address.
2. Add generic chain transaction ingestion and worker reconciliation with
   Alchemy RPC configuration.
3. Add the RealClaw skill, wrapper CLI, fixture mode, and Byreal `evm-cli`
   dry-run adapter.
4. Add the Mantle dashboard page and inspector proof details.
5. Add Audit Copilot with deterministic fallback.
6. Polish submission copy, video, screenshots, and deployment-award checklist.

## Assumptions

- Mantle mainnet is chain ID `5000`; Mantle Sepolia is chain ID `5003`.
- Byreal's public Mantle `evm-cli` currently targets mainnet, so repeatable
  Sepolia proof anchoring uses OpenStat's demo executor.
- Byreal's richer `byreal-agent-skills` CLI is currently Solana-focused.
- ERC-8004 identity linkage is optional metadata if organizer-issued identity
  details become available; it does not block the first submission.
- The contract and Alchemy monitoring work are high-confidence EVM integration
  tasks. The main external uncertainty is obtaining Byreal-managed RealClaw
  credentials for a live mainnet demonstration.

## References

- [Hackathon details](https://dorahacks.io/hackathon/mantleturingtesthackathon2026/detail)
- [Requirements and criteria](https://dorahacks.io/hackathon/mantleturingtesthackathon2026/requirements-&-criteria)
- [Byreal GitHub organization](https://github.com/byreal-git)
- [Byreal EVM CLI](https://github.com/byreal-git/evm-cli)
- [Byreal agent skills](https://github.com/byreal-git/byreal-agent-skills)
- [Alchemy Mantle mainnet RPC](https://www.alchemy.com/rpc/mantle)
- [Alchemy Mantle Sepolia RPC](https://www.alchemy.com/rpc/mantle-sepolia)
- [Alchemy Mantle API overview](https://www.alchemy.com/docs/mantle/mantle-api-overview)
