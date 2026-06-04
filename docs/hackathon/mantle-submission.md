# Mantle Turing Test Hackathon Submission

OpenStat's submission path is **AI Alpha & Data / Data & Analytics**. OpenStat
is the analytics and verification layer for AI agents on Mantle: it records
agent intent, verifies Mantle transaction receipts, generates a redacted AI
audit insight, and anchors a privacy-safe proof on-chain.

The deployment-award proof uses the `OpenStatAuditAnchor` contract on Mantle
Sepolia. The contract stores cryptographic commitments to an audited agent run;
it does not store raw prompts, wallet secrets, private account details, or raw
tool payloads.

One-line pitch:

```text
OpenStat is the analytics and verification layer for AI agents on Mantle.
```

## How The Mantle Proof Works

OpenStat keeps verification logic off-chain and uses Mantle as the immutable
proof layer.

```text
AI agent run
  -> OpenStat telemetry
  -> Mantle transaction receipt verification
  -> redacted Audit Copilot insight
  -> telemetryDigest + insightDigest
  -> OpenStatAuditAnchor.anchorAudit(...)
  -> public Mantle proof
```

For a Mantle transaction, OpenStat checks the chain receipt through Mantle RPC:

- transaction hash exists
- receipt status is confirmed, reverted, or pending
- block number and gas usage are recorded
- explorer links are attached to dashboard rows

After that off-chain verification, OpenStat calls `anchorAudit(...)` with:

- `runRef`: a bytes32 reference for the audited run
- `telemetryDigest`: hash of the redacted run-audit input
- `insightDigest`: hash of the structured AI audit insight
- `outcome`: `0` unknown, `1` pass, `2` warning, or `3` fail

The contract is therefore a proof registry for verified audits. It does not
re-execute trades or inspect private telemetry on-chain.

## Dashboard Demo

The public dashboard demo is available at:

```text
https://openstat.online/dashboard/onchain/mantle
```

The demo row shows an AI trading-agent run correlated with a real Mantle Sepolia
audit anchor:

- run ID: `mantle-demo-run`
- action: `anchor_audit`
- receipt: `confirmed`
- Audit Copilot: `pass - 0/100`
- proof: `Anchored`

This demo uses simulated agent telemetry with a real Mantle Sepolia proof
transaction. In production, the same pipeline attaches to real agent-submitted
transactions and verifies their receipts from Mantle RPC before anchoring the
audit proof.

## Deployment Award Checklist

- Register and submit the OpenStat BUIDL on DoraHacks.
- Deploy `OpenStatAuditAnchor` to Mantle Sepolia.
- Verify bytecode and Solidity source on Mantle Explorer.
- Set backend Mantle variables:
  - `MANTLE_SEPOLIA_ANCHOR_CONTRACT_ADDRESS`
  - `MANTLE_ANCHOR_INDEXING_ENABLED=true`
  - `MANTLE_ANCHOR_INDEX_START_BLOCK`
  - `MANTLE_SEPOLIA_RPC_URL`
- Deploy the public dashboard and backend with non-localhost URLs.
- Anchor one demo audit with `anchorAudit(...)`.
- Confirm the worker indexes the anchor event into `audit_anchors`.
- Show the proof in the authenticated dashboard with Mantle Explorer links.
- Record a demo video of at least two minutes.
- Include repo, demo URL, contract address, explorer URL, and video URL in the
  DoraHacks submission.

## Contract Commands

Run all commands from the repository root.

```sh
pnpm --filter @openstat/contracts compile
pnpm --filter @openstat/contracts test
```

Deployment dry run:

```sh
pnpm --filter @openstat/contracts deploy:mantle-sepolia
```

Broadcast only after reviewing the printed chain ID, deployer, and gas estimate:

```sh
pnpm --filter @openstat/contracts deploy:mantle-sepolia -- --confirm
```

Verify deployed bytecode:

```sh
pnpm --filter @openstat/contracts verify:mantle-sepolia -- 0xContract
```

Anchor a deterministic demo audit. This is a dry run unless `--confirm` is
present:

```sh
pnpm --filter @openstat/contracts demo:anchor-mantle-sepolia -- --run-id mantle-demo-run
```

Broadcast the demo anchor only after reviewing the dry-run output:

```sh
pnpm --filter @openstat/contracts demo:anchor-mantle-sepolia -- --run-id mantle-demo-run --confirm
```

## DoraHacks Submission Fields

- **Track:** AI Alpha & Data / Data & Analytics.
- **Project:** OpenStat.
- **Pitch:** Analytics and verification for AI agents on Mantle.
- **Data sources:** OpenStat telemetry, Mantle RPC receipts, and audit anchor
  events.
- **AI role:** Audit Copilot analyzes redacted agent-run context and emits a
  structured verdict.
- **Mantle use:** `OpenStatAuditAnchor.anchorAudit(...)` stores privacy-safe
  digests and outcome on Mantle Sepolia.
- **Repository:** public OpenStat GitHub URL.
- **Demo URL:** public dashboard URL.
- **Contract address:** Mantle Sepolia `OpenStatAuditAnchor` address.
- **Explorer URL:** Mantle Explorer contract verification and demo transaction
  links.
- **Video:** two-minute walkthrough of run telemetry, AI audit insight, on-chain
  anchor, and dashboard proof.

Current Mantle Sepolia proof links:

- Contract:
  `https://sepolia.mantlescan.xyz/address/0x1f5a3354dc01beb89ba7de1a01d04295274a737a`
- Deployment transaction:
  `https://sepolia.mantlescan.xyz/tx/0x05218e9b32c615c0c616e88efd7efc9b5f7bbf84ff388e73dc4b7b14c2ddc956`
- Demo anchor transaction:
  `https://sepolia.mantlescan.xyz/tx/0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b`

## GitBook Page Copy

Use this concise version for the public GitBook page:

```text
OpenStat verifies AI-agent activity on Mantle without exposing private
telemetry. An agent run emits OpenStat telemetry, OpenStat verifies the related
Mantle transaction receipt through RPC, Audit Copilot produces a redacted
structured verdict, and OpenStat anchors only cryptographic digests of that
audit through OpenStatAuditAnchor on Mantle Sepolia.

The smart contract is not a trading bot and does not re-execute the transaction.
It acts as an immutable proof registry: every important audited agent run can
produce a public proof that the displayed OpenStat audit matches an on-chain
commitment.

Live proof:
- Contract: 0x1f5a3354dc01beb89ba7de1a01d04295274a737a
- Sample proof transaction:
  0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b
- Dashboard: https://openstat.online/dashboard/onchain/mantle
```

## Acceptance Checks

Before submission, verify:

- The contract has bytecode on Mantle Sepolia.
- Solidity source is verified on Mantle Explorer.
- One `AuditAnchored` event exists for the demo run.
- The backend indexes the event after `MANTLE_ANCHOR_INDEXING_ENABLED=true`.
- The dashboard shows receipt status, audit outcome, and proof/explorer links.
- Public docs and submission copy do not expose secrets, raw prompts, wallet
  private keys, or unredacted telemetry.
