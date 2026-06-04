# Mantle verification

OpenStat is the analytics and verification layer for AI agents on Mantle. It
records what an agent attempted, verifies related Mantle transaction receipts,
produces a redacted AI audit verdict, and anchors a privacy-safe proof on
Mantle Sepolia.

The on-chain component is `OpenStatAuditAnchor`. It is not a trading bot and it
does not re-execute agent transactions. It acts as an immutable proof registry
for OpenStat audits.

## How it works

```text
AI agent run
  -> OpenStat telemetry
  -> Mantle receipt verification
  -> redacted Audit Copilot verdict
  -> telemetryDigest + insightDigest
  -> OpenStatAuditAnchor.anchorAudit(...)
  -> public Mantle proof
```

When an agent submits a Mantle transaction, OpenStat stores the run context and
checks the transaction hash through Mantle RPC. The dashboard can then show the
receipt status, block number, gas used, and explorer link beside the agent run.

After the receipt is reconciled, Audit Copilot analyzes only redacted run
context and emits a structured verdict. OpenStat hashes the redacted telemetry
and the AI insight, then calls `anchorAudit(...)` with:

- `runRef`: a bytes32 reference for the audited run
- `telemetryDigest`: hash of the redacted run-audit input
- `insightDigest`: hash of the structured AI audit verdict
- `outcome`: `0` unknown, `1` pass, `2` warning, or `3` fail

Only these commitments and the outcome are written on-chain. Raw prompts,
wallet secrets, private account details, and unredacted telemetry stay out of
public chain data.

## What the proof means

The proof confirms that an OpenStat audit existed for a specific agent run and
that the displayed redacted audit can be matched to an on-chain commitment. It
does not claim that a smart contract independently decided to trade, inspected
private prompts, or executed the agent's transaction.

In production, the same pipeline attaches to real agent-submitted Mantle
transactions. For the hackathon deployment, the public dashboard shows a sample
AI trading workflow with a real Mantle Sepolia audit anchor.

## Live proof

- Dashboard:
  [https://openstat.online/dashboard/onchain/mantle](https://openstat.online/dashboard/onchain/mantle)
- Contract:
  [`0x1f5a3354dc01beb89ba7de1a01d04295274a737a`](https://sepolia.mantlescan.xyz/address/0x1f5a3354dc01beb89ba7de1a01d04295274a737a)
- Deployment transaction:
  [`0x05218e9b32c615c0c616e88efd7efc9b5f7bbf84ff388e73dc4b7b14c2ddc956`](https://sepolia.mantlescan.xyz/tx/0x05218e9b32c615c0c616e88efd7efc9b5f7bbf84ff388e73dc4b7b14c2ddc956)
- Sample proof transaction:
  [`0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b`](https://sepolia.mantlescan.xyz/tx/0x22f6e966f1190404580228a2e71597f0beb17ddc269aab6e0b7325bfcdbaad4b)

## Why Mantle

Mantle gives OpenStat a public, low-cost settlement layer for audit
commitments. OpenStat keeps high-volume telemetry and AI reasoning off-chain,
while Mantle stores the final verification commitment that anyone can inspect.
