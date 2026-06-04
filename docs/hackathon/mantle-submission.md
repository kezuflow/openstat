# Mantle Turing Test Hackathon Submission

OpenStat's submission path is **AI Alpha & Data / Data & Analytics**. The
deployment-award proof is the `OpenStatAuditAnchor` contract on Mantle Sepolia:
an AI-generated audit insight digest is anchored on-chain without publishing
private telemetry.

One-line pitch:

```text
OpenStat is the analytics and verification layer for AI agents on Mantle.
```

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

## Acceptance Checks

Before submission, verify:

- The contract has bytecode on Mantle Sepolia.
- Solidity source is verified on Mantle Explorer.
- One `AuditAnchored` event exists for the demo run.
- The backend indexes the event after `MANTLE_ANCHOR_INDEXING_ENABLED=true`.
- The dashboard shows receipt status, audit outcome, and proof/explorer links.
- Public docs and submission copy do not expose secrets, raw prompts, wallet
  private keys, or unredacted telemetry.
